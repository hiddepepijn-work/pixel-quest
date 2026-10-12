// De verte: lucht, erf en grond rondom de scène, zodat je bij elke zoom en pan een doorlopende wereld ziet en nooit
// een vlak kleurvlak. Tekent alleen een rechthoek van de wereld (het zichtbare stuk plus marge) in artpx, op dezelfde
// coördinaten als de scène; de scène (huis-teken.js) ligt erbovenop en dekt zijn eigen stuk af.
//   PQ_HUISVERTE.teken(canvas, geo, dd, x0, y0, b, h)
// Boven: de gedithered luchtbanden lopen door in de bovenste band, met wolken en (’s nachts) sterren per vak.
// Opzij: heuvels, verre bomenrij, grasmat en grond. Onder: de aardlagen van de doorsnede, dieper donkerder, met
// stenen en hier en daar een wortel. Alles op hele artpx, uit het palet, met vaste zaden per vak: pannen springt niet.
window.PQ_HUISVERTE = (function (P, BU) {
  'use strict';
  const { rect, px, tint, rng, dither, overgang, ovaal } = P;
  const zaad = (i, j, k) => ((Math.imul(i | 0, 73856093) ^ Math.imul(j | 0, 19349663) ^ Math.imul(k | 0, 83492791)) >>> 0) % 2147483647;
  const BANDEN_DAG = [['petrol.3', 0.3], ['petrol.4', 0.42], ['creme.2', 0.28]];
  const banden = dd => dd.banden || BANDEN_DAG;
  // Gedithered vlak als patroon (snel, ook voor grote stukken): kl met elke n-de pixel kl2, uitgelijnd op de wereld.
  const patronen = new Map();
  function patroon(ctx, kl2, n) {
    const sl = kl2 + n;
    if (!patronen.has(sl)) {
      const c = document.createElement('canvas'); c.width = c.height = 4;
      const x = c.getContext('2d'); x.fillStyle = P.kleur(kl2);
      for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) if (n === 2 ? ((i + j) & 1) === 0 : ((i + 2 * j) % n) === 0) x.fillRect(i, j, 1, 1);
      patronen.set(sl, c);
    }
    return ctx.createPattern(patronen.get(sl), 'repeat');
  }
  function vlak(ctx, x, y, b, h, kl, kl2, n) {
    if (b <= 0 || h <= 0) return;
    rect(ctx, x, y, b, h, kl);
    if (kl2) { ctx.fillStyle = patroon(ctx, kl2, n); ctx.fillRect(x, y, b, h); }
  }
  const ZENIT = -560;   // boven deze hoogte wordt de bovenste band een tint donkerder (diepte in de lucht)

  function lucht(ctx, geo, dd, x0, y0, b, h) {
    const bs = banden(dd), g = geo.grondY;
    const bovenkant = y0, onderkant = Math.min(y0 + h, g);
    if (onderkant <= bovenkant) return;
    // de bovenste band loopt door naar boven; de onderste tot de grond
    let y = 0;
    const zenit = tint(bs[0][0], -1);
    if (bovenkant < ZENIT) rect(ctx, x0, bovenkant, b, Math.min(onderkant, ZENIT) - bovenkant, zenit);
    rect(ctx, x0, Math.max(bovenkant, ZENIT), b, Math.max(0, Math.min(onderkant, 0) - Math.max(bovenkant, ZENIT)), bs[0][0]);
    if (bovenkant < ZENIT + 8 && onderkant > ZENIT - 8) overgang(ctx, x0, ZENIT - 8, b, 16, zenit, bs[0][0]);
    for (let i = 0; i < bs.length; i++) {
      const hh = i === bs.length - 1 ? g - y : Math.round(bs[i][1] * g);
      const a = Math.max(y, bovenkant), z = Math.min(y + hh, onderkant);
      if (z > a) rect(ctx, x0, a, b, z - a, bs[i][0]);
      if (i > 0 && y + 6 > bovenkant && y - 6 < onderkant) overgang(ctx, x0, y - 6, b, 12, bs[i - 1][0], bs[i][0]);
      y += hh;
    }
    // sterren en wolken per vak van 96 × 64 artpx (vast zaad per vak)
    const wf = dd.wolken || 1, niveau = dd.sterNiveau != null ? dd.sterNiveau : 1;
    const VX = 96, VY = 64;
    for (let j = Math.floor(y0 / VY) - 1; j * VY < onderkant; j++) {
      for (let i = Math.floor(x0 / VX) - 1; i * VX < x0 + b; i++) {
        const r = rng(zaad(i, j, 5));
        if (dd.sterren) {
          for (let n = 0; n < 9; n++) {
            const sx = i * VX + Math.floor(r() * VX), sy = j * VY + Math.floor(r() * VY), zichtbaar = r(), k = r(), groot = r() < 0.08;
            if (zichtbaar >= niveau || sy > g * 0.8) continue;
            if (groot) { rect(ctx, sx - 1, sy, 3, 1, 'goud.4'); rect(ctx, sx, sy - 1, 1, 3, 'goud.4'); px(ctx, sx, sy, 'creme.4'); }
            else px(ctx, sx, sy, k < 0.3 ? 'goud.4' : k < 0.5 ? 'creme.4' : 'titel.4');
          }
        }
        // wolken: hoger in de lucht wat dunner gezaaid; bij een heldere nacht verdwijnen ze met de sterren
        const kans = (wf > 2 ? 0.45 : 0.16) * (dd.sterren && wf <= 1 ? 1 - niveau : 1) * (j * VY < -300 ? 0.5 : 1);
        if (r() < kans && j * VY < g - 70) {
          const wb = (wf > 2 ? 44 : 32) + Math.floor(r() * 30);
          BU.wolk(ctx, i * VX + Math.floor(r() * (VX - 20)), j * VY + Math.floor(r() * (VY - 20)), wb, dd);
        }
      }
    }
  }

  // heuvels, verre bomenrij en de donkere strook vlak boven het gras (zelfde formules als de scène)
  function achtergrond(ctx, geo, dd, x0, b) {
    const nacht = dd.id === 'nacht', avond = dd.id === 'avond';
    const ver = dd.ver || (nacht ? 'titel.3' : avond ? 'lavendel.2' : 'blad.4');
    const dicht = dd.dicht || (nacht ? 'nacht.1' : avond ? 'lavendel.1' : 'blad.3');
    const og = BU.omg, g = geo.grondY;
    for (let x = x0; x < x0 + b; x++) {
      const hh = Math.round(34 + 14 * Math.sin(x / 140) + 8 * Math.sin(x / 53 + 1.3));
      rect(ctx, x, g - hh, 1, hh, ver);
      if (x % 2 === 0 && (x / 2) % 3 === 0) px(ctx, x, g - hh, tint(ver, 1));
    }
    const STAP = 14;
    for (let i = Math.floor(x0 / STAP) - 2; i * STAP < x0 + b + 20; i++) {
      const r = rng(zaad(i, 0, 9)), x = i * STAP + Math.floor(r() * 6), s = 10 + Math.floor(r() * 12), top = g - 14 - s - Math.floor(r() * 10);
      const kl = og ? og.boomrij(r, dicht) : dicht;
      ovaal(ctx, x, top, s + 4, s + 4, kl);
      if (!nacht) ovaal(ctx, x + 3, top + 1, Math.round(s / 2), Math.round(s / 3), tint(kl, 1));
      rect(ctx, x + Math.floor(s / 2), top + s, 2, g - top - s, tint(dicht, -1));
    }
    rect(ctx, x0, g - 16, b, 16, dicht);
    dither(ctx, x0, g - 16, b, 2, tint(dicht, nacht ? 0 : 1), 4);
  }

  // grond in doorsnede, oneindig naar opzij en naar beneden: steeds donkerdere aardlagen met stenen en wortels
  // [diepte, kleur, korrel, om de hoeveel pixels]: dieper donkerder, als aarde (bruin met een donkere korrel)
  const LAGEN = [[0, 'koffie.2'], [9, 'koffie.1'], [30, 'koffie.0'], [120, 'koffie.0', 'nacht.0', 4], [240, 'koffie.0', 'nacht.0', 2], [380, 'nacht.0', 'koffie.0', 4]];
  function grond(ctx, geo, dd, x0, y0, b, h) {
    const g = geo.grondY, a = Math.max(y0, g), z = y0 + h;
    if (z <= a) return;
    for (let i = 0; i < LAGEN.length; i++) {
      const van = g + LAGEN[i][0], tot = i + 1 < LAGEN.length ? g + LAGEN[i + 1][0] : Infinity;
      const p = Math.max(van, a), q = Math.min(tot, z);
      if (q > p) vlak(ctx, x0, p, b, q - p, LAGEN[i][1], LAGEN[i][2], LAGEN[i][3]);
      if (i > 0 && i < 3 && van - 2 >= a - 3 && van < z) dither(ctx, x0, van - 2, b, 3, LAGEN[i][1]);
    }
    // stenen en kluitjes per vak van 24 × 24 (in diepere lagen grover), wortels vlak onder de grasmat
    const V = 24;
    for (let j = Math.floor((a - g) / V); g + j * V < z; j++) {
      for (let i = Math.floor(x0 / V); i * V < x0 + b; i++) {
        const r = rng(zaad(i, j, 3)), diep = j * V;
        const n = diep < 30 ? 2 : 1 + (r() < 0.5 ? 1 : 0);
        for (let k = 0; k < n; k++) {
          const sx = i * V + Math.floor(r() * V), sy = g + 4 + diep + Math.floor(r() * V), s = diep > 120 ? 2 + Math.floor(r() * 3) : r() < 0.2 ? 3 : 2;
          if (sy < g + 4) continue;
          const kl = diep < 30 ? (r() < 0.5 ? 'koffie.3' : 'nacht.2') : diep < 120 ? (r() < 0.6 ? 'nacht.2' : 'koffie.2') : r() < 0.7 ? 'koffie.1' : 'nacht.3';
          rect(ctx, sx, sy, s + (s > 2 ? 1 : 0), s - 1, kl);
          px(ctx, sx, sy, tint(kl, 2));
        }
        if (diep < 30 && r() < 0.18) {          // een wortel die schuin naar beneden loopt
          let wx = i * V + Math.floor(r() * V), wy = g + 5;
          for (let k = 0; k < 10 + Math.floor(r() * 14); k++) { px(ctx, wx, wy, 'eik.1'); wy++; if (r() < 0.6) wx += r() < 0.5 ? -1 : 1; }
        }
      }
    }
    // grasmat met sprieten (seizoenskleuren uit de omgeving)
    if (g >= y0 - 4 && g < z) {
      const og = BU.omg, [g0, g1, g2] = og ? og.gras : ['blad.2', 'blad.3', 'blad.1'], r = rng(zaad(Math.floor(x0 / 64), 0, 11));
      rect(ctx, x0, g, b, 3, g0); rect(ctx, x0, g, b, 1, g1);
      dither(ctx, x0, g + 3, b, 2, g2);
      if (!og || og.halmen) for (let x = x0; x < x0 + b; x += 1 + Math.floor(r() * 3)) rect(ctx, x, g - 1 - Math.floor(r() * 3), 1, 3, r() < 0.4 ? g1 : g0);
    }
  }

  function teken(canvas, geo, dd, x0, y0, b, h) {
    canvas.width = Math.max(1, b); canvas.height = Math.max(1, h);
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.save();
    ctx.translate(-x0, -y0);
    BU.omg = dd.buiten || null;
    lucht(ctx, geo, dd, x0, y0, b, h);
    if (!geo.huis.omgeving && y0 < geo.grondY) achtergrond(ctx, geo, dd, x0, b);
    grond(ctx, geo, dd, x0, y0, b, h);
    BU.omg = null;
    ctx.restore();
  }
  return { teken };
})(window.PQ_PIX, window.PQ_HUISBUITEN);
