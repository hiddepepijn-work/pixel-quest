// Huis-buiten: lucht in gedithered banden, zon/maan/wolken/sterren, heuvels en bomenrij op de achtergrond, grond in
// doorsnede, en het erf (bomen, buxus, siergras, olijfboom, heg, lantaarn, brievenbus, oprit). Ook de buitenkamers:
// tuin, zwembad, overdekt terras, carport en balkon. Harde pixels, kleuren uit het palet. Leest PQ_PIX.
window.PQ_HUISBUITEN = (function (H, P) {
  'use strict';
  const M = H.maten, { rect, px, tint, rng, dither, ovaal, overgang } = P;
  const B = {};   // B.omg: seizoen en weer voor deze tekening (gezet door huis-teken.js tekenDecor)

  // ---------- lucht ----------
  // Banden van boven naar beneden: [kleur, aandeel]. Tussen twee banden een overgang van 2 rijen dambord.
  const BANDEN = {
    dag: [['petrol.3', 0.3], ['petrol.4', 0.42], ['creme.2', 0.28]],
    ochtend: [['lavendel.4', 0.3], ['abrikoos.4', 0.4], ['goud.4', 0.3]],
    avond: [['lavendel.1', 0.22], ['lavendel.2', 0.2], ['koraal.3', 0.2], ['abrikoos.3', 0.2], ['goud.4', 0.18]],
    nacht: [['titel.2', 0.4], ['nacht.1', 0.35], ['nacht.2', 0.25]],
  };
  // dd.banden: banden per lichtfase en weer uit omgeving-teken.js; anders de vaste vier dagdelen.
  const banden = dd => dd.banden || BANDEN[dd.id] || BANDEN.dag;
  // Geordende 8x8 Bayer-matrix (0-63). Twee luchten (naburige lichtfases) mengen per pixel: waar de drempel onder het
  // mengsel ligt komt de tweede set. Zo blijft elke pixel een paletkleur en verloopt de lucht toch per minuut.
  const B8 = (() => {
    let m = [[0]];
    while (m.length < 8) {
      const n = m.length, r = [];
      for (let y = 0; y < 2 * n; y++) { r.push([]); for (let x = 0; x < 2 * n; x++) r[y].push(m[y % n][x % n] * 4 + [[0, 2], [3, 1]][Math.floor(y / n)][Math.floor(x / n)]); }
      m = r;
    }
    return m;
  })();
  const mengt = (dd, x, y) => dd.mengsel > 0 && dd.banden2 && (B8[y & 7][x & 7] + 0.5) / 64 < dd.mengsel;
  function masker(f) {
    const c = document.createElement('canvas'), x = c.getContext('2d');
    c.width = c.height = 8;
    for (let j = 0; j < 8; j++) for (let i = 0; i < 8; i++) if ((B8[j][i] + 0.5) / 64 < f) x.fillRect(i, j, 1, 1);
    return c;
  }
  // Kleur van de lucht op hoogte y (ook voor het uitzicht door de ramen); met x ook de menging van twee fases.
  function luchtKleur(dd, y, geo, x) {
    const bs = x != null && mengt(dd, Math.round(x), Math.round(y)) ? dd.banden2 : banden(dd), t = Math.max(0, Math.min(0.999, y / geo.grondY));
    let som = 0;
    for (const [kl, a] of bs) { som += a; if (t < som) return kl; }
    return bs[bs.length - 1][0];
  }
  function tekenBanden(ctx, geo, bs) {
    let y = 0;
    for (let i = 0; i < bs.length; i++) {
      const h = i === bs.length - 1 ? geo.H - y : Math.round(bs[i][1] * geo.grondY);
      rect(ctx, 0, y, geo.W, h, bs[i][0]);
      if (i > 0) overgang(ctx, 0, y - 6, geo.W, 12, bs[i - 1][0], bs[i][0]);
      y += h;
    }
  }
  // Plek aan de hemel: azimut 90 (oost) links, 270 (west) rechts (we kijken naar het zuiden); hoogte 0 = horizon
  // (achter de heuvels), 50 graden of meer = bovenin.
  function hemelPos(geo, s) {
    const horizon = geo.grondY - 34, top = 14;
    return [Math.round(geo.W * (s.azimut - 90) / 180), Math.round(horizon - Math.max(-0.4, Math.min(1, s.hoogte / 50)) * (horizon - top))];
  }
  function tekenLucht(ctx, geo, dd) {
    tekenBanden(ctx, geo, banden(dd));
    if (dd.mengsel > 0.004 && dd.banden2 && dd.banden2 !== banden(dd)) {
      const c = document.createElement('canvas'), x = c.getContext('2d');
      c.width = geo.W; c.height = geo.H;
      tekenBanden(x, geo, dd.banden2);
      x.globalCompositeOperation = 'destination-in';
      x.fillStyle = x.createPattern(masker(dd.mengsel), 'repeat');
      x.fillRect(0, 0, geo.W, geo.H);
      ctx.drawImage(c, 0, 0);
    }
    const r = rng(7), wf = dd.wolken || 1, niveau = dd.sterNiveau != null ? dd.sterNiveau : 1;
    if (dd.sterren) {
      // sterren komen er één voor één bij naarmate het donkerder wordt
      for (let i = 0; i < geo.W * geo.grondY / 700; i++) {
        const x = Math.floor(r() * geo.W), yy = Math.floor(r() * geo.grondY * 0.75), groot = r() < 0.08, zicht = r(), k = r();
        if (zicht >= niveau) continue;
        if (groot) { rect(ctx, x - 1, yy, 3, 1, 'goud.4'); rect(ctx, x, yy - 1, 1, 3, 'goud.4'); px(ctx, x, yy, 'creme.4'); }
        else px(ctx, x, yy, k < 0.3 ? 'goud.4' : k < 0.5 ? 'creme.4' : 'titel.4');
      }
    }
    if (dd.maan && dd.maanStand) { if (dd.maanStand.hoogte > -2) maanFase(ctx, ...hemelPos(geo, dd.maanStand), dd.maanStand); }
    else if (dd.sterren && dd.maan !== false) maan(ctx, Math.round(geo.W * 0.8), 22);
    if (dd.zonStand) {
      if (dd.zon) zonOp(ctx, geo, dd.zonStand);
    } else if (dd.sterren) {
      if (wf <= 1) return;
    } else if (dd.zon !== false && dd.id !== 'nacht') {
      if (dd.id === 'avond') zon(ctx, Math.round(geo.W * 0.16), Math.round(geo.grondY * 0.78), 14, 'koraal.4', 'goud.4');
      else if (dd.id === 'ochtend') zon(ctx, Math.round(geo.W * 0.12), Math.round(geo.grondY * 0.45), 10, 'goud.4', 'creme.4');
      else zon(ctx, Math.round(geo.W * 0.86), 24, 9, 'goud.4', 'creme.4');
    }
    // Meer wolken bij (half)bewolkt weer; bij een grijze lucht zakken ze tot halverwege. Een heldere nacht heeft geen
    // wolken: ze verdwijnen geleidelijk met het opkomen van de sterren.
    const n = Math.max(2, Math.round(geo.W / 300 * wf)), diep = wf > 2 ? geo.grondY * 0.5 : geo.ytop * 0.7;
    const tot = dd.sterren && wf <= 1 ? Math.round(n * (1 - niveau)) : n;
    for (let i = 0; i < n; i++) {
      if (i >= tot) break;
      const x = Math.floor((i + 0.2 + r() * 0.6) * geo.W / n) - (wf > 2 ? 20 : 0), yy = 8 + Math.floor(r() * Math.max(10, diep));
      wolk(ctx, x, yy, (wf > 2 ? 44 : 34) + Math.floor(r() * 30), dd);
    }
  }
  function zon(ctx, x, y, r, kern, rand) {
    dither(ctx, x - r - 4, y - r - 4, 2 * r + 9, 2 * r + 9, rand, 4);
    ovaal(ctx, x - r - 1, y - r - 1, 2 * r + 2, 2 * r + 2, rand);
    ovaal(ctx, x - r, y - r, 2 * r, 2 * r, kern);
    ovaal(ctx, x - r + 3, y - r + 2, r, r - 2, rand);
  }
  // Zon op zijn echte plek: laag aan de hemel groter en oranjer, hoog kleiner en geler.
  function zonOp(ctx, geo, s) {
    const [x, y] = hemelPos(geo, s), laag = Math.max(0, Math.min(1, (12 - s.hoogte) / 12));
    if (x < -30 || x > geo.W + 30) return;
    zon(ctx, x, y, Math.round(9 + 4 * laag), laag > 0.6 ? 'koraal.4' : 'goud.4', laag > 0.6 ? 'goud.4' : 'creme.4');
  }
  // Maan met schijngestalte: het verlichte deel aan de rechterkant bij wassende maan (fase < 0,5), links bij afnemende.
  // Bij nieuwe maan (minder dan 4% verlicht) is er niets te zien.
  function maanFase(ctx, x, y, m) {
    if (m.verlicht < 0.04) return;
    const r = 8, wassend = m.fase < 0.5;
    dither(ctx, x - 12, y - 12, 25, 25, 'titel.4', 6);
    ovaal(ctx, x - r, y - r, 2 * r, 2 * r, 'titel.3');
    for (let j = 0; j < 2 * r; j++) {
      const dy = (j + 0.5 - r) / r, w = r * Math.sqrt(Math.max(0, 1 - dy * dy)), grens = w * (1 - 2 * m.verlicht);
      const a = wassend ? Math.round(x + grens) : Math.round(x - w), b = wassend ? Math.round(x + w) : Math.round(x - grens);
      rect(ctx, a, y - r + j, b - a, 1, j < 3 || j > 2 * r - 4 ? 'creme.3' : 'creme.4');
    }
    if (m.verlicht > 0.6) { rect(ctx, x - 3, y - 2, 3, 2, 'creme.2'); rect(ctx, x + 2, y + 2, 2, 2, 'creme.2'); }
  }
  function maan(ctx, x, y) {
    dither(ctx, x - 12, y - 12, 25, 25, 'titel.4', 6);
    ovaal(ctx, x - 8, y - 8, 16, 16, 'creme.3');
    ovaal(ctx, x - 7, y - 7, 13, 13, 'creme.4');
    rect(ctx, x - 3, y - 2, 3, 2, 'creme.2'); rect(ctx, x + 2, y + 2, 2, 2, 'creme.2'); px(ctx, x - 1, y + 4, 'creme.2');
  }
  // Wolk: drie overlappende bollen, lichte bovenkant, schaduw aan de onderkant, platte bodem.
  function wolk(ctx, x, y, b, dd) {
    const avond = dd.id === 'avond';
    const [hoog, basis, laag] = dd.wolkKleur ? dd.wolkKleur : avond ? ['koraal.4', 'abrikoos.4', 'lavendel.3'] : dd.id === 'ochtend' ? ['creme.4', 'abrikoos.4', 'lavendel.4'] : ['creme.4', 'creme.3', 'petrol.4'];
    const h = Math.round(b * 0.42);
    for (const [ox, oy, s] of [[0.05, 0.45, 0.42], [0.25, 0.1, 0.5], [0.55, 0.3, 0.42]]) {
      ovaal(ctx, x + b * ox, y + h * oy, b * s, b * s * 0.8, basis);
    }
    rect(ctx, x + b * 0.02, y + h * 0.85, b * 0.96, h * 0.3, basis);
    for (const [ox, oy, s] of [[0.3, 0.16, 0.3], [0.1, 0.5, 0.2]]) ovaal(ctx, x + b * ox, y + h * oy, b * s, b * s * 0.5, hoog);
    rect(ctx, x + b * 0.06, y + h * 1.1, b * 0.88, 2, laag);
    dither(ctx, x + b * 0.08, y + h * 0.95, b * 0.84, 2, laag);
  }

  // ---------- achtergrond: heuvels, bomenrij, verre huisjes ----------
  function tekenAchtergrond(ctx, geo, dd) {
    const nacht = dd.id === 'nacht', avond = dd.id === 'avond';
    const ver = dd.ver || (nacht ? 'titel.3' : avond ? 'lavendel.2' : 'blad.4');
    const dicht = dd.dicht || (nacht ? 'nacht.1' : avond ? 'lavendel.1' : 'blad.3');
    const og = B.omg;
    const g = geo.grondY, r = rng(21);
    for (let x = 0; x < geo.W; x++) {
      const h = 34 + 14 * Math.sin(x / 140) + 8 * Math.sin(x / 53 + 1.3);
      rect(ctx, x, g - h, 1, h, ver);
      if (x % 2 === 0 && (x / 2) % 3 === 0) px(ctx, x, g - h, tint(ver, 1));
    }
    // twee verre huisjes op de heuvel
    for (const f of [0.3, 0.67]) {
      const x = Math.round(geo.W * f), top = g - (34 + 14 * Math.sin(x / 140) + 8 * Math.sin(x / 53 + 1.3)) - 9;
      rect(ctx, x, top, 14, 10, tint(ver, -1)); for (let i = 0; i < 5; i++) rect(ctx, x - 1 + i, top - 1 - i, 16 - 2 * i, 1, tint(ver, -1));
      rect(ctx, x + 3, top + 3, 2, 2, nacht || avond ? 'goud.4' : tint(ver, 1)); rect(ctx, x + 9, top + 3, 2, 2, nacht ? 'goud.3' : tint(ver, 1));
    }
    // bomenrij: kruinen als bolletjes met een lichte bovenrand
    for (let x = -10; x < geo.W + 10; x += 9 + Math.floor(r() * 9)) {
      const s = 10 + Math.floor(r() * 12), top = g - 14 - s - Math.floor(r() * 10);
      const kl = og ? og.boomrij(r, dicht) : dicht;     // seizoen: bloesem, herfstkleuren, kale bomen
      ovaal(ctx, x, top, s + 4, s + 4, kl);
      if (!nacht) { ovaal(ctx, x + 3, top + 1, Math.round(s / 2), Math.round(s / 3), tint(kl, 1)); }
      rect(ctx, x + Math.floor(s / 2), top + s, 2, g - top - s, tint(dicht, -1));
    }
    rect(ctx, 0, g - 16, geo.W, 16, dicht);
    dither(ctx, 0, g - 16, geo.W, 2, tint(dicht, nacht ? 0 : 1), 4);
  }

  // ---------- grond in doorsnede ----------
  function tekenGrond(ctx, geo, dd) {
    const y = geo.grondY, r = rng(11), h = geo.H - y;
    rect(ctx, 0, y, geo.W, h, 'koffie.2');
    rect(ctx, 0, y + 9, geo.W, h - 9, 'koffie.1');
    dither(ctx, 0, y + 8, geo.W, 2, 'koffie.1');
    if (h > 30) { rect(ctx, 0, y + 30, geo.W, h - 30, 'koffie.0'); dither(ctx, 0, y + 28, geo.W, 3, 'koffie.0'); }
    for (let i = 0; i < geo.W * h / 90; i++) {
      const x = Math.floor(r() * geo.W), yy = y + 4 + Math.floor(r() * (h - 5)), s = r() < 0.2 ? 3 : 2;
      rect(ctx, x, yy, s, s - 1, r() < 0.5 ? 'koffie.3' : 'nacht.2');
      px(ctx, x, yy, 'koffie.4');
    }
    // grasmat met sprieten (kleuren per seizoen; onder een sneeuwlaag geen sprieten)
    const og = B.omg, [g0, g1, g2] = og ? og.gras : ['blad.2', 'blad.3', 'blad.1'];
    rect(ctx, 0, y, geo.W, 3, g0); rect(ctx, 0, y, geo.W, 1, g1);
    dither(ctx, 0, y + 3, geo.W, 2, g2);
    if (!og || og.halmen) for (let x = 0; x < geo.W; x += 1 + Math.floor(r() * 3)) rect(ctx, x, y - 1 - Math.floor(r() * 3), 1, 3, r() < 0.4 ? g1 : g0);
    if (og) og.grond(ctx, 0, y, geo.W, 11);
  }

  return Object.assign(B, { luchtKleur, tekenLucht, tekenAchtergrond, tekenGrond, wolk });
})(window.PQ_HUIS, window.PQ_PIX);

// ---------- erf: bomen, struiken, grassen, lampen ----------
(function (B, H, P) {
  'use strict';
  const M = H.maten, { rect, px, tint, rng, dither, ovaal } = P;
  // Bladerkruin uit clusters: donkere basis, middentoon linksboven, lichte toppen, rafelige rand.
  // Met een seizoen (B.omg) tekent omgeving-teken.js de kruin: bloesem, herfstkleur of kale takken.
  function kruin(ctx, cx, cy, rx, ry, kl, zaad) {
    if (B.omg) return B.omg.kruin(ctx, cx, cy, rx, ry, kl, zaad, kruinBasis);
    kruinBasis(ctx, cx, cy, rx, ry, kl, zaad);
  }
  function kruinBasis(ctx, cx, cy, rx, ry, kl, zaad) {
    const r = rng(zaad);
    ovaal(ctx, cx - rx, cy - ry, 2 * rx, 2 * ry, tint(kl, -1));
    for (let i = 0; i < 9; i++) {
      const a = r() * 6.28, d = r() * 0.55, s = 0.38 + r() * 0.22;
      const x = cx + Math.cos(a) * rx * d - rx * s - rx * 0.08, y = cy + Math.sin(a) * ry * d - ry * s - ry * 0.12;
      ovaal(ctx, x, y, 2 * rx * s, 2 * ry * s, kl);
    }
    for (let i = 0; i < 6; i++) {
      const x = cx - rx * (0.1 + r() * 0.6), y = cy - ry * (0.25 + r() * 0.6), s = 0.12 + r() * 0.12;
      ovaal(ctx, x, y, 2 * rx * s, 2 * ry * s * 0.8, tint(kl, 1));
    }
    for (let i = 0; i < rx * ry / 12; i++) {
      const a = r() * 6.28, x = Math.round(cx + Math.cos(a) * rx * 1.02), y = Math.round(cy + Math.sin(a) * ry * 1.02);
      px(ctx, x, y, tint(kl, -1));
      const xi = Math.round(cx + (r() - 0.5) * rx * 1.4), yi = Math.round(cy + (r() - 0.5) * ry * 1.4);
      px(ctx, xi, yi, tint(kl, r() < 0.5 ? -1 : 1));
    }
  }
  function stam(ctx, x, voet, h, b, kl) {
    rect(ctx, x, voet - h, b, h, kl);
    rect(ctx, x, voet - h, 1, h, tint(kl, 1));
    rect(ctx, x + b - 2, voet - h, 2, h, tint(kl, -1));
    for (let y = voet - h + 4; y < voet - 2; y += 7) rect(ctx, x + 1 + (y % 3), y, 2, 1, tint(kl, -1));
  }
  // Boom van ~3,4 m (150 artpx): stam met twee takken en een grote kruin.
  B.boom = function (ctx, x, voet, h = 150, kl = 'blad.2', zaad = 31) {
    stam(ctx, x - 3, voet, h * 0.55, 7, 'koffie.3');
    rect(ctx, x - 12, voet - h * 0.55, 10, 2, 'koffie.3'); rect(ctx, x + 3, voet - h * 0.6, 10, 2, 'koffie.3');
    kruin(ctx, x, voet - h * 0.62, h * 0.32, h * 0.3, kl, zaad);
    dither(ctx, x - 16, voet, 34, 2, 'blad.1');
  };
  // Boompje (krentenboompje, ~2,5 m): meerstammig en luchtig.
  B.boompje = function (ctx, x, voet) {
    for (const [dx, h] of [[-4, 70], [0, 80], [4, 66]]) stam(ctx, x + dx, voet, h, 2, 'koffie.3');
    kruin(ctx, x - 14, voet - 82, 16, 14, 'blad.3', 41); kruin(ctx, x + 10, voet - 92, 17, 15, 'blad.2', 42);
    kruin(ctx, x - 2, voet - 104, 14, 12, 'blad.3', 43);
    if (!B.omg || B.omg.bessen) for (const [dx, dy] of [[-18, -86], [12, -100], [2, -110], [-6, -92]]) rect(ctx, x + dx, voet + dy, 2, 2, 'creme.4');
  };
  // Olijfboom (~2,6 m): knoestige grijze stam, zilvergroene kruin.
  B.olijf = function (ctx, x, voet) {
    for (let y = 0; y < 60; y++) {
      const o = Math.round(Math.sin(y / 9) * 3);
      rect(ctx, x - 4 + o, voet - y, 8 - Math.floor(y / 20), 1, 'nacht.3'); px(ctx, x - 4 + o, voet - y, 'nacht.4');
    }
    rect(ctx, x - 14, voet - 56, 14, 3, 'nacht.3'); rect(ctx, x + 2, voet - 62, 12, 3, 'nacht.3');
    kruin(ctx, x - 16, voet - 76, 20, 16, 'mos.3', 51); kruin(ctx, x + 14, voet - 80, 19, 15, 'mos.3', 52);
    kruin(ctx, x, voet - 96, 18, 14, 'mos.3', 53);
  };
  B.buxus = function (ctx, x, voet, s = 14) {
    ovaal(ctx, x, voet - s, s, s, 'blad.1'); ovaal(ctx, x + 1, voet - s, s - 3, s - 3, 'blad.2');
    ovaal(ctx, x + 3, voet - s + 2, Math.round(s / 3), Math.round(s / 4), 'blad.3');
    for (let i = 0; i < s; i++) px(ctx, x + 2 + ((i * 5) % (s - 3)), voet - s + 3 + ((i * 7) % (s - 5)), 'blad.1');
  };
  // Siergras (pennisetum, ~70 cm): waaier van sprieten met pluimen.
  B.siergras = function (ctx, x, voet, h = 30, zaad = 3) {
    const r = rng(zaad);
    for (let i = 0; i < 14; i++) {
      const hoek = -0.9 + (i / 13) * 1.8, l = h * (0.6 + r() * 0.4);
      for (let s = 0; s < l; s++) px(ctx, Math.round(x + Math.sin(hoek) * s * 0.7 * (s / l)), voet - s, s > l * 0.7 ? 'abrikoos.4' : i % 2 ? 'mos.3' : 'mos.2');
    }
  };
  B.heg = function (ctx, x, voet, b, h, strak) {
    rect(ctx, x, voet - h, b, h, 'blad.1');
    if (strak) {
      const r = rng(x + 5);
      for (let i = 0; i < b * h / 8; i++) rect(ctx, x + Math.floor(r() * (b - 1)), voet - h + 2 + Math.floor(r() * (h - 2)), 2, 1, r() < 0.5 ? 'blad.2' : 'blad.0');
      rect(ctx, x, voet - h, b, 2, 'blad.2'); rect(ctx, x, voet - h, b, 1, 'blad.3'); dither(ctx, x, voet - h + 2, b, 2, 'blad.2');
      return;
    }
    // beukenhaag: per seizoen fris groen, koperbruin in de herfst en droog bruin blad in de winter
    const [k0, k1, k2, k3] = (B.omg && B.omg.heg) || ['blad.1', 'blad.2', 'blad.0', 'blad.3'];
    if (k0 !== 'blad.1') rect(ctx, x, voet - h, b, h, k0);
    const r = rng(x);
    for (let i = 0; i < b * h / 10; i++) rect(ctx, x + Math.floor(r() * (b - 2)), voet - h + Math.floor(r() * h), 2, 1, r() < 0.6 ? k1 : k2);
    for (let i = 0; i < b; i += 3) rect(ctx, x + i, voet - h - (i % 2), 3, 2, k1);
    rect(ctx, x, voet - h, b, 1, k3);
  };
  // Lantaarnpaal (3,4 m), tuinlampje (40 cm) en bolder (60 cm). lichten: [{ x, y, r }] voor de avond.
  B.lantaarn = function (ctx, x, voet, aan, lichten) {
    rect(ctx, x - 3, voet - 6, 8, 6, 'nacht.1'); rect(ctx, x, voet - 150, 3, 150, 'nacht.1'); px(ctx, x, voet - 150, 'nacht.3');
    rect(ctx, x - 4, voet - 162, 11, 2, 'nacht.1'); rect(ctx, x - 3, voet - 160, 9, 9, 'nacht.1');
    rect(ctx, x - 2, voet - 159, 7, 7, aan ? 'goud.4' : 'creme.2'); rect(ctx, x + 1, voet - 159, 1, 7, 'nacht.1');
    rect(ctx, x - 1, voet - 166, 5, 4, 'nacht.1');
    if (aan) lichten.push({ x: x + 1, y: voet - 155, r: 34, grond: voet });
  };
  B.tuinlamp = function (ctx, x, voet, aan, lichten) {
    rect(ctx, x, voet - 16, 3, 16, 'nacht.1'); rect(ctx, x - 1, voet - 19, 5, 3, 'nacht.1');
    rect(ctx, x, voet - 16, 3, 2, aan ? 'goud.4' : 'nacht.3');
    if (aan) lichten.push({ x: x + 1, y: voet - 15, r: 12, grond: voet });
  };
  B.bolder = function (ctx, x, voet, aan, lichten) {
    rect(ctx, x, voet - 26, 6, 26, 'nacht.1'); rect(ctx, x, voet - 26, 1, 26, 'nacht.3');
    rect(ctx, x, voet - 22, 6, 3, aan ? 'goud.4' : 'nacht.2');
    if (aan) lichten.push({ x: x + 3, y: voet - 20, r: 16, grond: voet });
  };
  B.brievenbus = function (ctx, x, g, modern) {
    if (modern) {
      rect(ctx, x, g - 44, 9, 44, 'nacht.1'); rect(ctx, x, g - 44, 1, 44, 'nacht.3');
      rect(ctx, x + 2, g - 38, 5, 1, 'nacht.3'); rect(ctx, x + 3, g - 30, 3, 5, 'goud.3');
      return;
    }
    rect(ctx, x + 4, g - 40, 3, 40, 'eik.2'); rect(ctx, x + 4, g - 40, 1, 40, 'eik.3');
    rect(ctx, x, g - 52, 12, 12, 'bordeaux.2'); rect(ctx, x, g - 52, 12, 2, 'bordeaux.3'); rect(ctx, x, g - 42, 12, 2, 'bordeaux.1');
    rect(ctx, x + 3, g - 48, 6, 1, 'titel.1'); rect(ctx, x + 11, g - 57, 1, 8, 'goud.2'); rect(ctx, x + 12, g - 57, 3, 2, 'goud.3');
  };
  B.bloemen = function (ctx, a, b, g, zaad) {
    if (B.omg) return B.omg.bloemen(ctx, a, b, g, zaad, bloemenBasis);
    bloemenBasis(ctx, a, b, g, zaad);
  };
  function bloemenBasis(ctx, a, b, g, zaad, kleuren) {
    const r = rng(zaad), kl = kleuren || ['koraal.3', 'goud.3', 'lavendel.3', 'creme.4', 'koraal.4'];
    for (let x = a; x < b; x += 3 + Math.floor(r() * 4)) {
      const h = 4 + Math.floor(r() * 6);
      rect(ctx, x, g - h, 1, h, 'mos.2'); px(ctx, x + 1, g - h + 2, 'blad.2');
      rect(ctx, x - 1, g - h - 2, 3, 2, kl[Math.floor(r() * kl.length)]); px(ctx, x, g - h - 2, 'goud.4');
    }
  }
})(window.PQ_HUISBUITEN, window.PQ_HUIS, window.PQ_PIX);

// ---------- erf-indeling en buitenkamers ----------
(function (B, H, P) {
  'use strict';
  const M = H.maten, { rect, px, rng, dither, ovaal } = P;
  // Veelhoek vullen met scanlijnen (harde rand). pts = [[x, y], ...].
  function poly(ctx, pts, kl) {
    const ys = pts.map(p => p[1]), y0 = Math.floor(Math.min(...ys)), y1 = Math.ceil(Math.max(...ys));
    for (let y = y0; y < y1; y++) {
      const xs = [], yc = y + 0.5;
      for (let i = 0; i < pts.length; i++) {
        const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % pts.length];
        if ((ay <= yc && by > yc) || (by <= yc && ay > yc)) xs.push(ax + (yc - ay) / (by - ay) * (bx - ax));
      }
      xs.sort((a, b) => a - b);
      for (let i = 0; i + 1 < xs.length; i += 2) rect(ctx, Math.round(xs[i]), y, Math.round(xs[i + 1]) - Math.round(xs[i]), 1, kl);
    }
  }
  B.poly = poly;

  B.tekenErf = function (ctx, geo, dd, lichten) {
    const dec = geo.huis.decor || [], modern = geo.huis.stijl === 'modern', aan = !!dd.lampen, g = geo.grondY;
    const v0 = geo.kamers.filter(k => k.verdieping === 0);
    const L = Math.min(...v0.map(k => k.box.x)), Rr = Math.max(...v0.map(k => k.box.x + k.box.b + (k.buiten ? 0 : M.muur)));
    const oprit = dec.includes('oprit');
    if (dec.includes('heg')) B.heg(ctx, 4, g, L - 8, 40);
    if (dec.includes('buxus') && !modern) { B.buxus(ctx, L - 22, g, 14); B.buxus(ctx, L - 40, g, 11); }
    if (dec.includes('siergras')) { B.siergras(ctx, L - 14, g, 30, 4); B.siergras(ctx, L - 34, g, 26, 5); }
    if (dec.includes('lantaarn')) B.lantaarn(ctx, L - 50, g, aan, lichten);
    if (dec.includes('bloemen')) B.bloemen(ctx, 6, L - 6, g, 5);
    // de grote boom op het erf is een eik (huis-bomen.js); zonder dat bestand de oude generieke boom
    if (dec.includes('boom')) {
      if (B.eik) B.eik(ctx, oprit ? geo.W - 40 : Rr + 64, g - (oprit ? 8 : 0), oprit ? 165 : 155);
      else B.boom(ctx, oprit ? geo.W - 34 : Rr + 58, g - (oprit ? 8 : 0), oprit ? 160 : 150, 'blad.2', 31);
    }
    if (oprit) {
      P.mat.vloer(ctx, Rr, g - 8, geo.W - Rr, 8, { kleur: 'nacht.3', naad: 'nacht.2', licht: 'nacht.4', patroon: 'klinkers' }, 61);
      rect(ctx, Rr, g - 8, geo.W - Rr, 1, 'creme.2');
      if (dec.includes('buitenlampen')) for (const dx of [26, 84]) B.bolder(ctx, Rr + dx, g - 7, aan, lichten);
    }
    if (dec.includes('buxus')) { B.buxus(ctx, Rr + 2, g - (oprit ? 8 : 0), 12); if (!oprit) B.buxus(ctx, Rr + 34, g, 10); }
    if (dec.includes('siergras') && !oprit) B.siergras(ctx, Rr + 46, g, 28, 6);
    if (dec.includes('bloemen')) B.bloemen(ctx, Rr + 16, Rr + 50, g, 9);
    if (dec.includes('brievenbus')) B.brievenbus(ctx, oprit ? geo.W - 18 : Rr + 20, g - (oprit ? 8 : 0), modern);
  };

  // Achterkant van een tuin: klassiek een beukenhaag, modern een antraciet lamellenhek (1,8 m).
  function achterkant(ctx, kam, top, modern) {
    // modern: strak geschoren taxushaag (1,4 m)
    if (modern) B.heg(ctx, kam.x, top, kam.b, 60, true);
    else B.heg(ctx, kam.x, top, kam.b, 66);
  }
  B.tekenTuin = function (ctx, geo, kam, dd, lichten) {
    const dec = geo.huis.decor || [], modern = geo.huis.stijl === 'modern', top = kam.y + kam.h - M.vloer;
    const zw = kam.zwembad;
    achterkant(ctx, kam, top, modern);
    // in de tuin een kersenboom in plaats van het krentenboompje (huis-bomen.js)
    if (dec.includes('boompje') && !zw) { if (B.kers) B.kers(ctx, kam.x + 44, top); else B.boompje(ctx, kam.x + 40, top); }
    if (zw && dec.includes('olijfboom')) B.olijf(ctx, kam.x + kam.b - 120, top);
    const a = kam.x + 4, e = kam.x + kam.b - 4;
    if (modern) for (let x = a + 8; x < e; x += 46) B.siergras(ctx, x, top, 26, x);
    else { B.bloemen(ctx, a, e, top, kam.x); for (let x = a + 70; x < e; x += 64) B.buxus(ctx, x, top, 12); }
    P.mat.vloer(ctx, kam.x, top, kam.b, M.vloer, kam.vloer, kam.x);
    if (!zw) {
      const t = Math.round(kam.b * 0.42);
      P.mat.vloer(ctx, kam.x + kam.b - t, top, t, M.vloer, { kleur: 'creme.1', naad: 'creme.0', licht: 'creme.2', patroon: 'terras' }, 7);
    }
    if (B.omg) {
      // seizoen en weer op het gazon (niet in het zwembad)
      if (zw) { B.omg.grond(ctx, kam.x, top, zw.x - 4, kam.x); B.omg.grond(ctx, kam.x + zw.x + zw.b + 4, top, kam.b - zw.x - zw.b - 4, kam.x + 1); }
      else B.omg.grond(ctx, kam.x, top, kam.b, kam.x);
    }
    if (zw) zwembad(ctx, geo, kam, top, dd, lichten);
    if (dec.includes('tuinlampjes')) {
      for (let x = kam.x + 10; x < kam.x + kam.b - 10; x += zw ? 100 : 70) {
        if (!zw || x > kam.x + zw.x + zw.b + 4) B.tuinlamp(ctx, x, top + 1, !!dd.lampen, lichten);
      }
    }
  };
  // Zwembad in doorsnede: natuurstenen rand met overstek, mozaïek langs wanden en bodem, een donkere waterlijn,
  // water in drie diepte-tinten met lichtnetjes, rimpels en glinsters, een rvs-trapje en een ronde lamp onder water.
  function zwembad(ctx, geo, kam, top, dd, lichten) {
    const x = kam.x + kam.zwembad.x, b = kam.zwembad.b, bodem = geo.H - 6, wy = top + 4, r = rng(71);
    rect(ctx, x - 4, top, b + 8, bodem - top + 4, 'creme.1');
    rect(ctx, x - 4, top, 1, bodem - top + 4, 'creme.0'); rect(ctx, x + b + 3, top, 1, bodem - top + 4, 'creme.0');
    const d1 = wy + Math.round((bodem - wy) * 0.38), d2 = wy + Math.round((bodem - wy) * 0.72);
    rect(ctx, x, wy, b, bodem - wy, 'petrol.3');
    rect(ctx, x, d1, b, bodem - d1, 'petrol.2'); P.overgang(ctx, x, d1 - 4, b, 8, 'petrol.3', 'petrol.2');
    rect(ctx, x, d2, b, bodem - d2, 'petrol.1'); P.overgang(ctx, x, d2 - 4, b, 8, 'petrol.2', 'petrol.1');
    // mozaïek: wanden en bodem
    for (let y = wy + 4; y < bodem; y += 3) for (const xx of [x, x + b - 3]) { rect(ctx, xx, y, 3, 2, 'petrol.4'); px(ctx, xx + 1, y, 'creme.4'); }
    for (let xx = x; xx < x + b; xx += 3) { rect(ctx, xx, bodem - 3, 2, 3, 'petrol.4'); }
    // lichtnetjes (caustics) in het bovenste deel
    for (let i = 0; i < b / 4; i++) {
      let xx = x + 4 + Math.floor(r() * (b - 12)), yy = wy + 6 + Math.floor(r() * (d1 - wy));
      for (let s = 0; s < 5; s++) { px(ctx, xx, yy, 'petrol.4'); xx += 1; yy += r() < 0.5 ? 1 : -1; }
    }
    for (let i = 0; i < b / 8; i++) { const xx = x + 4 + Math.floor(r() * (b - 12)), yy = d1 + 4 + Math.floor(r() * (d2 - d1)); rect(ctx, xx, yy, 3, 1, 'petrol.3'); }
    // waterlijn: donkere mozaïekband, daarboven het wateroppervlak met rimpels en glinsters
    for (let xx = x; xx < x + b; xx++) { px(ctx, xx, wy + 1, (xx & 1) ? 'petrol.1' : 'petrol.0'); px(ctx, xx, wy + 2, (xx & 1) ? 'petrol.0' : 'petrol.1'); }
    rect(ctx, x, wy, b, 1, 'petrol.4');
    for (let i = 0; i < b / 5; i++) rect(ctx, x + Math.floor(r() * (b - 6)), wy + 4 + Math.floor(r() * 7), 2 + Math.floor(r() * 4), 1, 'petrol.4');
    if (!dd.sterren) {
      for (let i = 0; i < 7; i++) {
        const xx = x + 6 + Math.floor(r() * (b - 12)), yy = wy + (i % 3 === 0 ? 5 : 0);
        px(ctx, xx, yy, 'creme.4'); px(ctx, xx - 1, yy - 1, 'creme.4'); px(ctx, xx + 1, yy - 1, 'creme.4'); px(ctx, xx, yy - 2, 'creme.4');
      }
    }
    // rand (overstek) met schaduw op het water
    rect(ctx, x - 4, top - 2, b + 8, 4, 'creme.3'); rect(ctx, x - 4, top - 2, b + 8, 1, 'creme.4'); rect(ctx, x - 4, top + 2, b + 8, 1, 'creme.0');
    for (let i = x - 4; i < x + b + 4; i += 16) rect(ctx, i, top - 2, 1, 4, 'creme.1');
    dither(ctx, x, wy + 3, b, 1, 'petrol.2');
    // trapje
    const lx = x + b - 16;
    for (const dx of [0, 8]) { rect(ctx, lx + dx, top - 16, 2, wy + 28 - top + 16, 'nacht.4'); px(ctx, lx + dx, top - 16, 'creme.4'); rect(ctx, lx + dx, top - 16, 1, 14, 'creme.4'); }
    rect(ctx, lx - 4, top - 17, 6, 2, 'nacht.4'); rect(ctx, lx + 4, top - 17, 6, 2, 'nacht.4');
    for (const dy of [8, 16, 24]) { rect(ctx, lx, wy + dy, 10, 1, 'creme.3'); px(ctx, lx + 2, wy + dy + 1, 'petrol.2'); }
    // lamp onder water
    const kx = x + 14, ky = wy + 16;
    ovaal(ctx, kx - 1, ky - 1, 8, 8, 'nacht.3'); ovaal(ctx, kx, ky, 6, 6, dd.lampen ? 'goud.4' : 'creme.3');
    if (dd.lampen) lichten.push({ x: kx + 3, y: ky + 3, r: 34, kleur: 'petrol.4' });
  }
  // Overdekt terras: eiken lamellenscherm achterin, zwarte staander en balk, lamellendak, lichtsnoer.
  B.tekenTerras = function (ctx, geo, kam, dd, lichten) {
    const top = kam.y + kam.h - M.vloer, balk = top - 114;
    for (let i = 0; i < kam.b; i += 7) {
      const w = Math.min(5, kam.b - i), h = top - balk - 6;
      rect(ctx, kam.x + i, balk + 6, w, h, 'eik.3'); rect(ctx, kam.x + i, balk + 6, 1, h, 'eik.4');
      rect(ctx, kam.x + i + w - 1, balk + 6, 1, h, 'eik.2');
    }
    P.mat.vloer(ctx, kam.x, top, kam.b, M.vloer, kam.vloer, kam.x);
    rect(ctx, kam.x + 2, balk, 4, top - balk, 'nacht.1'); rect(ctx, kam.x + 2, balk, 1, top - balk, 'nacht.3');
    rect(ctx, kam.x, balk, kam.b + 4, 6, 'nacht.1'); rect(ctx, kam.x, balk, kam.b + 4, 1, 'nacht.3');
    for (let i = 2; i < kam.b; i += 6) { rect(ctx, kam.x + i, balk - 5, 3, 5, 'nacht.2'); px(ctx, kam.x + i, balk - 5, 'nacht.4'); }
    const a = kam.x + 8, b = kam.x + kam.b - 6;
    for (let x = a; x <= b; x++) {
      const t = (x - a) / (b - a), y = balk + 10 + Math.round(Math.sin(t * Math.PI) * 10);
      px(ctx, x, y, 'nacht.1');
      if ((x - a) % 12 === 6) {
        rect(ctx, x - 1, y + 1, 3, 3, dd.lampen ? 'goud.4' : 'creme.3'); px(ctx, x, y + 1, 'creme.4');
        if (dd.lampen) lichten.push({ x, y: y + 2, r: 10 });
      }
    }
  };
})(window.PQ_HUISBUITEN, window.PQ_HUIS, window.PQ_PIX);

// ---------- carport (met auto en laadpaal) en balkon ----------
(function (B, H, P) {
  'use strict';
  const M = H.maten, { rect, px, dither, ovaal, glas } = P;
  // Auto van 4,2 m (186 artpx) in zijaanzicht, neus naar links. x = neus, v = vloerlijn.
  function auto(ctx, x, v, dd) {
    const pt = a => a.map(([dx, dy]) => [x + dx, v + dy]);
    dither(ctx, x + 6, v - 1, 176, 3, 'nacht.2');
    B.poly(ctx, pt([[2, -12], [3, -21], [10, -25], [44, -29], [62, -45], [74, -50], [126, -50], [142, -42], [164, -31], [181, -28], [186, -21], [186, -12], [180, -7], [8, -7]]), 'nacht.2');
    B.poly(ctx, pt([[44, -29], [62, -45], [74, -50], [126, -50], [142, -42], [164, -31], [164, -28], [44, -27]]), 'nacht.2');
    rect(ctx, x + 12, v - 26, 160, 1, 'nacht.4'); rect(ctx, x + 10, v - 25, 168, 1, 'nacht.3');
    rect(ctx, x + 75, v - 50, 50, 1, 'nacht.3');
    B.poly(ctx, pt([[64, -31], [76, -46], [98, -47], [98, -31]]), 'titel.3');
    B.poly(ctx, pt([[102, -47], [124, -47], [138, -36], [136, -31], [102, -31]]), 'titel.3');
    for (const [a, b] of [[70, 84], [108, 120]]) for (let j = 0; j < 14; j++) rect(ctx, x + a + 10 - Math.round(j * 0.6), v - 45 + j, 3, 1, 'titel.4');
    rect(ctx, x + 99, v - 47, 3, 39, 'nacht.1');
    rect(ctx, x + 88, v - 25, 6, 1, 'nacht.4'); rect(ctx, x + 126, v - 25, 6, 1, 'nacht.4');
    rect(ctx, x + 66, v - 34, 5, 3, 'nacht.1');
    rect(ctx, x + 8, v - 10, 172, 3, 'nacht.1');
    rect(ctx, x + 3, v - 21, 10, 3, dd.lampen ? 'goud.4' : 'creme.3'); rect(ctx, x + 3, v - 17, 12, 1, 'creme.4');
    rect(ctx, x + 179, v - 24, 6, 4, 'koraal.2'); px(ctx, x + 180, v - 24, 'koraal.4');
    for (const cx of [34, 152]) {
      ovaal(ctx, x + cx - 15, v - 27, 30, 30, 'titel.1');
      ovaal(ctx, x + cx - 12, v - 24, 24, 24, 'titel.2');
      ovaal(ctx, x + cx - 7, v - 19, 14, 14, 'nacht.4');
      ovaal(ctx, x + cx - 5, v - 17, 10, 10, 'nacht.3');
      rect(ctx, x + cx - 1, v - 17, 2, 10, 'nacht.4'); rect(ctx, x + cx - 5, v - 13, 10, 2, 'nacht.4');
      rect(ctx, x + cx - 1, v - 13, 2, 2, 'creme.3'); px(ctx, x + cx - 4, v - 16, 'creme.4');
    }
    rect(ctx, x, v - 3, 190, 3, 'titel.1');
  }
  B.tekenCarport = function (ctx, geo, kam, dd, lichten) {
    const top = kam.y + kam.h - M.vloer, v = top + 4, ry = v - 114;
    P.mat.vloer(ctx, kam.x, top, kam.b, M.vloer, kam.vloer, kam.x);
    // laadpaal tegen de gevel, kabel naar de neus van de auto
    const lx = kam.x + 3;
    rect(ctx, lx, v - 40, 9, 40, 'creme.4'); rect(ctx, lx + 6, v - 40, 3, 40, 'creme.2'); rect(ctx, lx, v - 40, 9, 2, 'nacht.1');
    rect(ctx, lx + 2, v - 34, 4, 5, 'petrol.2'); px(ctx, lx + 3, v - 33, 'petrol.4'); rect(ctx, lx + 2, v - 26, 4, 1, 'blad.3');
    for (let i = 0; i < 18; i++) px(ctx, lx + 9 + i, v - 20 + Math.round(Math.sin(i / 5.7) * 6), 'titel.1');
    auto(ctx, kam.x + 26, v, dd);
    rect(ctx, kam.x - 2, ry, kam.b + 8, 2, 'nacht.1');
    P.mat.stuc(ctx, kam.x - 2, ry + 2, kam.b + 8, 6, 'creme.3', 'creme.2', kam.x);
    P.mat.lamellen(ctx, kam.x, ry + 8, kam.b + 4, 2, 'eik.3', 3);
    rect(ctx, kam.x + kam.b - 4, ry + 10, 4, v - ry - 10, 'nacht.1'); rect(ctx, kam.x + kam.b - 4, ry + 10, 1, v - ry - 10, 'nacht.3');
    for (const dx of [40, 120]) {
      rect(ctx, kam.x + dx, ry + 10, 4, 1, dd.lampen ? 'goud.4' : 'creme.4');
      if (dd.lampen) lichten.push({ x: kam.x + dx + 2, y: ry + 12, r: 26, kegel: true, grond: v });
    }
  };
  // Balkon: vlonder en een glazen balustrade van 100 cm met een zwarte handregel.
  B.tekenBalkon = function (ctx, geo, kam) {
    const top = kam.y + kam.h - M.vloer, h = 44, a = kam.x, b = kam.b;
    P.mat.vloer(ctx, a, top, b, M.vloer, kam.vloer, a);
    glas(ctx, a + 1, top - h, b - 2, h, 'petrol.4', 0.3);
    rect(ctx, a, top - h - 2, b, 2, 'nacht.1'); rect(ctx, a, top - h - 2, b, 1, 'nacht.3');
    rect(ctx, a, top - 3, b, 3, 'nacht.1');
    const muurRechts = geo.kamers.some(o => o.verdieping === kam.verdieping && !o.buiten && o.box.x === kam.box.x + kam.box.b);
    const muurLinks = geo.kamers.some(o => o.verdieping === kam.verdieping && !o.buiten && o.box.x + o.box.b === kam.box.x);
    if (!muurLinks) rect(ctx, a, top - h - 2, 2, h + 2, 'nacht.1');
    if (!muurRechts) rect(ctx, a + b - 2, top - h - 2, 2, h + 2, 'nacht.1');
  };
})(window.PQ_HUISBUITEN, window.PQ_HUIS, window.PQ_PIX);
