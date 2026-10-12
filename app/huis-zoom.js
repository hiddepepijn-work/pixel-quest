// In- en uitzoomen en pannen van het huis (PQZoom). Twee vingers zoomen, één vinger sleept, dubbeltik zoomt in en
// uit, scrollwiel/trackpad met Ctrl (of knijpen op een trackpad) zoomt, gewoon scrollen pant. Traagheid na een veeg en
// een harde grens: je kunt nooit buiten de getekende wereld kijken (geen rubberband, geen terugveren).
// Scherpte: tijdens het gebaar schaalt een CSS-transform de laag (image-rendering: pixelated). Na het gebaar klikt de
// zoom vast op een hele stap (1×, 2×, 3×, 4×) en tekent het huis zichzelf opnieuw op die schaal, zodat elke artpixel
// precies een geheel aantal schermpixels is. Onder 1× (overzicht) blijft de zoom vrij.
// Staat: eff = schermpx per artpx; tx, ty = plek van de scène-oorsprong in het venster (schermpx).
(function (wortel) {
  'use strict';
  const rustig = () => !!(wortel.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const klem = (v, a, b) => Math.min(b, Math.max(a, v));

  function maak(venster, podium, o) {
    const MAX = 4;
    let eff = 2, tx = 0, ty = 0, zr = o.zr ? o.zr() : 2, anim = 0, wielTimer = 0;
    const ptrs = new Map();
    let pan = null, knijp = null, onderdruk = false, laatsteTik = null, gebaar = false;

    // Maten worden bewaard en alleen opnieuw gemeten bij een nieuw gebaar, een resize of herbereken: geen layout lezen
    // per pointer-event (dat dwingt de browser elke keer de stijl opnieuw te berekenen).
    let maatC = null, rectC = null;
    function meetNu() { maatC = { vw: venster.clientWidth || 1, vh: venster.clientHeight || 1 }; rectC = venster.getBoundingClientRect(); }
    const maat = () => { if (!maatC) meetNu(); return maatC; };
    wortel.addEventListener('resize', () => { maatC = null; });
    const inhoud = () => o.inhoud();                     // { w, h, g, wereld: { x0, y0, x1, y1 } } in artpx
    // Uitzoomen kan tot het huis (met zijn erf) de breedte of de hoogte vult, maar nooit zo ver dat de wereld (lucht,
    // erf, grond) het scherm niet meer vult: het huis hangt dus nooit in een leeg vlak. Vanaf 1× een hele stap.
    function dekEff() {
      const { vw, vh } = maat(), c = inhoud(), wr = c.wereld;
      return wr ? Math.max(vw / (wr.x1 - wr.x0), vh / (wr.y1 - wr.y0)) : 0;
    }
    // Harde ondergrens: de wereld dekt het scherm nog net in de breedte én de hoogte. Verder uitzoomen kan niet.
    function minEff() { return dekEff() || (() => { const { vw, vh } = maat(), { w, h } = inhoud(); return Math.min(vw / w, vh / h); })(); }
    const maxEff = () => Math.max(MAX, Math.ceil(minEff()));
    // Grenzen voor tx, ty bij deze zoom: het zichtbare stuk blijft binnen de wereld (de scène plus lucht erboven, erf
    // opzij en grond eronder; huis.js tekent die als achtergrondlaag). Zo hangt het huis nooit in een leeg kleurvlak.
    // Met een open menu is alleen het stuk tussen boven/onder/links/rechts zichtbaar (zetVeld).
    let veld = null;
    const zicht = () => { const { vw, vh } = maat(); return Object.assign({ boven: 0, onder: vh, links: 0, rechts: vw }, veld || {}); };
    function grenzen(e) {
      const c = inhoud(), wr = c.wereld || { x0: 0, y0: 0, x1: c.w, y1: c.h }, v = zicht();
      const as = (lo, hi, vlo, vhi) => { const a = vhi - hi * e, b = vlo - lo * e; return a <= b ? [a, b] : [(a + b) / 2, (a + b) / 2]; };
      return { gx: as(wr.x0, wr.x1, v.links, v.rechts), gy: as(wr.y0, wr.y1, v.boven, v.onder) };
    }
    // Rust: na een gebaar of animatie mag huis.js het dure werk doen (deeltjes voor het zichtbare stuk).
    let rustTimer = 0;
    function rust() { podium.classList.remove('beweegt'); clearTimeout(rustTimer); rustTimer = setTimeout(() => { if (o.opRust && !ptrs.size) o.opRust({ eff, tx, ty, zr }); }, 60); }
    function toon() {
      const s = eff / zr;
      podium.style.transform = `translate(${Math.round(tx * 1000) / 1000}px, ${Math.round(ty * 1000) / 1000}px) scale(${s})`;
      podium.classList.toggle('verkleind', eff < 1 - 1e-6);
      if (o.opToon) o.opToon({ eff, tx, ty, zr });
    }
    function bewaarStand() {
      if (!o.opWijzig) return;
      const { vw, vh } = maat();
      o.opWijzig({ eff, cx: (vw / 2 - tx) / eff, cy: (vh / 2 - ty) / eff });
    }
    // Zoom naar e met het schermpunt (px, py) vast.
    function zoomRond(e, px, py, zacht) {
      const sx = (px - tx) / eff, sy = (py - ty) / eff;
      eff = zacht ? e : klem(e, minEff(), maxEff());
      tx = px - sx * eff; ty = py - sy * eff;
    }
    function klemT(hard) {
      const g = grenzen(eff);
      if (hard) { tx = klem(tx, g.gx[0], g.gx[1]); ty = klem(ty, g.gy[0], g.gy[1]); }
      else { tx = klem(tx, g.gx[0], g.gx[1]); ty = klem(ty, g.gy[0], g.gy[1]); }     // ook tijdens gebaren: hard
    }
    // Doel na een gebaar: hele stap (≥ 1×), binnen min/max, en binnen de grenzen.
    function doelEff(e) {
      e = klem(e, minEff(), maxEff());
      if (e < 1) return e;
      let r = Math.round(e);
      if (r < minEff()) r = Math.ceil(minEff() - 1e-9);
      return klem(r, Math.max(1, minEff()), maxEff());
    }
    function animeer(naarE, px, py, klaar) {
      cancelAnimationFrame(anim);
      const vanE = eff, vanX = tx, vanY = ty;
      // eindstand berekenen
      zoomRond(naarE, px, py, true); klemT(true);
      const doelX = tx, doelY = ty;
      eff = vanE; tx = vanX; ty = vanY;
      if (rustig()) { eff = naarE; tx = doelX; ty = doelY; toon(); klaar && klaar(); return; }
      const t0 = performance.now(), duur = 200;
      const stap = t => {
        const p = Math.min(1, (t - t0) / duur), k = 1 - Math.pow(1 - p, 3);
        eff = vanE + (naarE - vanE) * k; tx = vanX + (doelX - vanX) * k; ty = vanY + (doelY - vanY) * k;
        toon();
        if (p < 1) anim = requestAnimationFrame(stap); else klaar && klaar();
      };
      anim = requestAnimationFrame(stap);
    }
    // Naar een vaste eindstand (zoom en plek), bv. "alles in beeld": de scène in het midden van het zichtbare stuk.
    function animeerNaar(e2, tx2, ty2, klaar) {
      cancelAnimationFrame(anim);
      const van = { e: eff, x: tx, y: ty };
      eff = e2; tx = tx2; ty = ty2; klemT(true);
      const naar = { e: eff, x: tx, y: ty };
      if (rustig()) { toon(); return klaar && klaar(); }
      eff = van.e; tx = van.x; ty = van.y;
      const t0 = performance.now();
      const stap = t => {
        const p = Math.min(1, (t - t0) / 220), k = 1 - Math.pow(1 - p, 3);
        eff = van.e + (naar.e - van.e) * k; tx = van.x + (naar.x - van.x) * k; ty = van.y + (naar.y - van.y) * k;
        toon();
        if (p < 1) anim = requestAnimationFrame(stap); else klaar && klaar();
      };
      anim = requestAnimationFrame(stap);
    }
    function pasStand() {
      const m = minEff(), c = inhoud(), v = zicht();
      return [m, (v.links + v.rechts) / 2 - c.w / 2 * m, (v.boven + v.onder) / 2 - c.h / 2 * m];
    }
    // In rust staat de laag op hele schermpixels: een halve pixel verschuiving laat WebKit de laag uitsmeren.
    function heelPixel() { const d = wortel.devicePixelRatio || 1; tx = Math.round(tx * d) / d; ty = Math.round(ty * d) / d; }
    // Vastklikken: hele zoomstap, terug binnen de grenzen, daarna eventueel opnieuw tekenen op de nieuwe schaal.
    function zetVast(px, py) {
      const { vw, vh } = maat();
      if (px == null) { px = vw / 2; py = vh / 2; }
      animeer(doelEff(eff), px, py, () => {
        const nieuw = eff >= 1 ? Math.round(eff) : 1;
        if (nieuw !== zr && o.herteken) { zr = nieuw; o.herteken(zr); }
        heelPixel(); toon(); bewaarStand(); rust();
      });
    }

    // ---------- traagheid na een veeg ----------
    let vx = 0, vy = 0, monsters = [];
    function glij() {
      if (rustig() || Math.hypot(vx, vy) < 0.05) return zetVast();
      podium.classList.add('beweegt');
      let vorige = performance.now();
      const stap = t => {
        const dt = Math.min(40, t - vorige); vorige = t;
        tx += vx * dt; ty += vy * dt;
        // Traagheid stopt hard op de rand: op die as valt de snelheid weg.
        const g = grenzen(eff);
        if (tx <= g.gx[0] || tx >= g.gx[1]) vx = 0;
        if (ty <= g.gy[0] || ty >= g.gy[1]) vy = 0;
        const rem = Math.pow(0.94, dt / 16);
        vx *= rem; vy *= rem;
        klemT(true); toon();
        if (Math.hypot(vx, vy) > 0.02) anim = requestAnimationFrame(stap); else zetVast();
      };
      anim = requestAnimationFrame(stap);
    }

    // ---------- pointers: pannen, knijpen, dubbeltik ----------
    const interactief = t => t && t.closest && t.closest('button, a, input, select, .sleepbaar, .signaal');
    const midden = () => { const p = [...ptrs.values()]; return { x: (p[0].x + p[1].x) / 2, y: (p[0].y + p[1].y) / 2, d: Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y) || 1 }; };
    const lokaal = ev => { if (!rectC) meetNu(); return { x: ev.clientX - rectC.left, y: ev.clientY - rectC.top }; };
    function neer(ev) {
      if (!o.actief() || ev.button > 0) return;
      if (!ptrs.size) { onderdruk = false; meetNu(); }
      if (o.magPannen && !o.magPannen(ev) && !ptrs.size) return;     // bewerkmodus: alleen een lege plek pant
      cancelAnimationFrame(anim); clearTimeout(rustTimer);
      ptrs.set(ev.pointerId, lokaal(ev));
      if (ptrs.size === 1) { const p = lokaal(ev); pan = { x: p.x, y: p.y, tx, ty, bewogen: false, doel: ev.target }; monsters = []; }
      if (ptrs.size === 2) {
        const m = midden();
        knijp = { d: m.d, x: m.x, y: m.y, eff, tx, ty }; gebaar = true; onderdruk = true;
        podium.classList.add('beweegt');
        for (const id of ptrs.keys()) { try { venster.setPointerCapture(id); } catch (e) { /* */ } }
      }
    }
    // Pointer-events worden per frame samengevoegd: alleen de laatste vingerstand telt, één transform per frame.
    let gepland = 0;
    function beweeg(ev) {
      if (!ptrs.has(ev.pointerId)) return;
      ptrs.set(ev.pointerId, lokaal(ev));
      if (!gepland) gepland = requestAnimationFrame(verwerk);
    }
    function verwerk() {
      gepland = 0;
      if (knijp && ptrs.size >= 2) {
        const m = midden(), mx = maxEff(), mn = minEff();
        const e = klem(knijp.eff * m.d / knijp.d, mn, mx);      // hard: verder dan de grens gaat het gebaar niet
        const sx = (knijp.x - knijp.tx) / knijp.eff, sy = (knijp.y - knijp.ty) / knijp.eff;
        eff = e; tx = m.x - sx * eff; ty = m.y - sy * eff;
        klemT(true); toon();
        return;
      }
      if (!pan || !ptrs.size) return;
      const [id, p] = [...ptrs.entries()][0], dx = p.x - pan.x, dy = p.y - pan.y;
      if (!pan.bewogen && Math.hypot(dx, dy) < 7) return;
      if (!pan.bewogen) { pan.bewogen = true; gebaar = true; onderdruk = true; podium.classList.add('beweegt'); try { venster.setPointerCapture(id); } catch (e) { /* */ } }
      tx = pan.tx + dx; ty = pan.ty + dy;
      klemT(true); toon();
      const t = performance.now();
      monsters.push({ t, x: tx, y: ty }); monsters = monsters.filter(m => t - m.t < 90);
    }
    function op(ev) {
      if (!ptrs.has(ev.pointerId)) return;
      if (gepland) { cancelAnimationFrame(gepland); verwerk(); }      // de laatste stand eerst toepassen
      const p = lokaal(ev);
      ptrs.delete(ev.pointerId);
      if (knijp) {
        if (ptrs.size === 1) { const r = [...ptrs.values()][0]; pan = { x: r.x, y: r.y, tx, ty, bewogen: true }; monsters = []; knijp = null; }
        else if (!ptrs.size) { const k = knijp; knijp = null; pan = null; zetVast(k.x, k.y); }
        return;
      }
      if (ptrs.size) return;
      const was = pan; pan = null;
      if (was && was.bewogen) {
        const a = monsters[0], b = monsters[monsters.length - 1];
        vx = a && b && b.t > a.t ? (b.x - a.x) / (b.t - a.t) : 0; vy = a && b && b.t > a.t ? (b.y - a.y) / (b.t - a.t) : 0;
        return glij();
      }
      gebaar = false; podium.classList.remove('beweegt');
      // dubbeltik op een lege plek: inzoomen (3×) of terug naar alles in beeld
      if (ev.pointerType !== 'mouse' || ev.detail >= 1) {
        const nu = performance.now();
        if (laatsteTik && nu - laatsteTik.t < 320 && Math.hypot(p.x - laatsteTik.x, p.y - laatsteTik.y) < 30 && !interactief(ev.target)) {
          laatsteTik = null; dubbel(p.x, p.y);
        } else laatsteTik = { t: nu, x: p.x, y: p.y };
      }
    }
    function dubbel(x, y) {
      if (eff < 2.5) return animeer(Math.min(3, maxEff()), x, y, () => zetVast(x, y));
      const [m, px, py] = pasStand(); animeerNaar(doelEff(m), px, py, () => zetVast());
    }
    // Klikken na een veeg of knijp tegenhouden (anders opent een signaal of aait je een pet per ongeluk).
    function vangKlik(e) { if (onderdruk) { e.stopPropagation(); e.preventDefault(); } onderdruk = false; gebaar = false; }
    function wiel(ev) {
      if (!o.actief()) return;
      ev.preventDefault();
      cancelAnimationFrame(anim);
      const p = lokaal(ev);
      podium.classList.add('beweegt');
      if (ev.ctrlKey || ev.metaKey) { zoomRond(eff * Math.exp(-ev.deltaY * (ev.deltaMode ? 0.05 : 0.01)), p.x, p.y); klemT(true); }
      else { tx -= ev.shiftKey ? ev.deltaY : ev.deltaX; ty -= ev.shiftKey ? 0 : ev.deltaY; klemT(true); }
      toon();
      clearTimeout(wielTimer);
      wielTimer = setTimeout(() => zetVast(p.x, p.y), 220);
    }
    const geenPaginaZoom = e => e.preventDefault();     // Safari: knijpen zoomt anders de hele pagina
    venster.addEventListener('pointerdown', neer);
    venster.addEventListener('pointermove', beweeg);
    venster.addEventListener('pointerup', op);
    venster.addEventListener('pointercancel', op);
    venster.addEventListener('click', vangKlik, true);
    venster.addEventListener('wheel', wiel, { passive: false });
    venster.addEventListener('gesturestart', geenPaginaZoom);
    venster.addEventListener('dblclick', e => e.preventDefault());

    // ---------- publiek ----------
    function begin(stand, focus) {
      meetNu();
      const { vw, vh } = maat();
      if (stand && !(Number.isFinite(stand.eff) && Number.isFinite(stand.cx) && Number.isFinite(stand.cy))) stand = null;   // beschadigde of oude stand
      eff = stand && stand.eff ? klem(stand.eff, minEff(), maxEff()) : klem(2, minEff(), maxEff());
      if (eff >= 1) eff = doelEff(eff);
      const c = stand && stand.cx != null ? stand : focus || { cx: inhoud().w / 2, cy: inhoud().h / 2 };
      tx = vw / 2 - c.cx * eff; ty = vh / 2 - c.cy * eff;
      klemT(true);
      const nieuw = eff >= 1 ? Math.round(eff) : 1;
      if (nieuw !== zr && o.herteken) { zr = nieuw; o.herteken(zr); }
      if (eff >= 1) heelPixel();
      toon(); rust();
    }
    return {
      begin, toon, zetVast,
      stand: () => ({ eff, tx, ty, zr, schaal: eff / zr }),
      schaal: () => eff / zr,
      in: () => { const { vw, vh } = maat(); animeer(eff < 1 ? 1 : Math.min(maxEff(), Math.round(eff) + 1), vw / 2, vh / 2, () => zetVast()); },
      uit: () => { const { vw, vh } = maat(); animeer(eff > 1 ? Math.max(minEff(), Math.round(eff) - 1) : minEff(), vw / 2, vh / 2, () => zetVast()); },
      pas: () => { const [m, x, y] = pasStand(); animeerNaar(m, x, y, () => zetVast()); },
      zetVeld(v) { veld = v || null; },
      // Terug naar een eerdere stand (zelfde zoom), bv. na het sluiten van het menu.
      terugNaar(st) { if (!st || Math.abs(st.eff - eff) > 1e-6) return; const { vw, vh } = maat(); this.glijNaar((vw / 2 - st.tx) / eff, (vh / 2 - st.ty) / eff, vh / 2); },
      // Zacht pannen (geen zoom) zodat scènepunt (cx, cy) op schermpunt (midden, y) komt.
      glijNaar(cx, cy, y, x) {
        const { vw } = maat(), van = { x: tx, y: ty };
        tx = (x != null ? x : vw / 2) - cx * eff; ty = (y != null ? y : maat().vh / 2) - cy * eff; klemT(true);
        const naar = { x: tx, y: ty }; tx = van.x; ty = van.y;
        cancelAnimationFrame(anim);
        if (rustig()) { tx = naar.x; ty = naar.y; heelPixel(); toon(); return; }
        const t0 = performance.now();
        const stap = t => { const p = Math.min(1, (t - t0) / 280), k = 1 - Math.pow(1 - p, 3);
          tx = van.x + (naar.x - van.x) * k; ty = van.y + (naar.y - van.y) * k; if (p >= 1) heelPixel(); toon();
          if (p < 1) anim = requestAnimationFrame(stap); else rust(); };
        anim = requestAnimationFrame(stap);
      },
      naar: (cx, cy, e) => { const { vw, vh } = maat(); eff = e || eff; tx = vw / 2 - cx * eff; ty = vh / 2 - cy * eff; klemT(true); toon(); rust(); },
      herbereken: () => { meetNu(); if (eff < minEff()) eff = minEff(); klemT(true); toon(); rust(); },
      meet: meetNu, maten: () => maat(),
      bezig: () => gebaar || !!ptrs.size,
      grens: () => ({ min: minEff(), max: maxEff() }),
    };
  }
  wortel.PQZoom = { maak };
})(window);
