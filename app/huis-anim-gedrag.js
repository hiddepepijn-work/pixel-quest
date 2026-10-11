// Beweging, deel 2: gedrag op requestAnimationFrame. Hidde en Tessie lopen af en toe naar een plek op hun verdieping
// of naar een meubel van een taak, blijven staan (ademen), lopen niet door elkaar of door hoge meubels heen en praten
// even als ze bij elkaar stoppen. Pets wandelen, zitten, snuffelen, zwemmen, kruipen of fladderen (zie pet-deel).
// Frames komen uit huis-anim.js. Het frame van een loper hangt af van de AFGELEGDE AFSTAND (1 artpx per frame), zodat
// de voet op de grond stilstaat ten opzichte van de vloer. Pauzeert bij document.hidden. Leest PQ_HUIS en PQ_HUISMODEL.
window.PQ_HUISGEDRAG = (function (H, HM, BW) {
  'use strict';
  const q = new URLSearchParams(location.search);
  const TEMPO = q.has('tempo') ? Math.max(0.1, +q.get('tempo') || 1) : 1;      // test: tijd versnellen
  const rnd = (a, b) => a + Math.random() * (b - a);
  const kies = l => l[Math.floor(Math.random() * l.length)];
  const geheugen = new Map();          // id -> { x, vd, sleutel }: plek blijft staan als de scène opnieuw getekend wordt
  let acteurs = [], raf = 0, vorige = 0, Z = 2, geo = null, inr = [], bubbels = null, sleutel = '';
  const PETHUIS = ['aquarium', 'terrarium', 'stokje'];
  const AFSTAND = 34;                  // artpx tussen Hidde en Tessie als ze bij elkaar staan (schouder aan schouder)

  function begin(o) {
    stop();
    acteurs = []; Z = o.Z; geo = o.geo; inr = o.inrichting || []; bubbels = o.bubbels; sleutel = o.sleutel || '';
  }
  function stop() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0; vorige = 0;
    if (bubbels) bubbels.querySelectorAll('.praatje').forEach(b => b.remove());
  }
  const vergeet = () => geheugen.clear();
  function draai() {
    if (!raf && acteurs.length) raf = requestAnimationFrame(tik);
  }
  function tik(t) {
    raf = requestAnimationFrame(tik);
    if (document.hidden) { vorige = 0; return; }
    const dt = vorige ? Math.min(0.1, (t - vorige) / 1000) * TEMPO : 0;
    vorige = t;
    for (const a of acteurs) {
      try { a.stap(a, dt, t / 1000 * TEMPO); } catch (e) { a.stap = () => {}; if (window.PQ_TEST) window.PQ_TEST.fouten.push('gedrag: ' + e.message); }
    }
  }
  // Toont frame fr, spiegeling en positie (scene-artpx) alleen als er iets verandert; posities op hele schermpx.
  function toon(a, fr, x, y) {
    if (fr && a.huidig !== fr) {
      a.ctx.clearRect(0, 0, a.c.width, a.c.height);
      a.ctx.drawImage(fr, 0, 0, a.c.width, a.c.height);
      a.huidig = fr;
    }
    const sp = a.schaalX != null ? a.schaalX : (a.kijk !== a.natuur ? -1 : 1);
    if (sp !== a.sp) { a.spiegelEl.style.transform = sp === 1 ? '' : `scaleX(${sp})`; a.sp = sp; }
    const X = Math.round(x * Z), Y = Math.round(y * Z);
    if (X !== a.X || Y !== a.Y) { a.e.style.transform = `translate(${X}px, ${Y}px)`; a.X = X; a.Y = Y; }
  }
  function canvasVoor(a, w, h, cssW, cssH) {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h));
    c.style.width = cssW + 'px'; c.style.height = cssH + 'px';
    a.c = c; a.ctx = c.getContext('2d'); a.ctx.imageSmoothingEnabled = false;
    return c;
  }

  // ---------- vloer: looproutes per verdieping en hoge meubels ----------
  function segmenten(vd) {
    const ks = geo.kamers.filter(k => k.verdieping === vd).sort((a, b) => a.x - b.x);
    if (!ks.length) return [];
    let lijst = [[ks[0].x + 14, ks[ks.length - 1].x + ks[ks.length - 1].b - 14]];
    for (const k of ks) {
      if (!k.zwembad) continue;                                  // niet over het zwembad lopen
      const a = k.x + k.zwembad.x - 14, b = k.x + k.zwembad.x + k.zwembad.b + 14;
      lijst = lijst.flatMap(([p, e]) => (b <= p || a >= e ? [[p, e]] : [[p, a], [b, e]].filter(([u, v]) => v - u > 24)));
    }
    return lijst;
  }
  // Hoge of dichte meubels (kast, boekenkast, douche, aquarium ...): daar blijft niemand voor staan.
  function dicht(vd) {
    const uit = [];
    for (const i of inr) {
      const d = H.meubels[i.soort], k = geo.kamers.find(x => x.id === i.kamer);
      if (!d || d.op !== 'vloer' || !k || k.verdieping !== vd) continue;
      const m = HM.maat(i.soort);
      if (m.h >= 56 || PETHUIS.includes(i.soort)) uit.push([k.x + i.x, k.x + i.x + m.b]);
    }
    return uit;
  }
  const vloerVan = vd => (geo.kamers.find(k => k.verdieping === vd) || geo.kamers[0]).vloerY;

  // ---------- Hidde en Tessie ----------
  // o: { id, a (manifest-asset), frames (PQ_HUISANIM.mens), k (kamer), x (artpx in de kamer) }. Geeft het element.
  function mens(o) {
    const a = o.a, sc = Z / a.bronpx_per_artpixel, [ax, ay] = a.anker.bron, [w, h] = a.afmetingen.bron;
    const e = document.createElement('div');
    e.className = 'figuur loper';
    e.dataset.id = o.id;
    const act = { soort: 'mens', id: o.id, e, fr: o.frames, naam: a.naam, hoogte: a.figuur.bron[1] / a.bronpx_per_artpixel };
    const c = canvasVoor(act, w, h, w * sc, h * sc);
    c.setAttribute('aria-label', a.naam);
    Object.assign(c.style, { left: -ax * sc + 'px', top: -ay * sc + 'px', transformOrigin: ax * sc + 'px 0' });
    e.appendChild(c);
    act.spiegelEl = c;
    act.natuur = o.frames.kijk === 'links' ? -1 : 1;
    act.kijk = act.natuur;
    let x = o.k.x + o.x, vd = o.k.verdieping;
    const g = geheugen.get(o.id);
    if (g && g.sleutel === sleutel && segmenten(g.vd).some(([p, q2]) => g.x >= p - 2 && g.x <= q2 + 2)) { x = g.x; vd = g.vd; act.kijk = g.kijk || act.kijk; }
    // ?loopnu (test): meteen gaan lopen, zodat een schermafbeelding een loopcyclus vangt
    Object.assign(act, { x, vd, toestand: 'staan', wacht: q.has('loopnu') ? 0.3 : rnd(1.5, 6), afstand: 0, fase: Math.random() * 6, stap: stapMens });
    acteurs.push(act);
    toon(act, o.frames.adem[0], x, vloerVan(vd));
    return e;
  }
  const ander = a => acteurs.find(o => o.soort === 'mens' && o !== a && o.vd === a.vd);
  // Volgende doel: naast de ander om te praten, bij een meubel van een taak, of een vrije plek op de verdieping.
  function kiesDoel(a) {
    const segs = segmenten(a.vd), seg = segs.find(([p, e]) => a.x >= p - 2 && a.x <= e + 2) || segs[0];
    if (!seg) return null;
    const hoog = dicht(a.vd), b = ander(a);
    const vrij = (x, metAnder = true) => x >= seg[0] && x <= seg[1] && !hoog.some(([p, e]) => x > p - 10 && x < e + 10) &&
      (!metAnder || !b || Math.abs(x - (b.toestand === 'lopen' ? b.doel : b.x)) >= AFSTAND + 8);
    const r = Math.random();
    if (b && b.toestand === 'staan' && r < 0.25 && !q.has('loopnu')) {
      for (const kant of a.x < b.x ? [-1, 1] : [1, -1]) {
        const x = b.x + kant * AFSTAND;
        if (vrij(x, false) && Math.abs(x - a.x) > 6) return { x, praat: b };
      }
    }
    if (r < 0.6) {
      const bij = H.taken.map(t => inr.find(i => i.id === t.bij)).filter(Boolean).map(i => ({ i, k: geo.kamers.find(k => k.id === i.kamer) }))
        .filter(o => o.k && o.k.verdieping === a.vd);
      if (bij.length) {
        const { i, k } = kies(bij), m = HM.maat(i.soort), x0 = k.x + i.x;
        for (const x of [x0 + m.b / 2, x0 - 12, x0 + m.b + 12]) if (vrij(Math.round(x)) && Math.abs(x - a.x) > 10) return { x: Math.round(x) };
      }
    }
    for (let n = 0; n < 30; n++) {
      const x = Math.round(rnd(seg[0], seg[1]));
      if (Math.abs(x - a.x) >= 30 && vrij(x)) return { x };
    }
    return null;
  }
  function begin_lopen(a, d) {
    a.doel = d.x; a.praat = d.praat || null; a.dir = Math.sign(d.x - a.x) || 1; a.afstand = 0; a.tLoop = 0; a.uitloop = false;
    if (a.dir !== a.kijk) { a.kijk = a.dir; a.toestand = 'draai'; a.wacht = 0.22; }   // korte draaipauze
    else a.toestand = 'lopen';
  }
  function aangekomen(a, b) {
    a.toestand = 'staan'; a.wacht = rnd(4, 12);
    if (b && b.vd === a.vd && b.toestand !== 'lopen' && Math.abs(b.x - a.x) < AFSTAND + 8) praten(a, b);
  }
  function praten(a, b) {
    for (const [p, o] of [[a, b], [b, a]]) { p.toestand = 'praten'; p.wacht = rnd(3.2, 4.2); p.kijk = Math.sign(o.x - p.x) || p.kijk; p.beurt = 0; }
    a.spreker = true; b.spreker = false;
    bubbel(a, '…');
  }
  function bubbel(a, tekst) {
    if (!bubbels) return;
    const el = document.createElement('div');
    el.className = 'praatje' + (tekst === '♥' ? ' hart' : '');
    el.textContent = tekst;
    el.style.left = Math.round(a.x * Z) + 'px';
    el.style.top = Math.round((vloerVan(a.vd) - a.hoogte - 6) * Z) + 'px';
    bubbels.appendChild(el);
    setTimeout(() => el.remove(), 1300);
  }
  function stapMens(a, dt, t) {
    const F = a.fr, V = BW.mensen.snelheid, y = vloerVan(a.vd);
    if (a.toestand === 'lopen') {
      const rest = Math.abs(a.doel - a.x);
      a.tLoop += dt;
      let v = V * Math.min(1, 0.3 + a.tLoop / 0.4);                       // optrekken
      if (rest < 8) v *= Math.max(0.4, rest / 8);                         // uitlopen
      const s = Math.min(rest, v * dt);
      a.x += a.dir * s; a.afstand += s;
      const b = ander(a);
      if (b && (b.x - a.x) * a.dir > 0 && Math.abs(b.x - a.x) < AFSTAND && b !== a.praat) { aangekomen(a, b); }
      else if (b && b === a.praat && Math.abs(b.x - a.x) <= AFSTAND) aangekomen(a, b);
      else if (rest - s <= 0.001) {
        // Stoppen in de passeerhouding (beide voeten onder het lichaam): zo nodig nog een paar artpx uitlopen,
        // anders springt de stand van de benen bij het stilstaan.
        const j = Math.floor(a.afstand) % F.pas, mid = Math.floor(F.pas / 2), extra = (mid - j + F.pas) % F.pas;
        if (!a.uitloop && extra > 0 && extra < F.pas / 2 + 1) { a.uitloop = true; a.doel = a.x + a.dir * extra; }
        else { a.uitloop = false; aangekomen(a, a.praat); }
      }
      geheugen.set(a.id, { x: a.x, vd: a.vd, kijk: a.kijk, sleutel });
      if (a.toestand === 'lopen') {
        const i = Math.floor(a.afstand) % F.N;
        return toon(a, F.loop[i], a.x - a.dir * (a.afstand % 1), y);  // hele artpx: de standvoet staat stil
      }
      return toon(a, F.adem[0], a.x, y);
    }
    a.wacht -= dt;
    if (a.toestand === 'draai') { if (a.wacht <= 0) a.toestand = 'lopen'; return toon(a, F.adem[0], a.x, y); }
    if (a.toestand === 'praten') {
      a.beurt += dt;
      if (a.spreker && a.beurt > 1.2) { a.beurt = 0; a.spreker = false; const b = ander(a); if (b && b.toestand === 'praten') { b.spreker = true; b.beurt = 0; bubbel(b, a.wacht < 1.4 && Math.random() < 0.5 ? '♥' : '…'); } }
      if (a.wacht <= 0) { a.toestand = 'staan'; a.wacht = rnd(5, 12); }
    } else if (a.wacht <= 0) {
      const d = kiesDoel(a);
      if (d) begin_lopen(a, d); else a.wacht = rnd(2, 5);
    }
    // Rust: heel rustige ademhaling, 1 artpx op en neer (ongeveer elke 4 seconden).
    toon(a, F.adem[Math.sin((t + a.fase) * Math.PI * 2 / 4) > 0.55 ? 1 : 0], a.x, y);
  }

  // ---------- pets ----------
  // o: { id, e, romp (element dat spiegelt), frames (PQ_HUISANIM.pet), sc (schermpx per bronpx), f (echte-maatfactor),
  //      min, max, ymin, ymax (bewegingsruimte in scene-artpx t.o.v. het basispunt), slaapt }.
  function pet(o) {
    const fr = o.frames, w = fr.w * o.sc, h = fr.h * o.sc, eerste = fr.rust[0];
    const act = { soort: 'pet', id: o.id, e: o.e, fr, f: o.f, spiegelEl: o.romp, x: 0, y: 0, afstand: 0, fase: Math.random() * 6 };
    const c = canvasVoor(act, eerste.width, eerste.height, w, h);
    Object.assign(c.style, { position: 'absolute', left: 0, top: 0 });
    o.romp.appendChild(c);
    act.voor = fr.kijk === 'voor';
    act.natuur = fr.kijk === 'links' ? -1 : 1;
    act.kijk = act.natuur;
    if (act.voor) act.schaalX = 1;                    // van voren getekend: nooit spiegelen
    const def = BW.pets[o.id] || {};
    Object.assign(act, { min: o.min || 0, max: o.max || 0, ymin: o.ymin || 0, ymax: o.ymax || 0, def });
    act.v = (def.snelheid || 10) * (fr.soort === 'viervoeter' ? o.f : 1);   // scene-artpx per seconde
    act.toestand = o.slaapt ? 'slaap' : 'rust';
    act.wacht = rnd(0.5, 3);
    act.stap = { viervoeter: stapViervoeter, vis: stapVis, salamander: stapVis, kameleon: stapKameleon, vogel: stapVogel }[fr.soort] || stapRust;
    acteurs.push(act);
    toon(act, eerste, 0, 0);
    return act;
  }
  const adem = (a, t, periode) => a.fr.rust[a.fr.rust.length > 1 && Math.sin((t + a.fase) * Math.PI * 2 / periode) > 0.5 ? 1 : 0];
  function stapRust(a, dt, t) { toon(a, adem(a, t, a.toestand === 'slaap' ? 5 : 3), a.x, a.y); }
  function nieuwDoelX(a, minAfstand) {
    for (let n = 0; n < 12; n++) { const x = rnd(a.min, a.max); if (Math.abs(x - a.x) >= minAfstand) return x; }
    return null;
  }
  // Hondje, katje, draakje: wandelen (cyclus gekoppeld aan de afstand), stilstaan, zitten met kwispelen, snuffelen.
  function stapViervoeter(a, dt, t) {
    const F = a.fr, f = a.f;
    if (a.toestand === 'slaap') return stapRust(a, dt, t);
    if (a.toestand === 'lopen') {
      const rest = Math.abs(a.doel - a.x);
      a.tLoop += dt;
      let v = a.v * Math.min(1, 0.3 + a.tLoop / 0.5);
      if (rest < 4) v *= Math.max(0.4, rest / 4);
      const s = Math.min(rest, v * dt);
      a.x += a.dir * s; a.afstand += s;
      if (rest - s > 0.001) {
        const reeks = F.loop[a.voor ? a.dir : 1] || F.loop[1];
        return toon(a, reeks[Math.floor(a.afstand / f) % F.N], a.x - a.dir * (a.afstand % f), 0);
      }
      a.toestand = 'rust'; a.wacht = rnd(1.5, 5);
      if (Math.random() < 0.5) a.kwispelTot = t + rnd(0.8, 1.6);
    }
    a.wacht -= dt;
    if (a.toestand === 'draai') { if (a.wacht <= 0) a.toestand = 'lopen'; return toon(a, F.rust[0], a.x, 0); }
    if (a.toestand === 'snuffel') {
      if (a.wacht <= 0) { a.toestand = 'rust'; a.wacht = rnd(1, 3); }
      const p = a.wacht / 1.8;
      return toon(a, p > 0.85 || p < 0.15 ? F.snuffel[0] : F.snuffel[1], a.x, 0);
    }
    if (a.wacht <= 0) {
      const r = Math.random(), x = r < 0.6 ? nieuwDoelX(a, 10) : null;
      if (x != null) {
        a.doel = x; a.dir = Math.sign(x - a.x); a.afstand = 0; a.tLoop = 0;
        if (!a.voor && a.dir !== a.kijk) { a.kijk = a.dir; a.toestand = 'draai'; a.wacht = 0.2; } else { a.kijk = a.dir; a.toestand = 'lopen'; }
      } else if (r < 0.8 && F.snuffel.length) { a.toestand = 'snuffel'; a.wacht = 1.8; }
      else { a.wacht = rnd(2, 5); a.kwispelTot = t + rnd(0.8, 1.6); }
    }
    if (a.kwispelTot > t && F.kwispel.length) return toon(a, F.kwispel[Math.floor(t * 7) % 4], a.x, 0);
    toon(a, adem(a, t, 3), a.x, 0);
  }
  // Haaitje (zwemmen in het glas: vloeiende bochten, bij een richtingwissel een korte draai) en salamander (traag
  // kruipen met een lichaamsgolf, vaak lang stil). Snelheid en hoogte lopen met easing naar het doel.
  function stapVis(a, dt, t) {
    const F = a.fr, vis = F.soort === 'vis', reeks = vis ? F.zwem : F.kruip;
    if (a.vx == null) { a.vx = 0; a.y = rnd(a.ymin, a.ymax); a.x = rnd(a.min, a.max); a.ty = a.y; a.golf = 0; }
    a.wacht -= dt;
    if (a.doel == null && a.wacht <= 0) {
      const x = nieuwDoelX(a, vis ? 4 : 3);
      if (x != null) { a.doel = x; a.ty = rnd(a.ymin, a.ymax); } else a.wacht = rnd(1, 3);
    }
    const richting = a.doel != null ? Math.sign(a.doel - a.x) || a.kijk : a.kijk;
    if (a.toestand !== 'draai' && richting !== a.kijk && a.doel != null) { a.toestand = 'draai'; a.tDraai = 0; a.oud = a.kijk !== a.natuur ? -1 : 1; a.kijk = richting; }
    if (a.toestand === 'draai') {
      a.tDraai += dt;
      const p = Math.min(1, a.tDraai / 0.45), cs = Math.cos(Math.PI * p);
      a.schaalX = p >= 1 ? null : a.oud * Math.sign(cs || -1) * Math.max(0.15, Math.abs(cs));
      if (p >= 1) a.toestand = 'zwem';
      a.vx *= Math.max(0, 1 - dt * 3);
    } else if (a.doel != null) {
      const rest = Math.abs(a.doel - a.x), doelV = richting * a.v * Math.min(1, rest / 4 + 0.15);
      a.vx += (doelV - a.vx) * Math.min(1, dt * 1.6);
      if (rest < 0.4) { a.doel = null; a.wacht = vis ? rnd(0.4, 2.5) : rnd(3, 9); }
    } else a.vx *= Math.max(0, 1 - dt * 2);
    a.x = Math.min(a.max, Math.max(a.min, a.x + a.vx * dt));
    if (vis) a.y += (a.ty - a.y) * Math.min(1, dt * 0.9);
    // staartslag sneller bij meer vaart; de salamander golft alleen als hij kruipt
    a.golf += dt * (vis ? 5 + 9 * Math.abs(a.vx) / a.v : 10 * Math.abs(a.vx) / a.v);
    const zweef = vis ? Math.sin((t + a.fase) * 1.3) * 0.6 : 0;
    toon(a, reeks[Math.floor(a.golf) % reeks.length], a.x, a.y + zweef);
  }
  // Kameleon: heel stil; af en toe kijkt hij opzij (oog) of knikt hij met zijn kop.
  function stapKameleon(a, dt) {
    const F = a.fr;
    a.wacht -= dt;
    if (a.wacht <= 0) {
      if (a.actie) { a.actie = null; a.wacht = rnd(2.5, 7); }
      else { a.actie = Math.random() < 0.65 ? ['oog', kies([0, 1])] : ['kop', 0]; a.wacht = a.actie[0] === 'oog' ? rnd(1.2, 2.5) : 1.2; a.duur = a.wacht; }
    }
    let fr = F.rust[0];
    if (a.actie && a.actie[0] === 'oog') fr = F.oog[a.actie[1]];
    else if (a.actie) { const p = 1 - a.wacht / a.duur; fr = p < 0.25 || p > 0.75 ? F.kop[0] : F.kop[1]; }
    toon(a, fr, a.x, a.y);
  }
  // Parkiet: zitten, kopje dippen, af en toe een vleugelfladder of een huppeltje.
  function stapVogel(a, dt, t) {
    const F = a.fr;
    if (a.toestand === 'slaap') return toon(a, F.rust[0], a.x, a.y);
    a.wacht -= dt;
    if (a.wacht <= 0) {
      if (a.actie) { a.actie = null; a.wacht = rnd(1.5, 5); }
      else { a.actie = kies(['dip', 'dip', 'flap', 'hup']); a.duur = a.wacht = a.actie === 'dip' ? 1 : a.actie === 'flap' ? 0.6 : 0.35; }
    }
    let fr = F.rust[0], dy = 0;
    const p = a.actie ? 1 - a.wacht / a.duur : 0;
    if (a.actie === 'dip') fr = F.dip[p < 0.2 || p > 0.8 ? 0 : 1];
    else if (a.actie === 'flap') fr = F.flap[Math.floor(t * 16) % 2];
    else if (a.actie === 'hup') { dy = -Math.sin(Math.PI * p) * 3 / Z; fr = F.flap[0]; }
    toon(a, fr, a.x, a.y + dy);
  }

  return { begin, stop, draai, vergeet, mens, pet, segmenten, acteurs: () => acteurs };
})(window.PQ_HUIS, window.PQ_HUISMODEL, window.PQ_BEWEGING);
