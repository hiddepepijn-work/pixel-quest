// Ons huis: poppenhuis-doorsnede (vooraanzicht) met bewoners, pets, taaksignalen, bewerkmodus en verbouwingen.
// Leest PQ_HUIS (assets/huis.js), PQ_MANIFEST, PQ_KLEDING, PQ_FIGUUR (figuur.js), PQ_HUISMODEL en PQ_HUISTEKEN.
// Werkt via file://: alle data staat in scriptbestanden, er wordt niets opgehaald.
// Testadres: huis.html?test&schoon&uur=22&niveau=6&bewerk&weergave=verbouwen&zoom=2&outfit=zeebries (&verbouw=N zet echt)
(function () {
  'use strict';
  const H = window.PQ_HUIS, HM = window.PQ_HUISMODEL, HT = window.PQ_HUISTEKEN;
  const F = window.PQ_FIGUUR, D = window.PQ_KLEDING, MAN = window.PQ_MANIFEST;
  const OH = window.PQ_OMGEVINGHUIS;    // licht, weer, seizoen en events (omgeving-huis.js)
  const A = window.PQ_HUISANIM, G = window.PQ_HUISGEDRAG;   // loopcycli en gedrag (huis-anim*.js)
  const $ = s => document.querySelector(s);
  const ASSETS = '../assets/';
  const q = new URLSearchParams(location.search);
  const TEST = q.has('test'), SCHOON = q.has('schoon');
  if (TEST && q.has('poster')) document.body.classList.add('poster');   // hele scene, voor schermafbeeldingen
  const SLEUTEL = { staat: 'pq-huis-staat', taken: 'pq-huis-taken', inst: 'pq-huis-instellingen' };
  const minderBeweging = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const R = H.raster, DAG = 864e5;
  // Lopen en procedurele animatie: niet in de bewerkmodus en niet bij prefers-reduced-motion (dan staat alles stil).
  const animatie = () => !!(A && G) && !bewerken && !minderBeweging && !q.has('stil');

  // ---------- opslag (altijd in try/catch; ?schoon negeert opgeslagen staat) ----------
  function lees(sleutel, standaard) {
    if (SCHOON) return standaard;
    try {
      const v = localStorage.getItem(sleutel);
      return v ? JSON.parse(v) : standaard;
    } catch (e) { return standaard; }
  }
  function schrijf(sleutel, waarde) {
    if (SCHOON) return false;
    try { localStorage.setItem(sleutel, JSON.stringify(waarde)); return true; } catch (e) { return false; }
  }

  // ---------- staat ----------
  let staat = HM.normaliseer(lees(SLEUTEL.staat, null));
  let laatst = lees(SLEUTEL.taken, {}) || {};
  const inst = Object.assign({ zoom: 'auto', outfit: 'kledingkast', dagnacht: true, markeer: false }, lees(SLEUTEL.inst, {}));
  const LAAD = Date.now();
  let bekijk = null;            // niveau dat als voorbeeld getoond wordt (geen echte verbouwing)
  let bewerken = false;
  let gekozen = null;           // { soort: 'meubel' | 'bewoner', id }
  let Z = 2;                    // schermpx per artpx
  let scene = null;             // { geo, inrichting, doos, voorbeeld }
  const bewaar = () => schrijf(SLEUTEL.staat, staat);
  const bewaarInst = () => schrijf(SLEUTEL.inst, inst);

  if (q.has('zoom')) inst.zoom = q.get('zoom');
  if (q.has('outfit')) inst.outfit = q.get('outfit');
  if (q.has('markeer')) inst.markeer = true;
  if (q.has('dagnacht')) inst.dagnacht = q.get('dagnacht') !== '0';

  // ---------- hulpjes ----------
  const el = (tag, cls, tekst) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (tekst != null) e.textContent = tekst;
    return e;
  };
  const px = v => Math.round(v) + 'px';
  const asset = id => MAN.assets.find(a => a.id === id);
  const getal = n => n.toLocaleString('nl-NL');
  const inzet = t => Math.round(t.minuten * (1 + 0.3 * t.zwaarte));
  const kamerVan = (geo, id) => geo.kamers.find(k => k.id === id);
  // Dagdeel uit de omgevingsstatus (zonnestand, weer, seizoen); ?uur, ?datum, ?weer en ?dagnacht=0 werken daar.
  const dagdeelNu = () => OH.dagdeel();
  function kiesZoom(geo) {
    if (inst.zoom !== 'auto') return Math.min(3, Math.max(1, +inst.zoom || 2));
    const ruimte = $('#venster').clientWidth || window.innerWidth;
    // Minstens 2x: op 1x zijn de bewoners en de (op echte maat getekende) pets te klein.
    // Een groot huis scrollt dan binnen zijn eigen venster; 1x blijft kiesbaar via Zoom.
    const z = Math.floor(ruimte / geo.W);
    return Math.min(3, Math.max(H.schaal.minimum_smal, z));
  }
  // Nominale doos van een meubel in scene-artpx (linksboven, breedte, hoogte) en zijn kamer.
  function meubelBox(it, geo) {
    const k = kamerVan(geo, it.kamer), m = HM.maat(it.soort);
    return { x: k.x + it.x, y: k.vloerY - it.y - m.h, b: m.b, h: m.h, k };
  }
  function zetBox(e, x, y, b, h) {
    e.style.left = px(x * Z); e.style.top = px(y * Z);
    if (b != null) { e.style.width = px(b * Z); e.style.height = px(h * Z); }
  }
  // Kamer onder een punt (scene-artpx); anders de dichtstbijzijnde kamer.
  function kamerBij(geo, x, y) {
    let beste = null, afstand = Infinity;
    for (const k of geo.kamers) {
      const dx = Math.max(k.x - x, 0, x - (k.x + k.b)), dy = Math.max(k.y - y, 0, y - (k.y + k.h));
      const d = dx * dx + dy * dy * 4;
      if (d < afstand) { afstand = d; beste = k; }
    }
    return beste;
  }
  // Kleine glinster in pixels (7x7), voor signalen en de takenlijst.
  function glinster(schaal) {
    const c = el('canvas');
    c.width = 7; c.height = 7;
    const ctx = c.getContext('2d');
    HT.rect(ctx, 3, 0, 1, 7, 'goud'); HT.rect(ctx, 0, 3, 7, 1, 'goud');
    HT.rect(ctx, 2, 2, 3, 3, 'goud'); HT.rect(ctx, 3, 3, 1, 1, 'creme');
    c.style.width = px(7 * schaal); c.style.height = px(7 * schaal);
    return c;
  }

  // ---------- scene ----------
  // Het huis op het huidige niveau, of bij "Bekijk" een proefverbouwing naar een ander niveau. Meubels die bij die
  // verbouwing nieuw zijn, en voorbeeldmeubels in lege kamers, staan lichter.
  function maakScene() {
    const n = bekijk || staat.niveau, huis = HM.niveauVan(n);
    Z = kiesZoom(HM.bouw(huis));
    const geo = HM.bouw(huis, Math.floor(($('#venster').clientWidth || 0) / Z));
    if (!bekijk || bekijk === staat.niveau) {
      return { geo, inrichting: staat.inrichting, doos: staat.doos, voorbeeld: false };
    }
    const r = HM.verbouw(staat.inrichting, staat.doos, HM.bouw(HM.niveauVan(staat.niveau)), geo);
    const nieuw = new Set(r.nieuw);
    const inr = r.inrichting.map(i => nieuw.has(i.id) ? Object.assign({}, i, { voorbeeld: true }) : i);
    return { geo, inrichting: [...inr, ...HM.voorbeelden(geo, inr)], doos: r.doos, voorbeeld: true, echt: r };
  }

  function maakMeubel(it, geo, dd) {
    const def = H.meubels[it.soort], box = meubelBox(it, geo);
    const e = el('div', 'meubel' + (def.sprite ? '' : ' placeholder') + (it.voorbeeld ? ' voorbeeld' : ''));
    e.dataset.id = it.id;
    e.setAttribute('aria-label', def.naam + (def.sprite ? '' : ' (placeholder)') + (it.voorbeeld ? ', voorbeeld' : ''));
    // Een meubel met voor: true (kookeiland, salontafel) staat vóór de rest: 3 artpx lager en erover.
    zetBox(e, box.x, box.y + (def.voor ? 3 : 0), box.b, box.h);
    e.style.zIndex = def.op === 'muur' ? 1 : def.voor ? 3 : 2;
    e._glas = {};
    if (def.sprite) {
      // Echte sprite: bronpixels op schaal Z / bronpx_per_artpixel, anker middenonder de nominale doos.
      const s = def.sprite, sc = Z / s.bronpx_per_artpixel, img = new Image();
      img.src = ASSETS + s.bestand; img.alt = ''; img.draggable = false;
      img.style.width = px(s.maat[0] * sc); img.style.height = px(s.maat[1] * sc);
      img.style.left = px(box.b * Z / 2 - s.anker[0] * sc); img.style.top = px(box.h * Z - s.anker[1] * sc);
      e.appendChild(img);
    } else {
      const t = HT.tekenMeubel(def, dd.lampen);
      const zet = c => { c.style.left = px(t.ox * Z); c.style.top = px(t.oy * Z); c.style.width = px(t.w * Z); c.style.height = px(t.h * Z); };
      zet(t.achter); e.appendChild(t.achter);
      const glazen = {};
      for (const [naam, p] of Object.entries(def.plekken || {})) {
        if (!p.glas) continue;
        const sl = p.glas.join(',');
        if (!glazen[sl]) {
          glazen[sl] = el('div', 'glas');
          zetBox(glazen[sl], p.glas[0], p.glas[1], p.glas[2], p.glas[3]);
          e.appendChild(glazen[sl]);
        }
        e._glas[naam] = glazen[sl];
      }
      if (t.voor) { zet(t.voor); t.voor.style.zIndex = 3; e.appendChild(t.voor); }
    }
    if (bewerken && !scene.voorbeeld) maakSleepbaar(e, 'meubel', it.id, def.naam);
    return e;
  }

  // ---------- bewoners (Hidde en Tessie) ----------
  function outfitVoor(fid) {
    if (inst.outfit === 'origineel') return { keuze: {}, accs: [] };
    if (inst.outfit === 'kledingkast') {
      const kk = lees(F.OPSLAG_KAST.staat, {}) || {}, eigen = lees(F.OPSLAG_KAST.acc, []) || [];
      const alle = [...D.accessoires, ...(Array.isArray(eigen) ? eigen : [])];
      const ids = (kk.acc && kk.acc[fid]) || [];
      return { keuze: (kk.keuze && kk.keuze[fid]) || {}, accs: ids.map(id => alle.find(a => a.id === id)).filter(Boolean) };
    }
    const o = D.catalogus.find(c => c.id === inst.outfit);
    return { keuze: o ? o[fid] : {}, accs: [] };
  }
  // Kledingkast-look (figuur.js tekenLook) met automatische weerkleding (kast-auto.js) uit de omgevingsstatus;
  // anders, of als dat misgaat, de oude route (recolor-outfit via tekenFiguur).
  function bezitVan(fid) {
    if (q.get('bezit') === 'alles' && F.kastItems) return Object.fromEntries(F.kastItems().map(it => [it.id, it.kleuren.slice()]));
    const b = lees(F.OPSLAG_KAST.bezit || 'pq-kk-bezit', null);
    if (b && b[fid]) return b[fid];
    return Object.fromEntries((F.kastItems ? F.kastItems() : []).filter(it => it.startkast && (it.lichaam || []).includes(fid)).map(it => [it.id, [it.kleuren[0]]]));
  }
  function lookNu(fid) {
    let look = F.lookVoor(fid);
    const A = window.PQ_KASTAUTO, st = OH.status();
    if (A && st && OH.autoAan(fid)) {
      try { look = A.kiesAutoLook(look, st, bezitVan(fid), { fid, nu: OH.nu() }); } catch (e) { /* eigen look blijft */ }
    }
    return look;
  }
  function tekenBewoner(c, fid) {
    if (inst.outfit === 'kledingkast' && F.tekenLook && F.lookVoor) {
      try { F.tekenLook(c, fid, 'bron', lookNu(fid)); return; } catch (err) { /* terug naar de oude route */ }
    }
    const o = outfitVoor(fid);
    try { F.tekenFiguur(c, fid, 'bron', o.keuze, o.accs); } catch (err) { F.tekenFiguur(c, fid, 'bron', {}, []); }
  }
  function bewonerPlek(b, geo) {
    const p = !scene.voorbeeld && staat.posities[b.id];
    const k = p && kamerVan(geo, p.kamer);
    if (k) return { k, x: Math.min(Math.max(p.x, 16), k.b - 16) };
    const kk = b.kamers.map(t => geo.kamers.find(x => x.type === t)).find(Boolean) || geo.kamers.find(x => !x.buiten);
    return { k: kk, x: Math.min(Math.max(b.x, 16), kk.b - 16) };
  }
  function tekenBewoners(laag, geo) {
    for (const b of H.bewoners) {
      const a = asset(b.id), sc = Z / a.bronpx_per_artpixel;
      if (animatie()) {
        try {
          const fig = el('canvas'), plek = bewonerPlek(b, geo);
          tekenBewoner(fig, b.id);
          laag.appendChild(G.mens({ id: b.id, a, frames: A.mens(b.id, fig), k: plek.k, x: plek.x }));
          continue;
        } catch (err) { if (window.PQ_TEST) window.PQ_TEST.fouten.push('loopcyclus: ' + err.message); }
      }
      const [w, h] = a.afmetingen.bron, [ax, ay] = a.anker.bron, [fw, fh] = a.figuur.bron;
      const { k, x } = bewonerPlek(b, geo);
      const e = el('div', 'figuur');
      e.dataset.id = b.id;
      e.style.left = px((k.x + x) * Z - ax * sc); e.style.top = px(k.vloerY * Z - ay * sc);
      e.style.width = px(w * sc); e.style.height = px(h * sc); e.style.zIndex = 4;
      const c = el('canvas');
      c.setAttribute('aria-label', a.naam);
      tekenBewoner(c, b.id);
      e.appendChild(c);
      if (bewerken && !scene.voorbeeld) {
        const g = el('div', 'greep');
        g.style.left = px((ax - fw / 2) * sc); g.style.top = px((ay - fh) * sc);
        g.style.width = px(fw * sc); g.style.height = px(fh * sc);
        g._figuur = e; g.dataset.id = b.id;
        e.appendChild(g);
        maakSleepbaar(g, 'bewoner', b.id, a.naam);
      }
      laag.appendChild(e);
    }
  }
  function tekenKamerlabels(laag, geo) {
    for (const k of geo.kamers) {
      const l = el('div', 'kamerlabel', k.naam);
      l.style.left = px((k.x + 2) * Z); l.style.top = px((k.y + 2) * Z);
      laag.appendChild(l);
    }
  }

  // ---------- pets ----------
  // Een pet is een element op zijn voetanker; lopen = alleen translate, omdraaien = alleen scaleX(-1).
  let petTimers = [];
  const actievePets = [];
  function stopPets() { petTimers.forEach(clearTimeout); petTimers = []; actievePets.length = 0; if (G) G.stop(); }
  // Echte maat: verhouding tussen de gemiddelde maat van de soort (H.echte_maten) en de maat op de
  // pixelschaal van het blad. IJkpunt is Hidde (H.ijk: 190 cm).
  function petFactor(a) {
    const e = H.echte_maten && H.echte_maten[a.id], ijk = H.ijk && asset(H.ijk.figuur);
    if (!e || !ijk) return 1;
    const cmPerArtpx = H.ijk.cm / (ijk.figuur.bron[1] / ijk.bronpx_per_artpixel);
    const nu = (e.maat === 'hoogte' ? a.figuur.bron[1] : a.figuur.bron[0]) / a.bronpx_per_artpixel;
    return (e.cm / cmPerArtpx) / nu;
  }
  // Met frames (anim) tekent huis-anim-gedrag.js een canvas in de romp; anders het bronbeeld als <img>.
  function maakPet(p, anim) {
    const a = asset(p.id), sc = Z / a.bronpx_per_artpixel * petFactor(a);
    const [w, h] = a.afmetingen.bron, [ax, ay] = a.anker.bron, [fw, fh] = a.figuur.bron;
    const e = el('div', 'pet');
    e.dataset.id = p.id;
    const romp = el('div', 'romp' + (sc < 0.35 ? ' zacht' : ''));
    romp.style.left = px(-ax * sc); romp.style.top = px(-ay * sc);
    romp.style.width = px(w * sc); romp.style.height = px(h * sc);
    romp.style.transformOrigin = px(ax * sc) + ' 0';
    if (!anim) {
      const img = new Image();
      img.src = ASSETS + a.bestanden.bron; img.alt = ''; img.draggable = false;
      romp.appendChild(img);
    } else e.classList.add('anim');
    const naam = p.bijnaam || a.naam;
    const tik = el('button', 'tik');
    tik.setAttribute('aria-label', `Aai ${naam}`);
    // Tikvlak minstens 32 schermpx, ook voor een kikkertje van 8 cm.
    const tb = Math.max(fw * sc, 32), th = Math.max(fh * sc, 32);
    tik.style.left = px(-tb / 2); tik.style.top = px(-th);
    tik.style.width = px(tb); tik.style.height = px(th);
    tik.onclick = () => aai(e, naam);
    e.append(romp, tik);
    return { e, romp, naam, sc, f: petFactor(a) };
  }
  // Kijkrichting: een sprite die naar links kijkt, wordt gespiegeld als hij naar rechts loopt (en andersom).
  function kijk(romp, pet, naarRechts) {
    const spiegel = pet.kijkrichting === 'voor' ? false : (pet.kijkrichting === 'links') === naarRechts;
    romp.classList.toggle('gespiegeld', spiegel);
  }
  // Loopt heen en weer tussen [min, max] (in artpx t.o.v. het basispunt) en [ymin, ymax] voor zwemmers.
  function laatLopen(rec) {
    if (minderBeweging || rec.min === rec.max) return;
    const stap = () => {
      let doel = rec.min + Math.random() * (rec.max - rec.min);
      if (Math.abs(doel - rec.nu) < 10) doel = rec.nu < (rec.min + rec.max) / 2 ? rec.max : rec.min;
      const dy = rec.ymax > rec.ymin ? rec.ymin + Math.random() * (rec.ymax - rec.ymin) : 0;
      kijk(rec.romp, rec.pet, doel > rec.nu);
      rec.e.style.transform = `translate(${px(doel * Z)}, ${px(dy * Z)})`;
      rec.nu = doel;
      petTimers.push(setTimeout(stap, 2600 + Math.random() * 3200));
    };
    petTimers.push(setTimeout(stap, 400 + Math.random() * 1500));
  }
  function tekenPets(laag, geo) {
    for (const plek of HM.petsPlaatsen(geo, scene.inrichting)) {
      if (plek.logeert || !asset(plek.pet.id)) continue;
      const p = plek.pet, pa = asset(p.id);
      let fr = null;
      if (animatie()) { try { fr = A.pet(p.id, Z / pa.bronpx_per_artpixel * petFactor(pa)); } catch (err) { if (window.PQ_TEST) window.PQ_TEST.fouten.push('pet-frames: ' + err.message); } }
      const { e, romp, naam, sc, f } = maakPet(p, !!fr);
      if (!fr) kijk(romp, p, p.kijkrichting !== 'links');
      let rec;
      const nacht = OH.petPlek(p, geo, scene.inrichting);
      if (nacht) {
        // 's nachts op een vast plekje (de kat in de mand), zonder te lopen
        zetBox(e, nacht.x, nacht.y);
        e.classList.add('slaapt');
        rec = { e, romp, pet: p, nu: 0, min: 0, max: 0, ymin: 0, ymax: 0 };
        laag.appendChild(e);
      } else if (plek.kamer) {
        // Vrij lopen over de vloer van zijn kamer.
        const k = plek.kamer, x0 = k.x + plek.x;
        zetBox(e, x0, k.vloerY);
        rec = { e, romp, pet: p, nu: 0, min: Math.max(k.x + 24, x0 - 80) - x0, max: Math.min(k.x + k.b - 24, x0 + 80) - x0, ymin: 0, ymax: 0 };
        laag.appendChild(e);
      } else {
        // In of op een meubel: in het glas (geknipt) of op het meubel zelf.
        const m = laag.querySelector(`.meubel[data-id="${CSS.escape(plek.item.id)}"]`);
        if (!m) continue;
        const pl = plek.plek, bak = m._glas[p.plek[1]] || m;
        const gx = pl.glas ? pl.glas[0] : 0, gy = pl.glas ? pl.glas[1] : 0;
        zetBox(e, pl.bereik[0] - gx, pl.lijn[0] - gy);
        rec = { e, romp, pet: p, nu: 0, min: 0, max: pl.bereik[1] - pl.bereik[0], ymin: 0, ymax: pl.lijn[1] - pl.lijn[0] };
        bak.appendChild(e);
        if (m.classList.contains('voorbeeld')) e.style.opacity = 1;
      }
      rec.naam = naam;
      actievePets.push(rec);
      if (fr) G.pet({ id: p.id, e, romp, frames: fr, sc, f, min: rec.min, max: rec.max, ymin: rec.ymin, ymax: rec.ymax, slaapt: e.classList.contains('slaapt') || (p.id === 'parkietje' && OH.status() && OH.status().licht.fase === 'nacht') });
      else if (!bewerken) laatLopen(rec);
    }
  }
  // Positie van een element t.o.v. het diorama, in schermpx.
  function inDiorama(e) {
    const r = e.getBoundingClientRect(), d = $('#diorama').getBoundingClientRect();
    return { x: r.left - d.left + r.width / 2, y: r.top - d.top, b: r.width, h: r.height };
  }
  function aai(petEl, naam) {
    const tik = petEl.querySelector('.tik'), p = inDiorama(tik), box = $('#signalen');
    const hart = el('div', 'hartje', '♥');
    hart.style.left = px(p.x); hart.style.top = px(p.y);
    const kaart = el('div', 'naamkaartje', naam);
    kaart.style.left = px(p.x); kaart.style.top = px(p.y - 24);
    box.append(hart, kaart);
    setTimeout(() => { hart.remove(); kaart.remove(); }, 2300);
    if (!minderBeweging) {
      petEl.classList.remove('huppel'); void petEl.offsetWidth; petEl.classList.add('huppel');
    }
  }

  // ---------- taken: behoefte-klok, signalen en feestje ----------
  const laatstVan = t => (laatst[t.id] != null ? laatst[t.id] : LAAD - t.start_dagen_geleden * DAG);
  const taakKlok = t => HM.klok(t, laatstVan(t), Date.now());
  function standIcoon(stand, schaal) {
    if (stand.signaal === 'glinster') return glinster(schaal);
    return el('span', 'standicoon', stand.signaal === 'vraag' ? '?' : '·');
  }
  function tekenSignalen() {
    const box = $('#signalen');
    box.querySelectorAll('.signaal').forEach(x => x.remove());   // hartjes en sterretjes mogen uitspelen
    if (scene.voorbeeld) return;
    for (const t of H.taken) {
      const { stand } = taakKlok(t);
      const it = scene.inrichting.find(i => i.id === t.bij);
      if (!stand.signaal || !it) continue;
      const b = meubelBox(it, scene.geo);
      const knop = el('button', 'signaal ' + stand.signaal);
      knop.dataset.taak = t.id;
      if (stand.signaal === 'vraag') knop.textContent = '?'; else knop.appendChild(glinster(3));
      knop.setAttribute('aria-label', `${t.titel}: ${stand.tekst}`);
      knop.style.left = px((b.x + b.b * (t.signaal_x != null ? t.signaal_x : 0.5)) * Z);
      knop.style.top = px((b.y - 3) * Z);
      knop.onclick = () => openTaak(t);
      box.appendChild(knop);
    }
  }
  function tekenTakenlijst() {
    const ul = $('#takenlijst');
    ul.textContent = '';
    const lijst = H.taken.map(t => Object.assign({ t }, taakKlok(t))).sort((a, b) => b.waarde - a.waarde);
    for (const { t, stand } of lijst) {
      const li = el('li');
      const tekst = el('span', 'titel', t.titel);
      tekst.appendChild(el('span', 'stand', stand.tekst));
      const knop = el('button', 'knop mini', 'Bekijk');
      knop.onclick = () => openTaak(t);
      li.append(standIcoon(stand, 2), tekst, knop);
      ul.appendChild(li);
    }
  }
  function wanneer(ms) {
    const uren = Math.round(ms / 36e5);
    if (uren < 1) return 'net';
    if (uren < 36) return `${uren} uur geleden`;
    return `${Math.round(uren / 24)} dagen geleden`;
  }
  let openTaakId = null;
  function openTaak(t) {
    const { stand } = taakKlok(t);
    openTaakId = t.id;
    $('#taakTitel').textContent = t.titel;
    $('#taakStand').textContent = stand.tekst;
    $('#taakMeta').textContent = `Ongeveer elke ${t.interval_dagen === 1 ? 'dag' : t.interval_dagen + ' dagen'} · ${t.minuten} min · ` +
      `inzet ${inzet(t)} · laatst: ${wanneer(Date.now() - laatstVan(t))}`;
    $('#taakblad').hidden = false;
    $('#taakKlaar').focus();
  }
  function sluitTaak() { $('#taakblad').hidden = true; openTaakId = null; }
  function feestje(t) {
    const box = $('#signalen'), it = scene.inrichting.find(i => i.id === t.bij);
    let x = $('#venster').scrollLeft + $('#venster').clientWidth / 2, y = 60;
    if (it) { const b = meubelBox(it, scene.geo); x = (b.x + b.b / 2) * Z; y = b.y * Z; }
    const n = minderBeweging ? 5 : 12;
    for (let i = 0; i < n; i++) {
      const s = el('div', 'deeltje', '★'), hoek = (i / n) * Math.PI * 2, r = 30 + Math.random() * 30;
      s.style.left = px(x - 8); s.style.top = px(y - 12);
      s.style.setProperty('--dx', px(Math.cos(hoek) * r)); s.style.setProperty('--dy', px(Math.sin(hoek) * r - 10));
      box.appendChild(s);
      setTimeout(() => s.remove(), 1200);
    }
    const loper = actievePets.find(p => p.e.parentElement === $('#laag'));
    if (loper && !minderBeweging) { loper.e.classList.remove('huppel'); void loper.e.offsetWidth; loper.e.classList.add('huppel'); }
  }
  let meldTimer = null;
  function meld(tekst, ongedaan) {
    $('#meldingTekst').textContent = tekst;
    $('#meldingOngedaan').hidden = !ongedaan;
    $('#meldingOngedaan').onclick = () => { if (ongedaan) ongedaan(); $('#melding').hidden = true; };
    $('#melding').hidden = false;
    clearTimeout(meldTimer);
    meldTimer = setTimeout(() => { $('#melding').hidden = true; }, ongedaan ? 10000 : 4000);
  }
  function taakKlaar() {
    const t = H.taken.find(x => x.id === openTaakId);
    if (!t) return sluitTaak();
    const vorige = laatst[t.id];
    laatst[t.id] = Date.now();
    schrijf(SLEUTEL.taken, laatst);
    sluitTaak();
    feestje(t);
    tekenSignalen(); tekenTakenlijst();
    meld(`${t.titel}: gedaan, samen +${inzet(t)} inzet.`, () => {
      if (vorige == null) delete laatst[t.id]; else laatst[t.id] = vorige;
      schrijf(SLEUTEL.taken, laatst);
      tekenSignalen(); tekenTakenlijst();
    });
  }

  // ---------- bewerkmodus: slepen (pointer events: muis, pen en vinger) en pijltjes ----------
  function maakSleepbaar(e, soort, id, naam) {
    e.classList.add('sleepbaar');
    e.tabIndex = 0;
    e.setAttribute('role', 'button');
    e.setAttribute('aria-label', `Verplaats ${naam}`);
    if (gekozen && gekozen.soort === soort && gekozen.id === id) e.classList.add('gekozen');
    e.addEventListener('pointerdown', ev => startSleep(ev, e, soort, id));
    e.addEventListener('keydown', ev => toets(ev, soort, id));
    e.addEventListener('focus', () => kies(soort, id));
  }
  function kies(soort, id) {
    gekozen = { soort, id };
    document.querySelectorAll('.sleepbaar.gekozen').forEach(x => x.classList.remove('gekozen'));
    const naam = soort === 'meubel' ? H.meubels[(staat.inrichting.find(i => i.id === id) || {}).soort]?.naam : asset(id)?.naam;
    $('#gekozen').textContent = naam || 'niets';
    $('#naarDoos').disabled = soort !== 'meubel';
  }
  let sleep = null;
  function startSleep(ev, e, soort, id) {
    if (!bewerken || ev.button > 0) return;
    ev.preventDefault();
    const doel = soort === 'bewoner' ? e._figuur : e;
    try { e.setPointerCapture(ev.pointerId); } catch (x) { /* oude browser */ }
    sleep = { e, doel, soort, id, pid: ev.pointerId, cx: ev.clientX, cy: ev.clientY, x0: doel.offsetLeft, y0: doel.offsetTop, bewogen: false };
    doel.classList.add('sleept');
    kies(soort, id);
    e.onpointermove = beweeg;
    e.onpointerup = e.onpointercancel = los;
  }
  function beweeg(ev) {
    if (!sleep || ev.pointerId !== sleep.pid) return;
    const dx = ev.clientX - sleep.cx, dy = ev.clientY - sleep.cy;
    if (Math.abs(dx) + Math.abs(dy) > 3) sleep.bewogen = true;
    sleep.doel.style.left = px(sleep.x0 + dx);
    sleep.doel.style.top = px(sleep.y0 + dy);
  }
  function los(ev) {
    if (!sleep || ev.pointerId !== sleep.pid) return;
    const s = sleep;
    sleep = null;
    s.e.onpointermove = s.e.onpointerup = s.e.onpointercancel = null;
    s.doel.classList.remove('sleept');
    if (!s.bewogen) { s.doel.style.left = px(s.x0); s.doel.style.top = px(s.y0); return; }
    const links = parseFloat(s.doel.style.left) / Z, boven = parseFloat(s.doel.style.top) / Z;
    if (s.soort === 'meubel') zetMeubel(s.id, links, boven);
    else {
      const g = s.e, a = asset(s.id);
      const voetX = links + (g.offsetLeft + g.offsetWidth / 2) / Z, voetY = boven + (g.offsetTop + g.offsetHeight) / Z;
      zetBewoner(s.id, voetX, voetY, a);
    }
  }
  // Nieuwe plek uit de linkerbovenhoek van de nominale doos (scene-artpx). Vloer-meubels zoeken het dichtste vrije vak.
  function zetMeubel(id, links, boven) {
    const it = staat.inrichting.find(i => i.id === id);
    if (!it) return;
    const geo = scene.geo, m = HM.maat(it.soort), def = H.meubels[it.soort];
    const k = kamerBij(geo, links + m.b / 2, boven + m.h - 2);
    const anderen = staat.inrichting.filter(i => i !== it);
    const pos = HM.plaats(k, it.soort, links - k.x, k.vloerY - (boven + m.h), anderen);
    if (pos) {
      Object.assign(it, { kamer: k.id, x: pos.x, y: def.op === 'vloer' ? 0 : pos.y });
      if (def.op === 'vrij') HM.steun([it, ...anderen]);   // een plant in de lucht zakt naar de vloer of het aanrecht
    } else meld(`${def.naam} past niet in ${k.naam.toLowerCase()}.`);
    bewaar(); teken(); focusOp('meubel', id);
  }
  function zetBewoner(id, voetX, voetY) {
    const k = kamerBij(scene.geo, voetX, voetY - 4);
    const x = Math.min(Math.max(Math.round((voetX - k.x) / R) * R, 16), k.b - 16);
    staat.posities[id] = { kamer: k.id, x };
    bewaar(); teken(); focusOp('bewoner', id);
  }
  function focusOp(soort, id) {
    const sel = soort === 'meubel' ? `.meubel[data-id="${CSS.escape(id)}"]` : `.greep[data-id="${CSS.escape(id)}"]`;
    const e = document.querySelector(sel);
    if (e) e.focus({ preventScroll: true });
  }
  function toets(ev, soort, id) {
    const stap = { ArrowLeft: [-R, 0], ArrowRight: [R, 0], ArrowUp: [0, R], ArrowDown: [0, -R] }[ev.key];
    if (!stap) return;
    ev.preventDefault();
    if (soort === 'bewoner') {
      const p = bewonerPlek(H.bewoners.find(b => b.id === id), scene.geo);
      return zetBewoner(id, p.k.x + p.x + stap[0], p.k.vloerY + 4);
    }
    const it = staat.inrichting.find(i => i.id === id), k = kamerVan(scene.geo, it.kamer);
    const pos = HM.plaats(k, it.soort, it.x + stap[0], it.y + stap[1], staat.inrichting.filter(i => i !== it));
    if (pos) Object.assign(it, pos);
    bewaar(); teken(); focusOp('meubel', id);
  }

  // ---------- verhuisdoos ----------
  function tekenDoos() {
    const ul = $('#doos'), lijst = scene.doos;
    ul.textContent = '';
    $('#doosLeeg').hidden = lijst.length > 0;
    for (const d of lijst) {
      const def = H.meubels[d.soort], li = el('li');
      li.appendChild(el('span', 'titel', def.naam + (def.sprite ? '' : ' (placeholder)')));
      if (!scene.voorbeeld) {
        const knop = el('button', 'knop mini', 'Zet neer');
        knop.onclick = () => uitDoos(d.id);
        li.appendChild(knop);
      }
      ul.appendChild(li);
    }
  }
  function uitDoos(id) {
    const d = staat.doos.find(x => x.id === id), def = H.meubels[d.soort];
    for (const t of def.hoort || []) {
      for (const k of scene.geo.kamers.filter(x => x.type === t)) {
        const pos = HM.plaats(k, d.soort, 0, 0, staat.inrichting);
        if (!pos) continue;
        staat.doos = staat.doos.filter(x => x !== d);
        staat.inrichting.push({ id: d.id, soort: d.soort, kamer: k.id, x: pos.x, y: pos.y });
        bewaar(); teken();
        return meld(`${def.naam} staat nu in ${k.naam.toLowerCase()}.`);
      }
    }
    meld(`${def.naam} past nergens. Maak eerst ruimte.`);
  }
  function naarDoos() {
    if (!gekozen || gekozen.soort !== 'meubel') return;
    const it = staat.inrichting.find(i => i.id === gekozen.id);
    if (!it) return;
    staat.inrichting = staat.inrichting.filter(i => i !== it);
    staat.doos.push({ id: it.id, soort: it.soort });
    gekozen = null; $('#gekozen').textContent = 'niets'; $('#naarDoos').disabled = true;
    bewaar(); teken();
  }

  // ---------- alles tekenen ----------
  function teken() {
    scene = maakScene();
    const geo = scene.geo, dd = dagdeelNu();
    const dio = $('#diorama'), decor = $('#decor');
    dio.style.width = px(geo.W * Z); dio.style.height = px(geo.H * Z);
    HT.tekenDecor(decor, geo, dd, scene.inrichting);
    decor.style.width = px(geo.W * Z); decor.style.height = px(geo.H * Z);
    const mijden = H.bewoners.map(b => { const p = bewonerPlek(b, geo); return { kamer: p.k.id, x: p.x }; });
    const extra = OH.plaatsExtra(geo, scene.inrichting, mijden);    // event-decor en nachtdoek (lichtpunten vóór tekenLicht)
    const licht = $('#licht');
    HT.tekenLicht(licht, geo, dd, scene.inrichting);
    licht.style.opacity = dd.lampSterkte != null ? dd.lampSterkte : 1;
    licht.style.width = px(geo.W * Z); licht.style.height = px(geo.H * Z);
    // Rand naast de scene (tot de volgende hertekening na een breedtewijziging) in lucht- en grondkleur.
    $('#venster').style.background = `linear-gradient(${HM.kleur(dd.lucht)} ${px(geo.grondY * Z)}, ${HM.kleur('koffie.1')} 0)`;
    dio.classList.toggle('bewerken', bewerken && !scene.voorbeeld);
    dio.classList.toggle('markeer', !!inst.markeer);
    const tint = $('#tint');
    tint.style.background = dd.tint ? HM.kleur(dd.tint) : 'transparent';
    tint.style.opacity = dd.tint ? dd.sterkte : 0;
    OH.toonStatus();
    stopPets();
    if (G) G.begin({ Z, geo, inrichting: scene.inrichting, bubbels: $('#signalen'), sleutel: geo.huis.niveau + (scene.voorbeeld ? 'v' : '') });
    const laag = $('#laag');
    laag.textContent = '';
    if (bewerken && !scene.voorbeeld) tekenKamerlabels(laag, geo);
    for (const it of scene.inrichting) laag.appendChild(maakMeubel(it, geo, dd));
    tekenBewoners(laag, geo);
    tekenPets(laag, geo);
    if (animatie()) G.draai();
    OH.zetExtra(laag, extra, Z);
    OH.deeltjes($('#weer'), geo, Z);
    tekenSignalen(); tekenTakenlijst(); tekenDoos(); tekenVoorbeeldBalk();
    $('#bewerk').disabled = scene.voorbeeld;
    testInfo();
  }
  // Alleen lucht, decor, tint en lampen opnieuw (elke minuut bij het vloeiende verloop); de lopers lopen door.
  function tekenLichtNu() {
    const geo = scene.geo, dd = dagdeelNu();
    HT.tekenDecor($('#decor'), geo, dd, scene.inrichting);
    const mijden = H.bewoners.map(b => { const p = bewonerPlek(b, geo); return { kamer: p.k.id, x: p.x }; });
    OH.plaatsExtra(geo, scene.inrichting, mijden);          // alleen voor de lichtpunten (kerstboom)
    HT.tekenLicht($('#licht'), geo, dd, scene.inrichting);
    $('#licht').style.opacity = dd.lampSterkte != null ? dd.lampSterkte : 1;
    $('#venster').style.background = `linear-gradient(${HM.kleur(dd.lucht)} ${px(geo.grondY * Z)}, ${HM.kleur('koffie.1')} 0)`;
    $('#tint').style.background = dd.tint ? HM.kleur(dd.tint) : 'transparent';
    $('#tint').style.opacity = dd.tint ? dd.sterkte : 0;
  }
  function tekenVoorbeeldBalk() {
    const balk = $('#voorbeeldBalk');
    balk.hidden = !scene.voorbeeld;
    if (!scene.voorbeeld) return;
    const h = scene.geo.huis, doos = scene.doos.map(d => H.meubels[d.soort].naam.toLowerCase());
    const later = h.niveau > staat.niveau;
    $('#vbTitel').textContent = `Voorbeeld niveau ${h.niveau}: ${h.naam}`;
    $('#vbTekst').textContent = (later ? `${prijsTekst(h)}. ` : 'Een eerder niveau. ') +
      'Jullie spullen staan erin; lichte meubels zijn nieuw of een voorbeeld. ' +
      (doos.length ? `Past niet meer, gaat in de doos: ${doos.join(', ')}.` : 'Alles past.') +
      (later ? ' Verbouwen kan later in de winkel (fase 3).' : '');
    $('#vbVerhuis').hidden = !TEST;
  }
  // Prijs van één verbouwing, ook in weken volle huispot (0,5 munt per inzet tot de weeknorm 600: 300 per week).
  function prijsTekst(h) {
    if (!h.prijs) return 'Startniveau, gratis';
    const weken = Math.round(h.prijs / (0.5 * 600) * 2) / 2;
    return `${getal(h.prijs)} munten, ongeveer ${getal(weken)} ${weken === 1 ? 'week' : 'weken'} volle huispot`;
  }
  // Alleen in test-modus: zet het huis echt op niveau n (een verbouwing zonder betalen).
  function verbouwTest(n) {
    const van = HM.bouw(HM.niveauVan(staat.niveau)), naar = HM.bouw(HM.niveauVan(n));
    const r = HM.verbouw(staat.inrichting, staat.doos, van, naar);
    Object.assign(staat, { niveau: n, inrichting: r.inrichting, doos: r.doos, posities: {} });
    bekijk = null; bewaar(); teken(); tekenVerbouwen();
  }
  function herstel() {
    const r = HM.startInrichting(HM.bouw(HM.niveauVan(staat.niveau)));
    Object.assign(staat, { inrichting: r.inrichting, doos: r.doos, posities: {} });
    bewaar(); teken();
  }

  // ---------- verbouwen ----------
  function kamerTekst(geo) {
    const telling = {};
    for (const k of geo.kamers) if (!k.trap) telling[k.naam] = (telling[k.naam] || 0) + 1;
    return `${geo.F} ${geo.F > 1 ? 'verdiepingen' : 'verdieping'} · ` +
      Object.entries(telling).map(([n, a]) => (a > 1 ? `${a}× ` : '') + n.toLowerCase()).join(', ');
  }
  function tekenVerbouwen() {
    const nu = HM.niveauVan(staat.niveau), max = HM.maxNiveau();
    const kop = $('#nuNiveau');
    kop.textContent = '';
    kop.append(el('h3', null, `Nu: niveau ${nu.niveau} van ${max}, ${nu.naam}`), el('p', 'noot', kamerTekst(HM.bouw(nu))));
    const box = $('#huizen');
    box.textContent = '';
    for (const h of H.niveaus) {
      const geo = HM.bouw(h), huidig = h.niveau === staat.niveau;
      const stand = h.niveau <= staat.niveau ? 'gedaan' : h.niveau === staat.niveau + 1 ? 'volgende' : 'later';
      const kaart = el('article', 'kaart huiskaart' + (huidig ? ' huidig' : ''));
      const kopregel = el('div', 'kopregel');
      kopregel.appendChild(el('h3', null, `${h.niveau}. ${h.naam}`));
      kopregel.appendChild(el('span', 'label ' + stand, huidig ? 'nu' : stand));
      const vak = el('div', 'minivak'), c = el('canvas');
      HT.tekenMini(c, geo, Math.min(0.5, 272 / geo.W));
      c.setAttribute('aria-label', `Het huis na verbouwing ${h.niveau}: ${h.naam}`);
      vak.appendChild(c);
      const prijs = el('div', 'prijs');
      const munt = new Image(); munt.src = ASSETS + 'items/bron/munt.png'; munt.alt = '';
      prijs.append(munt, el('span', null, prijsTekst(h)));
      kaart.append(kopregel, vak, el('p', 'noot', h.omschrijving), prijs, el('div', 'kamers', kamerTekst(geo)));
      if (h.voorwaarde) kaart.appendChild(el('p', 'noot', `Pas te koop ${h.voorwaarde.tekst}.`));
      const knop = el('button', 'knop' + (huidig ? '' : ' goud'), huidig ? 'Naar ons huis' : 'Bekijk');
      knop.onclick = () => { bekijk = huidig ? null : h.niveau; kiesWeergave('huis'); teken(); };
      kaart.appendChild(knop);
      if (TEST && !huidig) {
        const zet = el('button', 'knop mini', 'Zet op dit niveau (test)');
        zet.onclick = () => verbouwTest(h.niveau);
        kaart.appendChild(zet);
      }
      box.appendChild(kaart);
    }
  }
  function kiesWeergave(w) {
    if (w === 'huizen') w = 'verbouwen';
    document.querySelectorAll('.weergaven button').forEach(b => b.setAttribute('aria-selected', String(b.dataset.weergave === w)));
    $('#paneelHuis').hidden = w !== 'huis';
    $('#paneelHuizen').hidden = w !== 'verbouwen';
    if (w === 'verbouwen') tekenVerbouwen(); else if (scene) teken();
  }

  // ---------- test ----------
  function testInfo() {
    const t = window.PQ_TEST;
    $('#testregel').textContent = `niveau ${scene.geo.huis.niveau}${scene.voorbeeld ? ' (voorbeeld)' : ''} · ${Z}× · ` +
      `${scene.inrichting.length} meubels · ${scene.doos.length} in de doos`;
    if (!t) return;
    Object.assign(t.info, {
      niveau: scene.geo.huis.niveau + (scene.voorbeeld ? ' (voorbeeld)' : ''), zoom: Z + '×',
      meubels: scene.inrichting.length, doos: scene.doos.length,
      pets: document.querySelectorAll('.pet').length, figuren: document.querySelectorAll('.figuur canvas').length,
      signalen: document.querySelectorAll('.signaal').length, dagdeel: dagdeelNu().fase,
      omgeving: OH.statusTekst(), deeltjes: $('#weer').dataset.soort || '-', events: document.querySelectorAll('.omgevingitem').length,
      venster: `${$('#venster').scrollWidth}/${$('#venster').clientWidth}`,
      scene: `${scene.geo.W}x${scene.geo.H} artpx, diorama ${$('#diorama').style.width}`,
    });
    if (t.toon) t.toon();
  }

  // ---------- bediening en start ----------
  function bediening() {
    const outfit = $('#outfit');
    outfit.append(new Option('Uit de kledingkast', 'kledingkast'), new Option('Origineel', 'origineel'));
    for (const o of D.catalogus) outfit.append(new Option(o.naam, o.id));
    outfit.value = inst.outfit; if (!outfit.value) { inst.outfit = 'kledingkast'; outfit.value = 'kledingkast'; }
    $('#zoom').value = inst.zoom; if (!$('#zoom').value) $('#zoom').value = 'auto';
    $('#markeer').checked = !!inst.markeer;
    outfit.onchange = () => { inst.outfit = outfit.value; bewaarInst(); teken(); };
    $('#zoom').onchange = e => { inst.zoom = e.target.value; bewaarInst(); teken(); };
    $('#markeer').onchange = e => { inst.markeer = e.target.checked; bewaarInst(); teken(); };
    $('#bewerk').onclick = () => zetBewerken(!bewerken);
    // Bevestigen in twee klikken: confirm() werkt niet in elke omgeving (bv. een ingebedde viewer).
    let herstelTimer = null;
    $('#herstel').onclick = () => {
      const k = $('#herstel');
      if (k.dataset.zeker) { delete k.dataset.zeker; k.textContent = 'Indeling herstellen'; clearTimeout(herstelTimer); herstel(); return; }
      k.dataset.zeker = '1'; k.textContent = 'Zeker? Klik nog eens';
      herstelTimer = setTimeout(() => { delete k.dataset.zeker; k.textContent = 'Indeling herstellen'; }, 4000);
    };
    $('#naarDoos').onclick = naarDoos;
    $('#vbTerug').onclick = () => { bekijk = null; teken(); };
    $('#vbVerhuis').onclick = () => bekijk && verbouwTest(bekijk);
    $('#taakSluit').onclick = sluitTaak;
    $('#taakLater').onclick = sluitTaak;
    $('#taakKlaar').onclick = taakKlaar;
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#taakblad').hidden) sluitTaak(); });
    document.querySelectorAll('.weergaven button').forEach(b => b.onclick = () => kiesWeergave(b.dataset.weergave));
    // Opnieuw tekenen als het venster van breedte verandert (draaien, scrollbalk, vensterformaat).
    let rt = null, breedte = 0;
    const opnieuw = () => {
      const b = $('#venster').clientWidth;
      if (!scene || !b || b === breedte) return;
      breedte = b; clearTimeout(rt); rt = setTimeout(teken, 120);
    };
    if (window.ResizeObserver) new ResizeObserver(opnieuw).observe($('#venster'));
    else window.addEventListener('resize', opnieuw);
  }
  function zetBewerken(aan) {
    bewerken = aan;
    if (G) G.vergeet();       // na het slepen staan ze weer op hun eigen plek
    $('#bewerk').setAttribute('aria-pressed', String(aan));
    $('#bewerkUitleg').hidden = !aan; $('#bewerkBalk').hidden = !aan; $('#herstel').hidden = !aan;
    teken();
  }
  // Bij een smal scherm: scroll het huis zo dat Hidde en Tessie in beeld staan.
  function centreer() {
    const v = $('#venster'), f = document.querySelector('.figuur');
    if (!f || v.scrollWidth <= v.clientWidth) return;
    const r = f.getBoundingClientRect(), d = $('#diorama').getBoundingClientRect();
    v.scrollLeft = Math.max(0, r.right - d.left - v.clientWidth / 2);
  }

  bediening();
  OH.bediening($('#omgevingBalk'));
  OH.start(() => { if (scene) teken(); }, () => { if (scene) tekenLichtNu(); });
  Promise.all([F.laadAlles(), A ? A.laad() : null]).then(() => {
    if (TEST && HM.niveauVan(q.get('verbouw'))) verbouwTest(+q.get('verbouw'));
    if (HM.niveauVan(q.get('niveau')) && +q.get('niveau') !== staat.niveau) bekijk = +q.get('niveau');
    if (q.has('bewerk')) zetBewerken(true); else teken();
    kiesWeergave(['verbouwen', 'huizen'].includes(q.get('weergave')) ? 'verbouwen' : 'huis');
    centreer();
    const t = H.taken.find(x => x.id === q.get('taak'));
    if (t) openTaak(t);
    if (q.has('feest')) feestje(H.taken[0]);
  }).catch(e => {
    $('#testregel').textContent = 'Laden mislukt: ' + e;
    if (window.PQ_TEST) window.PQ_TEST.fouten.push('laden: ' + e);
  });
})();
