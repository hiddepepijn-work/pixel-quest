// Beweging, deel 1: procedurele animatieframes uit de BESTAANDE pixels van de goedgekeurde figuren. Er wordt niets
// nieuw getekend: een frame is het oorspronkelijke sprite waarin stukken (benen, poten, staart, kop, vleugel, oog)
// per rij of per kolom over hele artpx verschoven zijn. Gezichten, silhouetten, kleuren en verhoudingen blijven dus
// gelijk. Frames worden één keer gemaakt per sprite (en per look bij de mensen) en gecachet op offscreen-canvassen.
// Leest PQ_MANIFEST, PQ_BEWEGING (assets/beweging.js), PQ_FIGUUR en PQ_KLEDING. Gedrag: huis-anim-gedrag.js.
window.PQ_HUISANIM = (function (MAN, BW, F, D) {
  'use strict';
  const ASSETS = '../assets/';
  function doek(w, h) {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h));
    const x = c.getContext('2d');
    x.imageSmoothingEnabled = false;
    return [c, x];
  }
  const klem = (v, a, b) => Math.max(a, Math.min(b, v));

  // ---------- rasterbewerkingen (native artpx -> bronpixels via m = { sx, ox, sy, oy }) ----------
  const BX = (m, x) => Math.round(m.ox + m.sx * x), BY = (m, y) => Math.round(m.oy + m.sy * y);
  // Verschuiving in artpx naar hele bronpixels; overal dezelfde afronding, zodat romp en delen naadloos aansluiten.
  const OX = (m, d) => Math.round(d * m.sx), OY = (m, d) => Math.round(d * m.sy);
  // bereik(y) (optioneel): per artrij de kolommen [x0, x1) van een deel (een been met een schuine beenscheiding).
  function wis(ctx, m, r, bereik) {
    if (!bereik) { const x = BX(m, r[0]), y = BY(m, r[1]); ctx.clearRect(x, y, BX(m, r[2]) - x, BY(m, r[3]) - y); return; }
    for (let y = r[1]; y < r[3]; y++) {
      const [a, b] = bereik(y), x = BX(m, a), yy = BY(m, y);
      ctx.clearRect(x, yy, BX(m, b) - x, BY(m, y + 1) - yy);
    }
  }
  // Rijen van r = [x0, y0, x1, y1] verschuiven. f(t, i) -> [dx, dy] in artpx (t: 0 = bovenste rij, 1 = onderste).
  // Rekt een stuk uit, dan wordt een rij herhaald; valt het samen, dan valt een rij weg (knie, nek). Alles in hele
  // artpx, zodat het pixelraster van het blad blijft staan.
  function rijen(ctx, src, m, r, f, bereik) {
    const [x0, y0, x1, y1] = r, n = y1 - y0, off = [];
    for (let i = 0; i < n; i++) off.push(f(n > 1 ? i / (n - 1) : 1, i).map(Math.round));
    const start = i => BY(m, y0 + i) + OY(m, off[i][1]);
    for (let i = 0; i < n; i++) {
      const sy = BY(m, y0 + i), sh = BY(m, y0 + i + 1) - sy, dy = start(i), eind = i + 1 < n ? start(i + 1) : dy + sh;
      if (eind <= dy) continue;
      const [a, b] = bereik ? bereik(y0 + i) : [x0, x1], sx = BX(m, a), sw = BX(m, b) - sx;
      if (sw > 0) ctx.drawImage(src, sx, sy, sw, sh, sx + OX(m, off[i][0]), dy, sw, eind - dy);
    }
  }
  // Kolommen van r verschuiven (golf door een staart of lijf). f(t, i) -> [dx, dy]; t: 0 = linkerkolom, 1 = rechter.
  function kolommen(ctx, src, m, r, f) {
    const [x0, y0, x1, y1] = r, n = x1 - x0, sy = BY(m, y0), sh = BY(m, y1) - sy;
    for (let i = 0; i < n; i++) {
      const [dx, dy] = f(n > 1 ? i / (n - 1) : 1, i).map(Math.round);
      const sx = BX(m, x0 + i), sw = BX(m, x0 + i + 1) - sx;
      ctx.drawImage(src, sx, sy, sw, sh, sx + OX(m, dx), sy + OY(m, dy), sw, sh);
    }
  }
  // Binnen r verschuiven en afknippen op r (een pupil in het oog): de vrijgekomen rand houdt de oude pixels.
  function knip(ctx, src, m, r, dx, dy, gx, gy) {
    const sx = BX(m, r[0]), sy = BY(m, r[1]), w = BX(m, r[2]) - sx, h = BY(m, r[3]) - sy;
    ctx.save();
    ctx.beginPath(); ctx.rect(sx + OX(m, gx), sy + OY(m, gy), w, h); ctx.clip();
    ctx.drawImage(src, sx, sy, w, h, sx + OX(m, dx + gx), sy + OY(m, dy + gy), w, h);
    ctx.restore();
  }
  function tekenDeel(x, src, m, d) {
    if (d.soort === 'kol') kolommen(x, src, m, d.rect, d.f);
    else if (d.soort === 'knip') knip(x, src, m, d.rect, d.dx, d.dy, d.gx || 0, d.gy || 0);
    else rijen(x, src, m, d.rect, d.f, d.bereik);
  }
  // Eén frame: delen achter de romp (staart), de romp = het sprite zonder de bewegende delen (met een verschuiving
  // in artpx, de deining), dan de delen ervoor (poten, kop) in volgorde. ws < 1: verkleind (zachte pets).
  const [rompC, rompX] = doek(1, 1);
  function frame(src, m, delen, romp, ws) {
    const w = src.width || src.naturalWidth, h = src.height || src.naturalHeight;
    rompC.width = w; rompC.height = h;
    rompX.clearRect(0, 0, w, h); rompX.drawImage(src, 0, 0);
    for (const d of delen) if (d.soort !== 'knip') wis(rompX, m, d.rect, d.bereik);
    const [c, x] = doek(w, h);
    for (const d of delen) if (d.laag === 'achter') tekenDeel(x, src, m, d);
    x.drawImage(rompC, OX(m, romp ? romp[0] : 0), OY(m, romp ? romp[1] : 0));
    for (const d of delen) if (d.laag !== 'achter') tekenDeel(x, src, m, d);
    if (!ws || ws >= 1) return c;
    const [k, kx] = doek(w * ws, h * ws);
    kx.imageSmoothingEnabled = true; kx.imageSmoothingQuality = 'high';
    kx.drawImage(c, 0, 0, k.width, k.height);
    return k;
  }
  // Snelle vingerafdruk van een figuur-canvas (cache per look).
  function vingerafdruk(c) {
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    let h = 2166136261;
    for (let i = 0; i < d.length; i += 28) h = Math.imul(h ^ d[i] ^ (d[i + 1] << 8) ^ (d[i + 3] << 16), 16777619);
    return c.width + 'x' + c.height + ':' + (h >>> 0);
  }

  // ---------- loopcyclus (gedeeld door mensen en viervoeters) ----------
  // pas = staplengte in artpx; N = 2 x pas frames. De voet op de grond schuift per frame precies 1 artpx terug, en
  // het gedrag schuift het lichaam per frame 1 artpx vooruit: zo staat die voet stil ten opzichte van de vloer.
  function voetStand(i, pas, til, groep) {
    const j = (i + (groep ? pas : 0)) % (2 * pas);
    if (j < pas) return { dx: pas / 2 - j, til: 0 };                 // op de grond: van voor naar achter
    const k = j - pas;                                                // zwaaien: van achter naar voor, opgetild
    return { dx: -pas / 2 + k, til: Math.round(til * Math.sin(Math.PI * (k + 0.5) / pas)) };
  }
  // Deining: hoog in de passeerfase (de zwaaivoet komt langs de standvoet).
  const deining = (i, pas, hoog) => { const j = i % pas, mid = Math.floor(pas / 2); return j === mid - 1 || j === mid ? hoog : 0; };

  // ---------- mensen ----------
  // Heup, kruis, enkel en beenscheiding uit de zonekaart (native 64 x 112): de broek begint op de heup, de schoenen op
  // de enkel; de beenscheiding is de kolom met de minste dekking tussen de benen.
  const maatCache = {};
  function meetMens(fid) {
    if (maatCache[fid]) return maatCache[fid];
    const s = F.SPR[fid].native, Z = D.zones, B = Z.indexOf('broek'), S = Z.indexOf('schoenen'), L = Z.indexOf('lijn');
    let heup = 1e9, enkel = 1e9, voet = 0, x0 = 1e9, x1 = 0;
    for (let y = 0; y < s.h; y++) for (let x = 0; x < s.w; x++) {
      const i = y * s.w + x;
      if (!s.px[i * 4 + 3]) continue;
      voet = Math.max(voet, y);
      if (s.zone[i] === B) { heup = Math.min(heup, y); x0 = Math.min(x0, x); x1 = Math.max(x1, x); }
      if (s.zone[i] === S) enkel = Math.min(enkel, y);
    }
    const vol = (x, y) => { const i = y * s.w + x; return s.px[i * 4 + 3] > 0 && s.zone[i] !== L; };
    // Beenscheiding per rij, van de voeten omhoog: het midden van de strook zonder stof (leeg of alleen outline)
    // tussen de benen, die het dichtst bij de scheiding van de rij eronder ligt. Zo volgt de scheiding ook benen die
    // schuin staan. Boven het kruis loopt de broek door; daar geldt de scheiding van het kruis.
    const stroken = y => {
      let l = s.w, rr = -1;
      for (let x = 0; x < s.w; x++) if (s.px[(y * s.w + x) * 4 + 3]) { l = Math.min(l, x); rr = x; }
      const uit = [];
      let a = -1;
      for (let x = l; x <= rr + 1; x++) {
        if (x <= rr && !vol(x, y)) { if (a < 0) a = x; } else if (a >= 0) { uit.push((a + x - 1) / 2); a = -1; }
      }
      return uit;
    };
    const split = {};
    // Begin bij de enkel: de zolen eronder zijn alleen outline, daar geldt de scheiding van de enkel.
    const y0 = Math.min(enkel, voet - 4);
    let vorige = (x0 + x1) / 2, kruis = y0;
    for (let y = y0; y >= heup; y--) {
      const g = stroken(y).filter(mx => Math.abs(mx - vorige) <= (y === y0 ? 6 : 3)).sort((a, b) => Math.abs(a - vorige) - Math.abs(b - vorige));
      if (!g.length) break;
      vorige = g[0]; split[y] = Math.round(g[0] + 0.5); kruis = y;
    }
    const c = split[kruis] != null ? split[kruis] : Math.round((x0 + x1) / 2);
    const scheiding = y => (split[y] != null ? split[y] : y > y0 && split[y0] != null ? split[y0] : c);
    const draai = Math.max(heup + 6, kruis - 5);
    return (maatCache[fid] = { heup, kruis, draai, enkel: Math.min(enkel, voet - 3), voet, c, scheiding });
  }
  // Frames voor Hidde of Tessie uit het samengestelde figuur (lichaam met alle kledinglagen, op bronschaal).
  // Benen: van het draaipunt onder de heup tot de enkel schuin (rij per rij), de schoen eronder blijft heel en tilt
  // als één stuk op. Het been aan de kant tegenover de kijkrichting staat vooraan en wordt als laatste getekend.
  // Handen in de zakken: geen armzwaai. Resultaat: { loop: [N], adem: [2], pas, N, kijk }.
  const mensCache = new Map();
  function mens(fid, figuur) {
    const sleutel = fid + '|' + vingerafdruk(figuur);
    if (mensCache.has(sleutel)) return mensCache.get(sleutel);
    const P = BW.mensen, eigen = P[fid] || {}, mt = meetMens(fid), m = D.characters[fid].native_naar_bron;
    const kijk = eigen.kijk || D.characters[fid].kijkrichting, r = kijk === 'links' ? -1 : 1;
    const pas = P.pas, N = 2 * pas, W = F.SPR[fid].native.w;
    const benen = [[0, mt.draai, mt.c, mt.voet + 1], [mt.c, mt.draai, W, mt.voet + 1]];
    const bereik = [y => [0, mt.scheiding(y)], y => [mt.scheiding(y), W]];
    const voor = r > 0 ? 0 : 1, achter = 1 - voor;                    // index van het voorste been in benen[]
    const tVan = y => klem((y - mt.draai) / Math.max(1, mt.enkel - mt.draai), 0, 1);
    const been = (b, st, bob) => ({ rect: benen[b], bereik: bereik[b], f: (t, i) => { const tt = tVan(mt.draai + i); return [r * st.dx * tt, -bob * (1 - tt) - st.til * tt]; } });
    const loop = [];
    for (let i = 0; i < N; i++) {
      const bob = deining(i, pas, P.deining);
      const st = [voetStand(i, pas, P.til, 0), voetStand(i, pas, P.til, 1)];
      loop.push(frame(figuur, m, [been(achter, st[achter], bob), been(voor, st[voor], bob)], [0, -bob]));
    }
    const rust = { dx: 0, til: 0 };
    const adem = [frame(figuur, m, [], [0, 0]),
      frame(figuur, m, [been(achter, rust, P.adem), been(voor, rust, P.adem)], [0, -P.adem])];
    const uit = { loop, adem, pas, N, kijk, eenheid: 1 };
    if (mensCache.size > 12) mensCache.clear();
    mensCache.set(sleutel, uit);
    return uit;
  }

  // ---------- pets ----------
  // Bronbeelden vooraf laden (laad()); frames per pet en per schaal (sc = schermpx per bronpixel).
  const beeld = {};
  function laad() {
    const ids = Object.keys(BW.pets);
    return Promise.all(ids.map(id => new Promise(ok => {
      const a = MAN.assets.find(x => x.id === id);
      if (!a) return ok();
      const img = new Image();
      img.onload = () => { beeld[id] = img; ok(); };
      img.onerror = () => ok();
      img.src = ASSETS + a.bestanden.bron;
    })));
  }
  const petCache = new Map();
  // Werkschaal: groot genoeg om scherp te blijven (2 x de schermschaal), nooit groter dan de bron.
  const werkschaal = sc => (sc < 0.35 ? Math.min(1, sc * 2) : 1);
  function pet(id, sc) {
    const def = BW.pets[id], img = beeld[id], a = MAN.assets.find(x => x.id === id);
    if (!def || !img || !a) return null;
    const sleutel = id + '|' + sc.toFixed(4);
    if (petCache.has(sleutel)) return petCache.get(sleutel);
    const k = a.bronpx_per_artpixel, m = { sx: k, ox: 0, sy: k, oy: 0 }, ws = werkschaal(sc);
    const maker = MAKERS[def.soort];
    const uit = Object.assign({ soort: def.soort, kijk: def.kijk, ws, w: img.naturalWidth, h: img.naturalHeight },
      maker ? maker(img, m, def, ws) : { rust: [frame(img, m, [], null, ws)] });
    petCache.set(sleutel, uit);
    return uit;
  }

  // Hoofd of kop zakken zonder het gezicht te vervormen: alleen de onderste (nek)rijen vallen samen.
  const nek = (dip, n, i) => { const nk = dip + 3; return i < n - nk ? dip : dip * (n - 1 - i) / nk; };
  const kopDeel = (rect, dip, gx = 0, gy = 0) => ({ rect, f: (t, i) => [gx, gy + nek(dip, rect[3] - rect[1], i)] });
  // Staart vast aan de onderkant (punt boven) of zijkant: hoe verder van de basis, hoe groter de uitslag.
  function staartDeel(s, uitslag, gy) {
    if (s.basis === 'onder') return { rect: s.rect, laag: 'achter', f: t => [uitslag * (1 - t), gy] };
    const punt = s.basis === 'links' ? (t => t) : (t => 1 - t);
    return { rect: s.rect, laag: 'achter', soort: 'kol', f: t => [0, gy + uitslag * punt(t)] };
  }

  const MAKERS = {
    // Hondje, katje, draakje: diagonale gang (linksvoor met rechtsachter), poten tillen 1-2 artpx op en zwaaien naar
    // voren terwijl het andere paar de grond raakt; 2 artpx deining; staart of vleugel zwaait mee met de cyclus.
    viervoeter(img, m, def, ws) {
      const pas = def.pas, N = 2 * pas, poot = (p, st, bob, r) => ({ rect: p.rect, f: t => [r * st.dx * t, -bob * (1 - t) - st.til * t] });
      const extra = (fase, bob) => {
        const uit = [];
        if (def.staart) uit.push(staartDeel(def.staart, def.staart.zwaai * Math.sin(fase), -bob));
        if (def.vleugel) uit.push(staartDeel(def.vleugel, -def.vleugel.flap * Math.max(0, Math.sin(fase)), -bob));
        return uit;
      };
      const loopVoor = r => Array.from({ length: N }, (_, i) => {
        const bob = deining(i, pas, def.deining), fase = 2 * Math.PI * i / N;
        const poten = def.poten.map(p => poot(p, voetStand(i, pas, def.til, p.groep), bob, r));
        return frame(img, m, extra(fase, bob).concat(poten), [0, -bob], ws);
      });
      // Een pet die van voren getekend is (kijk 'voor') wordt niet gespiegeld: dan een cyclus per richting.
      const loop = def.kijk === 'voor' ? { 1: loopVoor(1), '-1': loopVoor(-1) } : { 1: loopVoor(1) };
      const stil = { dx: 0, til: 0 };
      const rust = [0, 1].map(b => frame(img, m, extra(0, b).concat(def.poten.map(p => poot(p, stil, b, 1))), [0, -b], ws));
      const kwispel = [1, 0, -1, 0].map(s => frame(img, m, extra(s * Math.PI / 2, 0), null, ws));
      const snuffel = def.kop ? [Math.ceil(def.kop.dip / 2), def.kop.dip].map(d => frame(img, m, [kopDeel(def.kop.rect, d)], null, ws)) : [];
      return { loop, rust, kwispel, snuffel, pas, N, eenheid: 1 };
    },
    // Haaitje: kolommen in een sinusgolf, sterker naar de staartpunt toe; 8 frames.
    vis(img, m, def, ws) {
      const s = def.staart, N = 8;
      const zwem = Array.from({ length: N }, (_, i) => frame(img, m, [{ rect: s.rect, soort: 'kol',
        f: t => [0, s.golf * Math.pow(t, 1.5) * Math.sin(2 * Math.PI * i / N - t * Math.PI * 1.2)] }], null, ws));
      return { zwem, rust: [zwem[0]], N };
    },
    // Kameleon: stil, af en toe een oogbeweging (pupil 1 stap opzij) of een klein knikje met de kop.
    kameleon(img, m, def, ws) {
      const o = def.oog, k = def.kop;
      return {
        rust: [frame(img, m, [], null, ws)],
        oog: [-o.stap, o.stap].map(d => frame(img, m, [{ rect: o.rect, soort: 'knip', dx: d, dy: 0 }], null, ws)),
        kop: [1, k.knik].map(d => frame(img, m, [kopDeel(k.rect, d)], null, ws)),
      };
    },
    // Salamander: een lichaamsgolf (kolommen) die van kop naar staart loopt; 8 frames.
    salamander(img, m, def, ws) {
      const l = def.lijf, N = 8;
      const kruip = Array.from({ length: N }, (_, i) => frame(img, m, [{ rect: l.rect, soort: 'kol',
        f: t => [0, l.golf * Math.sin(2 * Math.PI * i / N + t * Math.PI * 3)] }], null, ws));
      return { kruip, rust: [kruip[0]], N };
    },
    // Parkiet: kopje dippen en een vleugelfladder (vleugelpunt op en neer).
    vogel(img, m, def, ws) {
      return {
        rust: [frame(img, m, [], null, ws)],
        dip: [1, def.kop.dip].map(d => frame(img, m, [kopDeel(def.kop.rect, d)], null, ws)),
        flap: [1, -1].map(s => frame(img, m, [staartDeel(def.vleugel, -s * def.vleugel.flap, 0)], null, ws)),
      };
    },
  };

  return { laad, mens, pet, meetMens, frame, rijen, kolommen, voetStand, deining, beeld: () => beeld, doek };
})(window.PQ_MANIFEST, window.PQ_BEWEGING, window.PQ_FIGUUR, window.PQ_KLEDING);
