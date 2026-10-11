// Ons huis als component: poppenhuis-doorsnede (vooraanzicht) met bewoners, pets, taaksignalen, bewerkmodus en
// verbouwingen, in een container naar keuze.
//   const h = PQHuis.mount(el, { store, compact, meld, opTaak, opKies, opScene, opZoom, pets, taken })
//   h.teken(), h.pauze(), h.hervat(), h.bewerk(aan), h.bekijk(niveau|null), h.feestje(taakId), h.zoom, h.unmount()
// Er draait er maar één tegelijk (h.hervat() pauzeert de vorige): het gedrag (huis-anim-gedrag.js) en de omgeving
// (omgeving-huis.js) zijn gedeeld. Een gepauzeerd huis tekent niets en houdt geen animatie draaiende (batterij).
// De staat (niveau, inrichting, doos, posities) staat in de store; slepen boekt de opdracht 'huis.inrichting'.
// Leest PQ_HUIS, PQ_HUISMODEL, PQ_HUISTEKEN, PQ_FIGUUR, PQ_KLEDING, PQ_MANIFEST, PQ_OMGEVINGHUIS, PQ_HUISANIM/-GEDRAG.
// Testadres (SPA): index.html?test&uur=22&weer=sneeuw  ·  huis.html?test&niveau=6&bewerk&markeer
(function () {
  'use strict';
  const H = window.PQ_HUIS, HM = window.PQ_HUISMODEL, HT = window.PQ_HUISTEKEN;
  const F = window.PQ_FIGUUR, D = window.PQ_KLEDING, MAN = window.PQ_MANIFEST;
  const OH = window.PQ_OMGEVINGHUIS, A = window.PQ_HUISANIM, G = window.PQ_HUISGEDRAG;
  const ASSETS = '../assets/';
  const q = new URLSearchParams(location.search);
  const TEST = q.has('test');
  const minderBeweging = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const R = H.raster;
  const kloon = o => JSON.parse(JSON.stringify(o));
  const el = (tag, cls, tekst) => { const e = document.createElement(tag); if (cls) e.className = cls; if (tekst != null) e.textContent = tekst; return e; };
  const px = v => Math.round(v) + 'px';
  const asset = id => MAN.assets.find(a => a.id === id);
  const kamerVan = (geo, id) => geo.kamers.find(k => k.id === id);
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
  // Echte maat van een pet: gemiddelde maat van de soort t.o.v. de pixelschaal van het blad (ijkpunt Hidde 190 cm).
  function petFactor(a) {
    const e = H.echte_maten && H.echte_maten[a.id], ijk = H.ijk && asset(H.ijk.figuur);
    if (!e || !ijk) return 1;
    const cmPerArtpx = H.ijk.cm / (ijk.figuur.bron[1] / ijk.bronpx_per_artpixel);
    const nu = (e.maat === 'hoogte' ? a.figuur.bron[1] : a.figuur.bron[0]) / a.bronpx_per_artpixel;
    return (e.cm / cmPerArtpx) / nu;
  }
  function glinster(schaal) {
    const c = el('canvas');
    c.width = 7; c.height = 7;
    const ctx = c.getContext('2d');
    HT.rect(ctx, 3, 0, 1, 7, 'goud'); HT.rect(ctx, 0, 3, 7, 1, 'goud');
    HT.rect(ctx, 2, 2, 3, 3, 'goud'); HT.rect(ctx, 3, 3, 1, 1, 'creme');
    c.style.width = px(7 * schaal); c.style.height = px(7 * schaal);
    return c;
  }

  // Eén omgeving voor de hele app: elke minuut opnieuw rekenen, en alleen het actieve huis tekent opnieuw.
  let actief = null, omgevingLoopt = false;
  function startOmgeving() {
    if (omgevingLoopt) return;
    omgevingLoopt = true;
    OH.start(() => { if (actief) actief.teken(); }, () => { if (actief) actief.tekenLicht(); });
  }
  let geladen = null;
  const laad = () => geladen || (geladen = Promise.all([F.laadAlles(), A ? A.laad() : null]));

  function mount(root, opties) {
    opties = opties || {};
    const store = opties.store, compact = !!opties.compact;
    startOmgeving();
    // ---------- DOM ----------
    root.textContent = '';
    const venster = el('div', 'huisvenster' + (compact ? ' compact' : ''));
    venster.setAttribute('aria-label', compact ? 'Ons huis. Tik om het huis te openen.' : 'Ons huis, doorsnede. Knijp of gebruik de zoomknoppen om in en uit te zoomen.');
    const podium = el('div', 'podium'), dio = el('div', 'diorama');
    const decor = el('canvas', 'decor'), laag = el('div', 'laag'), tint = el('div', 'tint');
    const licht = el('canvas', 'licht'), weer = el('canvas', 'weer'), signalen = el('div', 'signalen');
    for (const x of [decor, tint, licht, weer]) x.setAttribute('aria-hidden', 'true');
    dio.append(decor, laag, tint, licht, weer, signalen);
    podium.appendChild(dio); venster.appendChild(podium); root.appendChild(venster);

    // ---------- staat ----------
    const inst = Object.assign({ outfit: 'kledingkast', markeer: q.has('markeer') }, opties.instellingen || {});
    if (q.has('outfit')) inst.outfit = q.get('outfit');
    let staat = HM.normaliseer(kloon(store.staat().huis));
    let bekijk = null, bewerken = false, gekozen = null, Z = compact ? 1 : 2, scene = null, wilTekenen = true, weg = false;
    let eigenOpdracht = false;
    const animatie = () => !!(A && G) && !bewerken && !minderBeweging && !q.has('stil');
    function bewaar() {
      eigenOpdracht = true;
      const r = store.doe('huis.inrichting', { inrichting: staat.inrichting, doos: staat.doos, posities: staat.posities });
      eigenOpdracht = false;
      if (!r.ok && opties.meld) opties.meld(r.fout);
    }
    const meld = (t, o) => { if (opties.meld) opties.meld(t, o); };
    const schaal = () => (zoom ? zoom.schaal() : 1);
    function meubelBox(it, geo) {
      const k = kamerVan(geo, it.kamer), m = HM.maat(it.soort);
      return { x: k.x + it.x, y: k.vloerY - it.y - m.h, b: m.b, h: m.h, k };
    }
    function zetBox(e, x, y, b, h) {
      e.style.left = px(x * Z); e.style.top = px(y * Z);
      if (b != null) { e.style.width = px(b * Z); e.style.height = px(h * Z); }
    }

    // ---------- scene ----------
    // Het huis op het huidige niveau, of bij "Bekijk" een proefverbouwing naar een ander niveau. Meubels die bij die
    // verbouwing nieuw zijn, en voorbeeldmeubels in lege kamers, staan lichter.
    function maakScene() {
      const n = bekijk || staat.niveau, geo = HM.bouw(HM.niveauVan(n));
      if (!bekijk || bekijk === staat.niveau) return { geo, inrichting: staat.inrichting, doos: staat.doos, voorbeeld: false };
      const r = HM.verbouw(staat.inrichting, staat.doos, HM.bouw(HM.niveauVan(staat.niveau)), geo);
      const nieuw = new Set(r.nieuw);
      const inr = r.inrichting.map(i => nieuw.has(i.id) ? Object.assign({}, i, { voorbeeld: true }) : i);
      return { geo, inrichting: [...inr, ...HM.voorbeelden(geo, inr)], doos: r.doos, voorbeeld: true, echt: r };
    }
    function maakMeubel(it, geo, dd) {
      const def = H.meubels[it.soort], box = meubelBox(it, geo);
      const e = el('div', 'meubel' + (def.sprite ? '' : ' placeholder') + (it.voorbeeld ? ' voorbeeld' : ''));
      e.dataset.id = it.id;
      e.setAttribute('aria-label', def.naam + (it.voorbeeld ? ', voorbeeld' : ''));
      zetBox(e, box.x, box.y + (def.voor ? 3 : 0), box.b, box.h);     // voor: true staat 3 artpx lager en vóór de rest
      e.style.zIndex = def.op === 'muur' ? 1 : def.voor ? 3 : 2;
      e._glas = {};
      if (def.sprite) {
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
          if (!glazen[sl]) { glazen[sl] = el('div', 'glas'); zetBox(glazen[sl], p.glas[0], p.glas[1], p.glas[2], p.glas[3]); e.appendChild(glazen[sl]); }
          e._glas[naam] = glazen[sl];
        }
        if (t.voor) { zet(t.voor); t.voor.style.zIndex = 3; e.appendChild(t.voor); }
      }
      if (bewerken && !scene.voorbeeld) maakSleepbaar(e, 'meubel', it.id, def.naam);
      return e;
    }

    // ---------- bewoners (Hidde en Tessie), in hun kledingkast-look met automatische weerkleding ----------
    function bezitVan(fid) {
      if (q.get('bezit') === 'alles' && F.kastItems) return Object.fromEntries(F.kastItems().map(it => [it.id, it.kleuren.slice()]));
      return (store.staat().kleding.bezit || {})[fid] || {};
    }
    function lookNu(fid) {
      let look = store.staat().kleding.looks[fid] || F.standaardLook(fid);
      const KA = window.PQ_KASTAUTO, st = OH.status();
      if (KA && st && OH.autoAan(fid)) { try { look = KA.kiesAutoLook(look, st, bezitVan(fid), { fid, nu: OH.nu() }); } catch (e) { /* eigen look */ } }
      return look;
    }
    function tekenBewoner(c, fid) {
      if (inst.outfit === 'kledingkast' && F.tekenLook) { try { F.tekenLook(c, fid, 'bron', lookNu(fid)); return; } catch (err) { /* oude route */ } }
      const o = D.catalogus.find(x => x.id === inst.outfit);
      try { F.tekenFiguur(c, fid, 'bron', o ? o[fid] : {}, []); } catch (err) { F.tekenFiguur(c, fid, 'bron', {}, []); }
    }
    function bewonerPlek(b, geo) {
      const p = !scene.voorbeeld && staat.posities[b.id];
      const k = p && kamerVan(geo, p.kamer);
      if (k) return { k, x: Math.min(Math.max(p.x, 16), k.b - 16) };
      const kk = b.kamers.map(t => geo.kamers.find(x => x.type === t)).find(Boolean) || geo.kamers.find(x => !x.buiten);
      return { k: kk, x: Math.min(Math.max(b.x, 16), kk.b - 16) };
    }
    function tekenBewoners(geo) {
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
    function tekenKamerlabels(geo) {
      for (const k of geo.kamers) {
        const l = el('div', 'kamerlabel', k.naam);
        l.style.left = px((k.x + 2) * Z); l.style.top = px((k.y + 2) * Z);
        laag.appendChild(l);
      }
    }
    // ---------- pets: alleen de uitgekomen pets uit de collectie ----------
    let petTimers = [];
    const actievePets = [];
    function stopPets() { petTimers.forEach(clearTimeout); petTimers = []; actievePets.length = 0; if (G) G.stop(); }
    function maakPet(p, anim) {
      const a = asset(p.id), sc = Z / a.bronpx_per_artpixel * petFactor(a);
      const [w, h] = a.afmetingen.bron, [ax, ay] = a.anker.bron, [fw, fh] = a.figuur.bron;
      const e = el('div', 'pet');
      e.dataset.id = p.id;
      const romp = el('div', 'romp' + (sc < 0.35 ? ' zacht' : ''));
      romp.style.left = px(-ax * sc); romp.style.top = px(-ay * sc);
      romp.style.width = px(w * sc); romp.style.height = px(h * sc);
      romp.style.transformOrigin = px(ax * sc) + ' 0';
      if (!anim) { const img = new Image(); img.src = ASSETS + a.bestanden.bron; img.alt = ''; img.draggable = false; romp.appendChild(img); }
      else e.classList.add('anim');
      const naam = (opties.petNaam && opties.petNaam(p.id)) || p.bijnaam || a.naam;
      const tik = el('button', 'tik');
      tik.type = 'button';
      tik.setAttribute('aria-label', `Aai ${naam}`);
      const tb = Math.max(fw * sc, 32), th = Math.max(fh * sc, 32);     // tikvlak minstens 32 schermpx
      tik.style.left = px(-tb / 2); tik.style.top = px(-th); tik.style.width = px(tb); tik.style.height = px(th);
      tik.onclick = () => aai(e, naam);
      e.append(romp, tik);
      return { e, romp, naam, sc, f: petFactor(a) };
    }
    function kijk(romp, pet, naarRechts) {
      const spiegel = pet.kijkrichting === 'voor' ? false : (pet.kijkrichting === 'links') === naarRechts;
      romp.classList.toggle('gespiegeld', spiegel);
    }
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
    function tekenPets(geo) {
      const mag = opties.pets ? opties.pets() : null;
      for (const plek of HM.petsPlaatsen(geo, scene.inrichting)) {
        if (plek.logeert || !asset(plek.pet.id) || (mag && !mag.has(plek.pet.id))) continue;
        const p = plek.pet, pa = asset(p.id);
        let fr = null;
        if (animatie()) { try { fr = A.pet(p.id, Z / pa.bronpx_per_artpixel * petFactor(pa)); } catch (err) { if (window.PQ_TEST) window.PQ_TEST.fouten.push('pet-frames: ' + err.message); } }
        const { e, romp, naam, sc, f } = maakPet(p, !!fr);
        if (!fr) kijk(romp, p, p.kijkrichting !== 'links');
        let rec;
        const nacht = OH.petPlek(p, geo, scene.inrichting);
        if (nacht) {
          zetBox(e, nacht.x, nacht.y); e.classList.add('slaapt');
          rec = { e, romp, pet: p, nu: 0, min: 0, max: 0, ymin: 0, ymax: 0 };
          laag.appendChild(e);
        } else if (plek.kamer) {
          const k = plek.kamer, x0 = k.x + plek.x;
          zetBox(e, x0, k.vloerY);
          rec = { e, romp, pet: p, nu: 0, min: Math.max(k.x + 24, x0 - 80) - x0, max: Math.min(k.x + k.b - 24, x0 + 80) - x0, ymin: 0, ymax: 0 };
          laag.appendChild(e);
        } else {
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
    // Positie van een element in het diorama (layout-px, dus gecorrigeerd voor de zoom-transform).
    function inDiorama(e) {
      const r = e.getBoundingClientRect(), d = dio.getBoundingClientRect(), s = schaal();
      return { x: (r.left - d.left + r.width / 2) / s, y: (r.top - d.top) / s };
    }
    function huppel(e) { if (minderBeweging) return; e.classList.remove('huppel'); void e.offsetWidth; e.classList.add('huppel'); }
    function aai(petEl, naam) {
      const p = inDiorama(petEl.querySelector('.tik'));
      const hart = el('div', 'hartje', '♥'), kaart = el('div', 'naamkaartje', naam);
      hart.style.left = px(p.x); hart.style.top = px(p.y);
      kaart.style.left = px(p.x); kaart.style.top = px(p.y - 24);
      signalen.append(hart, kaart);
      setTimeout(() => { hart.remove(); kaart.remove(); }, 2300);
      huppel(petEl);
      if (opties.opAai) opties.opAai(petEl.dataset.id);
    }

    // ---------- taaksignalen uit de echte taken (plek = meubel of kamer van de taak) ----------
    function plekBox(plek) {
      if (!plek || !scene) return null;
      if (plek.meubel) { const it = scene.inrichting.find(i => i.id === plek.meubel); return it ? meubelBox(it, scene.geo) : null; }
      if (plek.kamer) { const k = kamerVan(scene.geo, plek.kamer); return k ? { x: k.x + k.b / 2 - 8, y: k.y + 24, b: 16, h: 8 } : null; }
      return null;
    }
    // Een signaal mag nooit een gezicht bedekken: Hidde en Tessie lopen vrij door de kamer, dus de punt van de bubbel
    // hangt altijd boven hun kruin (vloer − figuurhoogte), ook als het meubel lager is. In een lage kamer steekt de
    // bubbel dan iets over de plafondrand; dat is beter dan over een gezicht.
    function signaalY(b) {
      const k = b.k || (scene && scene.geo.kamers.find(x => b.x >= x.x && b.x < x.x + x.b && b.y >= x.y && b.y < x.y + x.h));
      if (!k) return b.y - 3;
      const kruin = Math.max(...H.bewoners.map(w => { const a = asset(w.id); return a ? a.figuur.bron[1] / a.bronpx_per_artpixel : 0; }));
      return Math.min(b.y - 3, k.vloerY - kruin - 3);
    }
    function tekenSignalen() {
      signalen.querySelectorAll('.signaal').forEach(x => x.remove());   // hartjes en sterretjes mogen uitspelen
      if (!scene || scene.voorbeeld || !opties.taken) return;
      const bezet = {};
      for (const t of opties.taken()) {
        const b = plekBox(t.plek);
        if (!b || !t.signaal || (compact && t.signaal !== 'vraag')) continue;
        const sl = Math.round(b.x) + ',' + Math.round(b.y), n = bezet[sl] = (bezet[sl] || 0) + 1;   // twee taken op één meubel: naast elkaar
        const knop = el('button', 'signaal ' + t.signaal);
        knop.type = 'button'; knop.dataset.taak = t.id;
        if (t.signaal === 'vraag') knop.textContent = '?'; else knop.appendChild(glinster(3));
        knop.setAttribute('aria-label', `${t.titel}: ${t.tekst}`);
        knop.style.left = px((b.x + b.b * 0.5) * Z + (n - 1) * 36); knop.style.top = px(signaalY(b) * Z);
        knop.onclick = () => opties.opTaak && opties.opTaak(t.id);
        signalen.appendChild(knop);
      }
    }
    function feestje(plek) {
      const b = plekBox(plek), s = schaal();
      let x, y;
      if (b) { x = (b.x + b.b / 2) * Z; y = b.y * Z; }
      else { const st = zoom ? zoom.stand() : { tx: 0, ty: 0 }; x = (venster.clientWidth / 2 - st.tx) / s; y = (venster.clientHeight / 3 - st.ty) / s; }
      const n = minderBeweging ? 5 : 12;
      for (let i = 0; i < n; i++) {
        const st = el('div', 'deeltje', '★'), hoek = (i / n) * Math.PI * 2, r = 30 + Math.random() * 30;
        st.style.left = px(x - 8); st.style.top = px(y - 12);
        st.style.setProperty('--dx', px(Math.cos(hoek) * r)); st.style.setProperty('--dy', px(Math.sin(hoek) * r - 10));
        signalen.appendChild(st);
        setTimeout(() => st.remove(), 1200);
      }
      const loper = actievePets.find(p => p.e.parentElement === laag);
      if (loper) huppel(loper.e);
    }
    // ---------- bewerkmodus: meubels en bewoners slepen (pointer events) en pijltjes ----------
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
      laag.querySelectorAll('.sleepbaar.gekozen').forEach(x => x.classList.remove('gekozen'));
      const it = staat.inrichting.find(i => i.id === id);
      const naam = soort === 'meubel' ? (it && H.meubels[it.soort].naam) : (asset(id) || {}).naam;
      if (opties.opKies) opties.opKies({ soort, id, naam: naam || 'niets' });
    }
    let sleep = null;
    function startSleep(ev, e, soort, id) {
      if (!bewerken || ev.button > 0) return;
      ev.preventDefault(); ev.stopPropagation();
      const doel = soort === 'bewoner' ? e._figuur : e;
      try { e.setPointerCapture(ev.pointerId); } catch (x) { /* oude browser */ }
      sleep = { e, doel, soort, id, pid: ev.pointerId, cx: ev.clientX, cy: ev.clientY, x0: doel.offsetLeft, y0: doel.offsetTop, bewogen: false };
      doel.classList.add('sleept');
      kies(soort, id);
      e.onpointermove = beweegSleep;
      e.onpointerup = e.onpointercancel = los;
    }
    function beweegSleep(ev) {
      if (!sleep || ev.pointerId !== sleep.pid) return;
      const s = schaal(), dx = (ev.clientX - sleep.cx) / s, dy = (ev.clientY - sleep.cy) / s;
      if (Math.abs(dx) + Math.abs(dy) > 3) sleep.bewogen = true;
      sleep.doel.style.left = px(sleep.x0 + dx); sleep.doel.style.top = px(sleep.y0 + dy);
    }
    function los(ev) {
      if (!sleep || ev.pointerId !== sleep.pid) return;
      const s = sleep;
      sleep = null;
      s.e.onpointermove = s.e.onpointerup = s.e.onpointercancel = null;
      s.doel.classList.remove('sleept');
      if (!s.bewogen) { s.doel.style.left = px(s.x0); s.doel.style.top = px(s.y0); return; }
      const links = parseFloat(s.doel.style.left) / Z, boven = parseFloat(s.doel.style.top) / Z;
      if (s.soort === 'meubel') return zetMeubel(s.id, links, boven);
      const g = s.e;
      zetBewoner(s.id, links + (g.offsetLeft + g.offsetWidth / 2) / Z, boven + (g.offsetTop + g.offsetHeight) / Z);
    }
    function zetMeubel(id, links, boven) {
      const it = staat.inrichting.find(i => i.id === id);
      if (!it) return;
      const geo = scene.geo, m = HM.maat(it.soort), def = H.meubels[it.soort];
      const k = kamerBij(geo, links + m.b / 2, boven + m.h - 2);
      const anderen = staat.inrichting.filter(i => i !== it);
      const pos = HM.plaats(k, it.soort, links - k.x, k.vloerY - (boven + m.h), anderen);
      if (pos) {
        Object.assign(it, { kamer: k.id, x: pos.x, y: def.op === 'vloer' ? 0 : pos.y });
        if (def.op === 'vrij') HM.steun([it, ...anderen]);
      } else meld(`${def.naam} past niet in ${k.naam.toLowerCase()}.`);
      bewaar(); teken(); focusOp('meubel', id);
    }
    function zetBewoner(id, voetX, voetY) {
      const k = kamerBij(scene.geo, voetX, voetY - 4);
      staat.posities[id] = { kamer: k.id, x: Math.min(Math.max(Math.round((voetX - k.x) / R) * R, 16), k.b - 16) };
      bewaar(); teken(); focusOp('bewoner', id);
    }
    function focusOp(soort, id) {
      const e = laag.querySelector(soort === 'meubel' ? `.meubel[data-id="${CSS.escape(id)}"]` : `.greep[data-id="${CSS.escape(id)}"]`);
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
    function uitDoos(id) {
      const d = staat.doos.find(x => x.id === id);
      if (!d) return;
      const def = H.meubels[d.soort];
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
      gekozen = null;
      if (opties.opKies) opties.opKies(null);
      bewaar(); teken();
    }
    function herstel() {
      const r = HM.startInrichting(HM.bouw(HM.niveauVan(staat.niveau)));
      Object.assign(staat, { inrichting: r.inrichting, doos: r.doos, posities: {} });
      bewaar(); teken();
    }
    // ---------- alles tekenen ----------
    let lucht = '#9fd3e6';
    function achtergrond(st) {
      // Rand naast de scène in lucht- en grondkleur, meebewegend met de zoom.
      st = st || (zoom ? zoom.stand() : { eff: Z, ty: 0 });
      const grens = scene ? st.ty + scene.geo.grondY * st.eff : 9999;
      venster.style.background = `linear-gradient(${lucht} ${px(grens)}, ${HM.kleur('koffie.1')} 0)`;
    }
    function sceneInfo() {
      if (!scene) return null;
      return { niveau: staat.niveau, getoond: scene.geo.huis.niveau, voorbeeld: scene.voorbeeld, bewerken, Z,
        doos: scene.doos.map(d => ({ id: d.id, naam: H.meubels[d.soort].naam })), echt: scene.echt || null };
    }
    function tekenOmgeving(geo, dd) {
      HT.tekenDecor(decor, geo, dd, scene.inrichting);
      decor.style.width = px(geo.W * Z); decor.style.height = px(geo.H * Z);
      const mijden = H.bewoners.map(b => { const p = bewonerPlek(b, geo); return { kamer: p.k.id, x: p.x }; });
      const extra = OH.plaatsExtra(geo, scene.inrichting, mijden);     // event-decor en nachtdoek (lichtpunten vóór tekenLicht)
      HT.tekenLicht(licht, geo, dd, scene.inrichting);
      licht.style.opacity = dd.lampSterkte != null ? dd.lampSterkte : 1;
      licht.style.width = px(geo.W * Z); licht.style.height = px(geo.H * Z);
      lucht = HM.kleur(dd.lucht);
      tint.style.background = dd.tint ? HM.kleur(dd.tint) : 'transparent';
      tint.style.opacity = dd.tint ? dd.sterkte : 0;
      achtergrond();
      return extra;
    }
    function teken() {
      if (weg) return;
      if (actief !== api) { wilTekenen = true; return; }
      wilTekenen = false;
      staat = HM.normaliseer(kloon(store.staat().huis));
      if (bekijk === staat.niveau) bekijk = null;
      scene = maakScene();
      const geo = scene.geo, dd = OH.dagdeel();
      dio.style.width = px(geo.W * Z); dio.style.height = px(geo.H * Z);
      dio.classList.toggle('bewerken', bewerken && !scene.voorbeeld);
      dio.classList.toggle('markeer', !!inst.markeer);
      const extra = tekenOmgeving(geo, dd);
      OH.toonStatus();
      stopPets();
      if (G) G.begin({ Z, geo, inrichting: scene.inrichting, bubbels: signalen, sleutel: geo.huis.niveau + (scene.voorbeeld ? 'v' : '') });
      laag.textContent = '';
      if (bewerken && !scene.voorbeeld) tekenKamerlabels(geo);
      for (const it of scene.inrichting) laag.appendChild(maakMeubel(it, geo, dd));
      tekenBewoners(geo);
      tekenPets(geo);
      if (animatie()) G.draai();
      OH.zetExtra(laag, extra, Z);
      OH.deeltjes(weer, geo, Z);
      tekenSignalen();
      if (zoom && begonnen) zoom.herbereken();
      if (opties.opScene) opties.opScene(sceneInfo());
      testInfo();
    }
    // Alleen lucht, decor, tint en lampen (elke minuut bij het vloeiende verloop); de lopers lopen door.
    function tekenLicht() { if (scene && actief === api) tekenOmgeving(scene.geo, OH.dagdeel()); }
    function testInfo() {
      const t = window.PQ_TEST;
      if (!t || compact) return;
      Object.assign(t.info, {
        niveau: scene.geo.huis.niveau + (scene.voorbeeld ? ' (voorbeeld)' : ''), zoom: (zoom ? zoom.stand().eff.toFixed(2) : Z) + '× (render ' + Z + '×)',
        meubels: scene.inrichting.length, doos: scene.doos.length, pets: laag.querySelectorAll('.pet').length,
        signalen: signalen.querySelectorAll('.signaal').length, omgeving: OH.statusTekst(),
      });
    }

    // ---------- zoom en pannen ----------
    let begonnen = false;
    const zoom = window.PQZoom.maak(venster, podium, {
      inhoud: () => (scene ? { w: scene.geo.W, h: scene.geo.H, g: scene.geo.grondY } : { w: 664, h: 272, g: 232 }),
      zr: () => Z,
      herteken: z => { Z = z; teken(); },
      actief: () => !compact && actief === api,
      magPannen: ev => !(bewerken && ev.target.closest && ev.target.closest('.sleepbaar')),
      opWijzig: st => { if (opties.opZoom) opties.opZoom(st); },
      opToon: st => achtergrond(st),
    });
    // Waar Hidde en Tessie staan (scene-artpx): daar begint het beeld.
    function focusPunt(vh, eff) {
      const geo = scene.geo, ps = H.bewoners.map(b => bewonerPlek(b, geo));
      const cx = ps.reduce((s, p) => s + p.k.x + p.x, 0) / ps.length, k = ps[0].k;
      return compact ? { cx, cy: k.vloerY + 14 - vh / 2 / eff } : { cx, cy: k.vloerY - 50 };
    }
    function begin() {
      begonnen = true;
      if (compact) { zoom.begin({ eff: 1, ...focusPunt(venster.clientHeight, 1) }); return; }
      const st = opties.zoomStand && opties.zoomStand();
      zoom.begin(st && st.eff ? st : null, focusPunt());
    }
    let ro = null;
    if (window.ResizeObserver) {
      ro = new ResizeObserver(() => { if (actief === api && begonnen && venster.clientWidth) { if (compact) begin(); else zoom.herbereken(); } });
      ro.observe(venster);
    }
    const afmelden = store.abonneer(op => {
      if (eigenOpdracht || weg) return;
      if (actief !== api) { wilTekenen = true; return; }
      if (/^(taak|bedank|voorbeelden)/.test(op.soort)) tekenSignalen(); else teken();
    });

    // ---------- publiek ----------
    const api = {
      teken, tekenLicht, tekenSignalen, feestje, naarDoos, uitDoos, herstel, zoom, element: venster,
      scene: sceneInfo,
      pauze() {
        if (actief !== api) return;
        actief = null; stopPets(); OH.deeltjes(null);
      },
      hervat() {
        if (weg) return;
        if (actief && actief !== api) actief.pauze();
        actief = api;
        if (!begonnen) { teken(); begin(); } else teken();
      },
      bewerk(aan) { bewerken = !!aan; gekozen = null; if (G) G.vergeet(); teken(); },
      bewerkt: () => bewerken,
      bekijk(n) { bekijk = n && n !== staat.niveau ? n : null; teken(); },
      bekijkt: () => bekijk,
      markeer(aan) { inst.markeer = !!aan; teken(); },
      unmount() { api.pauze(); afmelden(); if (ro) ro.disconnect(); weg = true; root.textContent = ''; },
    };
    return api;
  }

  // Mini-tekening van een niveau (voor Verbouwen) en een korte kamerbeschrijving.
  function mini(canvas, niveau, breed) {
    const geo = HM.bouw(HM.niveauVan(niveau));
    HT.tekenMini(canvas, geo, Math.min(0.5, (breed || 272) / geo.W));
    return geo;
  }
  function kamerTekst(niveau) {
    const geo = HM.bouw(HM.niveauVan(niveau)), telling = {};
    for (const k of geo.kamers) if (!k.trap) telling[k.naam] = (telling[k.naam] || 0) + 1;
    return `${geo.F} ${geo.F > 1 ? 'verdiepingen' : 'verdieping'} · ` +
      Object.entries(telling).map(([n, a]) => (a > 1 ? `${a}× ` : '') + n.toLowerCase()).join(', ');
  }
  window.PQHuis = { mount, laad, mini, kamerTekst, actief: () => actief, TEST };
})();
