// Gedeelde figuur-rendering: zone-recolor, accessoires, kastitems (lagen) en het tekenen van een character.
// Gebruikt door kledingkast.js en huis.js. Leest window.PQ_KLEDING (assets/kleding.js) en, als die er is,
// window.PQ_KAST (assets/kast.js). Zonder kast.js werkt alles zoals voorheen; tekenLook tekent dan alleen het lichaam.
// Alle sprites staan als data-URL in kleding.js, zodat canvas ook via file:// pixels mag lezen.
window.PQ_FIGUUR = (function (D) {
  'use strict';
  const ZONES = D.zones;

  // localStorage-sleutels van de kledingkast; het huis leest dezelfde staat.
  // look = { hidde: {slot: {item, kleur}}, tessie: {...} }, bezit = { hidde: {itemId: [kleur, ...]}, tessie: {...} }
  const OPSLAG_KAST = { staat: 'pq-kk-staat', outfits: 'pq-kk-outfits', acc: 'pq-kk-accessoires',
    look: 'pq-kk-look', bezit: 'pq-kk-bezit' };

  // ---------- kleur ----------
  const hex2rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const lum = c => c[0] * 0.299 + c[1] * 0.587 + c[2] * 0.114;
  const kleurVan = v => (D.palet[v] || v);

  // Zelfde rekenregels als tools/kleding.py (verkleur, ramp_kleur, ramp_verschuiving).
  const RAMP = {};
  for (const [naam, r] of Object.entries(D.rampen)) {
    const st = r.stops.map(hex2rgb);
    RAMP[naam] = { st, ls: st.map(lum), Lb: lum(hex2rgb(r.basis)) };
  }
  function verschuiving(r, breedte) {
    const boven = r.ls[r.ls.length - 1] - (r.Lb + 0.5 * breedte);
    const onder = r.ls[0] - (r.Lb - 0.5 * breedte);
    if (boven < 0 && onder <= 0) return Math.max(boven, onder);
    if (onder > 0 && boven >= 0) return Math.min(onder, boven);
    return 0;
  }
  function rampKleur(r, Lt, uit) {
    const ls = r.ls, n = ls.length;
    Lt = Math.min(Math.max(Lt, ls[0]), ls[n - 1]);
    let i = 0;
    while (i < n && ls[i] <= Lt) i++;          // searchsorted(side='right')
    i = Math.min(Math.max(i - 1, 0), n - 2);
    const t = (Lt - ls[i]) / Math.max(ls[i + 1] - ls[i], 1e-6);
    for (let k = 0; k < 3; k++) uit[k] = Math.round(r.st[i][k] * (1 - t) + r.st[i + 1][k] * t);
  }

  // ---------- data laden ----------
  function laadBeeld(src) {
    return new Promise((ok, fout) => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement('canvas');
        c.width = img.naturalWidth; c.height = img.naturalHeight;
        const ctx = c.getContext('2d');
        ctx.drawImage(img, 0, 0);
        ok(ctx.getImageData(0, 0, c.width, c.height));
      };
      img.onerror = fout;
      img.src = src;
    });
  }
  const SPR = {};   // SPR[fid][variant] = {w, h, px, zone, L, stats}
  let geladen = null;
  function laadAlles() {
    if (geladen) return geladen;
    geladen = (async () => {
      for (const fid of Object.keys(D.characters)) {
        SPR[fid] = {};
        for (const v of ['bron', 'native']) {
          const c = D.characters[fid][v];
          const [sp, zo] = await Promise.all([laadBeeld(c.sprite), laadBeeld(c.zones)]);
          const n = sp.width * sp.height;
          const zone = new Uint8Array(n), L = new Float32Array(n);
          for (let i = 0; i < n; i++) {
            zone[i] = Math.round(zo.data[i * 4] / 30);
            L[i] = sp.data[i * 4] * 0.299 + sp.data[i * 4 + 1] * 0.587 + sp.data[i * 4 + 2] * 0.114;
          }
          SPR[fid][v] = { w: sp.width, h: sp.height, px: sp.data, zone, L, stats: c.stats };
        }
      }
      await laadKast();
    })();
    return geladen;
  }

  const cache = new Map();
  function verkleur(fid, v, keuze) {
    const sleutel = fid + v + JSON.stringify(keuze || {});
    if (cache.has(sleutel)) return cache.get(sleutel);
    const s = SPR[fid][v];
    const out = new ImageData(new Uint8ClampedArray(s.px), s.w, s.h);
    const rgb = [0, 0, 0];
    for (const [zone, rampnaam] of Object.entries(keuze || {})) {
      if (!D.kleurbaar.includes(zone) || !rampnaam || rampnaam === 'origineel' || !s.stats[zone] || !RAMP[rampnaam]) continue;
      const zi = ZONES.indexOf(zone), r = RAMP[rampnaam], st = s.stats[zone];
      const k = Math.min(Math.max(D.recolor.doel_spreiding / st.spreiding, D.recolor.k_min), D.recolor.k_max);
      const basis = r.Lb + verschuiving(r, st.spreiding * k) - st.mediaan * k;
      for (let i = 0; i < s.zone.length; i++) {
        if (s.zone[i] !== zi) continue;
        rampKleur(r, basis + s.L[i] * k, rgb);
        out.data[i * 4] = rgb[0]; out.data[i * 4 + 1] = rgb[1]; out.data[i * 4 + 2] = rgb[2];
      }
    }
    if (cache.size > 80) cache.clear();
    cache.set(sleutel, out);
    return out;
  }

  // ---------- accessoires ----------
  function accRaster(acc) {
    const h = acc.pixels.length, w = Math.max(...acc.pixels.map(r => r.length));
    const cel = [];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const ch = acc.pixels[y][x];
      cel.push(ch && acc.kleuren[ch] ? kleurVan(acc.kleuren[ch]) : null);
    }
    return { w, h, cel };
  }
  // Pixels van een accessoire in native-canvascoördinaten voor een character.
  function accPixels(acc, fid) {
    const { w, h, cel } = accRaster(acc);
    const ch = D.characters[fid];
    let [ax, ay] = acc.ankerpunt;
    const spiegel = (acc.kijkrichting || 'rechts') !== ch.kijkrichting;
    if (spiegel) ax = w - 1 - ax;
    const [dx, dy] = (acc.verschuiving && acc.verschuiving[fid]) || [0, 0];
    const [kx, ky] = ch.ankers[acc.anker] || ch.ankers.kruin;
    const x0 = kx - ax + dx, y0 = ky - ay + dy;
    const uit = [];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const k = cel[y * w + (spiegel ? w - 1 - x : x)];
      if (k) uit.push([x0 + x, y0 + y, k]);
    }
    return uit;
  }
  function tekenAcc(ctx, acc, fid, v) {
    const m = D.characters[fid].native_naar_bron;
    for (const [x, y, k] of accPixels(acc, fid)) {
      ctx.fillStyle = k;
      if (v === 'native') ctx.fillRect(x, y, 1, 1);
      else {
        const X0 = Math.round(m.ox + m.sx * x), X1 = Math.round(m.ox + m.sx * (x + 1));
        const Y0 = Math.round(m.oy + m.sy * y), Y1 = Math.round(m.oy + m.sy * (y + 1));
        ctx.fillRect(X0, Y0, X1 - X0, Y1 - Y0);
      }
    }
  }

  // ---------- figuur tekenen ----------
  // Tekent character `fid` in variant `v` ('bron' of 'native') met kleurkeuze en accessoires.
  // Vereist dat laadAlles() klaar is.
  const offscreen = document.createElement('canvas');
  function tekenFiguur(canvas, fid, v, keuze, accs, metAnkers) {
    const s = SPR[fid][v];
    canvas.width = s.w; canvas.height = s.h;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, s.w, s.h);
    offscreen.width = s.w; offscreen.height = s.h;
    offscreen.getContext('2d').putImageData(verkleur(fid, v, keuze), 0, 0);
    for (const a of accs || []) if (a.laag === 'achter') tekenAcc(ctx, a, fid, v);
    ctx.drawImage(offscreen, 0, 0);
    for (const a of accs || []) if (a.laag !== 'achter') tekenAcc(ctx, a, fid, v);
    if (metAnkers) {
      const m = D.characters[fid].native_naar_bron;
      ctx.fillStyle = '#ff00ff';
      for (const [x, y] of Object.values(D.characters[fid].ankers)) {
        if (v === 'native') ctx.fillRect(x, y, 1, 1);
        else ctx.fillRect(Math.round(m.ox + m.sx * x), Math.round(m.oy + m.sy * y), Math.round(m.sx), Math.round(m.sy));
      }
    }
  }

  // ---------- kast: modulaire kleding per slot (window.PQ_KAST) ----------
  // Elk item is een laag op hetzelfde canvas als het lichaam (native 64 x 112, anker 32,108).
  // Masker per pixel: 0 = vast, 50..250 = toon o/a/b/c/h op de ramp, 255 = luminantie-recolor.
  const KAST = window.PQ_KAST || null;
  const SLOTS = KAST ? KAST.slots : ['hoofd', 'boven', 'jas', 'onder', 'heel_lichaam', 'schoenen', 'accessoire'];
  const BLD = {};            // pad -> ImageData
  const EXTRA = new Map();   // eigen items uit de editor (soort 'pixels'), id -> item
  async function laadKast() {
    if (!KAST) return;
    const paden = new Set();
    for (const it of KAST.items) {
      for (const k of ['sprites', 'maskers', 'knip']) Object.values(it[k] || {}).forEach(p => paden.add(p));
      Object.values(it.bron || {}).forEach(b => { paden.add(b.sprite); paden.add(b.masker); });
    }
    await Promise.all([...paden].map(async p => { BLD[p] = await laadBeeld(KAST.beelden[p]); }));
  }
  const kastItems = () => (KAST ? KAST.items : []).concat([...EXTRA.values()]);
  function itemVan(id) { return EXTRA.get(id) || (KAST && KAST.items.find(i => i.id === id)) || null; }
  // Eigen items (pixel-accessoires met een slot) bekendmaken, zodat tekenLook ze kan vinden.
  function registreerItems(lijst) {
    EXTRA.clear();
    for (const a of lijst || []) EXTRA.set(a.id, Object.assign({ soort: 'pixels', status: 'klaar', lichaam: Object.keys(D.characters),
      kleuren: [], herkomst: 'eigen (zelf getekend)' }, a, { slot: a.slot || 'accessoire' }));
  }
  const draagbaar = (it, fid) => !!it && it.status === 'klaar' && (it.soort === 'pixels' || !!(it.sprites && it.sprites[fid]));

  // Zelfde regel als tools/kast_teken.py (toon_stop).
  function toonStop(rampnaam, toon) {
    const r = D.rampen[rampnaam];
    let bi = r.stops.indexOf(r.basis);
    if (bi < 0) bi = 2;
    const i = [0, bi - 1, bi, bi + 1, bi + 2][toon - 1];
    return Math.min(Math.max(i, 0), 4);
  }
  const itemCache = new Map();
  function verkleurItem(it, fid, v, kleur) {
    const bronEigen = v === 'bron' && it.bron && it.bron[fid];
    const sleutel = [it.id, fid, bronEigen ? 'bron' : 'native', kleur || ''].join('|');
    if (itemCache.has(sleutel)) return itemCache.get(sleutel);
    const src = BLD[bronEigen ? it.bron[fid].sprite : it.sprites[fid]];
    const msk = BLD[bronEigen ? it.bron[fid].masker : it.maskers[fid]];
    const out = new ImageData(new Uint8ClampedArray(src.data), src.width, src.height);
    if (kleur && kleur !== 'origineel' && RAMP[kleur]) {
      const r = RAMP[kleur], rgb = [0, 0, 0], d = out.data, m = msk.data;
      if (it.modus === 'luminantie') {
        const st = it.stats[fid][bronEigen ? 'bron' : 'native'];
        const k = Math.min(Math.max(D.recolor.doel_spreiding / st.spreiding, D.recolor.k_min), D.recolor.k_max);
        const basis = r.Lb + verschuiving(r, st.spreiding * k) - st.mediaan * k;
        for (let i = 0; i < d.length; i += 4) {
          if (m[i] < 255 || !d[i + 3]) continue;
          rampKleur(r, basis + (d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114) * k, rgb);
          d[i] = rgb[0]; d[i + 1] = rgb[1]; d[i + 2] = rgb[2];
        }
      } else {
        const stops = [1, 2, 3, 4, 5].map(t => r.st[toonStop(kleur, t)]);
        for (let i = 0; i < d.length; i += 4) {
          const t = Math.round(m[i] / 50);
          if (t < 1 || t > 5 || m[i] === 255 || !d[i + 3]) continue;
          const c = stops[t - 1];
          d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2];
        }
      }
    }
    if (itemCache.size > 300) itemCache.clear();
    itemCache.set(sleutel, out);
    return out;
  }

  // Native masker (64 x 112) opvragen in de pixelruimte van variant v (bron: via native_naar_bron).
  function nativeNaarVariant(fid, v, alsWaar) {
    const s = SPR[fid][v], uit = new Uint8Array(s.w * s.h);
    if (v === 'native') { for (let i = 0; i < uit.length; i++) uit[i] = alsWaar(i % s.w, (i / s.w) | 0); return uit; }
    const m = D.characters[fid].native_naar_bron;
    for (let Y = 0; Y < s.h; Y++) {
      const y = Math.floor((Y - m.oy) / m.sy);
      for (let X = 0; X < s.w; X++) uit[Y * s.w + X] = alsWaar(Math.floor((X - m.ox) / m.sx), y);
    }
    return uit;
  }
  const maskerCache = new Map();
  // Haar en haar-outline van het lichaam die wegvallen onder hoofddeksels met een rand.
  function knipMasker(fid, v, items) {
    const lijst = items.filter(it => it.knip && it.knip[fid]);
    if (!lijst.length) return null;
    const sleutel = 'knip|' + fid + v + lijst.map(i => i.id).join(',');
    if (!maskerCache.has(sleutel)) {
      const zi = [ZONES.indexOf('haar'), ZONES.indexOf('lijn')], s = SPR[fid][v];
      const ms = lijst.map(it => BLD[it.knip[fid]]);
      const nat = nativeNaarVariant(fid, v, (x, y) => (x >= 0 && y >= 0 && x < 64 && y < 112 &&
        ms.some(m => m.data[(y * m.width + x) * 4] > 0)) ? 1 : 0);
      for (let i = 0; i < nat.length; i++) if (nat[i] && !zi.includes(s.zone[i])) nat[i] = 0;
      maskerCache.set(sleutel, nat);
    }
    return maskerCache.get(sleutel);
  }

  // Haarlaag: haar + outline die aan haar grenst. Wordt boven de jas opnieuw getekend,
  // zodat Tessies krullen over de schouders van een jas vallen (laagvolgorde ... jas, haar, hoofd).
  function haarMasker(fid, v) {
    const sleutel = 'haar|' + fid + v;
    if (maskerCache.has(sleutel)) return maskerCache.get(sleutel);
    const s = SPR[fid][v], w = s.w, h = s.h, r = v === 'native' ? 1 : 4;
    const zh = ZONES.indexOf('haar'), zl = ZONES.indexOf('lijn');
    const tmp = new Uint8Array(w * h), uit = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      let hit = 0;
      for (let d = -r; d <= r && !hit; d++) { const xx = x + d; if (xx >= 0 && xx < w && s.zone[y * w + xx] === zh) hit = 1; }
      tmp[y * w + x] = hit;
    }
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (s.zone[i] === zh) { uit[i] = 1; continue; }
      if (s.zone[i] !== zl) continue;
      for (let d = -r; d <= r; d++) { const yy = y + d; if (yy >= 0 && yy < h && tmp[yy * w + x]) { uit[i] = 1; break; } }
    }
    maskerCache.set(sleutel, uit);
    return uit;
  }

  const laagCache = new Map();
  function tekenItem(ctx, it, fid, v, kleur) {
    if (it.soort === 'pixels') { tekenAcc(ctx, it, fid, v); return; }
    const sleutel = [it.id, fid, v, kleur || ''].join('|');
    let c = laagCache.get(sleutel);
    if (!c) {
      const img = verkleurItem(it, fid, v, kleur), s = SPR[fid][v];
      c = document.createElement('canvas');
      c.width = s.w; c.height = s.h;
      const cx = c.getContext('2d');
      if (img.width === s.w && img.height === s.h) cx.putImageData(img, 0, 0);
      else {   // native item op de bronversie: elk artpixel wordt een blok, zoals bij accessoires
        const m = D.characters[fid].native_naar_bron, d = img.data;
        for (let y = 0; y < img.height; y++) for (let x = 0; x < img.width; x++) {
          const i = (y * img.width + x) * 4;
          if (!d[i + 3]) continue;
          cx.fillStyle = `rgb(${d[i]},${d[i + 1]},${d[i + 2]})`;
          const X0 = Math.round(m.ox + m.sx * x), X1 = Math.round(m.ox + m.sx * (x + 1));
          const Y0 = Math.round(m.oy + m.sy * y), Y1 = Math.round(m.oy + m.sy * (y + 1));
          cx.fillRect(X0, Y0, X1 - X0, Y1 - Y0);
        }
      }
      if (laagCache.size > 200) laagCache.clear();
      laagCache.set(sleutel, c);
    }
    ctx.drawImage(c, 0, 0);
  }

  function lookLagen(fid, look) {
    const lagen = {};
    for (const slot of SLOTS) {
      const k = look && look[slot], it = k && itemVan(k.item);
      if (draagbaar(it, fid)) lagen[slot] = { it, kleur: k.kleur };
    }
    if (lagen.heel_lichaam) { delete lagen.boven; delete lagen.onder; }   // heel lichaam vervangt boven en onder
    return lagen;
  }
  const LAAGVOLGORDE = KAST ? KAST.laagvolgorde : ['lichaam', 'schoenen', 'onder', 'heel_lichaam', 'boven', 'jas', 'haar', 'accessoire', 'hoofd'];
  const tussen = document.createElement('canvas');
  function legBeeld(ctx, img) {
    tussen.width = img.width; tussen.height = img.height;
    tussen.getContext('2d').putImageData(img, 0, 0);
    ctx.drawImage(tussen, 0, 0);
  }
  // Tekent character fid in variant v met een look: { slot: { item, kleur } }.
  // opties: { keuze (oude zone-recolor van het lichaam), accs (oude pixel-accessoires), metAnkers }.
  function tekenLook(canvas, fid, v, look, opties = {}) {
    const s = SPR[fid][v];
    canvas.width = s.w; canvas.height = s.h;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, s.w, s.h);
    const lagen = lookLagen(fid, look);
    const basis = new ImageData(new Uint8ClampedArray(verkleur(fid, v, opties.keuze).data), s.w, s.h);
    const weg = knipMasker(fid, v, Object.values(lagen).map(l => l.it));
    if (weg) for (let i = 0; i < weg.length; i++) if (weg[i]) basis.data[i * 4 + 3] = 0;
    const hm = haarMasker(fid, v), haar = new ImageData(s.w, s.h);
    for (let i = 0; i < hm.length; i++) if (hm[i] && !(weg && weg[i])) for (let k = 0; k < 4; k++) haar.data[i * 4 + k] = basis.data[i * 4 + k];
    const accs = opties.accs || [];
    for (const a of accs) if (a.laag === 'achter') tekenAcc(ctx, a, fid, v);
    legBeeld(ctx, basis);
    const leg = sl => { if (lagen[sl]) tekenItem(ctx, lagen[sl].it, fid, v, lagen[sl].kleur); };
    const acc = lagen.accessoire && lagen.accessoire.it;
    for (const laag of LAAGVOLGORDE.slice(1)) {
      if (laag === 'haar') { if (acc && acc.onder_haar) leg('accessoire'); legBeeld(ctx, haar); }
      else if (laag === 'jas') { if (acc && acc.onder_jas) leg('accessoire'); leg('jas'); }
      else if (laag === 'accessoire') { if (acc && !acc.onder_haar && !acc.onder_jas) leg('accessoire'); }
      else leg(laag);
    }
    for (const a of accs) if (a.laag !== 'achter') tekenAcc(ctx, a, fid, v);
    if (opties.metAnkers) {
      const m = D.characters[fid].native_naar_bron;
      ctx.fillStyle = '#ff00ff';
      for (const [x, y] of Object.values(D.characters[fid].ankers)) {
        if (v === 'native') ctx.fillRect(x, y, 1, 1);
        else ctx.fillRect(Math.round(m.ox + m.sx * x), Math.round(m.oy + m.sy * y), Math.round(m.sx), Math.round(m.sy));
      }
    }
  }

  // Startkast als look: de gratis items die al getekend zijn, in hun basiskleur (geen pyjama overdag).
  function standaardLook(fid) {
    const look = {};
    for (const it of kastItems()) if (it.startkast && it.slot !== 'heel_lichaam' && draagbaar(it, fid)) look[it.slot] = { item: it.id, kleur: it.kleuren[0] };
    return look;
  }
  // Opgeslagen look uit de kledingkast (localStorage), voor bijvoorbeeld het huis.
  function lookVoor(fid) {
    try { const l = JSON.parse(localStorage.getItem(OPSLAG_KAST.look) || 'null'); if (l && l[fid]) return l[fid]; } catch (e) { /* geen opslag */ }
    return standaardLook(fid);
  }

  return { OPSLAG_KAST, kleurVan, laadBeeld, laadAlles, SPR, verkleur, accRaster, accPixels, tekenAcc, tekenFiguur,
    KAST, SLOTS, kastItems, itemVan, registreerItems, draagbaar, toonStop, verkleurItem, tekenLook, standaardLook, lookVoor };
})(window.PQ_KLEDING);
