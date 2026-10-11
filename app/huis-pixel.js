// Huis-pixels: gedeelde tekenhulpjes voor huis-teken.js en huis-buiten.js. Harde pixels (fillRect op hele
// artpx), geen gradients of blur; arcering met pixelclusters en dithering. Kleuren alleen uit het palet en de
// rampen van kleding.js ("eik", "eik.3"). Leest PQ_HUISMODEL (kleur()).
window.PQ_PIX = (function (HM) {
  'use strict';
  const k = HM.kleur;

  function rect(ctx, x, y, b, h, kl) {
    if (b <= 0 || h <= 0 || !kl) return;
    ctx.fillStyle = k(kl);
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(b), Math.round(h));
  }
  const px = (ctx, x, y, kl) => rect(ctx, x, y, 1, 1, kl);
  // Andere tint uit dezelfde ramp: tint('eik', 1) = 'eik.3', tint('eik.3', -2) = 'eik.1'. Hex blijft hex.
  function tint(naam, d) {
    if (!naam || naam[0] === '#') return naam;
    const [n, s] = String(naam).split('.');
    return `${n}.${Math.max(0, Math.min(4, (s === undefined ? 2 : +s) + d))}`;
  }
  const donker = (naam, stap = 1) => tint(naam, -stap);
  const licht = (naam, stap = 1) => tint(naam, stap);
  // Vaste pseudo-willekeur, zodat textuur, sterren en grasprieten niet verspringen.
  function rng(zaad) {
    let s = (zaad * 2654435761) >>> 0;
    return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  }
  // Doorzichtig vlak (glas, lichtbaan): één effen tint, harde randen.
  function waas(ctx, x, y, b, h, kl, a) {
    ctx.globalAlpha = a; rect(ctx, x, y, b, h, kl); ctx.globalAlpha = 1;
  }
  // Dambordpatroon (50%) of een spaarzamer patroon (1 op n), voor schaduw en overgangen.
  function dither(ctx, x, y, b, h, kl, n = 2, fase = 0) {
    x = Math.round(x); y = Math.round(y);
    ctx.fillStyle = k(kl);
    for (let j = 0; j < h; j++) {
      for (let i = 0; i < b; i++) {
        const gx = x + i, gy = y + j;
        if (n === 2 ? ((gx + gy + fase) & 1) === 0 : ((gx + 2 * gy + fase) % n) === 0) ctx.fillRect(gx, gy, 1, 1);
      }
    }
  }
  // Overgang tussen twee kleurbanden met een 4x4-Bayermatrix: n rijen, van boven naar onder steeds meer 'onder'.
  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  function overgang(ctx, x, y, b, n, boven, onder) {
    const kb = k(boven), ko = k(onder);
    for (let j = 0; j < n; j++) {
      const f = (j + 0.5) / n, gy = Math.round(y) + j;
      for (let i = 0; i < b; i++) {
        const gx = Math.round(x) + i;
        ctx.fillStyle = BAYER[(gy & 3) * 4 + (gx & 3)] / 16 < f ? ko : kb;
        ctx.fillRect(gx, gy, 1, 1);
      }
    }
  }
  // Ovaal of cirkel in rijen (harde rand): vult per rij het stuk binnen de ellips.
  function ovaal(ctx, x, y, b, h, kl) {
    const rx = b / 2, ry = h / 2;
    for (let j = 0; j < h; j++) {
      const dy = (j + 0.5 - ry) / ry, w = Math.round(rx * Math.sqrt(Math.max(0, 1 - dy * dy)) * 2);
      rect(ctx, x + Math.round((b - w) / 2), y + j, w, 1, kl);
    }
  }
  // Lampenkap / afzuigkap: trapezium, smal boven en breed onder.
  function kap(ctx, x, y, b, h, kl) {
    for (let j = 0; j < h; j++) {
      const w = Math.round(b * (0.55 + 0.45 * (j + 1) / h));
      rect(ctx, x + Math.round((b - w) / 2), y + j, w, 1, kl);
    }
  }
  // Boog: rechthoek met een ronde bovenkant (hoofdbord, spiegel, vensterboog).
  function boog(ctx, x, y, b, h, kl) {
    const r = Math.min(b / 2, h);
    for (let j = 0; j < h; j++) {
      let w = b;
      if (j < r) { const dy = (r - j - 0.5) / r; w = Math.round(b - 2 * r * (1 - Math.sqrt(Math.max(0, 1 - dy * dy)))); }
      rect(ctx, x + Math.round((b - w) / 2), y + j, w, 1, kl);
    }
  }
  // Glas: lichte waas met twee diagonale reflectiestrepen (linksboven naar rechtsonder).
  function glas(ctx, x, y, b, h, kl = 'petrol.4', a = 0.28) {
    waas(ctx, x, y, b, h, kl, a);
    ctx.globalAlpha = 0.55;
    for (const [o, w] of [[Math.round(b * 0.18), 2], [Math.round(b * 0.18) + 5, 1]]) {
      for (let j = 0; j < h; j++) {
        const xx = x + o + Math.round(j * 0.6) - Math.round(h * 0.3);
        const a0 = Math.max(x, xx), a1 = Math.min(x + b, xx + w);
        if (a1 > a0) rect(ctx, a0, y + j, a1 - a0, 1, 'creme.4');
      }
    }
    ctx.globalAlpha = 1;
  }

  // ---------- outline (achteraf, op een los canvas) ----------
  // Elke dichte pixel aan de rand van het silhouet krijgt de outlinekleur; pixels met alfa < 200 (glas) tellen
  // als leeg en worden niet gekleurd. Boven: nacht.1 (iets zachter), elders titel.1.
  function omlijn(c) {
    const ctx = c.getContext('2d'), w = c.width, h = c.height;
    if (!w || !h) return;
    const d = ctx.getImageData(0, 0, w, h), a = d.data;
    const dicht = (x, y) => x >= 0 && y >= 0 && x < w && y < h && a[(y * w + x) * 4 + 3] >= 200;
    const rand = [];
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (!dicht(x, y)) continue;
        const boven = !dicht(x, y - 1);
        if (boven || !dicht(x, y + 1) || !dicht(x - 1, y) || !dicht(x + 1, y)) rand.push([x, y, boven]);
      }
    }
    const kb = hexRgb(k('nacht.1')), ko = hexRgb(k('titel.1'));
    for (const [x, y, boven] of rand) {
      const i = (y * w + x) * 4, kl = boven ? kb : ko;
      a[i] = kl[0]; a[i + 1] = kl[1]; a[i + 2] = kl[2]; a[i + 3] = 255;
    }
    ctx.putImageData(d, 0, 0);
  }
  function hexRgb(hex) {
    const n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  return { rect, px, tint, donker, licht, rng, waas, dither, overgang, ovaal, kap, boog, glas, omlijn, kleur: k };
})(window.PQ_HUISMODEL);

// ---------- materialen (muren, vloeren, gevel) ----------
// Elk materiaal vult een rechthoek in artpx; zaad houdt de willekeur vast per kamer.
window.PQ_PIX.mat = (function (P) {
  'use strict';
  const { rect, px, tint, rng, dither } = P;
  function stuc(ctx, x, y, b, h, kl, pk, zaad) {
    rect(ctx, x, y, b, h, kl);
    // Stucwerk: spaarzame, korte clusters in een iets donkerder tint (geen ruis).
    const r = rng(zaad || 1), n = Math.round(b * h / 90);
    for (let i = 0; i < n; i++) {
      const xx = x + Math.floor(r() * b), yy = y + Math.floor(r() * h), l = r() < 0.4 ? 3 : r() < 0.5 ? 2 : 1;
      rect(ctx, xx, yy, Math.min(l, x + b - xx), 1, pk || tint(kl, -1));
    }
  }
  function baksteen(ctx, x, y, b, h, kl, voeg, zaad) {
    rect(ctx, x, y, b, h, voeg);
    const r = rng(zaad || 3), tinten = [kl, kl, tint(kl, -1), 'bordeaux.2', tint(kl, 1)];
    for (let j = 0, rij = 0; j < h; j += 3, rij++) {
      for (let i = -((rij % 2) * 4); i < b; i += 9) {
        const a = Math.max(0, i), e = Math.min(b, i + 8);
        if (e <= a) continue;
        const t = tinten[Math.floor(r() * tinten.length)];
        rect(ctx, x + a, y + j, e - a, Math.min(2, h - j), t);
        if (e - a > 3) px(ctx, x + a, y + j, tint(t, 1));
      }
    }
  }
  function lamellen(ctx, x, y, b, h, kl, mod = 5) {
    rect(ctx, x, y, b, h, tint(kl, -2));
    for (let i = 0; i < b; i += mod) {
      const w = Math.min(mod - 1, b - i);
      rect(ctx, x + i, y, w, h, kl);
      rect(ctx, x + i, y, 1, h, tint(kl, 1));
      if (w > 2) rect(ctx, x + i + w - 1, y, 1, h, tint(kl, -1));
    }
  }
  function tegels(ctx, x, y, b, h, kl, voeg, tb = 8, th = 8, verspring = false, zaad = 5) {
    rect(ctx, x, y, b, h, kl);
    const r = rng(zaad);
    for (let j = 0, rij = 0; j < h; j += th, rij++) {
      const o = verspring && rij % 2 ? Math.floor(tb / 2) : 0;
      for (let i = -o; i < b; i += tb) {
        const a = Math.max(0, i), e = Math.min(b, i + tb - 1), hh = Math.min(th - 1, h - j);
        if (e <= a || hh <= 0) continue;
        if (r() < 0.18) rect(ctx, x + a, y + j, e - a, hh, tint(kl, -1));
        rect(ctx, x + a, y + j, e - a, 1, tint(kl, 1));
        rect(ctx, x + a, y + j, 1, hh, tint(kl, 1));
      }
      if (j + th - 1 < h) rect(ctx, x, y + j + th - 1, b, 1, voeg);
      for (let i = -o + tb - 1; i < b; i += tb) if (i >= 0) rect(ctx, x + i, y + j, 1, Math.min(th, h - j), voeg);
    }
  }
  // Natuursteen: grote platen met een paar dunne aders.
  function natuursteen(ctx, x, y, b, h, kl, voeg, zaad) {
    tegels(ctx, x, y, b, h, kl, voeg, 32, 24, true, zaad);
    const r = rng(zaad + 7);
    for (let i = 0; i < b * h / 500; i++) {
      let xx = x + Math.floor(r() * b), yy = y + Math.floor(r() * h);
      for (let s = 0; s < 6 + r() * 6; s++) { if (xx < x + b && yy < y + h) px(ctx, xx, yy, tint(kl, -1)); xx += 1; yy += r() < 0.5 ? 1 : 0; }
    }
  }
  function marmer(ctx, x, y, b, h, kl, zaad) {
    rect(ctx, x, y, b, h, kl);
    const r = rng(zaad || 9);
    for (let i = 0; i < Math.max(2, b / 14); i++) {
      let xx = x + Math.floor(r() * b), yy = y;
      while (yy < y + h) { px(ctx, xx, yy, r() < 0.5 ? tint(kl, -1) : 'nacht.4'); xx += r() < 0.6 ? 1 : 2; yy++; if (xx >= x + b) break; }
    }
  }
  // Vloerbanden (8 artpx): bovenrand licht, onderaan een donkere lijn.
  function vloer(ctx, x, y, b, h, v, zaad) {
    const kl = v.kleur, naad = v.naad || tint(kl, -2), r = rng(zaad || 2), p = v.patroon;
    rect(ctx, x, y, b, h, kl);
    if (p === 'visgraat') {
      for (let j = 1; j < h; j++) {
        for (let i = 0; i < b; i++) {
          const gx = x + i, g = Math.floor(gx / 4), s = g % 2 ? 1 : -1, q = gx + s * j;
          const naadHier = ((q % 4) + 4) % 4 === 0;
          const toon = (((Math.floor(q / 4) * 7 + g * 3) % 3) + 3) % 3;
          px(ctx, gx, y + j, naadHier ? naad : toon === 0 ? tint(kl, 1) : toon === 1 ? kl : tint(kl, -1));
        }
      }
    } else if (p === 'planken' || p === 'vlonder') {
      for (let j = 1, rij = 0; j < h; j += 2, rij++) {
        rect(ctx, x, y + j, b, 2, rij % 2 ? tint(kl, -1) : kl);
        for (let i = (rij * 13) % 37; i < b; i += p === 'vlonder' ? 30 : 37) rect(ctx, x + i, y + j, 1, 2, naad);
        for (let i = 0; i < b / 9; i++) rect(ctx, x + Math.floor(r() * b), y + j + (r() < 0.5 ? 0 : 1), 3, 1, tint(kl, r() < 0.5 ? 1 : -1));
      }
    } else if (p === 'tegels' || p === 'terras') {
      const tb = p === 'terras' ? 20 : 16;
      for (let i = 0; i < b; i += tb) {
        if (r() < 0.3) rect(ctx, x + i, y + 1, tb - 1, h - 1, tint(kl, -1));
        rect(ctx, x + i + tb - 1, y + 1, 1, h - 1, naad);
      }
      rect(ctx, x, y + Math.floor(h / 2) + 1, b, 1, naad);
    } else if (p === 'klinkers') {
      for (let j = 1, rij = 0; j < h; j += 3, rij++) {
        for (let i = -(rij % 2) * 3; i < b; i += 6) {
          const a = Math.max(0, i), e = Math.min(b, i + 5);
          if (e > a) rect(ctx, x + a, y + j, e - a, 2, ['creme.1', 'nacht.4', 'creme.0', 'eik.4'][Math.floor(r() * 4)]);
        }
      }
    } else if (p === 'gras') {
      for (let i = 0; i < b; i++) {
        if (r() < 0.35) rect(ctx, x + i, y + 1 + Math.floor(r() * (h - 2)), 1, 1, tint(kl, r() < 0.5 ? 1 : -1));
        if (r() < 0.45) rect(ctx, x + i, y - 1 - Math.floor(r() * 2), 1, 2 + Math.floor(r() * 2), r() < 0.5 ? kl : tint(kl, 1));
      }
      dither(ctx, x, y + h - 2, b, 2, tint(kl, -1));
    }
    rect(ctx, x, y, b, 1, v.licht || tint(kl, 1));
    rect(ctx, x, y + h - 1, b, 1, tint(kl, -2));
  }
  return { stuc, baksteen, lamellen, tegels, natuursteen, marmer, vloer };
})(window.PQ_PIX);
