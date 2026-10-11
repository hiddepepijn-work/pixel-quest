// Omgeving tekenen: zet de omgevingsstatus (PQ_OMGEVING.bereken) om in een dagdeel-object voor huis-buiten.js en
// huis-teken.js, en levert de seizoens-, weer- en eventlagen. Harde pixels en alleen paletkleuren (kleding.js).
// Leest PQ_HUIS, PQ_PIX en PQ_HUISBUITEN; laadt na huis-buiten.js en vóór huis-teken.js.
window.PQ_OMGEVINGTEKEN = (function (H, P, BU) {
  'use strict';
  const { rect, px, tint, rng, dither, ovaal } = P;

  // ---------- lucht per lichtfase en weer ----------
  // Banden van boven naar beneden: [kleur, aandeel]. 'grijs' = bewolkt, 'nat' = regen, 'wit' = sneeuwlucht.
  const LUCHT = {
    helder: {
      nacht: [['titel.2', 0.4], ['nacht.1', 0.35], ['nacht.2', 0.25]],
      dageraad: [['lavendel.1', 0.24], ['lavendel.2', 0.24], ['lavendel.3', 0.22], ['koraal.4', 0.3]],
      ochtend: [['petrol.4', 0.34], ['abrikoos.4', 0.36], ['goud.4', 0.3]],
      middag: [['petrol.3', 0.3], ['petrol.4', 0.42], ['creme.2', 0.28]],
      gouden_uur: [['petrol.3', 0.2], ['goud.4', 0.24], ['goud.3', 0.26], ['abrikoos.3', 0.3]],
      schemering: [['petrol.0', 0.22], ['lavendel.1', 0.2], ['lavendel.2', 0.2], ['koraal.3', 0.2], ['koraal.4', 0.18]],
    },
    grijs: {
      nacht: [['titel.2', 0.3], ['titel.3', 0.4], ['nacht.2', 0.3]],
      dageraad: [['titel.3', 0.4], ['nacht.3', 0.3], ['lavendel.2', 0.3]],
      ochtend: [['titel.4', 0.25], ['nacht.4', 0.4], ['abrikoos.4', 0.35]],
      middag: [['titel.4', 0.25], ['nacht.4', 0.4], ['petrol.4', 0.35]],
      gouden_uur: [['nacht.4', 0.35], ['koraal.4', 0.35], ['abrikoos.4', 0.3]],
      schemering: [['titel.3', 0.4], ['nacht.3', 0.3], ['lavendel.2', 0.3]],
    },
    nat: {
      nacht: [['titel.1', 0.35], ['titel.2', 0.35], ['titel.3', 0.3]],
      dageraad: [['titel.2', 0.4], ['titel.3', 0.3], ['nacht.3', 0.3]],
      ochtend: [['nacht.3', 0.3], ['titel.4', 0.35], ['nacht.4', 0.35]],
      middag: [['nacht.3', 0.3], ['titel.4', 0.35], ['nacht.4', 0.35]],
      gouden_uur: [['nacht.3', 0.3], ['titel.4', 0.35], ['abrikoos.4', 0.35]],
      schemering: [['titel.2', 0.4], ['titel.3', 0.3], ['nacht.3', 0.3]],
    },
    wit: {
      nacht: [['titel.2', 0.3], ['titel.3', 0.4], ['nacht.3', 0.3]],
      dageraad: [['titel.3', 0.35], ['nacht.4', 0.35], ['lavendel.3', 0.3]],
      ochtend: [['nacht.4', 0.3], ['petrol.4', 0.4], ['creme.2', 0.3]],
      middag: [['nacht.4', 0.3], ['petrol.4', 0.4], ['creme.2', 0.3]],
      gouden_uur: [['nacht.4', 0.3], ['lavendel.4', 0.35], ['abrikoos.4', 0.35]],
      schemering: [['titel.3', 0.4], ['nacht.3', 0.3], ['lavendel.2', 0.3]],
    },
  };
  const LUCHTSOORT = { helder: 'helder', halfbewolkt: 'helder', bewolkt: 'grijs', regen: 'nat', sneeuw: 'wit' };
  // Wolken [licht, basis, schaduw] per luchtsoort en dag/avond/nacht.
  const WOLK = {
    helder: { nacht: ['titel.4', 'titel.3', 'titel.2'] },
    grijs: { dag: ['petrol.4', 'nacht.4', 'titel.4'], avond: ['creme.1', 'nacht.4', 'titel.4'], nacht: ['titel.4', 'titel.3', 'titel.2'] },
    nat: { dag: ['nacht.4', 'titel.4', 'nacht.3'], avond: ['titel.4', 'nacht.3', 'titel.2'], nacht: ['titel.3', 'titel.2', 'titel.1'] },
    wit: { dag: ['creme.3', 'petrol.4', 'nacht.4'], avond: ['lavendel.4', 'nacht.4', 'titel.4'], nacht: ['titel.4', 'titel.3', 'titel.2'] },
  };
  // Lichtfase -> dagdeel-id waarmee de bestaande tekenpaden werken (achtergrond, ramen, zonnestand).
  const BASIS = { nacht: 'nacht', dageraad: 'ochtend', ochtend: 'ochtend', middag: 'dag', gouden_uur: 'avond', schemering: 'avond' };
  const FASENAAM = { nacht: 'nacht', dageraad: 'dageraad', ochtend: 'ochtend', middag: 'middag', gouden_uur: 'gouden uur', schemering: 'schemering' };
  const WEERNAAM = { helder: 'helder', halfbewolkt: 'licht bewolkt', bewolkt: 'bewolkt', regen: 'regen', sneeuw: 'sneeuw' };
  // Tint over de kamers (multiply): blauw 's nachts, warm in het gouden uur, grijs bij donker weer, koud bij sneeuw.
  const TINT_FASE = { nacht: ['titel', 0.22], dageraad: ['lavendel', 0.14], ochtend: ['abrikoos', 0.06], middag: [null, 0],
    gouden_uur: ['abrikoos', 0.14], schemering: ['lavendel', 0.14] };
  const TINT_WEER = { bewolkt: ['nacht.4', 0.12], regen: ['nacht.3', 0.14], sneeuw: ['petrol.4', 0.16] };

  // Vloeiend verloop: ankerpunten op de zonhoogte (graden), apart voor de ochtend- en de avondkant, oplopend.
  // Tussen twee ankers mengt de lucht de banden van beide fases (geordende dither in huis-buiten.js) en lopen tint en
  // lampsterkte lineair mee. Zo verschuift het beeld elke minuut een beetje in plaats van in zes sprongen.
  const ANKERS = {
    ochtend: [[-12, 'nacht'], [-3.5, 'dageraad'], [4, 'ochtend'], [16, 'middag']],
    avond: [[-10, 'nacht'], [-2, 'schemering'], [6, 'gouden_uur'], [16, 'middag']],
  };
  function verloop(l) {
    if (l.hoogte == null) return { a: l.fase, b: l.fase, f: 0 };
    const lijst = ANKERS[l.ochtend ? 'ochtend' : 'avond'], h = l.hoogte;
    if (h <= lijst[0][0]) return { a: lijst[0][1], b: lijst[0][1], f: 0 };
    for (let i = 0; i + 1 < lijst.length; i++) {
      const [h0, a] = lijst[i], [h1, b] = lijst[i + 1];
      if (h < h1) return { a, b, f: (h - h0) / (h1 - h0) };
    }
    return { a: 'middag', b: 'middag', f: 0 };
  }
  function mengHex(k1, k2, f) {
    const c = [k1, k2].map(k => { const n = parseInt(P.kleur(k).slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; });
    return '#' + c[0].map((v, i) => Math.round(v + (c[1][i] - v) * f).toString(16).padStart(2, '0')).join('');
  }
  const klem = (v, a, b) => Math.max(a, Math.min(b, v));

  // Zet de status om in het dagdeel-object dat huis-teken.js en huis-buiten.js lezen. omg (status) gaat mee in dd.omg.
  function dagdeel(st) {
    const fase = st.licht.fase, w = st.weer.type, soort = LUCHTSOORT[w] || 'helder', id = BASIS[fase] || 'dag';
    const donker = soort !== 'helder', nacht = fase === 'nacht', vl = verloop(st.licht), h = st.licht.hoogte;
    const bandenA = LUCHT[soort][vl.a] || LUCHT.helder.middag, bandenB = LUCHT[soort][vl.b] || bandenA;
    const banden = vl.f < 0.5 ? bandenA : bandenB;       // de overheersende set (rand naast de scène, schuine daken)
    const [ka, sa] = TINT_FASE[vl.a] || [null, 0], [kb, sb] = TINT_FASE[vl.b] || [null, 0];
    let tk = ka || kb ? mengHex(ka || kb, kb || ka, vl.f) : null, ts = sa + (sb - sa) * vl.f;
    if (TINT_WEER[w] && !nacht) { const [wk, ws] = TINT_WEER[w]; if (ws >= ts || !tk) { tk = wk; ts = Math.max(ts, ws); } }
    const wolkSoort = WOLK[soort] || {};
    const dd = {
      id, fase, naam: FASENAAM[fase] + (WEERNAAM[w] && w !== 'helder' ? ', ' + WEERNAAM[w] : ''),
      lucht: banden[0][0], raam: banden[Math.min(1, banden.length - 1)][0], banden: bandenA, banden2: bandenB, mengsel: vl.f,
      // sterren verschijnen geleidelijk (0-1) tussen -3 en -10 graden; zon en maan op hun echte plek
      sterNiveau: donker || h == null ? (nacht && !donker ? 1 : 0) : klem((-3 - h) / 7, 0, 1),
      sterren: !donker && (h == null ? nacht : h < -3), maan: !donker && (h == null ? nacht : h < 2),
      zon: !donker && (h == null ? !['nacht', 'dageraad', 'schemering'].includes(fase) : h > -1.5),
      zonStand: h == null ? null : { hoogte: h, azimut: st.licht.azimut }, maanStand: st.licht.maan || null,
      wolken: w === 'halfbewolkt' ? 2.5 : donker ? 5 : 1,
      wolkKleur: wolkSoort[nacht ? 'nacht' : id === 'avond' || fase === 'dageraad' ? 'avond' : 'dag'] || null,
      lichtbanen: !donker && ['ochtend', 'middag'].includes(fase),
      lampen: !!st.licht.lampen,
      lampSterkte: h == null ? (fase === 'dageraad' ? 0.6 : 1) : h <= -6 ? 1 : h > 3 ? 0.55 : klem((3 - h) / 9, 0.4, 1),
      tint: tk, sterkte: ts, omg: st,
    };
    Object.assign(dd, achtergrondKleuren(dd, st));
    dd.buiten = buitenStaat(dd, st);
    return dd;
  }

  // ---------- achtergrond (heuvels en bomenrij) per seizoen ----------
  function achtergrondKleuren(dd, st) {
    const s = st.seizoen.naam, sneeuw = st.sneeuwlaag > 0;
    if (dd.id === 'nacht') return sneeuw ? { ver: 'nacht.3', dicht: 'nacht.1' } : {};
    if (dd.id === 'avond') return sneeuw ? { ver: 'lavendel.3', dicht: 'lavendel.1' } : {};
    // grijs weer (bewolkt, regen): vlakker en donkerder, de verte grijs
    const dof = ['bewolkt', 'regen'].includes(st.weer.type);
    const ver = sneeuw ? 'creme.3' : dof ? (st.weer.type === 'regen' ? 'nacht.4' : 'mos.3') : s === 'zomer' ? 'blad.4' : 'mos.4';
    const dicht = s === 'winter' ? (dof ? 'koffie.3' : 'koffie.4') : s === 'herfst' ? (dof ? 'mos.2' : 'mos.3') : dof ? 'blad.2' : 'blad.3';
    return { ver, dicht };
  }
  const HERFSTRIJ = ['abrikoos.3', 'koraal.3', 'goud.3', 'mos.3', 'abrikoos.3', 'goud.4'];
  const HERFSTRIJ_DOF = ['abrikoos.1', 'koraal.1', 'goud.1', 'mos.2', 'abrikoos.1', 'goud.2'];

  // ---------- het erf per seizoen: kruinen, hagen, bloemen, grond ----------
  // buitenStaat levert de haakjes die huis-buiten.js aanroept (BU.omg). Elk haakje tekent het seizoen of het weer
  // over of in plaats van de standaardtekening; zonder BU.omg tekent huis-buiten.js het oude zomerbeeld.
  function buitenStaat(dd, st) {
    const s = st.seizoen.naam, laag = st.sneeuwlaag || 0, overdag = dd.id === 'dag' || dd.id === 'ochtend';
    const dof = ['bewolkt', 'regen'].includes(st.weer.type);
    const o = { seizoen: s, sneeuw: laag, regen: st.weer.type === 'regen', bessen: s === 'zomer' || s === 'lente' };
    o.gras = s === 'winter' ? ['mos.2', 'mos.3', 'mos.1'] : s === 'lente' ? ['blad.3', 'blad.4', 'blad.2'] :
      s === 'herfst' ? ['mos.2', 'mos.3', 'blad.1'] : ['blad.2', 'blad.3', 'blad.1'];
    o.halmen = laag < 2;
    o.boomrij = (r, dicht) => {
      if (!overdag || laag > 1) return dicht;
      const q = r();
      if (s === 'herfst') return (dof ? HERFSTRIJ_DOF : HERFSTRIJ)[Math.floor(q * HERFSTRIJ.length)];
      if (s === 'lente') return q < 0.22 ? (dof ? 'koraal.3' : 'koraal.4') : q < 0.38 ? (dof ? 'creme.1' : 'creme.3') : dicht;
      if (s === 'winter') return q < 0.5 ? 'koffie.4' : 'nacht.4';
      return dicht;
    };
    o.heg = s === 'lente' ? ['blad.2', 'blad.3', 'blad.1', 'blad.4'] : s === 'herfst' ? ['mos.1', 'goud.1', 'blad.0', 'goud.2'] :
      s === 'winter' ? ['koffie.2', 'koffie.3', 'koffie.1', 'abrikoos.1'] : null;
    o.kruin = (ctx, cx, cy, rx, ry, kl, zaad, basis) => kruin(ctx, cx, cy, rx, ry, kl, zaad, basis, s, laag);
    o.bloemen = (ctx, a, b, g, zaad, basis) => bloemen(ctx, a, b, g, zaad, basis, s);
    o.grond = (ctx, x, y, b, zaad) => grond(ctx, x, y, b, zaad, o, dd);
    return o;
  }
  // Seizoenskruin. Groenblijvers (olijf: 'mos') blijven altijd hetzelfde.
  function kruin(ctx, cx, cy, rx, ry, kl, zaad, basis, s, laag) {
    if (String(kl).startsWith('mos') || s === 'zomer') return basis(ctx, cx, cy, rx, ry, kl, zaad);
    if (s === 'winter') return kaal(ctx, cx, cy, rx, ry, zaad, laag);
    const r = rng(zaad + 101);
    // Plukjes van 4x3 pixels (licht linksboven, schaduw rechtsonder) binnen de kruin; boven lichter dan onder.
    const plukjes = (n, kies) => {
      for (let i = 0; i < n; i++) {
        const a = r() * 6.28, d = Math.sqrt(r()) * 0.9;
        const x = Math.round(cx + Math.cos(a) * rx * d) - 2, y = Math.round(cy + Math.sin(a) * ry * d - ry * 0.1) - 1;
        const k = kies(y < cy - ry * 0.2);
        rect(ctx, x + 1, y, 2, 1, k); rect(ctx, x, y + 1, 4, 1, k); rect(ctx, x + 1, y + 2, 3, 1, tint(k, -1));
        px(ctx, x + 1, y, tint(k, 1)); px(ctx, x + 3, y + 2, tint(k, -2));
      }
    };
    if (s === 'lente') {
      // bloesem: frisgroene kruin met trosjes roze (kers) of wit (krentenboompje: kl blad.3)
      basis(ctx, cx, cy, rx, ry, 'blad.3', zaad);
      const wit = kl === 'blad.3';
      plukjes(Math.round(rx * ry / 9), boven => wit ? (boven ? 'creme.3' : 'creme.2') : r() < 0.25 ? 'creme.3' : boven ? 'koraal.4' : 'koraal.3');
      return;
    }
    // herfst: oranje kruin met rode en gele plukken en een paar losse blaadjes eronder
    basis(ctx, cx, cy, rx, ry, 'abrikoos.2', zaad);
    plukjes(Math.round(rx * ry / 5), boven => { const q = r(); return q < 0.35 ? (boven ? 'goud.3' : 'goud.2') : q < 0.65 ? 'koraal.2' : boven ? 'abrikoos.3' : 'abrikoos.1'; });
    for (let i = 0; i < 6; i++) px(ctx, Math.round(cx + (r() - 0.5) * rx * 2), Math.round(cy + ry + 2 + r() * ry * 0.8), r() < 0.5 ? 'koraal.2' : 'goud.3');
  }
  // Kale winterboom: vier tot zes hoofdtakken met zijtakjes binnen de kruin; sneeuw op de bovenkant van de takken.
  function kaal(ctx, cx, cy, rx, ry, zaad, laag) {
    const r = rng(zaad + 7), punten = [];
    const lijn = (x0, y0, x1, y1, dik, kl) => {
      const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
      for (let i = 0; i <= n; i++) {
        const x = Math.round(x0 + (x1 - x0) * i / n), y = Math.round(y0 + (y1 - y0) * i / n);
        rect(ctx, x, y, dik, 1, kl); punten.push([x, y, dik]);
      }
    };
    const voet = [cx, Math.round(cy + ry * 0.75)];
    const n = 4 + Math.floor(r() * 3);
    for (let i = 0; i < n; i++) {
      const hoek = -Math.PI / 2 + (i / (n - 1) - 0.5) * 2.2 + (r() - 0.5) * 0.3;
      const ex = cx + Math.cos(hoek) * rx * (0.75 + r() * 0.25), ey = cy + Math.sin(hoek) * ry * (0.75 + r() * 0.25) - ry * 0.1;
      lijn(voet[0], voet[1], ex, ey, 2, 'koffie.2');
      for (let j = 0; j < 3; j++) {
        const f = 0.35 + j * 0.2 + r() * 0.1, bx = voet[0] + (ex - voet[0]) * f, by = voet[1] + (ey - voet[1]) * f;
        const h2 = hoek + (r() < 0.5 ? -1 : 1) * (0.5 + r() * 0.4), l = rx * (0.22 + r() * 0.2);
        lijn(bx, by, bx + Math.cos(h2) * l, by + Math.sin(h2) * l * (ry / rx), 1, 'koffie.3');
      }
    }
    for (const [x, y, dik] of punten) if (dik === 2) px(ctx, x, y, 'koffie.3');       // lichte kant van de hoofdtakken
    if (laag) {
      const kans = [0, 0.3, 0.6, 0.85][laag], rs = rng(zaad + 9);
      for (const [x, y, dik] of punten) if (rs() < kans) rect(ctx, x, y - 1, dik, 1, 'creme.4');
    }
  }

  // Borders: lente tulpen en narcissen, zomer de volle mix, herfst een paar late asters tussen uitgebloeide stengels,
  // winter alleen wat droge stengels.
  function bloemen(ctx, a, b, g, zaad, basis, s) {
    if (s === 'lente') return basis(ctx, a, b, g, zaad, ['koraal.2', 'goud.3', 'creme.4', 'lavendel.3', 'koraal.3', 'goud.4']);
    if (s === 'zomer') return basis(ctx, a, b, g, zaad);
    const r = rng(zaad);
    for (let x = a; x < b; x += 4 + Math.floor(r() * 6)) {
      const h = 3 + Math.floor(r() * 6);
      rect(ctx, x, g - h, 1, h, s === 'winter' ? 'koffie.3' : 'mos.1');
      if (s === 'herfst' && r() < 0.35) { rect(ctx, x - 1, g - h - 2, 3, 2, r() < 0.5 ? 'lavendel.2' : 'goud.2'); px(ctx, x, g - h - 2, 'goud.4'); }
      else if (r() < 0.4) px(ctx, x, g - h - 1, s === 'winter' ? 'koffie.2' : 'koffie.3');
    }
  }
  // Grond (het maaiveld en het gazon van de tuin): blad en bladhopen in de herfst, madeliefjes in de lente, rijp in
  // de winter, plassen bij regen en een sneeuwdeken. y = bovenkant van de grond.
  function grond(ctx, x0, y, b, zaad, o, dd) {
    const r = rng((zaad || 13) + 3), s = o.seizoen;
    if (s === 'herfst' && o.sneeuw < 2) {
      for (let i = 0; i < b / 5; i++) rect(ctx, x0 + Math.floor(r() * b), y - (r() < 0.5 ? 1 : 0), 2, 1, ['koraal.2', 'abrikoos.2', 'goud.2', 'abrikoos.3', 'koffie.3'][Math.floor(r() * 5)]);
      for (let x = x0 + 30 + Math.floor(r() * 80); x < x0 + b - 30; x += 150 + Math.floor(r() * 120)) bladhoop(ctx, x, y, 14 + Math.floor(r() * 8), r);
    }
    if (s === 'lente' && !o.sneeuw) {
      for (let i = 0; i < b / 14; i++) { const x = x0 + Math.floor(r() * b); px(ctx, x, y - 2, 'creme.4'); px(ctx, x + 1, y - 2, 'goud.3'); px(ctx, x, y - 1, 'blad.1'); }
    }
    if (s === 'winter' && !o.sneeuw) dither(ctx, x0, y - 2, b, 3, 'creme.3', 3);       // rijp op het gras
    if (o.regen) {
      for (let x = x0 + 20 + Math.floor(r() * 60); x < x0 + b - 26; x += 90 + Math.floor(r() * 110)) {
        const w = 10 + Math.floor(r() * 14);
        rect(ctx, x, y, w, 2, 'petrol.2'); rect(ctx, x + 1, y, w - 2, 1, 'petrol.3');
        rect(ctx, x + 2, y, Math.round(w / 3), 1, 'petrol.4'); px(ctx, x + w - 4, y, 'creme.4');
      }
    }
    if (o.sneeuw) deken(ctx, x0, y, b, o.sneeuw, r);
  }
  // Bladhoop: halve ovaal van bruin blad met rode, oranje en gele plukjes.
  function bladhoop(ctx, cx, y, w, r) {
    const h = Math.round(w * 0.38);
    for (let j = 0; j < h; j++) {
      const hw = Math.round(w / 2 * Math.sqrt(1 - (j / h) ** 2));
      rect(ctx, cx - hw, y - 1 - j, 2 * hw, 1, j === h - 1 ? 'abrikoos.2' : 'abrikoos.1');
    }
    for (let i = 0; i < w * h / 3; i++) {
      const j = Math.floor(r() * h), hw = Math.round(w / 2 * Math.sqrt(1 - (j / h) ** 2));
      if (hw > 0) px(ctx, cx - hw + Math.floor(r() * 2 * hw), y - 1 - j, ['koraal.2', 'goud.3', 'abrikoos.3', 'koffie.3', 'koraal.3'][Math.floor(r() * 5)]);
    }
  }
  // Sneeuwdeken op de grond: poedertje = dambord, laagje = 2 artpx, dik pak = 3-4 artpx met een golvende bovenkant.
  function deken(ctx, x0, y, b, laag, r) {
    if (laag === 1) { dither(ctx, x0, y - 1, b, 2, 'creme.4'); dither(ctx, x0, y - 2, b, 1, 'creme.4', 3); return; }
    const t = laag === 2 ? 2 : 3;
    let golf = 0;
    for (let x = x0; x < x0 + b; x++) {
      if (r() < 0.12) golf = laag === 3 ? Math.floor(r() * 2) : 0;
      const h = t + golf;
      rect(ctx, x, y - h, 1, h + 2, 'creme.4');
      if ((x & 1) === 0) px(ctx, x, y + 2, 'petrol.4');
    }
  }

  // ---------- sneeuw op alles wat bovenaan open ligt (daken, hagen, kruinen, dakkapellen, schoorsteen) ----------
  // Werkt op een los canvas met alleen de voorgrond (zonder lucht): een dichte pixel met een lege pixel erboven is
  // een bovenkant. Op elk stuk bovenkant van minstens 2 breed komt sneeuw. Onder grensY (het maaiveld, dat heeft een
  // eigen deken) en in de uitsluit-vakken (onder een overkapping of carportdak) niet.
  function sneeuwRanden(ctx, W, Hh, laag, grensY, uitsluit) {
    if (!laag || !W || !Hh) return;
    const d = ctx.getImageData(0, 0, W, Hh), a = d.data, wit = rgb('creme.4'), blauw = rgb('petrol.4'), licht = rgb('creme.3');
    const dicht = (x, y) => a[(y * W + x) * 4 + 3] >= 200;
    const zet = (x, y, c) => { const i = (y * W + x) * 4; a[i] = c[0]; a[i + 1] = c[1]; a[i + 2] = c[2]; a[i + 3] = 255; };
    const weg = (x, y) => uitsluit.some(([x0, y0, x1, y1]) => x >= x0 && x < x1 && y >= y0 && y < y1);
    const t = [0, 1, 2, 3][laag], r = rng(17);
    for (let y = 2; y < Math.min(Hh, grensY); y++) {
      let x = 0;
      while (x < W) {
        if (!(dicht(x, y) && !dicht(x, y - 1)) || weg(x, y)) { x++; continue; }
        let e = x;
        while (e < W && dicht(e, y) && !dicht(e, y - 1)) e++;
        if (e - x >= 1) {
          for (let xx = x; xx < e; xx++) {
            const rand = xx === x || xx === e - 1, h = laag === 1 ? 1 : Math.max(1, t - (rand ? 1 : 0) + (laag === 3 && r() < 0.25 ? 1 : 0));
            if (laag === 1) { if ((xx + y) & 1) zet(xx, y - 1, wit); else zet(xx, y, licht); continue; }
            for (let j = 1; j <= h && y - j >= 0 && !dicht(xx, y - j); j++) zet(xx, y - j, j === 1 && (xx & 1) ? blauw : wit);
          }
        }
        x = e;
      }
    }
    ctx.putImageData(d, 0, 0);
  }
  // Sneeuw op een pannendak (vooraanzicht): per rij pannen ligt er sneeuw op de bovenste lijnen, de onderkant van
  // elke rij blijft zichtbaar. Poedertje: een dambordje; laagje: 5 van de 8 lijnen; dik pak: bijna het hele vlak.
  function dakSneeuw(ctx, d, stap, n, laag) {
    const r = rng(d.x + 3);
    for (let j = 2; j < n * 8; j++) {
      const kk = j % 8, yy = d.y - 1 - j;
      const xl = Math.round(d.x - 8 + stap * j / 8) + 3, xr = Math.round(d.x + d.b + 8 - stap * j / 8) - 3;
      if (xr <= xl) continue;
      if (laag === 1) { if (kk >= 5) dither(ctx, xl, yy, xr - xl, 1, 'creme.4', kk === 7 ? 2 : 3); continue; }
      // kk 0 = onderrand van een rij pannen: blijft grotendeels zichtbaar (gebroken lijn), kk 1 = schaduw onder de sneeuw
      if (kk >= 2) { rect(ctx, xl, yy, xr - xl, 1, 'creme.4'); continue; }
      const kans = kk === 1 ? (laag === 2 ? 0.55 : 0.8) : (laag === 2 ? 0.25 : 0.5);
      for (let x = xl; x < xr;) {
        const l = 2 + Math.floor(r() * 6);
        if (r() < kans) rect(ctx, x, yy, Math.min(l, xr - x), 1, kk === 1 && r() < 0.5 ? 'petrol.4' : 'creme.4');
        x += l;
      }
    }
  }
  function rgb(naam) { const n = parseInt(P.kleur(naam).slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }

  // ---------- ramen: druppels op het glas, sneeuw op de buitenvensterbank ----------
  function raam(ctx, x, y, b, h, dd) {
    const st = dd.omg;
    if (!st) return;
    const r = rng(x * 7 + y * 3);
    if (st.weer.type === 'regen') {
      for (let i = 0; i < b * h / 70; i++) {
        const xx = x + 1 + Math.floor(r() * (b - 2)), yy = y + 1 + Math.floor(r() * (h - 4));
        if (r() < 0.4) { ctx.globalAlpha = 0.45; rect(ctx, xx, yy - 3 - Math.floor(r() * 5), 1, 3 + Math.floor(r() * 4), 'creme.4'); ctx.globalAlpha = 1; }
        px(ctx, xx, yy, 'creme.4'); px(ctx, xx, yy + 1, dd.id === 'nacht' ? 'titel.4' : 'petrol.3');
      }
    }
    const laag = st.sneeuwlaag || 0;
    if (laag) {
      const t = [0, 1, 2, 3][laag];
      for (let i = 0; i < b; i++) {
        const hh = Math.max(1, t - ((i < 2 || i >= b - 2) ? 1 : 0) + (laag === 3 && (i * 7) % 5 === 0 ? 1 : 0));
        rect(ctx, x + i, y + h - hh, 1, hh, 'creme.4');
        if (laag > 1 && (i & 1)) px(ctx, x + i, y + h - 1, 'petrol.4');
      }
      if (st.weer.type === 'sneeuw') for (let i = 0; i < b * h / 120; i++) px(ctx, x + Math.floor(r() * b), y + Math.floor(r() * (h - t - 1)), 'creme.4');
    }
  }

  // ---------- events op het decor: lampjes aan de gevel en een slinger in de woonkamer (Kerst) ----------
  const woonkamer = geo => geo.kamers.find(k => k.type === 'woonkamer') || geo.kamers.find(k => k.type === 'woonkeuken') ||
    geo.kamers.find(k => !k.buiten && !k.trap);
  const LAMPJES = ['koraal.3', 'goud.4', 'blad.4', 'lavendel.4', 'abrikoos.3'];
  function naDecor(ctx, geo, dd, lichten) {
    const st = dd.omg;
    if (!st || !st.events.includes('kerst')) return;
    const aan = !!dd.lampen;
    // lampjessnoer onder de dakrand van elk dakstuk, in boogjes van 12 artpx
    for (const d of geo.daken) {
      const a = d.x - 6, e = d.x + d.b + 6, y0 = d.y + 1;
      for (let x = a, i = 0; x < e; x++) {
        const f = ((x - a) % 12) / 12, y = y0 + Math.round(Math.sin(f * Math.PI) * 3);
        px(ctx, x, y, 'nacht.1');
        if ((x - a) % 12 === 6) {
          const kl = LAMPJES[i++ % LAMPJES.length];
          rect(ctx, x, y + 1, 1, 2, aan ? kl : tint(kl, -2)); if (aan) px(ctx, x, y + 1, 'creme.4');
          if (aan) lichten.push({ x, y: y + 2, r: 5, kleur: kl });
        }
      }
    }
    // slinger van dennengroen met kerstballen onder het plafond van de woonkamer
    const k = woonkamer(geo);
    if (!k) return;
    const r = rng(k.x);
    for (let x = k.x + 4; x < k.x + k.b - 4; x++) {
      const f = ((x - k.x - 4) % 48) / 48, y = k.y + 4 + Math.round(Math.sin(f * Math.PI) * 7);
      rect(ctx, x, y, 1, 3, r() < 0.5 ? 'blad.1' : 'blad.0'); if (r() < 0.4) px(ctx, x, y - 1, 'blad.2');
      if (r() < 0.2) px(ctx, x, y + 1, 'blad.2');
      if ((x - k.x - 4) % 24 === 12) { rect(ctx, x - 1, y + 3, 3, 3, (x >> 3) & 1 ? 'koraal.2' : 'goud.3'); px(ctx, x - 1, y + 3, 'creme.4'); }
    }
  }

  // ---------- event-sprites (in code getekend, met de silhouet-outline van de meubels) ----------
  // Maat in artpx; anker middenonder. aan = lampjes branden. lichten: punten voor de lichtlaag ('s avonds).
  function doek(w, h) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    return [c, ctx];
  }
  function kerstboom(aan) {
    // ~160 cm (72 artpx) in een rode pot; past achter een bank of tussen twee meubels
    const [c, ctx] = doek(32, 72), lichten = [], r = rng(5), m = 16;
    rect(ctx, 10, 63, 12, 9, 'bordeaux.2'); rect(ctx, 9, 62, 14, 2, 'bordeaux.3'); rect(ctx, 19, 64, 3, 8, 'bordeaux.1');
    rect(ctx, 10, 66, 12, 1, 'goud.2'); rect(ctx, 14, 58, 4, 4, 'koffie.2'); px(ctx, 14, 58, 'koffie.3');
    // drie lagen dennengroen met een gekartelde onderrand; schaduw rechts, licht links
    for (const [top, h, w0, w1] of [[5, 21, 3, 18], [17, 23, 6, 26], [31, 27, 9, 32]]) {
      for (let j = 0; j < h; j++) {
        const w = Math.round(w0 + (w1 - w0) * j / h), x = m - Math.round(w / 2), y = top + j;
        rect(ctx, x, y, w, 1, 'blad.1');
        rect(ctx, x + Math.round(w * 0.62), y, Math.ceil(w * 0.38), 1, 'blad.0');
        rect(ctx, x, y, Math.max(1, Math.round(w * 0.22)), 1, 'blad.2');
      }
      for (let x = m - Math.round(w1 / 2); x < m + Math.round(w1 / 2); x += 4) rect(ctx, x, top + h, 2, 1, x < m ? 'blad.1' : 'blad.0');
      for (let i = 0; i < w1; i++) px(ctx, m - Math.round(w1 / 2) + Math.floor(r() * w1), top + Math.floor(h * 0.4 + r() * h * 0.55), r() < 0.5 ? 'blad.3' : 'blad.2');
    }
    // gouden slinger, ballen en lampjes
    for (const [y0, x0, x1] of [[16, 10, 22], [30, 7, 26], [46, 5, 28]]) for (let x = x0; x < x1; x += 2) px(ctx, x, y0 + Math.round((x - x0) * 0.35), 'goud.3');
    const ballen = [[13, 22, 'koraal.2'], [19, 33, 'goud.3'], [9, 39, 'lavendel.2'], [22, 51, 'koraal.2'], [8, 55, 'petrol.3'], [15, 44, 'goud.3'], [24, 41, 'petrol.3']];
    for (const [x, y, kl] of ballen) { rect(ctx, x, y, 3, 3, kl); px(ctx, x, y, 'creme.4'); px(ctx, x + 2, y + 2, tint(kl, -1)); }
    const lampjes = [[16, 12], [11, 19], [19, 27], [9, 32], [23, 37], [14, 40], [7, 49], [18, 50], [26, 55], [11, 57], [21, 59]];
    for (const [x, y] of lampjes) {
      px(ctx, x, y, aan ? 'goud.4' : 'creme.2');
      if (aan) { px(ctx, x, y - 1, 'creme.4'); lichten.push({ x, y, r: 6 }); }
    }
    P.omlijn(c);
    // ster in de top (na de outline, zodat hij blijft glanzen)
    rect(ctx, 15, 0, 2, 6, 'goud.3'); rect(ctx, 13, 2, 6, 2, 'goud.3'); px(ctx, 15, 1, 'goud.4'); px(ctx, 16, 2, 'creme.4');
    if (aan) lichten.push({ x: 16, y: 36, r: 26 });
    return { canvas: c, w: 32, h: 72, lichten };
  }
  function schoen() {
    // leren schoen met een wortel voor het paard van Sinterklaas
    const [c, ctx] = doek(18, 14);
    for (let i = 0; i < 7; i++) { rect(ctx, 5 + i, 2 + i, 2, 1, 'abrikoos.2'); px(ctx, 6 + i, 3 + i, 'abrikoos.1'); }
    rect(ctx, 3, 0, 3, 1, 'blad.2'); rect(ctx, 4, 1, 2, 1, 'blad.1'); px(ctx, 2, 1, 'blad.3'); px(ctx, 6, 0, 'blad.3');
    rect(ctx, 1, 5, 7, 7, 'bordeaux.2'); rect(ctx, 1, 8, 16, 4, 'bordeaux.2'); rect(ctx, 12, 9, 5, 2, 'bordeaux.2');
    rect(ctx, 2, 5, 5, 1, 'bordeaux.0'); rect(ctx, 2, 6, 1, 5, 'bordeaux.3'); rect(ctx, 8, 8, 8, 1, 'bordeaux.3');
    rect(ctx, 14, 10, 3, 1, 'bordeaux.1'); px(ctx, 9, 9, 'creme.3'); px(ctx, 11, 9, 'creme.3');
    rect(ctx, 1, 12, 17, 2, 'koffie.1'); rect(ctx, 1, 12, 4, 1, 'koffie.2');
    P.omlijn(c);
    return { canvas: c, w: 18, h: 14, lichten: [] };
  }
  function pepernoten() {
    const [c, ctx] = doek(14, 8);
    const r = rng(3);
    for (let i = 0; i < 9; i++) { const x = 2 + Math.floor(r() * 9), y = 1 + Math.floor(r() * 2); rect(ctx, x, y, 2, 2, r() < 0.5 ? 'eik.2' : 'hazelnoot.2'); px(ctx, x, y, 'eik.3'); }
    rect(ctx, 0, 3, 14, 2, 'creme.4'); rect(ctx, 1, 5, 12, 1, 'creme.3'); rect(ctx, 2, 6, 10, 1, 'creme.2'); rect(ctx, 4, 7, 6, 1, 'creme.1');
    rect(ctx, 1, 4, 12, 1, 'koraal.3');
    P.omlijn(c);
    return { canvas: c, w: 14, h: 8, lichten: [] };
  }
  // Doek over het vogelstokje ('s nachts): een klokvorm met plooien en een gouden zoom.
  function nachtdoek() {
    // Theedoek over het stokje: ligt over de stok en hangt aan twee kanten af in punten (links langer),
    // wit met rode banen en plooien. Geen lampenkap-vorm: plat bovenop, scheve slippen.
    const W = 22, Hd = 20, [c, ctx] = doek(W, Hd);
    const rij = (j, a, e) => { for (let x = a; x <= e; x++) px(ctx, x, j, (x === 6 || x === 12 || x === 17) && j > 4 ? 'creme.2' : 'creme.4'); };
    rij(1, 6, 15); rij(2, 3, 18);
    for (let j = 3; j < 11; j++) rij(j, 2, 19);
    for (let j = 11; j < 15; j++) { rij(j, 2, 9 - (j - 11)); rij(j, 13 + (j - 11), 19); }
    for (let j = 15; j < 19; j++) rij(j, 2 + (j - 15), 6 - Math.floor((j - 15) / 2));
    rij(15, 17, 19); rij(16, 18, 19);
    for (let x = 2; x <= 19; x++) { px(ctx, x, 5, 'koraal.2'); if (x <= 9 || x >= 14) px(ctx, x, 12, 'koraal.2'); }
    for (let x = 2; x <= 19; x++) px(ctx, x, 6, 'koraal.3');
    P.omlijn(c);
    return { canvas: c, w: W, h: Hd, lichten: [] };
  }
  function sprite(soort, aan) {
    if (soort === 'kerstboom') return kerstboom(aan);
    if (soort === 'schoen') return schoen();
    if (soort === 'pepernoten') return pepernoten();
    if (soort === 'doek') return nachtdoek();
    return null;
  }

  return { dagdeel, raam, naDecor, sneeuwRanden, dakSneeuw, sprite, woonkamer, LUCHT, FASENAAM, WEERNAAM };
})(window.PQ_HUIS, window.PQ_PIX, window.PQ_HUISBUITEN);
