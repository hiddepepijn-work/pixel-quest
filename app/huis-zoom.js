// In- en uitzoomen en pannen van het huis (PQZoom). Twee vingers zoomen, één vinger sleept, dubbeltik zoomt in en
// uit, scrollwiel/trackpad met Ctrl (of knijpen op een trackpad) zoomt, gewoon scrollen pant. Traagheid na een veeg en
// zachte grenzen (elastisch over de rand, daarna terugveren).
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

    const maat = () => ({ vw: venster.clientWidth || 1, vh: venster.clientHeight || 1 });
    const inhoud = () => o.inhoud();                     // { w, h } in artpx
    // Alles in beeld; vanaf 1× afgerond naar beneden op een hele stap (dan is de scène iets kleiner dan het venster).
    function pasEff() { const { vw, vh } = maat(), { w, h } = inhoud(); return Math.min(vw / w, vh / h); }
    function minEff() { const p = pasEff(); return p >= 1 ? Math.floor(p) : p; }
    const maxEff = () => Math.max(MAX, Math.ceil(minEff()));
    // Grenzen voor tx, ty bij deze zoom. Kleiner dan het venster: horizontaal in het midden, en verticaal met de
    // grondlijn op ~70% van de hoogte (lucht erboven, een strook grond eronder), binnen het venster.
    // Met een open menu is alleen het stuk tussen boven en onder zichtbaar (zetVeld); dan mag je verticaal meer pannen.
    let veld = null;
    function grenzen(e) {
      const { vw, vh } = maat(), { w, h, g } = inhoud(), sw = w * e, sh = h * e;
      const v = veld || { boven: 0, onder: vh }, hv = v.onder - v.boven;
      const gx = sw <= vw ? [(vw - sw) / 2, (vw - sw) / 2] : [vw - sw, 0];
      const y = klem(v.boven + hv * 0.7 - (g || h) * e, v.boven, v.onder - sh);
      const gy = sh <= hv ? [y, y] : [v.onder - sh, v.boven];
      return { gx, gy };
    }
    const elastisch = (v, [a, b]) => (v < a ? a - (a - v) * 0.35 : v > b ? b + (v - b) * 0.35 : v);
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
      else { tx = elastisch(tx, g.gx); ty = elastisch(ty, g.gy); }
    }
    // Doel na een gebaar: hele stap (≥ 1×), binnen min/max, en binnen de grenzen.
    function doelEff(e) {
      e = klem(e, minEff(), maxEff());
      return e < 1 ? e : klem(Math.round(e), Math.max(1, minEff()), maxEff());
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
    // In rust staat de laag op hele schermpixels: een halve pixel verschuiving laat WebKit de laag uitsmeren.
    function heelPixel() { const d = wortel.devicePixelRatio || 1; tx = Math.round(tx * d) / d; ty = Math.round(ty * d) / d; }
    // Vastklikken: hele zoomstap, terug binnen de grenzen, daarna eventueel opnieuw tekenen op de nieuwe schaal.
    function zetVast(px, py) {
      const { vw, vh } = maat();
      if (px == null) { px = vw / 2; py = vh / 2; }
      animeer(doelEff(eff), px, py, () => {
        const nieuw = eff >= 1 ? Math.round(eff) : 1;
        if (nieuw !== zr && o.herteken) { zr = nieuw; o.herteken(zr); }
        heelPixel(); toon(); bewaarStand();
      });
    }

    // ---------- traagheid na een veeg ----------
    let vx = 0, vy = 0, monsters = [];
    function glij() {
      if (rustig() || Math.hypot(vx, vy) < 0.05) return zetVast();
      let vorige = performance.now();
      const stap = t => {
        const dt = Math.min(40, t - vorige); vorige = t;
        tx += vx * dt; ty += vy * dt;
        const g = grenzen(eff), buiten = tx < g.gx[0] || tx > g.gx[1] || ty < g.gy[0] || ty > g.gy[1];
        const rem = Math.pow(buiten ? 0.8 : 0.94, dt / 16);
        vx *= rem; vy *= rem;
        klemT(false); toon();
        if (Math.hypot(vx, vy) > 0.02) anim = requestAnimationFrame(stap); else zetVast();
      };
      anim = requestAnimationFrame(stap);
    }

    // ---------- pointers: pannen, knijpen, dubbeltik ----------
    const interactief = t => t && t.closest && t.closest('button, a, input, select, .sleepbaar, .signaal');
    const midden = () => { const p = [...ptrs.values()]; return { x: (p[0].x + p[1].x) / 2, y: (p[0].y + p[1].y) / 2, d: Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y) || 1 }; };
    const lokaal = ev => { const r = venster.getBoundingClientRect(); return { x: ev.clientX - r.left, y: ev.clientY - r.top }; };
    function neer(ev) {
      if (!o.actief() || ev.button > 0) return;
      if (!ptrs.size) onderdruk = false;
      if (o.magPannen && !o.magPannen(ev) && !ptrs.size) return;     // bewerkmodus: alleen een lege plek pant
      cancelAnimationFrame(anim);
      ptrs.set(ev.pointerId, lokaal(ev));
      if (ptrs.size === 1) { const p = lokaal(ev); pan = { x: p.x, y: p.y, tx, ty, bewogen: false, doel: ev.target }; monsters = []; }
      if (ptrs.size === 2) {
        const m = midden();
        knijp = { d: m.d, x: m.x, y: m.y, eff, tx, ty }; gebaar = true; onderdruk = true;
        for (const id of ptrs.keys()) { try { venster.setPointerCapture(id); } catch (e) { /* */ } }
      }
    }
    function beweeg(ev) {
      if (!ptrs.has(ev.pointerId)) return;
      ptrs.set(ev.pointerId, lokaal(ev));
      if (knijp && ptrs.size >= 2) {
        const m = midden(), mx = maxEff(), mn = minEff();
        let e = knijp.eff * m.d / knijp.d;
        if (e > mx) e = mx + (e - mx) * 0.3; if (e < mn) e = mn - (mn - e) * 0.3;     // zacht over de grens
        const sx = (knijp.x - knijp.tx) / knijp.eff, sy = (knijp.y - knijp.ty) / knijp.eff;
        eff = e; tx = m.x - sx * eff; ty = m.y - sy * eff;
        klemT(false); toon();
        return;
      }
      if (!pan) return;
      const p = lokaal(ev), dx = p.x - pan.x, dy = p.y - pan.y;
      if (!pan.bewogen && Math.hypot(dx, dy) < 7) return;
      if (!pan.bewogen) { pan.bewogen = true; gebaar = true; onderdruk = true; try { venster.setPointerCapture(ev.pointerId); } catch (e) { /* */ } }
      tx = pan.tx + dx; ty = pan.ty + dy;
      klemT(false); toon();
      const t = performance.now();
      monsters.push({ t, x: tx, y: ty }); monsters = monsters.filter(m => t - m.t < 90);
    }
    function op(ev) {
      if (!ptrs.has(ev.pointerId)) return;
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
      gebaar = false;
      // dubbeltik op een lege plek: inzoomen (3×) of terug naar alles in beeld
      if (ev.pointerType !== 'mouse' || ev.detail >= 1) {
        const nu = performance.now();
        if (laatsteTik && nu - laatsteTik.t < 320 && Math.hypot(p.x - laatsteTik.x, p.y - laatsteTik.y) < 30 && !interactief(ev.target)) {
          laatsteTik = null; dubbel(p.x, p.y);
        } else laatsteTik = { t: nu, x: p.x, y: p.y };
      }
    }
    function dubbel(x, y) { animeer(eff < 2.5 ? Math.min(3, maxEff()) : doelEff(minEff()), x, y, () => zetVast(x, y)); }
    // Klikken na een veeg of knijp tegenhouden (anders opent een signaal of aait je een pet per ongeluk).
    function vangKlik(e) { if (onderdruk) { e.stopPropagation(); e.preventDefault(); } onderdruk = false; gebaar = false; }
    function wiel(ev) {
      if (!o.actief()) return;
      ev.preventDefault();
      cancelAnimationFrame(anim);
      const p = lokaal(ev);
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
      toon();
    }
    return {
      begin, toon, zetVast,
      stand: () => ({ eff, tx, ty, zr, schaal: eff / zr }),
      schaal: () => eff / zr,
      in: () => { const { vw, vh } = maat(); animeer(eff < 1 ? 1 : Math.min(maxEff(), Math.round(eff) + 1), vw / 2, vh / 2, () => zetVast()); },
      uit: () => { const { vw, vh } = maat(); animeer(eff > 1 ? Math.max(minEff(), Math.round(eff) - 1) : minEff(), vw / 2, vh / 2, () => zetVast()); },
      pas: () => { const { vw, vh } = maat(); animeer(minEff(), vw / 2, vh / 2, () => zetVast()); },
      zetVeld(v) { veld = v || null; },
      // Terug naar een eerdere stand (zelfde zoom), bv. na het sluiten van het menu.
      terugNaar(st) { if (!st || Math.abs(st.eff - eff) > 1e-6) return; const { vw, vh } = maat(); this.glijNaar((vw / 2 - st.tx) / eff, (vh / 2 - st.ty) / eff, vh / 2); },
      // Zacht pannen (geen zoom) zodat scènepunt (cx, cy) op schermpunt (midden, y) komt.
      glijNaar(cx, cy, y) {
        const { vw } = maat(), van = { x: tx, y: ty };
        tx = vw / 2 - cx * eff; ty = (y != null ? y : maat().vh / 2) - cy * eff; klemT(true);
        const naar = { x: tx, y: ty }; tx = van.x; ty = van.y;
        cancelAnimationFrame(anim);
        if (rustig()) { tx = naar.x; ty = naar.y; heelPixel(); toon(); return; }
        const t0 = performance.now();
        const stap = t => { const p = Math.min(1, (t - t0) / 280), k = 1 - Math.pow(1 - p, 3);
          tx = van.x + (naar.x - van.x) * k; ty = van.y + (naar.y - van.y) * k; if (p >= 1) heelPixel(); toon();
          if (p < 1) anim = requestAnimationFrame(stap); };
        anim = requestAnimationFrame(stap);
      },
      naar: (cx, cy, e) => { const { vw, vh } = maat(); eff = e || eff; tx = vw / 2 - cx * eff; ty = vh / 2 - cy * eff; klemT(true); toon(); },
      herbereken: () => { if (eff < minEff()) eff = minEff(); klemT(true); toon(); },
      bezig: () => gebaar || !!ptrs.size,
      grens: () => ({ min: minEff(), max: maxEff() }),
    };
  }
  wortel.PQZoom = { maak };
})(window);
