// Huis-tekenwerk: kamers (muren, vloeren, ramen, gordijnen, lampen, details), doorgesneden gevel, daken, trappen,
// schaduw en licht, placeholder-meubels en de mini-preview. Alles op canvas in artpx met harde randen; de pagina
// schaalt met image-rendering: pixelated. Kleuren alleen uit het palet en de rampen van kleding.js.
// Leest PQ_HUIS, PQ_HUISMODEL, PQ_PIX (huis-pixel.js) en PQ_HUISBUITEN (huis-buiten.js).
window.PQ_HUISTEKEN = (function (H, HM, P, BU) {
  'use strict';
  const M = H.maten, { rect, px, tint, donker, rng, waas, dither, ovaal, kap, boog, glas } = P, MAT = P.mat;
  const isModern = geo => geo.huis.stijl === 'modern';
  const vloerTop = kam => kam.y + kam.h - M.vloer;

  // ---------- muren ----------
  function tekenMuur(ctx, kam, x, y, b, h, m, zaad) {
    const kl = m.kleur, pk = m.patroonkleur || tint(kl, -1), p = m.patroon;
    if (p === 'lamellen') { MAT.lamellen(ctx, x, y, b, h, kl, 5); return; }
    if (p === 'tegels') { MAT.tegels(ctx, x, y, b, h, kl, pk, 8, 8, false, zaad); return; }
    if (p === 'natuursteen') { MAT.natuursteen(ctx, x, y, b, h, kl, pk, zaad); return; }
    MAT.stuc(ctx, x, y, b, h, kl, pk, zaad);
    if (p === 'behang') {
      for (let i = x + 3; i < x + b; i += 8) { rect(ctx, i, y, 1, h, pk); for (let j = y + (i % 16 ? 4 : 0); j < y + h; j += 8) px(ctx, i + 4, j, pk); }
    }
  }
  // Patroon met een hoogte (lambrisering, metrotegels tot halverwege) onderaan de muur.
  function tekenOnderwand(ctx, kam, m, zaad) {
    const onder = vloerTop(kam) - M.plint, tot = m.tot || 0, top = onder - tot, pk = m.patroonkleur || tint(m.kleur, -1);
    if (!tot || !['lambrisering', 'metro', 'tegels'].includes(m.patroon)) return;
    if (m.patroon === 'metro') {
      MAT.tegels(ctx, kam.x, top, kam.b, tot, m.kleur, pk, 8, 4, true, zaad);
      rect(ctx, kam.x, top - 2, kam.b, 2, 'creme.4'); rect(ctx, kam.x, top - 1, kam.b, 1, 'creme.2');
      return;
    }
    if (m.patroon === 'tegels') { MAT.tegels(ctx, kam.x, top, kam.b, tot, m.kleur, pk, 8, 8, false, zaad); return; }
    // lambrisering: panelen met een lichte bovenrand en een schaduwnaad, en een lijst erboven
    const vak = tint(m.kleur, 0), lijst = tint(pk, 1);
    rect(ctx, kam.x, top, kam.b, tot, lijst);
    for (let i = kam.x + 4; i + 20 < kam.x + kam.b; i += 24) {
      rect(ctx, i, top + 6, 20, tot - 11, vak);
      rect(ctx, i, top + 6, 20, 1, pk); rect(ctx, i, top + 6, 1, tot - 11, pk);
      rect(ctx, i, top + tot - 6, 20, 1, 'creme.4'); rect(ctx, i + 19, top + 6, 1, tot - 11, 'creme.4');
    }
    rect(ctx, kam.x, top - 3, kam.b, 3, lijst); rect(ctx, kam.x, top - 3, kam.b, 1, 'creme.4'); rect(ctx, kam.x, top, kam.b, 1, pk);
  }

  // ---------- ramen ----------
  // Uitzicht: de lucht op die hoogte, heuvels en een bomenrij onderaan; 's nachts sterren.
  function uitzicht(ctx, geo, x, y, b, h, dd) {
    const nacht = dd.id === 'nacht', avond = dd.id === 'avond';
    const ver = dd.ver || (nacht ? 'titel.3' : avond ? 'lavendel.2' : 'blad.4'), dicht = dd.dicht || (nacht ? 'nacht.1' : avond ? 'lavendel.1' : 'blad.3');
    // twee lichtfases tegelijk (vloeiend verloop): per pixel gemengd met dezelfde dither als de lucht buiten
    if (dd.mengsel > 0.004 && dd.banden2) { for (let j = 0; j < h; j++) for (let i = 0; i < b; i++) px(ctx, x + i, y + j, BU.luchtKleur(dd, y + j, geo, x + i)); }
    else for (let j = 0; j < h; j++) rect(ctx, x, y + j, b, 1, BU.luchtKleur(dd, y + j, geo));
    for (let i = 0; i < b; i++) {
      const gx = x + i, heuvel = geo.grondY - (34 + 14 * Math.sin(gx / 140) + 8 * Math.sin(gx / 53 + 1.3));
      const boom = geo.grondY - 22 - 7 * Math.abs(Math.sin(gx / 6.5)) - 5 * Math.abs(Math.sin(gx / 17));
      const a = Math.max(y, Math.round(heuvel)), c = Math.max(y, Math.round(boom));
      if (a < y + h) rect(ctx, gx, a, 1, y + h - a, ver);
      if (c < y + h) rect(ctx, gx, c, 1, y + h - c, dicht);
    }
    if (dd.sterren) { const r = rng(x); for (let i = 0; i < b * h / 60; i++) px(ctx, x + Math.floor(r() * b), y + Math.floor(r() * h * 0.5), 'creme.4'); }
  }
  function tekenRaam(ctx, geo, kam, r, dd) {
    const modern = isModern(geo), x = kam.x + r.x, y = kam.y + (r.y != null ? r.y : M.raam_y), b = r.b, h = r.h || M.raam_h;
    const muur = kam.muur.kleur;
    if (!modern) { rect(ctx, x - 4, y - 4, b + 8, h + 8, tint(muur, -1)); }
    uitzicht(ctx, geo, x, y, b, h, dd);
    glas(ctx, x, y, b, h, 'creme.4', 0.08);
    if (modern) {
      const lijn = 'titel.2';
      rect(ctx, x - 2, y - 2, b + 4, 2, lijn); rect(ctx, x - 2, y + h, b + 4, 2, lijn);
      rect(ctx, x - 2, y, 2, h, lijn); rect(ctx, x + b, y, 2, h, lijn);
      const n = Math.max(1, Math.round(b / 34));
      for (let i = 1; i < n; i++) rect(ctx, x + Math.round(i * b / n), y, 1, h, lijn);
      if (h > 60) rect(ctx, x, y + h - 26, b, 1, lijn);
      rect(ctx, x - 2, y - 2, b + 4, 1, 'titel.4');
    } else {
      const kz = 'creme.4', sch = 'creme.2';
      rect(ctx, x - 3, y - 3, b + 6, 3, kz); rect(ctx, x - 3, y + h, b + 6, 2, kz);
      rect(ctx, x - 3, y, 3, h, kz); rect(ctx, x + b, y, 3, h, kz);
      rect(ctx, x, y, b, 1, sch); rect(ctx, x, y, 1, h, sch);
      if (b >= 24) rect(ctx, x + Math.floor(b / 2) - 1, y, 2, h, kz);
      if (h >= 24) rect(ctx, x, y + Math.floor(h * 0.38), b, 2, kz);
      rect(ctx, x - 6, y + h + 2, b + 12, 3, 'eik.3'); rect(ctx, x - 6, y + h + 2, b + 12, 1, 'eik.4'); rect(ctx, x - 6, y + h + 5, b + 12, 1, tint(muur, -2));
    }
    // reflectiestrepen over het glas
    ctx.globalAlpha = 0.5;
    for (let j = 0; j < h; j++) {
      const o = Math.round(b * 0.15) + Math.round(j * 0.5) - Math.round(h * 0.25);
      for (const [d, w] of [[0, 2], [5, 1]]) {
        const a0 = Math.max(x, x + o + d), a1 = Math.min(x + b, x + o + d + w);
        if (a1 > a0) rect(ctx, a0, y + j, a1 - a0, 1, 'creme.4');
      }
    }
    ctx.globalAlpha = 1;
    if (window.PQ_OMGEVINGTEKEN) window.PQ_OMGEVINGTEKEN.raam(ctx, x, y, b, h, dd);   // druppels, sneeuw op de vensterbank
    gordijn(ctx, kam, x, y, b, h, modern);
  }
  // Gordijnen: klassiek twee stofpanelen aan een roede; modern een vitrage aan een plafondrail;
  // badkamers een half neergelaten rolgordijn.
  const STOF = { woonkamer: 'abrikoos.3', woonkeuken: 'koraal.3', slaapkamer: 'lavendel.2', slaaphoek: 'lavendel.2', werkkamer: 'blad.2', logeerkamer: 'abrikoos.3', master: 'creme.2' };
  function gordijn(ctx, kam, x, y, b, h, modern) {
    if (kam.type === 'badkamer' || kam.type === 'ensuite') {
      const d = Math.round(h * 0.35);
      rect(ctx, x, y, b, d, 'creme.3'); dither(ctx, x, y, b, d, 'creme.2', 5); rect(ctx, x, y + d, b, 2, 'nacht.1');
      return;
    }
    const kl = STOF[kam.type];
    if (!kl || kam.type === 'keuken') return;
    const vloer = vloerTop(kam) - M.plint;
    if (modern) {
      rect(ctx, x - 10, kam.y, b + 20, 2, 'titel.2');
      const w = 12, eind = Math.min(vloer, y + h + 6);
      ctx.globalAlpha = 0.8;
      for (const sx of [x - 10, x + b - 2]) {
        rect(ctx, sx, kam.y + 2, w, eind - kam.y - 2, 'creme.4');
        for (let i = 2; i < w; i += 3) rect(ctx, sx + i, kam.y + 2, 1, eind - kam.y - 2, 'creme.3');
      }
      ctx.globalAlpha = 1;
      return;
    }
    const w = Math.max(7, Math.round(b * 0.22)), top = y - 8, eind = Math.min(vloer, y + h + 14);
    rect(ctx, x - 9, top, b + 18, 2, 'goud.2'); rect(ctx, x - 11, top - 1, 3, 4, 'goud.3'); rect(ctx, x + b + 8, top - 1, 3, 4, 'goud.3');
    for (const sx of [x - 8, x + b + 8 - w]) {
      rect(ctx, sx, top + 2, w, eind - top - 2, kl);
      for (let i = 1; i < w; i += 3) { rect(ctx, sx + i, top + 2, 1, eind - top - 2, tint(kl, -1)); rect(ctx, sx + i + 1, top + 2, 1, eind - top - 2, tint(kl, 1)); }
      rect(ctx, sx, eind - 1, w, 1, tint(kl, -1));
      rect(ctx, sx, y + Math.round(h * 0.55), w, 2, tint(kl, -1));
    }
  }

  // ---------- plafondlampen en kleine details ----------
  // lichten: [{ x, y, r, kegel?, grond? }] voor de lichtlaag ('s avonds en 's nachts).
  function tekenLampen(ctx, kam, dd, lichten) {
    const aan = !!dd.lampen, s = kam.lampen;
    if (s === 'spots') {
      for (let x = kam.x + 24; x < kam.x + kam.b - 12; x += 48) {
        rect(ctx, x - 1, kam.y, 5, 2, 'nacht.3'); rect(ctx, x, kam.y + 1, 3, 1, aan ? 'goud.4' : 'creme.4');
        if (aan) lichten.push({ x: x + 1, y: kam.y + 2, r: 20, kegel: true, grond: vloerTop(kam) + 4 });
      }
    } else if (s === 'hang' || s === 'kroon') {
      const x = kam.x + Math.round(kam.b / 2), l = s === 'kroon' ? 18 : 24;
      rect(ctx, x, kam.y, 1, l, 'nacht.1'); rect(ctx, x - 3, kam.y, 7, 2, 'nacht.2');
      if (s === 'kroon') {
        rect(ctx, x - 9, kam.y + l, 19, 2, 'goud.2'); rect(ctx, x - 1, kam.y + l - 3, 3, 8, 'goud.2');
        for (const dx of [-9, -1, 8]) { rect(ctx, x + dx, kam.y + l - 4, 2, 4, 'creme.4'); rect(ctx, x + dx, kam.y + l - 6, 2, 2, aan ? 'goud.4' : 'creme.3'); }
        ovaal(ctx, x - 2, kam.y + l + 4, 5, 4, 'goud.3');
      } else {
        kap(ctx, x - 7, kam.y + l, 15, 7, 'creme.3'); rect(ctx, x - 6, kam.y + l, 13, 1, 'creme.4');
        rect(ctx, x - 7, kam.y + l + 6, 15, 1, 'creme.1'); rect(ctx, x - 2, kam.y + l + 7, 5, 2, aan ? 'goud.4' : 'creme.4');
      }
      if (aan) lichten.push({ x, y: kam.y + l + 6, r: 38, grond: vloerTop(kam) + 4 });
    }
  }
  function tekenDetails(ctx, geo, kam) {
    const modern = isModern(geo), v = vloerTop(kam) - M.plint, kl = modern ? 'nacht.1' : 'creme.4', rand = modern ? 'nacht.3' : 'creme.1';
    const doos = (x, y, b, h) => { rect(ctx, x, y, b, h, rand); rect(ctx, x + 1, y + 1, b - 2, h - 2, kl); };
    doos(kam.x + 5, v - 48, 4, 5);
    for (const f of [0.36, 0.78]) { const x = kam.x + Math.round(kam.b * f); doos(x, v - 13, 5, 5); px(ctx, x + 1, v - 11, rand); px(ctx, x + 3, v - 11, rand); }
    if (['woonkamer', 'woonkeuken'].includes(kam.type)) {
      const x = kam.x + kam.b - 16;
      doos(x, v - 70, 6, 7); rect(ctx, x + 2, v - 68, 2, 2, modern ? 'goud.3' : 'goud.2');
    }
    // radiator onder een klassiek raam
    if (!modern) {
      for (const r of kam.ramen) {
        const ry = kam.y + (r.y != null ? r.y : M.raam_y) + (r.h || M.raam_h);
        if (v - ry < 38 || r.b < 24) continue;
        const x = kam.x + r.x + 3, b = r.b - 6;
        rect(ctx, x, v - 30, b, 22, 'creme.2');
        for (let i = 1; i < b - 1; i += 3) { rect(ctx, x + i, v - 29, 2, 20, 'creme.4'); px(ctx, x + i + 1, v - 29, 'creme.3'); }
        rect(ctx, x, v - 8, 2, 8, 'creme.1'); rect(ctx, x + b - 2, v - 8, 2, 8, 'creme.1');
      }
    }
  }
  // Ambient occlusion: donkere band onder het plafond en in de hoeken, gedithered.
  function tekenAO(ctx, kam) {
    const m = kam.muur.kleur;
    rect(ctx, kam.x, kam.y, kam.b, 2, tint(m, -2)); dither(ctx, kam.x, kam.y + 2, kam.b, 2, tint(m, -1)); dither(ctx, kam.x, kam.y + 4, kam.b, 2, tint(m, -1), 4);
    const h = vloerTop(kam) - kam.y;
    for (const [x, f] of [[kam.x, 0], [kam.x + kam.b - 2, 1]]) { rect(ctx, x + (f ? 1 : 0), kam.y, 1, h, tint(m, -1)); dither(ctx, x + (f ? 0 : 1), kam.y, 1, h, tint(m, -1)); }
  }
  // Lichtbanen door de ramen overdag: een schuine baan van het raam naar de vloer.
  function tekenLichtbanen(ctx, kam, dd) {
    if (dd.lichtbanen === false || !['dag', 'ochtend'].includes(dd.id)) return;
    const kl = dd.id === 'ochtend' ? 'abrikoos.4' : 'creme.4', v = vloerTop(kam) + 2;
    for (const r of kam.ramen) {
      const y0 = kam.y + (r.y != null ? r.y : M.raam_y), h = r.h || M.raam_h, x0 = kam.x + r.x;
      ctx.globalAlpha = 0.14;
      for (let y = y0 + Math.round(h * 0.4); y < v; y++) {
        const o = Math.round((y - y0) * 0.55), a = Math.max(kam.x, x0 + o), e = Math.min(kam.x + kam.b, x0 + r.b + o);
        if (e > a) rect(ctx, a, y, e - a, 1, kl);
      }
      ctx.globalAlpha = 0.18;
      const o = Math.round((v - y0) * 0.55), a = Math.max(kam.x, x0 + o), e = Math.min(kam.x + kam.b, x0 + r.b + o);
      if (e > a) rect(ctx, a, v - 2, e - a, 4, kl);
      ctx.globalAlpha = 1;
    }
  }

  // ---------- kamer ----------
  function tekenKamer(ctx, geo, kam, dd, lichten) {
    if (kam.buiten) {
      if (kam.type === 'balkon') BU.tekenBalkon(ctx, geo, kam);
      else if (kam.overkapping) BU.tekenTerras(ctx, geo, kam, dd, lichten);
      else if (kam.carport) BU.tekenCarport(ctx, geo, kam, dd, lichten);
      else if (geo.huis.omgeving === 'bos') MAT.vloer(ctx, kam.x, vloerTop(kam), kam.b, M.vloer, kam.vloer, kam.x);
      else BU.tekenTuin(ctx, geo, kam, dd, lichten);
      return;
    }
    const zaad = kam.x * 7 + kam.y;
    tekenMuur(ctx, kam, kam.x, kam.y, kam.b, kam.h, kam.muur, zaad);
    tekenOnderwand(ctx, kam, kam.muur, zaad);
    if (kam.accent) {
      const a = kam.accent, x = kam.x + Math.max(0, a.x), b = Math.min(a.b, kam.b - a.x);
      tekenMuur(ctx, kam, x, kam.y, b, vloerTop(kam) - kam.y, { kleur: a.kleur, patroon: a.patroon }, zaad + 1);
      rect(ctx, x - 1, kam.y, 1, vloerTop(kam) - kam.y, tint(a.kleur, -2)); rect(ctx, x + b, kam.y, 1, vloerTop(kam) - kam.y, tint(a.kleur, -2));
    }
    for (const r of kam.ramen) tekenRaam(ctx, geo, kam, r, dd);
    if (!kam.trap) tekenDetails(ctx, geo, kam);
    const pt = vloerTop(kam) - M.plint, pl = kam.plint || 'creme.3';
    rect(ctx, kam.x, pt, kam.b, M.plint, pl); rect(ctx, kam.x, pt, kam.b, 1, tint(pl, 1)); rect(ctx, kam.x, pt + M.plint - 1, kam.b, 1, tint(pl, -1));
    MAT.vloer(ctx, kam.x, vloerTop(kam), kam.b, M.vloer, kam.vloer, zaad);
    tekenAO(ctx, kam);
    tekenLampen(ctx, kam, dd, lichten);
    tekenLichtbanen(ctx, kam, dd);
  }

  // ---------- trappen ----------
  // Zwevende eiken treden van de vloer van de trapkamer tot de vloer van de trapkamer erboven (door de vloerplaat),
  // met een glazen balustrade langs de treden en rond het trapgat boven.
  function tekenTrappen(ctx, geo) {
    for (const kam of geo.kamers.filter(k => k.trap)) {
      const o = geo.kamers.find(x => x.trap && x.verdieping === kam.verdieping + 1 && Math.abs(x.box.x - kam.box.x) < 8);
      if (!o) continue;
      const modern = isModern(geo), v0 = kam.y + kam.h - M.vloerlijn, v1 = o.y + o.h - M.vloerlijn;
      const gat = o.y + o.h - M.vloer;
      tekenMuur(ctx, kam, kam.x, gat, kam.b, kam.y - gat, kam.muur, kam.x + 3);
      const n = Math.round((v0 - v1) / 8), w = (kam.b - 10) / n;
      const trede = i => ({ x: kam.x + Math.round(i * w), y: v0 - 8 * (i + 1) });
      for (let i = 0; i < n; i++) {
        const t = trede(i);
        dither(ctx, t.x + 2, t.y + 3, Math.ceil(w) + 3, 3, tint(kam.muur.kleur, -1));
      }
      for (let i = 0; i < n; i++) {
        const t = trede(i), b = Math.ceil(w) + 4;
        rect(ctx, t.x, t.y, b, 3, 'eik.3'); rect(ctx, t.x, t.y, b, 1, 'eik.4'); rect(ctx, t.x, t.y + 2, b, 1, 'eik.1'); px(ctx, t.x + b - 1, t.y + 1, 'eik.2');
      }
      // glazen balustrade langs de treden (100 cm), handregel erboven
      ctx.globalAlpha = 0.26;
      for (let xx = kam.x; xx < kam.x + kam.b - 8; xx++) {
        const i = Math.min(n - 1, Math.floor((xx - kam.x) / w)), ty = v0 - 8 * (i + 1);
        rect(ctx, xx, ty - 44, 1, 44, 'petrol.4');
      }
      ctx.globalAlpha = 1;
      for (let xx = kam.x; xx < kam.x + kam.b - 8; xx++) {
        const y = Math.round(v0 - 8 - (xx - kam.x) / w * 8) - 46;
        rect(ctx, xx, y, 1, 2, modern ? 'nacht.1' : 'eik.2');
        if ((xx - kam.x) % 9 === 3) { ctx.globalAlpha = 0.5; rect(ctx, xx, y + 6, 1, 20, 'creme.4'); ctx.globalAlpha = 1; }
      }
      // boven: trapgat met een glazen hekje, rechts het bordes
      const bordes = 14;
      MAT.vloer(ctx, o.x + o.b - bordes, gat, bordes, M.vloer, o.vloer, o.x);
      glas(ctx, o.x, v1 - 44, o.b - bordes, 44, 'petrol.4', 0.26);
      rect(ctx, o.x, v1 - 46, o.b - bordes + 2, 2, modern ? 'nacht.1' : 'eik.2');
      rect(ctx, o.x + o.b - bordes, v1 - 46, 2, 46, modern ? 'nacht.1' : 'eik.2');
    }
  }

  // ---------- doorgesneden gevel ----------
  // Klassiek: baksteen, een houten balklaag met balkkoppen en een stucplafond. Modern: wit stucwerk, betonnen vloer,
  // boven aan de buitenkant houten lamellen. Onderaan elke muur een natuurstenen plint. pui: een glazen schuifpui.
  function wand(ctx, geo, x, y, b, h, v, buitenkant, romp) {
    if (isModern(geo) || (romp && romp !== geo.huis.romp)) {
      if (isModern(geo) && buitenkant && v > 0) { MAT.lamellen(ctx, x, y, b, h, 'eik.3', 3); return; }
      MAT.stuc(ctx, x, y, b, h, romp || 'creme.3', 'creme.2', x + y);
      rect(ctx, x + Math.floor(b / 2), y, 1, h, 'creme.2');
    } else MAT.baksteen(ctx, x, y, b, h, romp || 'koraal.1', 'bordeaux.3', x * 3 + y);
  }
  function plaat(ctx, geo, x, y, b) {
    if (isModern(geo)) {
      MAT.stuc(ctx, x, y, b, M.vloerplaat, 'creme.2', 'creme.1', x + y);
      rect(ctx, x, y, b, 1, 'eik.3'); rect(ctx, x, y + M.vloerplaat - 1, b, 1, 'creme.3');
      return;
    }
    rect(ctx, x, y, b, 2, 'eik.2'); rect(ctx, x, y, b, 1, 'eik.3');
    rect(ctx, x, y + 2, b, 4, 'koffie.2');
    for (let i = x + 4; i < x + b - 4; i += 16) { rect(ctx, i, y + 2, 5, 4, 'eik.1'); px(ctx, i, y + 2, 'eik.2'); }
    rect(ctx, x, y + 6, b, 2, 'creme.3'); rect(ctx, x, y + 7, b, 1, 'creme.2');
  }
  function plint(ctx, x, y, b, h, zaad) { MAT.tegels(ctx, x, y, b, h, 'nacht.4', 'nacht.2', 12, 4, true, zaad); }
  function pui(ctx, geo, x, y, dd) {
    const top = y + M.vloerplaat + 6, vloer = y + geo.P - M.vloer + 1;
    wand(ctx, geo, x, y, M.muur, top - y, 0, false);
    glas(ctx, x, top, M.muur, vloer - top, 'petrol.4', 0.3);
    rect(ctx, x, top, M.muur, 1, 'titel.2'); rect(ctx, x, top, 1, vloer - top, 'titel.2');
    rect(ctx, x + M.muur - 1, top, 1, vloer - top, 'titel.2'); rect(ctx, x + 3, top, 2, vloer - top, 'titel.2');
    rect(ctx, x, vloer, M.muur, M.vloer - 1, 'nacht.1'); rect(ctx, x, vloer, M.muur, 1, 'nacht.3');
  }
  function tekenRomp(ctx, geo, dd) {
    for (const kam of geo.kamers) {
      if (kam.buiten) continue;
      const y = geo.plaatY(kam.verdieping);
      plaat(ctx, geo, kam.box.x, y, kam.box.b + M.muur);
      if (!kam.verdieping) plint(ctx, kam.box.x, y + geo.P, kam.box.b + M.muur, M.vloerplaat, kam.box.x);
      const eerste = !geo.kamers.some(o => o.verdieping === kam.verdieping && !o.buiten && o.box.x + o.box.b === kam.box.x);
      if (kam.pui === 'links') pui(ctx, geo, kam.box.x, y, dd);
      else wand(ctx, geo, kam.box.x, y, M.muur, geo.P, kam.verdieping, eerste, kam.romp);
      if (!kam.verdieping && kam.pui !== 'links') plint(ctx, kam.box.x, y + geo.P - 10, M.muur, 10, kam.box.x + 1);
      if (eerste && kam.pui !== 'links') rect(ctx, kam.box.x, y, 1, geo.P + M.vloerplaat, 'titel.3');
    }
    for (let v = 0; v < geo.F; v++) {
      for (const [, b] of geo.rijen(v)) {
        const y = geo.plaatY(v);
        const laatste = geo.kamers.find(k => k.verdieping === v && !k.buiten && k.box.x + k.box.b + M.muur === b);
        wand(ctx, geo, b - M.muur, y, M.muur, geo.P + M.vloerplaat, v, true, laatste && laatste.romp);
        if (!v) plint(ctx, b - M.muur, y + geo.P - 10, M.muur, 10, b);
        rect(ctx, b - 1, y, 1, geo.P + M.vloerplaat, 'titel.3');
      }
    }
  }

  // ---------- daken ----------
  // Pannendak in vooraanzicht: schuine rijen pannen met schaduw onder elke rij, witte windveren, nokvorsten,
  // een zinken goot, een bakstenen schoorsteen en een dakraam.
  // Dakkapel (klassiek): witte houten wangen, een raam met roedes en een plat zinken dakje met boeiboord.
  function dakkapel(ctx, geo, x, voet, dd) {
    const b = 40, h = 38, top = voet - h;
    rect(ctx, x, top, b, h, 'creme.4'); rect(ctx, x + b - 3, top, 3, h, 'creme.2'); rect(ctx, x, top, 1, h, 'creme.3');
    for (let j = top + 3; j < voet; j += 4) rect(ctx, x + 1, j, b - 4, 1, 'creme.3');
    uitzicht(ctx, geo, x + 8, top + 9, 24, 20, dd);
    rect(ctx, x + 6, top + 7, 28, 2, 'creme.4'); rect(ctx, x + 6, top + 29, 28, 2, 'creme.4');
    rect(ctx, x + 6, top + 7, 2, 24, 'creme.4'); rect(ctx, x + 32, top + 7, 2, 24, 'creme.4'); rect(ctx, x + 19, top + 9, 2, 20, 'creme.4');
    rect(ctx, x + 8, top + 17, 24, 1, 'creme.4');
    ctx.globalAlpha = 0.5; for (let j = 0; j < 12; j++) px(ctx, x + 10 + Math.round(j * 0.5), top + 10 + j, 'creme.4'); ctx.globalAlpha = 1;
    rect(ctx, x - 4, top - 6, b + 8, 6, 'creme.4'); rect(ctx, x - 4, top - 7, b + 8, 1, 'nacht.4'); rect(ctx, x - 4, top - 1, b + 8, 1, 'creme.2');
    rect(ctx, x + 4, top + 31, 32, 2, 'nacht.4');
  }
  function pannendak(ctx, geo, d, dak, dd) {
    const s = dak.stap || 12, n = (d.h - 8) / 8, y = d.y, kl = dak.kleur, r = rng(d.x);
    for (let j = 0; j < n * 8; j++) {
      const xl = Math.round(d.x - 8 + s * j / 8), xr = Math.round(d.x + d.b + 8 - s * j / 8), i = Math.floor(j / 8), kk = j % 8, yy = y - 1 - j;
      // pannen van 6 breed, per rij verspringend: ronde onderkant, naad, glimlicht op de bolling, wat verweerde pannen
      rect(ctx, xl, yy, xr - xl, 1, kk === 0 ? dak.rij : kk === 7 ? tint(kl, 1) : kl);
      for (let x = xl + 2; x < xr - 2; x++) {
        const p = ((x - d.x + (i % 2) * 3) % 6 + 6) % 6, pan = Math.floor((x - d.x + (i % 2) * 3) / 6) * 31 + i * 17;
        const oud = (pan * 7919) % 23;
        if (kk === 1 && (p === 0 || p === 5)) px(ctx, x, yy, dak.rij);
        else if (kk >= 1 && kk < 7 && p === 0) px(ctx, x, yy, tint(kl, -1));
        else if (kk >= 4 && kk < 7 && p === 2) px(ctx, x, yy, tint(kl, 1));
        else if (kk >= 1 && kk < 7 && oud === 0) px(ctx, x, yy, tint(kl, -1));
        else if (kk >= 2 && kk < 7 && oud === 1 && p !== 0) px(ctx, x, yy, 'bordeaux.3');
      }
      rect(ctx, xl - 1, yy, 3, 1, 'creme.4'); px(ctx, xl + 2, yy, 'creme.2');
      rect(ctx, xr - 2, yy, 3, 1, 'creme.4'); px(ctx, xr - 3, yy, 'creme.2');
    }
    // sneeuw op het pannenvlak (omgeving-teken.js): het dak is van voren getekend, dus de sneeuw ligt op het vlak
    if (BU.omg && BU.omg.sneeuw && window.PQ_OMGEVINGTEKEN) window.PQ_OMGEVINGTEKEN.dakSneeuw(ctx, d, s, n, BU.omg.sneeuw);
    const xl = Math.round(d.x - 8 + s * n), xr = Math.round(d.x + d.b + 8 - s * n), top = y - n * 8;
    rect(ctx, xl, top - 4, xr - xl, 4, dak.rij);
    for (let x = xl + 1; x < xr - 4; x += 6) { rect(ctx, x, top - 6, 5, 2, dak.rij); px(ctx, x + 1, top - 6, tint(kl, 1)); }
    rect(ctx, d.x - 11, y - 3, d.b + 22, 3, 'nacht.4'); rect(ctx, d.x - 11, y - 3, d.b + 22, 1, 'creme.3'); rect(ctx, d.x - 11, y - 1, d.b + 22, 1, 'nacht.3');
    if (d.hoofd && d.b > 260 && n >= 6) for (const f of d.b > 520 ? [0.22, 0.46] : [0.3]) dakkapel(ctx, geo, d.x + Math.round(d.b * f), y - 6, dd);
    if (d.hoofd) {
      const cx = d.x + Math.round(d.b * 0.7), boven = top - 14, onder = y - Math.round(d.h * 0.45);
      MAT.baksteen(ctx, cx, boven, 16, onder - boven, 'koraal.1', 'bordeaux.3', cx);
      rect(ctx, cx + 13, boven, 3, onder - boven, 'bordeaux.1');
      rect(ctx, cx - 2, boven - 3, 20, 3, 'nacht.2'); rect(ctx, cx - 2, boven - 3, 20, 1, 'nacht.4');
      rect(ctx, cx - 2, onder - 2, 20, 3, 'nacht.4');
    }
  }
  function platDak(ctx, geo, d, dak, dd, lichten) {
    const y = d.y;
    if (!dak.overstek) {
      rect(ctx, d.x - 4, y - 7, d.b + 8, 2, 'nacht.2'); rect(ctx, d.x - 4, y - 7, d.b + 8, 1, 'nacht.4');
      rect(ctx, d.x - 4, y - 5, d.b + 8, 5, 'creme.4'); rect(ctx, d.x - 4, y - 1, d.b + 8, 1, 'creme.2');
      if (d.hoofd !== false && geo.huis.omgeving !== 'flat') {
        const x = d.x + Math.round(d.b * 0.75);
        MAT.baksteen(ctx, x, y - 24, 14, 17, 'koraal.1', 'bordeaux.3', x); rect(ctx, x - 2, y - 26, 18, 3, 'nacht.2');
      }
      return;
    }
    const o = dak.overstek, h = d.h, a = d.x - o, b = d.b + 2 * o;
    if (d.hoofd) {
      for (let p = d.x + 14; p + 22 < d.x + d.b - 10; p += 28) {
        for (let j = 0; j < 9; j++) rect(ctx, p + Math.floor(j / 2), y - h - 1 - j, 22, 1, j === 8 ? 'nacht.4' : j % 3 === 0 ? 'petrol.1' : 'nacht.1');
        for (let i = 5; i < 22; i += 6) for (let j = 0; j < 9; j++) px(ctx, p + Math.floor(j / 2) + i, y - h - 1 - j, 'petrol.1');
        rect(ctx, p + 18, y - h - 5, 2, 4, 'nacht.2');
      }
    } else {
      rect(ctx, d.x, y - h - 3, d.b, 3, 'mos.2'); dither(ctx, d.x, y - h - 3, d.b, 2, 'mos.3');
      const r = rng(d.x);
      for (let i = 0; i < d.b / 9; i++) px(ctx, d.x + Math.floor(r() * d.b), y - h - 3, r() < 0.5 ? 'abrikoos.4' : 'lavendel.3');
    }
    rect(ctx, a, y - h, b, 2, 'nacht.1'); rect(ctx, a, y - h, b, 1, 'nacht.3');
    MAT.stuc(ctx, a, y - h + 2, b, h - 5, 'creme.3', 'creme.2', d.x);
    rect(ctx, a, y - 3, b, 1, 'creme.1');
    MAT.lamellen(ctx, a, y - 2, b, 2, 'eik.3', 3);
    if (dd.lampen) for (const x of [a + 4, a + b - 6]) { rect(ctx, x, y - 1, 2, 1, 'goud.4'); lichten.push({ x: x + 1, y: y + 1, r: 6 }); }
  }

  // ---------- oude vormen (tweede huizen: boomhut, kasteeltje; zolder met schuine kap) ----------
  function oudeBoom(ctx, x, voet, hoogte, kl) {
    rect(ctx, x - 3, voet - hoogte * 0.45, 6, hoogte * 0.45, 'koffie');
    const kr = hoogte * 0.7;
    for (let i = 0; i < 6; i++) {
      const w = [16, 28, 36, 40, 36, 24][i] * kr / 48;
      rect(ctx, x - w / 2, voet - hoogte + i * kr / 6, w, kr / 6 + 1, i % 2 ? kl : donker(kl, 0));
    }
  }
  function tekenOmgeving(ctx, geo) {
    const huis = geo.huis;
    if (huis.omgeving === 'bos') {
      const r = rng(3);
      for (let x = 12; x < geo.W; x += 40 + Math.floor(r() * 30)) oudeBoom(ctx, x, geo.grondY, 70 + Math.floor(r() * 50), 'mos.1');
      // Stam onder de eerste verdieping.
      const rij = geo.rijen(1)[0];
      if (rij) {
        const mid = Math.round((rij[0] + rij[1]) / 2), top = geo.plaatY(0) + M.vloerplaat;
        rect(ctx, mid - 20, top, 40, geo.grondY - top, 'eik');
        rect(ctx, mid - 20, top, 6, geo.grondY - top, 'eik.3');
        rect(ctx, mid + 14, top, 6, geo.grondY - top, 'koffie');
        for (let y = top + 12; y < geo.grondY - 8; y += 18) rect(ctx, mid - 8 + (y % 3) * 4, y, 6, 2, 'koffie');
        rect(ctx, mid - 28, geo.grondY - 6, 56, 6, 'eik');
      }
    }
    if (huis.omgeving === 'rij') {
      const top = geo.plaatY(geo.F - 1), x1 = geo.links;
      rect(ctx, 0, top - 40, x1, geo.grondY - top + 40, 'papier.1');
      rect(ctx, 0, top - 48, x1 + 4, 8, 'bordeaux.3');
      for (let v = 0; v < geo.F; v++) {
        const y = geo.plaatY(v) + M.vloerplaat + M.raam_y;
        rect(ctx, 12, y - 2, 36, 40, 'eik.3'); rect(ctx, 14, y, 32, 36, 'nacht.3');
      }
      rect(ctx, x1 - 4, top - 40, 4, geo.grondY - top + 40, 'koffie.1');
    }
    if (huis.omgeving === 'flat') {
      const binnen = geo.kamers.filter(x => !x.buiten);
      const a = Math.min(...binnen.map(x => x.box.x)), b = Math.max(...binnen.map(x => x.box.x + x.box.b)) + M.muur;
      for (let v = 0; v <= geo.F; v++) {
        if (binnen.some(x => x.verdieping === v)) continue;
        const y = geo.plaatY(v);
        rect(ctx, a, y, b - a, geo.P, 'papier.1');
        rect(ctx, a, y, b - a, M.vloerplaat, 'koffie.3');
        for (let x = a + 24; x + 40 < b; x += 72) {
          rect(ctx, x - 2, y + M.vloerplaat + M.raam_y - 2, 44, 40, 'eik.3');
          rect(ctx, x, y + M.vloerplaat + M.raam_y, 40, 36, 'nacht.3');
        }
        if (v === 0) { rect(ctx, a + 48, y + 56, 32, 80, 'petrol.1'); rect(ctx, a + 72, y + 96, 3, 3, 'goud'); }
      }
      rect(ctx, a, geo.plaatY(geo.F), b - a, M.vloerplaat, 'koffie.3');
      rect(ctx, a - 4, geo.plaatY(geo.F) - 8, b - a + 8, 8, 'nacht');
    }
  }
  function oudDak(ctx, geo, d, dak, dd) {
    const y = d.y;
    if (dak.vorm === 'kanteel') {
      rect(ctx, d.x, y - 6, d.b, 6, dak.kleur);
      for (let x = d.x; x + 8 <= d.x + d.b; x += 16) { rect(ctx, x, y - 16, 8, 10, dak.kleur); rect(ctx, x, y - 16, 8, 1, dak.rij); }
      rect(ctx, d.x, y - 6, d.b, 1, dak.rij);
    } else if (dak.vorm === 'blad') {
      const w = [0.55, 0.8, 0.95, 1.05, 1.1, 1.12, 1.08];
      for (let i = 0; i < w.length; i++) {
        const b = d.b * w[i], x = d.x + (d.b - b) / 2;
        rect(ctx, x, y - d.h + i * 8, b, 9, i % 2 ? dak.kleur : dak.rij);
      }
      const r = rng(d.x);
      for (let i = 0; i < d.b / 6; i++) rect(ctx, d.x + r() * d.b, y - d.h + 4 + r() * (d.h - 10), 3, 2, 'mos.3');
    } else if (dak.vorm === 'glas') {
      // Glazen kap van een serre: een lage, getrapte kas van ruiten (lucht/raamkleur) met lichte stijlen.
      const rijen = 5;
      for (let i = 0; i < rijen; i++) {
        const x0 = d.x - 4 + 8 * i, x1 = d.x + d.b + 4 - 8 * i, yb = y - 4 * (i + 1);
        rect(ctx, x0, yb, x1 - x0, 4, dd.raam);
        rect(ctx, x0, yb, x1 - x0, 1, dak.kleur);
        for (let x = d.x + 12; x < x1 - 1; x += 16) if (x > x0) rect(ctx, x, yb, 1, 4, dak.kleur);
      }
      rect(ctx, d.x - 6, y - 2, d.b + 12, 2, dak.rij);
    } else if (dak.vorm === 'spits') {
      // Torenspits: steil (6 opzij per 8 omhoog), met een vlaggetje als het decor 'vlag' heeft.
      let top = y;
      for (let i = 0; ; i++) {
        const x0 = d.x - 4 + 6 * i, x1 = d.x + d.b + 4 - 6 * i;
        if (x1 - x0 < 4) break;
        top = y - 8 * (i + 1);
        rect(ctx, x0, top, x1 - x0, 8, dak.kleur);
        rect(ctx, x0, top + 7, x1 - x0, 1, dak.rij);
        if (i % 2) rect(ctx, x0 + 2, top + 3, 2, 2, dak.rij);
      }
      const mx = Math.round(d.x + d.b / 2);
      if ((geo.huis.decor || []).includes('vlag')) {
        rect(ctx, mx - 1, top - 16, 2, 16, 'nacht');
        rect(ctx, mx + 1, top - 16, 11, 7, 'koraal'); rect(ctx, mx + 1, top - 10, 11, 1, 'koraal.1');
        rect(ctx, mx - 2, top - 18, 4, 3, 'goud');
      }
    }
  }
  // Schuine kap over een zolder, in doorsnede: vanaf de knieschotten loopt een band dakpannen schuin naar binnen,
  // buiten de band is lucht en boven het plafond is de nok dicht. Een dakkapel ('links' of 'rechts') zet een stuk
  // van de schuine kant rechtop, met een raampje en een plat dakje.
  function tekenSchuin(ctx, geo, d, dak, dd) {
    const s = d.schuin, ye = d.y + geo.P - s.knie, n = s.m + s.extra;
    const kapel = (d.kamers || []).map(id => geo.kamers.find(k => k.id === id)).find(k => k && k.dakkapel);
    const kant = kapel ? kapel.dakkapel : null, K0 = 2, K1 = Math.min(8, s.m - 1);
    const romp = geo.huis.romp;
    for (let i = 0; i < n; i++) {
      const yb = ye - 8 * (i + 1);
      const xl = d.x - 8 + s.stap * i, xr = d.x + d.b + 8 - s.stap * i;
      if (i >= s.m) {
        rect(ctx, xl, yb, xr - xl, 8, dak.kleur); rect(ctx, xl, yb + 7, xr - xl, 1, dak.rij);
        if (i === n - 1) rect(ctx, xl, yb, xr - xl, 2, dak.rij);
        continue;
      }
      for (const links of [true, false]) {
        const kapelHier = kant === (links ? 'links' : 'rechts') && i >= K0 && i < K1;
        // buitenrand van de band in deze rij (bij een dakkapel: recht boven rij K0)
        const rand = links ? (kapelHier ? d.x - 8 + s.stap * K0 + 8 : xl) : (kapelHier ? d.x + d.b + 8 - s.stap * K0 - 8 : xr);
        if (links) rect(ctx, d.x, yb, Math.max(0, rand - d.x), 8, dd.lucht);
        else rect(ctx, rand, yb, Math.max(0, d.x + d.b - rand), 8, dd.lucht);
        const bx = links ? rand : rand - (kapelHier ? 8 : 16);
        if (kapelHier) {
          // rechte voorwand van de dakkapel met een raam (doorgesneden: glas tussen een houten kozijn)
          rect(ctx, bx, yb, 8, 8, romp);
          if (i > K0 && i < K1 - 1) { rect(ctx, bx + 1, yb, 6, 8, dd.raam); rect(ctx, bx + 3, yb, 2, 8, 'creme'); }
          if (i === K0 + 1) rect(ctx, bx, yb, 8, 2, 'eik');
          if (i === K1 - 2) rect(ctx, bx - 2, yb + 6, 12, 2, 'creme.1');
        } else {
          rect(ctx, bx, yb, 16, 8, dak.kleur); rect(ctx, bx, yb + 7, 16, 1, dak.rij);
        }
      }
      if (kant && i === K1) {
        // plat dakje van de dakkapel, van de rechte wand tot de schuine band
        const links = kant === 'links';
        const a = links ? d.x + s.stap * K0 - 6 : xr - 16, b = links ? xl + 16 : d.x + d.b - s.stap * K0 + 6;
        rect(ctx, Math.min(a, b), yb + 2, Math.abs(b - a), 6, dak.kleur);
        rect(ctx, Math.min(a, b), yb + 2, Math.abs(b - a), 1, dak.rij); rect(ctx, Math.min(a, b), yb + 7, Math.abs(b - a), 1, dak.rij);
      }
    }
  }
  function tekenLadder(ctx, geo) {
    const kam = geo.kamers.filter(x => x.verdieping === 1 && !x.buiten).sort((a, b) => a.box.x - b.box.x)[0];
    if (!kam) return;
    const x = kam.box.x - 12, top = geo.plaatY(0) + M.vloerplaat;
    rect(ctx, x, top, 2, geo.grondY - top, 'eik'); rect(ctx, x + 12, top, 2, geo.grondY - top, 'eik');
    for (let y = top + 6; y < geo.grondY; y += 10) rect(ctx, x, y, 14, 2, 'hazelnoot');
  }

  function tekenDak(ctx, geo, d, dd, lichten) {
    const dak = d.stijl || geo.huis.dak;
    if (d.schuin) return tekenSchuin(ctx, geo, d, dak, dd);
    if (dak.vorm === 'zadel') return pannendak(ctx, geo, d, dak, dd);
    if (!dak.vorm || dak.vorm === 'plat') return platDak(ctx, geo, d, dak, dd, lichten);
    oudDak(ctx, geo, d, dak, dd);
  }

  // ---------- schaduw onder en naast meubels (gedithered, 1-2 tinten donkerder) ----------
  function tekenSchaduw(ctx, geo, inrichting) {
    for (const it of inrichting) {
      const def = H.meubels[it.soort], k = geo.kamers.find(x => x.id === it.kamer);
      if (!def || !k) continue;
      const m = HM.maat(it.soort), x = k.x + it.x, fl = k.vloer.kleur || 'eik';
      if (def.op === 'muur') {
        const top = k.vloerY - it.y - m.h, mk = k.muur.kleur || 'papier';
        dither(ctx, x + 1, top + m.h, m.b, 1, tint(mk, -1)); dither(ctx, x + m.b, top + 1, 1, m.h, tint(mk, -1));
        continue;
      }
      if (it.y > 0) continue;
      const v = k.vloerY + (def.voor ? 3 : 0);
      rect(ctx, x + 1, v, m.b - 2, 1, tint(fl, -2));
      dither(ctx, x, v + 1, m.b + 2, 1, tint(fl, -2)); dither(ctx, x + 2, v - 1, m.b + 2, 1, tint(fl, -1));
      if (!k.buiten && !def.voor && m.h >= 16) {
        const mk = k.muur.kleur || 'papier', top = k.vloerY - m.h + 4;
        dither(ctx, x + m.b, top, 2, k.vloerY - M.vloerlijn - top - 1, tint(mk, -1));
      }
    }
  }

  // ---------- lichtlaag ('s avonds en 's nachts, boven de tint) ----------
  // Warme lichtpoelen in getrapte ringen (geen gradient), lichtkegels onder spots en een gloed bij de puien.
  function poel(ctx, p) {
    const kl = p.kleur || 'goud.3', r = p.r;
    const ringen = p.kegel ? [[0.3, 0.2]] : [[1, 0.1], [0.66, 0.12], [0.36, 0.18], [0.16, 0.3]];
    for (const [f, a] of ringen) { ctx.globalAlpha = a; ovaal(ctx, p.x - r * f, p.y - r * f * 0.8, 2 * r * f, 1.6 * r * f, kl); }
    if (p.kegel && p.grond) {
      ctx.globalAlpha = 0.09;
      for (let y = p.y; y < p.grond; y++) { const w = 2 + Math.round((y - p.y) * 0.42); rect(ctx, p.x - w, y, 2 * w + 1, 1, kl); }
    }
    if (p.grond) { const w = Math.round(p.kegel ? 2 + (p.grond - p.y) * 0.42 : r * 0.9); ctx.globalAlpha = 0.22; ovaal(ctx, p.x - w, p.grond - 2, 2 * w, 5, kl); }
    ctx.globalAlpha = 1;
  }
  function tekenLicht(canvas, geo, dd, inrichting) {
    canvas.width = geo.W; canvas.height = geo.H;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, geo.W, geo.H);
    if (!dd.lampen) return;
    const nacht = dd.id === 'nacht';
    for (const kam of geo.kamers) {
      if (kam.buiten) continue;
      waas(ctx, kam.x, kam.y, kam.b, kam.h, 'goud.3', nacht ? 0.12 : 0.08);
      for (const r of kam.ramen) {
        const y = kam.y + (r.y != null ? r.y : M.raam_y);
        waas(ctx, kam.x + r.x, y, r.b, r.h || M.raam_h, 'goud.4', 0.12);
      }
      if (kam.pui === 'links') {
        ctx.globalAlpha = 0.1;
        const top = kam.y + 8, vl = kam.y + kam.h;
        for (let y = top; y < vl; y++) { const w = Math.round((y - top) * 0.32); rect(ctx, kam.box.x - w, y, w + M.muur, 1, 'goud.4'); }
        ctx.globalAlpha = 1;
      }
    }
    const punten = (geo._lichten || []).slice();
    for (const it of inrichting || []) {
      const def = H.meubels[it.soort], k = geo.kamers.find(x => x.id === it.kamer);
      if (!def || !def.licht || !k) continue;
      const m = HM.maat(it.soort), oy = def.voor ? 3 : 0;
      for (const l of def.licht) punten.push({ x: k.x + it.x + l.x, y: k.vloerY - it.y - m.h + l.y + oy, r: l.r, grond: k.vloerY + oy });
    }
    for (const p of punten) poel(ctx, p);
  }

  // ---------- volledig decor ----------
  // dd = dagdeel-object. inrichting (optioneel) voor de schaduw onder de meubels. Lichtpunten van buiten en van
  // de plafondlampen komen in geo._lichten, voor tekenLicht.
  function tekenDecor(canvas, geo, dd, inrichting) {
    canvas.width = geo.W; canvas.height = geo.H;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    const lichten = [], OT = window.PQ_OMGEVINGTEKEN, laag = (dd.omg && dd.omg.sneeuwlaag) || 0;
    BU.omg = dd.buiten || null;          // seizoen en weer voor het erf (omgeving-teken.js); null = het vaste zomerbeeld
    BU.bomen = [];                       // kruinen van kers en eik (huis-bomen.js), voor de bloesemdeeltjes
    BU.tekenLucht(ctx, geo, dd);
    if (!geo.huis.omgeving) BU.tekenAchtergrond(ctx, geo, dd);
    // Bij sneeuw komt de voorgrond eerst op een los canvas: daar ligt de sneeuw precies op elke open bovenkant.
    let v = ctx, los = null;
    if (laag && OT) {
      los = document.createElement('canvas'); los.width = geo.W; los.height = geo.H;
      v = los.getContext('2d'); v.imageSmoothingEnabled = false;
    }
    tekenOmgeving(v, geo);
    BU.tekenGrond(v, geo, dd);
    if (!geo.huis.omgeving) BU.tekenErf(v, geo, dd, lichten);
    for (const kam of geo.kamers) tekenKamer(v, geo, kam, dd, lichten);
    if (inrichting) tekenSchaduw(v, geo, inrichting);
    tekenRomp(v, geo, dd);
    tekenTrappen(v, geo);
    if (geo.huis.omgeving !== 'flat') for (const d of geo.daken) tekenDak(v, geo, d, dd, lichten);
    if (geo.huis.omgeving === 'bos') tekenLadder(v, geo);
    if (los) {
      const onderDak = geo.kamers.filter(k => k.overkapping || k.carport).map(k => [k.x - 4, k.y + 12, k.x + k.b + 8, k.y + k.h]);
      OT.sneeuwRanden(v, geo.W, geo.H, laag, geo.grondY - 14, onderDak);
      ctx.drawImage(los, 0, 0);
    }
    if (OT && dd.omg) OT.naDecor(ctx, geo, dd, lichten);   // events: lampjes aan de gevel, slinger
    BU.omg = null;
    geo._lichten = lichten;
    geo._bomen = BU.bomen || [];
  }

  // ---------- meubels ----------
  // Elk deel krijgt drie tinten (schaduw onder en rechts, basis, licht boven), een textuur en eventueel een lijn;
  // daarna krijgt het silhouet een donkere outline (huis-pixel.js omlijn). Twee canvassen: achter en voor
  // (laag: 'voor', bv. het glas van een aquarium, zodat een pet ertussen kan). ox/oy: verschuiving t.o.v. de maat.
  function rrect(ctx, x, y, b, h, r, kl) {
    if (!r || b < 4 || h < 4) { rect(ctx, x, y, b, h, kl); return; }
    const inset = [[1], [2, 1], [3, 1, 1]][Math.min(3, r) - 1];
    for (let j = 0; j < h; j++) {
      const i = j < inset.length ? inset[j] : h - 1 - j < inset.length ? inset[h - 1 - j] : 0;
      rect(ctx, x + i, y + j, b - 2 * i, 1, kl);
    }
  }
  function textuur(ctx, t, x, y, b, h, kl, binnen) {
    if (!t || b <= 0 || h <= 0) return;
    const r = rng(x * 31 + y * 17 + b), z = (gx, gy, k) => { if (binnen(gx, gy)) px(ctx, gx, gy, k); };
    for (let j = 0; j < h; j++) {
      for (let i = 0; i < b; i++) {
        const gx = x + i, gy = y + j, q = r();
        if (t === 'hout' && j % 2 === 0 && q < 0.1) { for (let s = 0; s < 4; s++) z(gx + s, gy, tint(kl, -1)); }
        else if (t === 'houtv' && i % 2 === 0 && q < 0.08) { for (let s = 0; s < 4; s++) z(gx, gy + s, tint(kl, -1)); }
        else if (t === 'lamel') { if (i % 4 === 3) z(gx, gy, tint(kl, -2)); else if (i % 4 === 0) z(gx, gy, tint(kl, 1)); }
        else if (t === 'stof') { if ((gx * 3 + gy * 5) % 7 === 0) z(gx, gy, tint(kl, -1)); else if (q < 0.025) z(gx, gy, tint(kl, 1)); }
        else if (t === 'riet') { if ((gx + gy) % 3 === 0) z(gx, gy, tint(kl, -1)); else if (((gx - gy) % 4 + 4) % 4 === 0) z(gx, gy, tint(kl, 1)); }
        else if (t === 'blad') { if (q < 0.12) z(gx, gy, tint(kl, j < h / 2 ? 1 : -1)); }
        else if (t === 'water') { if (gx % 7 === 2 && gy % 2 === 0) z(gx, gy, tint(kl, 1)); if (j === 0) z(gx, gy, tint(kl, 1)); }
        else if (t === 'grind') { if (q < 0.45) z(gx, gy, q < 0.15 ? tint(kl, -1) : q < 0.3 ? tint(kl, 1) : 'nacht.4'); }
        else if (t === 'tegel') { if (i % 5 === 4 || j % 5 === 4) z(gx, gy, tint(kl, -1)); else if ((Math.floor(i / 5) * 7 + Math.floor(j / 5) * 3) % 5 === 0) z(gx, gy, tint(kl, -1)); }
        else if (t === 'metaal') { if (i === Math.floor(b / 3)) z(gx, gy, tint(kl, 2)); }
        else if (t === 'spiegel') { const d = (i - j + 200) % 14; if (d === 0 || d === 1 || d === 4) z(gx, gy, tint(kl, 1)); }
        else if (t === 'stuc') { if (q < 0.06) z(gx, gy, tint(kl, q < 0.02 ? 1 : -1)); }
      }
    }
    if (t === 'marmer') {
      for (let v = 0; v < Math.max(1, b / 16); v++) {
        let xx = x + Math.floor(r() * b), yy = y;
        while (yy < y + h && xx < x + b) { z(xx, yy, r() < 0.5 ? tint(kl, -1) : 'nacht.4'); xx += r() < 0.6 ? 1 : 2; yy++; }
      }
    }
  }
  function deel(ctx, d, x, y, lampen) {
    const b = d.b, h = d.h, kl = d.licht === 'kap' && lampen ? 'goud.3' : d.k;
    if (d.t === 'glas') { glas(ctx, x, y, b, h, kl, d.a != null ? d.a : 0.3); return; }
    const vorm = d.vorm === 'ovaal' ? ovaal : d.vorm === 'kap' ? kap : d.vorm === 'boog' ? boog : (c, a, e, f, g, k) => rrect(c, a, e, f, g, d.r || 0, k);
    const binnen = d.vorm === 'ovaal'
      ? (gx, gy) => { const dx = (gx + 0.5 - x - b / 2) / (b / 2), dy = (gy + 0.5 - y - h / 2) / (h / 2); return dx * dx + dy * dy <= 0.85; }
      : (gx, gy) => gx >= x && gy >= y && gx < x + b && gy < y + h;
    if (d.a != null) ctx.globalAlpha = d.a;
    if (d.vlak || b < 3 || h < 3) { vorm(ctx, x, y, b, h, kl); textuur(ctx, d.t, x, y, b, h, kl, binnen); ctx.globalAlpha = 1; return; }
    vorm(ctx, x, y, b, h, tint(kl, -1));
    vorm(ctx, x, y, b - 1, h - (h >= 10 ? 2 : 1), kl);
    textuur(ctx, d.t, x + 1, y + 1, b - 2, h - 2, kl, binnen);
    if (d.vorm === 'ovaal') ovaal(ctx, x + Math.round(b * 0.18), y + Math.max(1, Math.round(h * 0.1)), Math.max(1, Math.round(b * 0.42)), Math.max(1, Math.round(h * 0.3)), tint(kl, 1));
    else if (d.vorm) rect(ctx, x + Math.round(b * 0.3), y + 1, Math.max(1, Math.round(b * 0.3)), 1, tint(kl, 1));
    else { const r = d.r ? Math.min(3, d.r) : 0; rect(ctx, x + r + 1, y, b - 2 * r - 2, 1, tint(kl, 1)); rect(ctx, x, y + r + 1, 1, Math.max(0, h - 2 * r - 3), tint(kl, 1)); }
    if (d.rand) { rect(ctx, x, y, b, 1, d.rand); rect(ctx, x, y + h - 1, b, 1, d.rand); rect(ctx, x, y, 1, h, d.rand); rect(ctx, x + b - 1, y, 1, h, d.rand); }
    if (d.licht === 'kap' && lampen) { rect(ctx, x + 1, y + h - 2, b - 2, 2, 'goud.4'); rect(ctx, x + 2, y + h - 1, b - 4, 1, 'creme.4'); }
    ctx.globalAlpha = 1;
  }
  const meubelCache = new WeakMap();
  function maakMeubel(def, lampen) {
    const delen = (def.delen || []).filter(d => d.licht !== 'gloed');
    let x0 = 0, y0 = 0, x1 = def.maat[0], y1 = def.maat[1];
    for (const d of delen) { x0 = Math.min(x0, d.x); y0 = Math.min(y0, d.y); x1 = Math.max(x1, d.x + d.b); y1 = Math.max(y1, d.y + d.h); }
    const w = x1 - x0, h = y1 - y0;
    const maak = () => { const c = document.createElement('canvas'); c.width = w; c.height = h; const ctx = c.getContext('2d'); ctx.imageSmoothingEnabled = false; return [c, ctx]; };
    const [achter, ca] = maak();
    let voor = null, cv = null;
    if (delen.some(d => d.laag === 'voor')) [voor, cv] = maak();
    for (const d of delen) deel(d.laag === 'voor' ? cv : ca, d, d.x - x0, d.y - y0, lampen);
    P.omlijn(achter);
    return { achter, voor, ox: x0, oy: y0, w, h };
  }
  function kopie(c) {
    const n = document.createElement('canvas');
    n.width = c.width; n.height = c.height;
    n.getContext('2d').drawImage(c, 0, 0);
    return n;
  }
  function tekenMeubel(def, lampen) {
    let c = meubelCache.get(def);
    if (!c) { c = {}; meubelCache.set(def, c); }
    const s = lampen ? 'aan' : 'uit';
    if (!c[s]) c[s] = maakMeubel(def, lampen);
    const t = c[s];
    return { achter: kopie(t.achter), voor: t.voor ? kopie(t.voor) : null, ox: t.ox, oy: t.oy, w: t.w, h: t.h };
  }

  // ---------- mini-preview ----------
  // Het volledige decor (overdag), verkleind met naaste-buur-sampling: harde pixels, zelfde kleuren.
  const DAG = H.dagdelen.find(d => d.id === 'dag') || H.dagdelen[0];
  function tekenMini(canvas, geo, s) {
    const off = document.createElement('canvas');
    tekenDecor(off, geo, DAG);
    canvas.width = Math.round(geo.W * s); canvas.height = Math.round(geo.H * s);
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(off, 0, 0, geo.W, geo.H, 0, 0, canvas.width, canvas.height);
  }

  return { tekenDecor, tekenMeubel, tekenMini, tekenLicht, rect, donker };
})(window.PQ_HUIS, window.PQ_HUISMODEL, window.PQ_PIX, window.PQ_HUISBUITEN);
