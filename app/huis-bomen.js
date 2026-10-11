// Boomsoorten op het erf en in de tuin: kers en eik, elk met eigen silhouet en eigen seizoensgedrag.
// Kers: rond en laag, gladde roodbruine bast met horizontale banden; lente roze-witte bloesem (bloesemblaadjes als
// deeltjes in april), zomer donkergroen met kersjes, herfst rood-oranje, winter kaal met fijne twijgen.
// Eik: breed en grillig met dikke, knoestige takken en een gegroefde stam; lente lichtgroen, zomer diepgroen, herfst
// bruin-oranje en goud, winter kaal maar met een deel van het bruine dorre blad (marcescentie).
// Harde pixels in het palet (PQ_PIX). Leest B.omg (seizoen, sneeuw) dat huis-teken.js tijdens tekenDecor zet.
// B.bomen: lijst met kruinen ({ soort, x, y, rx, ry }), voor de bloesemdeeltjes (omgeving-huis.js).
(function (B, P) {
  'use strict';
  const { rect, px, tint, rng, ovaal } = P;
  B.bomen = [];
  const seizoen = () => (B.omg && B.omg.seizoen) || 'zomer';

  // Lijn van (x0,y0) naar (x1,y1), dikte van dik0 naar dik1 (taps), met een lichte rand links.
  function tak(ctx, x0, y0, x1, y1, dik0, dik1, kl) {
    const n = Math.max(1, Math.round(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))));
    for (let i = 0; i <= n; i++) {
      const t = i / n, d = Math.max(1, Math.round(dik0 + (dik1 - dik0) * t));
      const x = Math.round(x0 + (x1 - x0) * t - d / 2), y = Math.round(y0 + (y1 - y0) * t);
      rect(ctx, x, y, d, 1, kl);
      if (d >= 3) { px(ctx, x, y, tint(kl, 1)); px(ctx, x + d - 1, y, tint(kl, -1)); }
    }
  }
  // Kruin uit lobben: schaduw, basis iets linksboven, lichte toppen, rafelige rand; kl = [schaduw, basis, licht].
  function lobben(ctx, lijst, kl, zaad) {
    const r = rng(zaad);
    for (const [cx, cy, rx, ry] of lijst) ovaal(ctx, cx - rx, cy - ry, 2 * rx, 2 * ry, kl[0]);
    for (const [cx, cy, rx, ry] of lijst) ovaal(ctx, cx - rx * 0.92 - 1, cy - ry * 0.95 - 1, rx * 1.75, ry * 1.6, kl[1]);
    for (const [cx, cy, rx, ry] of lijst) {
      for (let i = 0; i < 3; i++) {
        const s = 0.22 + r() * 0.14;
        ovaal(ctx, cx - rx * (0.15 + r() * 0.45), cy - ry * (0.35 + r() * 0.45), 2 * rx * s, 2 * ry * s * 0.8, kl[2]);
      }
      for (let i = 0; i < rx * ry / 10; i++) {
        const a = r() * 6.28, x = Math.round(cx + Math.cos(a) * rx * 1.03), y = Math.round(cy + Math.sin(a) * ry * 1.03);
        px(ctx, x, y, a > 3.4 && a < 6 ? kl[1] : kl[0]);
        px(ctx, Math.round(cx + (r() - 0.5) * rx * 1.5), Math.round(cy + (r() - 0.5) * ry * 1.4), r() < 0.5 ? kl[0] : kl[2]);
      }
    }
  }
  // Plukjes van 3x2 tot 4x3 in de lobben (bloesem, herfstkleur, dor blad); kies(boven) -> kleur.
  function plukjes(ctx, lijst, n, kies, zaad, groot = true) {
    const r = rng(zaad);
    for (let i = 0; i < n; i++) {
      const [cx, cy, rx, ry] = lijst[Math.floor(r() * lijst.length)];
      const a = r() * 6.28, d = Math.sqrt(r()) * 0.92;
      const x = Math.round(cx + Math.cos(a) * rx * d) - 1, y = Math.round(cy + Math.sin(a) * ry * d) - 1, k = kies(y < cy - ry * 0.2, r);
      rect(ctx, x, y, groot ? 3 : 2, 1, k); rect(ctx, x + (groot ? 1 : 0), y + 1, groot ? 3 : 2, 1, tint(k, -1)); px(ctx, x, y, tint(k, 1));
    }
  }
  function kaleTakken(ctx, voetX, voetY, lijst, n, dik, kl, zaad, kronkel) {
    const r = rng(zaad), punten = [];
    for (let i = 0; i < n; i++) {
      const [cx, cy, rx, ry] = lijst[i % lijst.length];
      const ex = cx + (r() - 0.5) * rx * 1.4, ey = cy - ry * (0.3 + r() * 0.6);
      const mx = (voetX + ex) / 2 + (r() - 0.5) * kronkel, my = (voetY + ey) / 2 + (r() - 0.5) * kronkel * 0.4;
      tak(ctx, voetX, voetY, mx, my, dik, Math.max(1, dik * 0.65), kl);
      tak(ctx, mx, my, ex, ey, Math.max(1, dik * 0.65), 1, kl);
      for (let j = 0; j < 3; j++) {
        const f = 0.3 + r() * 0.6, bx = mx + (ex - mx) * f, by = my + (ey - my) * f, h = (r() < 0.5 ? -1 : 1) * (0.6 + r() * 0.5) - Math.PI / 2;
        const l = rx * (0.18 + r() * 0.2), tx = bx + Math.cos(h) * l, ty = by + Math.sin(h) * l * 0.8;
        tak(ctx, bx, by, tx, ty, 1, 1, tint(kl, 1));
        punten.push([Math.round(tx), Math.round(ty)]);
      }
      punten.push([Math.round(ex), Math.round(ey)]);
    }
    return punten;
  }

  // ---------- kers (~2,5 m): rond en laag ----------
  B.kers = function (ctx, x, voet, h = 110, zaad = 61) {
    const s = seizoen(), cy = Math.round(voet - h * 0.66), sh = Math.round(h * 0.42);
    const kr = [[x, cy, 30, 23], [x - 19, cy + 8, 16, 13], [x + 19, cy + 7, 17, 13], [x - 7, cy - 12, 18, 13], [x + 10, cy - 10, 17, 13]];
    // gladde roodbruine stam met horizontale lenticellen
    rect(ctx, x - 3, voet - sh, 6, sh, 'bordeaux.1'); rect(ctx, x - 3, voet - sh, 1, sh, 'bordeaux.2'); rect(ctx, x + 2, voet - sh, 1, sh, 'koffie.1');
    for (let y = voet - sh + 3; y < voet - 2; y += 5) rect(ctx, x - 2, y, 4, 1, 'koraal.1');
    rect(ctx, x - 5, voet - 2, 10, 2, 'bordeaux.1');
    B.bomen.push({ soort: 'kers', x, y: cy, rx: 34, ry: 26 });
    if (s === 'winter') {
      // donkere takken: ze moeten ook voor de bruine winterhaag goed te zien zijn
      tak(ctx, x, voet - sh, x - 10, voet - sh - 10, 4, 3, 'koffie.0'); tak(ctx, x, voet - sh, x + 9, voet - sh - 12, 4, 3, 'koffie.0');
      kaleTakken(ctx, x, voet - sh - 6, kr, 8, 3, 'koffie.0', zaad, 6);
      return;
    }
    tak(ctx, x, voet - sh, x - 10, cy + 6, 4, 2, 'bordeaux.1'); tak(ctx, x, voet - sh, x + 10, cy + 4, 4, 2, 'bordeaux.1');
    if (s === 'lente') {
      lobben(ctx, kr, ['koraal.3', 'koraal.4', 'creme.4'], zaad);
      plukjes(ctx, kr, 46, (boven, r) => (r() < 0.55 ? 'creme.4' : r() < 0.85 ? 'koraal.4' : 'blad.3'), zaad + 1);
      const r = rng(zaad + 2);
      for (let i = 0; i < 24; i++) px(ctx, Math.round(x + (r() - 0.5) * 70), voet - (r() < 0.6 ? 0 : 1), r() < 0.5 ? 'koraal.4' : 'creme.4');
    } else if (s === 'herfst') {
      lobben(ctx, kr, ['koraal.1', 'koraal.2', 'abrikoos.3'], zaad);
      plukjes(ctx, kr, 38, (boven, r) => (r() < 0.4 ? 'goud.3' : r() < 0.7 ? 'abrikoos.2' : 'koraal.3'), zaad + 1);
    } else {
      lobben(ctx, kr, ['blad.0', 'blad.1', 'blad.2'], zaad);
      const r = rng(zaad + 3);
      for (let i = 0; i < 14; i++) {      // kersjes, in paartjes aan een steeltje
        const [cx, cy2, rx, ry] = kr[Math.floor(r() * kr.length)], kx = Math.round(cx + (r() - 0.5) * rx * 1.4), ky = Math.round(cy2 + r() * ry * 0.8);
        px(ctx, kx + 1, ky - 1, 'mos.2'); rect(ctx, kx, ky, 2, 2, 'bordeaux.2'); px(ctx, kx, ky, 'koraal.3');
      }
    }
  };

  // ---------- eik (~3,6 m): breed en grillig, dikke takken ----------
  B.eik = function (ctx, x, voet, h = 160, zaad = 71) {
    const s = seizoen(), cy = Math.round(voet - h * 0.68), sh = Math.round(h * 0.44), top = voet - sh;
    const kr = [[x - 34, cy + 8, 22, 16], [x - 10, cy - 8, 27, 18], [x + 21, cy - 2, 26, 17], [x + 44, cy + 12, 17, 13],
      [x - 50, cy + 18, 13, 10], [x + 4, cy + 16, 22, 12], [x - 22, cy - 22, 16, 11], [x + 16, cy - 24, 15, 10]];
    // gegroefde stam met wortelvoet
    rect(ctx, x - 6, top, 12, sh, 'koffie.2');
    for (let j = 0; j < 6; j++) rect(ctx, x - 7 - (6 - j) / 2, voet - j - 1, 14 + (6 - j), 1, 'koffie.2');
    const r = rng(zaad);
    for (let gx = x - 5; gx < x + 6; gx += 3) for (let y = top + 2; y < voet - 1; y += 1) if (r() < 0.78) px(ctx, gx, y, 'koffie.1');
    rect(ctx, x - 6, top, 1, sh, 'koffie.3'); rect(ctx, x + 5, top, 1, sh, 'koffie.1');
    // knoestige hoofdtakken (ook later deels over het blad, zodat ze tussen de lobben door zichtbaar blijven)
    const takken = [[x - 2, top + 4, x - 22, top - 10, x - 40, cy + 8], [x + 2, top + 2, x + 18, top - 12, x + 40, cy + 6],
      [x, top, x - 6, cy + 10, x - 14, cy - 14], [x + 1, top, x + 10, cy + 8, x + 18, cy - 16]];
    const zetTak = (deel) => {
      for (const [x0, y0, x1, y1, x2, y2] of takken) { tak(ctx, x0, y0, x1, y1, 6, 4, 'koffie.2'); if (deel) tak(ctx, x1, y1, x2, y2, 4, 2, 'koffie.2'); }
    };
    zetTak(true);
    B.bomen.push({ soort: 'eik', x, y: cy, rx: 58, ry: 30 });
    if (s === 'winter') {
      kaleTakken(ctx, x, top - 4, kr, 9, 3, 'koffie.2', zaad + 4, 18);
      // marcescentie: een deel van het dorre bruine blad blijft hangen, vooral laag in de kruin
      plukjes(ctx, kr.filter(l => l[1] > cy - 12), 130, (boven, q) => (q() < 0.4 ? 'abrikoos.1' : q() < 0.7 ? 'koffie.3' : q() < 0.9 ? 'abrikoos.2' : 'goud.1'), zaad + 5, true);
      return;
    }
    const kl = s === 'lente' ? ['blad.2', 'blad.3', 'blad.4'] : s === 'herfst' ? ['koffie.2', 'abrikoos.1', 'abrikoos.2'] : ['blad.0', 'blad.1', 'blad.2'];
    lobben(ctx, kr, kl, zaad);
    if (s === 'herfst') plukjes(ctx, kr, 60, (boven, q) => (q() < 0.35 ? 'goud.3' : q() < 0.6 ? 'goud.2' : q() < 0.85 ? 'abrikoos.3' : 'koffie.3'), zaad + 6);
    if (s === 'lente') plukjes(ctx, kr, 30, () => 'blad.4', zaad + 6, false);
    zetTak(false);
  };
})(window.PQ_HUISBUITEN, window.PQ_PIX);
