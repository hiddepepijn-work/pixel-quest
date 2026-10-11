// Huis-model: pure rekenregels voor app/huis.js (geen DOM). Leest window.PQ_HUIS (assets/huis.js)
// en de kleurrampen uit window.PQ_KLEDING. Te testen met node:
//   node -e "global.window={};require('./assets/kleding.js');require('./assets/huis.js');require('./app/huis-model.js')"
window.PQ_HUISMODEL = (function (H, K) {
  'use strict';
  const M = H.maten, C = H.cel, R = H.raster;
  const P = M.kamerhoogte + M.vloerplaat;          // hoogte van één verdieping inclusief vloerplaat

  // ---------- kleur ----------
  // 'eik' -> paletkleur, 'eik.3' -> stop 3 van de ramp, '#abc123' -> zichzelf.
  function kleur(naam) {
    if (!naam) return null;
    if (naam[0] === '#') return naam;
    const [n, s] = String(naam).split('.');
    if (s === undefined) return K.palet[n] || '#ff00ff';
    const r = K.rampen[n];
    return (r && r.stops[+s]) || '#ff00ff';
  }

  const niveauVan = n => H.niveaus.find(h => h.niveau === +n) || null;
  const maxNiveau = () => Math.max(...H.niveaus.map(h => h.niveau));

  // Maat van een meubel in artpx: sprite (bronpx / bronpx_per_artpixel) of de nominale placeholder-maat.
  function maat(soort) {
    const d = H.meubels[soort];
    if (!d) return { b: 8, h: 8 };
    if (d.sprite) {
      const s = d.sprite;
      return { b: Math.round(s.maat[0] / s.bronpx_per_artpixel), h: Math.round(s.maat[1] / s.bronpx_per_artpixel) };
    }
    return { b: d.maat[0], h: d.maat[1] };
  }

  // ---------- geometrie ----------
  // stijl (optioneel): { stap } bij een zadeldak (artpx opzij per 8 omhoog), { overstek } bij een plat dak.
  function dakHoogte(vorm, breedte, stijl) {
    const st = stijl || {};
    if (vorm === 'zadel') {
      const stap = st.stap || 12, max = st.stap ? 9 : 10;
      return Math.min(max, Math.max(1, Math.floor((breedte / 2 - 8) / stap))) * 8 + 8;
    }
    if (vorm === 'kanteel') return 16;
    if (vorm === 'blad') return 56;
    if (vorm === 'glas') return 20;
    if (vorm === 'spits') return Math.ceil((breedte + 8) / 12) * 8 + 16;   // punt plus een vlaggenstok
    return st.overstek ? 14 : 10;   // plat (met overstek: dikkere dakrand)
  }
  // Schuine kap over een zolder: vanaf de knieschotten loopt het dak met `stap` artpx per 8 omhoog naar binnen.
  // m = rijen van 8 tot het plafond, extra = rijen boven het plafond (de nok). Geeft ook de dakhoogte boven de plaat.
  function schuinDak(b, knie, stap) {
    const m = Math.round((P - knie) / 8);
    const plafond = b + 16 - 2 * stap * m;
    const extra = Math.max(1, Math.min(4, Math.floor((plafond - 24) / (2 * stap))));
    return { knie, stap, m, extra, h: 8 * extra + 8 };
  }

  // Zet de indeling van een niveau om in rechthoeken in scene-coördinaten (artpx).
  // minBreedte (optioneel): maak de scene minstens zo breed en zet het huis in het midden.
  function bouw(huis, minBreedte) {
    const F = 1 + Math.max(...huis.kamers.map(k => k.verdieping));
    const erf = huis.erf || {};
    let links = M.marge + (huis.omgeving === 'rij' ? 64 : 0) + (erf.links || 0);
    const inspring = huis.inspring || {};
    const teller = {};
    const modern = huis.stijl === 'modern';
    const kamers = huis.kamers.map(k => {
      const t0 = H.kamertypes[k.type] || {};
      // Vanaf de gevelrenovatie (stijl 'modern') gelden de modern-varianten van een kamertype.
      const t = modern && t0.modern ? Object.assign({}, t0, t0.modern, {
        muur: Object.assign({}, t0.muur, t0.modern.muur), vloer: Object.assign({}, t0.vloer, t0.modern.vloer) }) : t0;
      let id = k.id;
      if (!id) { teller[k.type] = (teller[k.type] || 0) + 1; id = teller[k.type] > 1 ? `${k.type}-${teller[k.type]}` : k.type; }
      return {
        id, type: k.type, naam: k.naam || t.naam || k.type, verdieping: k.verdieping, breedte: k.breedte,
        buiten: !!t.buiten, trap: !!t.trap, ramen: k.ramen || [], romp: k.romp || t.romp || null,
        dakvloer: !!t.dakvloer, dak: k.dak || t.dak || null, dakkapel: k.dakkapel || null, plaatsing: k.plaatsing || null,
        muur: Object.assign({}, t.muur, k.muur), vloer: Object.assign({}, t.vloer, k.vloer), plint: k.plint || t.plint,
        start: k.start, pui: k.pui || null, lampen: k.lampen !== undefined ? k.lampen : (t.lampen || null),
        accent: k.accent || t.accent || null, overkapping: !!t.overkapping, carport: !!t.carport, glas: !!t.glas,
        zwembad: t.zwembad || null, blok: t.zwembad ? [[t.zwembad.x, t.zwembad.x + t.zwembad.b]] : [],
      };
    });
    // x: per verdieping van links naar rechts.
    const cursor = {};
    let maxCel = 0;
    for (const k of kamers) {
      const v = k.verdieping, basis = inspring[v] || 0;
      if (!(v in cursor)) cursor[v] = basis;
      if (k.start != null) cursor[v] = basis + k.start;
      k.box = { x: links + cursor[v] * C, b: k.breedte * C };
      cursor[v] += k.breedte;
      maxCel = Math.max(maxCel, cursor[v]);
    }
    const Wnat = links + maxCel * C + M.muur + M.marge + (erf.rechts || 0);
    const extra = minBreedte > Wnat ? Math.floor((minBreedte - Wnat) / 2) : 0;
    if (extra) { links += extra; for (const k of kamers) k.box.x += extra; }
    for (const k of kamers) {
      const buur = kamers.find(o => o !== k && o.verdieping === k.verdieping && !o.buiten && o.box.x + o.box.b === k.box.x);
      const muurLinks = !k.buiten || !!buur;
      k.x = k.box.x + (muurLinks ? M.muur : 0);
      k.b = k.box.b - (muurLinks ? M.muur : 0);
    }
    // Daken: delen van een binnenrij waar geen binnenkamer (of dakterras) bovenop staat. Per stuk de dakvorm:
    // een eigen dak van de kamer (serre: glas, toren: spits), een aanbouw naast een hogere verdieping, of het hoofddak.
    const binnen = v => kamers.filter(k => k.verdieping === v && !k.buiten).sort((a, b) => a.box.x - b.box.x);
    const rijen = v => {
      const uit = [];
      for (const k of binnen(v)) {
        const eind = k.box.x + k.box.b + M.muur;
        const laatste = uit[uit.length - 1];
        if (laatste && laatste[1] >= k.box.x) laatste[1] = Math.max(laatste[1], eind);
        else uit.push([k.box.x, eind]);
      }
      return uit;
    };
    const hoger = v => kamers.some(k => k.verdieping > v && !k.buiten);
    const daken = [];
    for (let v = 0; v < F; v++) {
      const boven = [...rijen(v + 1), ...kamers.filter(k => k.verdieping === v + 1 && k.dakvloer).map(k => [k.box.x, k.box.x + k.box.b])];
      for (const [a, b] of rijen(v)) {
        let stukken = [[a, b]];
        for (const [c, d] of boven) {
          stukken = stukken.flatMap(([p, q]) => (d <= p || c >= q) ? [[p, q]] : [[p, c], [d, q]].filter(([s, e]) => e - s > M.muur));
        }
        for (const [p, q] of stukken) {
          const delen = [];
          for (const k of binnen(v)) {
            const s = Math.max(p, k.box.x), e = Math.min(q, k.box.x + k.box.b + M.muur);
            if (e - s <= M.muur) continue;
            const sleutel = k.dak ? JSON.stringify(k.dak) : '';
            const laatste = delen[delen.length - 1];
            if (laatste && laatste.sleutel === sleutel) { laatste.e = Math.max(laatste.e, e); laatste.kamers.push(k); }
            else delen.push({ s, e, sleutel, eigen: k.dak, kamers: [k] });
          }
          for (const d of delen) {
            const stijl = d.eigen ? Object.assign({}, d.eigen) : hoger(v) && huis.dak.aanbouw ? Object.assign({}, huis.dak.aanbouw) : huis.dak;
            const zolder = d.kamers.find(k => (H.kamertypes[k.type] || {}).schuin);
            const dak = { v, x: d.s, b: d.e - d.s, stijl, hoofd: !d.eigen && !hoger(v), kamers: d.kamers.map(k => k.id) };
            if (zolder && stijl.vorm === 'zadel') {
              dak.schuin = schuinDak(dak.b, H.kamertypes[zolder.type].schuin.knie, stijl.stap || 8);
              dak.h = dak.schuin.h;
              for (const k of d.kamers) k.schuin = { knie: dak.schuin.knie, stap: dak.schuin.stap, links: dak.x, rechts: dak.x + dak.b };
            } else dak.h = dakHoogte(stijl.vorm, dak.b, stijl);
            daken.push(dak);
          }
        }
      }
    }
    // y: lucht + uitsteeksel van het hoogste dak (of een burenverdieping bij een flat).
    let boven = 0;
    for (const d of daken) boven = Math.max(boven, d.h - (F - 1 - d.v) * P);
    if (huis.omgeving === 'flat') boven = Math.max(boven, P + dakHoogte('plat', 0));
    const ytop = M.lucht + boven;
    const plaatY = v => ytop + (F - 1 - v) * P;
    for (const k of kamers) {
      k.y = plaatY(k.verdieping) + M.vloerplaat;
      k.h = M.kamerhoogte;
      k.vloerY = k.y + k.h - M.vloerlijn;
    }
    for (const d of daken) d.y = plaatY(d.v);
    const grondY = ytop + F * P;
    const W = Math.max(Wnat, minBreedte || 0);
    return { huis, F, P, kamers, daken, rijen, plaatY, grondY, W, H: grondY + (huis.grond || M.grond), links, ytop };
  }

  // ---------- inrichting ----------
  // Item: { id, soort, kamer (kamer-id), x, y, voorbeeld? }. x vanaf de binnenkant van de linkermuur,
  // y = hoogte van de onderkant boven de vloerlijn.
  const prio = it => (H.meubels[it.soort] && H.meubels[it.soort].prioriteit) || 0;
  function overlapt(x, b, o) {
    const ob = maat(o.soort).b;
    return x < o.x + ob && o.x < x + b;
  }

  // Schuine kap (zolder): raakt een meubel op (x, y) met maat b x h binnen de kamer het dak niet?
  function onderKap(kamer, x, y, b, h) {
    const s = kamer.schuin;
    if (!s) return true;
    const i = Math.floor((M.vloerlijn + y + h - 1 - s.knie) / 8);    // hoogste dakrij die het meubel raakt
    if (i < 0) return true;
    const ax = kamer.x + x;
    return ax - (s.links + M.muur) >= s.stap * i && (s.rechts - M.muur) - (ax + b) >= s.stap * i;
  }

  // Zoekt een plek voor `soort` in `kamer`, zo dicht mogelijk bij (wilX, wilY). null = past niet.
  // Vloer-meubels overlappen elkaar niet; muur- en vrije meubels worden alleen binnen de kamer gehouden.
  function plaats(kamer, soort, wilX, wilY, geplaatst) {
    const d = H.meubels[soort];
    if (!d) return null;
    const { b, h } = maat(soort);
    if (b > kamer.b) return null;
    if (kamer.trap && d.op !== 'muur' && !(d.hoort || []).includes('trap')) return null;
    const maxX = kamer.b - b;
    const snap = x => Math.min(maxX, Math.max(0, Math.round(x / R) * R));
    if (d.op === 'vloer') {
      const vrij = x => !geplaatst.some(o => o.kamer === kamer.id && H.meubels[o.soort] &&
        H.meubels[o.soort].op === 'vloer' && overlapt(x, b, o)) && onderKap(kamer, x, 0, b, h) &&
        !(kamer.blok || []).some(([p, q]) => x < q && p < x + b);      // niet in het zwembad
      const x0 = snap(wilX || 0);
      for (let s = 0; s <= kamer.b + R; s += R) {
        for (const x of s ? [x0 - s, x0 + s] : [x0]) {
          if (x >= 0 && x <= maxX && vrij(x)) return { x, y: 0 };
        }
      }
      return vrij(maxX) ? { x: maxX, y: 0 } : null;
    }
    const maxY = kamer.h - M.vloerlijn - h;
    if (maxY < 0) return null;
    const x = snap(wilX || 0);
    for (let y = Math.min(maxY, Math.max(0, Math.round((wilY || 0) / R) * R)); y >= 0; y -= R) {
      if (onderKap(kamer, x, y, b, h)) return { x, y };
    }
    return null;
  }

  // Een vrij meubel boven de vloer (plant op het aanrecht) zakt naar de vloer als er niets meer onder staat.
  function steun(items) {
    for (const it of items) {
      const d = H.meubels[it.soort];
      if (!d || d.op !== 'vrij' || it.y <= 0) continue;
      const m = maat(it.soort), mid = it.x + m.b / 2;
      const draagt = items.some(o => o !== it && o.kamer === it.kamer && o.x <= mid && mid <= o.x + maat(o.soort).b &&
        Math.abs(o.y + maat(o.soort).h - it.y) <= 4);
      if (!draagt) it.y = 0;
    }
    return items;
  }

  // Standaardplaatsing van een kamer: eigen `plaatsing` uit het niveau, anders die van zijn type.
  const plaatsingVan = k => k.plaatsing || H.plaatsingen[k.type] || [];
  const opVolgorde = lijst => lijst.slice().sort((a, b) => (prio(b) - prio(a)) || (maat(b.soort).b - maat(a.soort).b));

  // Verbouwing van vanGeo naar naarGeo (vanGeo = null: de startinrichting).
  //   1. Een meubel blijft in zijn kamer (zelfde kamer-id) op zijn x, als die kamer nog bestaat en het type gelijk
  //      bleef of het meubel bij het nieuwe type hoort (een bed in slaaphoek -> slaapkamer blijft staan).
  //   2. Anders zoekt het een kamer uit zijn `hoort`-lijst (het keukenblok gaat naar de nieuwe keuken). Wat al in de
  //      doos zat, krijgt hier ook een nieuwe kans. Past het nergens, dan gaat het in de doos.
  //   3. Een nieuwe kamer (of een kamer met een ander type) krijgt de meubels uit zijn plaatsing die jullie nog niet
  //      hebben en die passen. Die staan in `nieuw`.
  function verbouw(inrichting, doos, vanGeo, naarGeo) {
    const oud = id => vanGeo && vanGeo.kamers.find(x => x.id === id);
    const geplaatst = [], rest = [], nieuweDoos = [], nieuw = [];
    // Komt een meubel in een kamer die nieuw is of van type veranderde, en staat het in de plaatsing van die kamer,
    // dan is die plek de wens (het bed staat in de mastersuite naast het nachtkastje, niet op zijn oude x).
    const wens = (it, k) => {
      const was = oud(k.id);
      const p = (!was || was.type !== k.type) && plaatsingVan(k).find(q => q.id === it.id);
      return p ? { x: p.x, y: p.y } : { x: it.x, y: it.y };
    };
    for (const it of opVolgorde(inrichting.filter(i => !i.voorbeeld))) {
      const d = H.meubels[it.soort];
      if (!d) continue;
      const k = naarGeo.kamers.find(x => x.id === it.kamer), was = oud(it.kamer);
      const blijft = k && (!was || was.type === k.type || (d.hoort || []).includes(k.type));
      const w = blijft && wens(it, k);
      const p = blijft && plaats(k, it.soort, w.x, w.y, geplaatst);
      if (p) geplaatst.push({ id: it.id, soort: it.soort, kamer: k.id, x: p.x, y: p.y });
      else rest.push(it);
    }
    for (const it of opVolgorde([...rest, ...doos.map(i => ({ id: i.id, soort: i.soort, x: 0, y: 0 }))])) {
      const d = H.meubels[it.soort];
      if (!d) continue;
      let gelukt = null;
      for (const t of d.hoort || []) {
        for (const k of naarGeo.kamers.filter(x => x.type === t)) {
          const w = wens(it, k);
          const p = plaats(k, it.soort, w.x, w.y, geplaatst);
          if (p) { gelukt = { id: it.id, soort: it.soort, kamer: k.id, x: p.x, y: p.y }; break; }
        }
        if (gelukt) break;
      }
      if (gelukt) geplaatst.push(gelukt); else nieuweDoos.push({ id: it.id, soort: it.soort });
    }
    const bekend = new Set([...geplaatst, ...nieuweDoos].map(i => i.id));
    for (const k of naarGeo.kamers) {
      const was = oud(k.id);
      if (was && was.type === k.type) continue;
      for (const p of plaatsingVan(k)) {
        if (bekend.has(p.id)) continue;
        const pos = plaats(k, p.soort, p.x, p.y, geplaatst);
        if (!pos) continue;
        bekend.add(p.id); nieuw.push(p.id);
        geplaatst.push({ id: p.id, soort: p.soort, kamer: k.id, x: pos.x, y: pos.y });
      }
    }
    return { inrichting: steun(geplaatst), doos: nieuweDoos, nieuw };
  }
  const startInrichting = geo => verbouw([], [], null, geo);

  // Voorbeeldmeubels (lichter getekend) voor kamers die na een proefverbouwing nog leeg zijn.
  function voorbeelden(geo, inrichting) {
    const uit = [], alle = inrichting.slice();
    for (const k of geo.kamers) {
      if (inrichting.some(i => i.kamer === k.id && H.meubels[i.soort] && H.meubels[i.soort].op === 'vloer')) continue;
      for (const p of plaatsingVan(k)) {
        const pos = plaats(k, p.soort, p.x, p.y, alle);
        if (!pos) continue;
        const it = { id: `vb:${k.id}:${p.id}`, soort: p.soort, kamer: k.id, x: pos.x, y: pos.y, voorbeeld: true };
        uit.push(it); alle.push(it);
      }
    }
    return uit;
  }

  // ---------- pets en bewoners ----------
  const plekVoor = (item, naam) => (item && H.meubels[item.soort] && H.meubels[item.soort].plekken || {})[naam] || null;
  function kamerVoor(geo, types) {
    for (const t of types || []) { const k = geo.kamers.find(x => x.type === t); if (k) return k; }
    return geo.kamers.find(k => !k.buiten && !k.trap) || geo.kamers[0];
  }
  // Per pet: { pet, kamer, x } (vrij lopen, x = voetanker in de kamer) of { pet, item, plek } of { pet, logeert: true }.
  function petsPlaatsen(geo, inrichting) {
    return H.pets.map(p => {
      if (p.plek) {
        const item = inrichting.find(i => i.id === p.plek[0]);
        const plek = plekVoor(item, p.plek[1]);
        return item && plek ? { pet: p, item, plek } : { pet: p, logeert: true };
      }
      const k = kamerVoor(geo, p.kamers);
      return { pet: p, kamer: k, x: Math.min(Math.max(p.x, 20), k.b - 20) };
    });
  }

  // ---------- behoefte-klok en dagdeel ----------
  function klok(taak, laatst, nu) {
    const waarde = (nu - laatst) / 864e5 / taak.interval_dagen;
    const stand = H.klokstanden.find(s => s.tot == null || waarde < s.tot);
    return { waarde, stand };
  }
  function dagdeel(uur) {
    return H.dagdelen.find(d => d.van < d.tot ? (uur >= d.van && uur < d.tot) : (uur >= d.van || uur < d.tot)) || H.dagdelen[0];
  }

  // ---------- opgeslagen staat controleren ----------
  // staat (versie 3): { versie, niveau, inrichting, doos, posities: { hidde: { kamer, x } } }.
  // Versie 2 (losse huizen) wordt omgezet: de studio is niveau 1 (woonkeuken -> 'woon', slaaphoek -> 'slaap');
  // stond je in een ander huis, dan begin je opnieuw op niveau 1.
  const V2_KAMERS = { woonkeuken: 'woon', slaaphoek: 'slaap' };
  function normaliseer(s) {
    let st = (s && typeof s === 'object') ? s : {};
    if (st.versie === 2) {
      st = st.bewoond === 'studio'
        ? { versie: 3, niveau: 1, inrichting: (st.inrichting || []).map(i => i && Object.assign({}, i, { kamer: V2_KAMERS[i.kamer] || i.kamer })),
          doos: st.doos, posities: {} }
        : {};
    }
    if (st.versie !== 3) st = {};
    const niveau = niveauVan(st.niveau) ? +st.niveau : H.start.niveau;
    const geo = bouw(niveauVan(niveau));
    let inrichting = Array.isArray(st.inrichting) ? st.inrichting : null;
    let doos = Array.isArray(st.doos) ? st.doos.filter(i => i && H.meubels[i.soort]) : [];
    if (!inrichting) ({ inrichting, doos } = startInrichting(geo));
    const ids = new Set(), schoon = [];
    for (const i of inrichting) {
      if (!i || !H.meubels[i.soort] || ids.has(i.id)) continue;
      ids.add(i.id);
      const k = geo.kamers.find(x => x.id === i.kamer);
      if (!k) { doos.push({ id: i.id, soort: i.soort }); continue; }
      const m = maat(i.soort);
      schoon.push({ id: i.id, soort: i.soort, kamer: k.id,
        x: Math.min(Math.max(0, +i.x || 0), Math.max(0, k.b - m.b)), y: Math.max(0, +i.y || 0) });
    }
    const posities = (st.posities && typeof st.posities === 'object') ? st.posities : {};
    return { versie: 3, niveau, inrichting: schoon, doos, posities };
  }

  return { kleur, niveauVan, maxNiveau, maat, bouw, dakHoogte, startInrichting, verbouw, voorbeelden, plaats, steun, plekVoor,
    onderKap, petsPlaatsen, klok, dagdeel, normaliseer, R, P };
})(window.PQ_HUIS, window.PQ_KLEDING);
