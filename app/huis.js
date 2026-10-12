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
    // De verte (huis-verte.js): lucht, erf en grond rondom de scène, alleen het zichtbare stuk plus 25% marge.
    const verte = el('canvas', 'verte');
    verte.setAttribute('aria-hidden', 'true');
    dio.append(verte, decor, laag, tint, licht, weer, signalen);
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
    // Set dragen = een kleine glinstering (winkel, puur cosmetisch): een paar pixelsterretjes rond de bewoner, één keer
    // getekend in twee standen. Het gedrag wisselt de stand hooguit één keer per ~0,9 s (alleen zichtbaarheid, geen
    // tekenwerk); bij minder beweging staat hij stil. (ox, oy) = het voetanker in het element, in schermpx.
    function glans(fid, a, ox, oy) {
      const P = window.PQWinkel, setNaam = P && P.glinster && P.glinster(lookNu(fid), fid);
      if (!setNaam) return null;
      const hoog = Math.round(a.figuur.bron[1] / a.bronpx_per_artpixel), B = 60, Hh = hoog + 10;
      const ster = (ctx, x, y, groot) => {
        const r = groot ? 2 : 1;
        HT.rect(ctx, x - r, y, 2 * r + 1, 1, 'goud.2'); HT.rect(ctx, x, y - r, 1, 2 * r + 1, 'goud.2'); HT.rect(ctx, x, y, 1, 1, 'creme.4');
        if (groot) { HT.rect(ctx, x - 1, y, 3, 1, 'goud.3'); HT.rect(ctx, x, y - 1, 1, 3, 'goud.3'); HT.rect(ctx, x, y, 1, 1, 'creme.4'); }
      };
      const doek = sterren => { const c = el('canvas'); c.width = B; c.height = Hh; const ctx = c.getContext('2d'); for (const s of sterren) ster(ctx, ...s); return c; };
      const vak = el('div', 'glans');
      vak.setAttribute('aria-hidden', 'true'); vak.title = `Draagt de set ${setNaam}`;
      Object.assign(vak.style, { position: 'absolute', left: px(ox - (B / 2) * Z), top: px(oy - Hh * Z), width: px(B * Z), height: px(Hh * Z), pointerEvents: 'none', zIndex: 1 });
      const A1 = doek([[8, 10, true], [52, 4, false], [55, Math.round(hoog * 0.5), true], [4, Math.round(hoog * 0.62), false]]);
      const A2 = doek([[11, 4, false], [49, 12, true], [5, Math.round(hoog * 0.42), true], [56, Math.round(hoog * 0.7), false]]);
      for (const c of [A1, A2]) Object.assign(c.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', imageRendering: 'pixelated' });
      A2.style.visibility = 'hidden';
      vak.append(A1, A2);
      vak.wissel = () => { const b2 = A2.style.visibility === 'hidden'; A2.style.visibility = b2 ? '' : 'hidden'; A1.style.visibility = b2 ? 'hidden' : ''; };
      if (window.PQ_TEST) window.PQ_TEST.info['glans_' + fid] = setNaam;
      return vak;
    }
    function tekenBewoners(geo) {
      if (window.PQ_TEST) for (const b of H.bewoners) delete window.PQ_TEST.info['glans_' + b.id];
      for (const b of H.bewoners) {
        const a = asset(b.id), sc = Z / a.bronpx_per_artpixel;
        if (animatie()) {
          try {
            const fig = el('canvas'), plek = bewonerPlek(b, geo);
            tekenBewoner(fig, b.id);
            const loper = G.mens({ id: b.id, a, frames: A.mens(b.id, fig), k: plek.k, x: plek.x });
            const gl = glans(b.id, a, 0, 0);
            if (gl) { loper.appendChild(gl); loper._glans = gl; }
            laag.appendChild(loper);
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
        const gl = glans(b.id, a, ax * sc, ay * sc);
        if (gl) e.appendChild(gl);
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
    // Waar staat een bewoner nu (scene-artpx): de lopende figuur uit het gedrag, anders zijn vaste plek. y = kruin.
    function bewonerPunt(id) {
      const act = G && G.acteurs().find(a => a.id === id && a.soort === 'mens');
      if (act && scene) { const k = scene.geo.kamers.find(x => x.verdieping === act.vd); if (k) return { x: act.x, y: k.vloerY - act.hoogte }; }
      const b = H.bewoners.find(x => x.id === id), a = asset(id);
      if (!b || !a || !scene) return null;
      const p = bewonerPlek(b, scene.geo);
      return { x: p.k.x + p.x, y: p.k.vloerY - a.figuur.bron[1] / a.bronpx_per_artpixel };
    }
    function plekBox(plek) {
      if (!plek || !scene) return null;
      if (plek.bewoner) {
        const ps = (plek.bewoner === 'samen' ? H.bewoners.map(b => b.id) : [plek.bewoner]).map(bewonerPunt).filter(Boolean);
        if (!ps.length) return null;
        const x = ps.reduce((s, q) => s + q.x, 0) / ps.length, y = Math.min(...ps.map(q => q.y));
        return { x: x - 8, y: y + 12, b: 16, h: 8 };
      }
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
    // Feestje in het huis: sterretjes (en optioneel "+inzet" dat opstijgt) bij de plek, en een loper-pet huppelt.
    function feestje(plek, tekst) {
      const b = plekBox(plek), s = schaal();
      let x, y;
      if (b) { x = (b.x + b.b / 2) * Z; y = b.y * Z; }
      else { const st = zoom ? zoom.stand() : { tx: 0, ty: 0 }; x = (venster.clientWidth / 2 - st.tx) / s; y = (venster.clientHeight / 3 - st.ty) / s; }
      const n = minderBeweging ? 5 : 16, groot = 1 / Math.max(0.5, s);
      if (tekst) {
        const plus = el('div', 'pluslabel', tekst);
        plus.style.left = px(x); plus.style.top = px(y - 18 * groot); plus.style.fontSize = px(20 * groot);
        signalen.appendChild(plus);
        setTimeout(() => plus.remove(), 1700);
      }
      for (let i = 0; i < n; i++) {
        const st = el('div', 'deeltje', i % 4 ? '★' : '♥'), hoek = (i / n) * Math.PI * 2, r = (40 + Math.random() * 50) * groot;
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
      const def = H.meubels[d.soort], m = HM.maat(d.soort);
      for (const t of def.hoort || []) {
        for (const k of scene.geo.kamers.filter(x => x.type === t)) {
          // Midden in de kamer beginnen; iets aan de muur op ooghoogte (~1,25 m), niet op de vloer.
          const pos = HM.plaats(k, d.soort, (k.b - m.b) / 2, def.op === 'muur' ? 56 : 0, staat.inrichting);
          if (!pos) continue;
          staat.doos = staat.doos.filter(x => x !== d);
          staat.inrichting.push({ id: d.id, soort: d.soort, kamer: k.id, x: pos.x, y: pos.y });
          bewaar(); teken();
          meld(`${def.naam} staat nu in ${k.naam.toLowerCase()}.`);
          return true;
        }
      }
      meld(`${def.naam} past nergens. Maak eerst ruimte.`);
      return false;
    }
    // Gekozen meubel markeren en focussen (na "Plaatsen" vanuit de winkel).
    function kiesUit(soort, id) {
      if (!bewerken) return;
      kies(soort, id);
      const e = laag.querySelector(`.meubel[data-id="${CSS.escape(id)}"]`);
      if (e) { e.focus({ preventScroll: true }); e.classList.add('gekozen'); }   // eerst focus: die kiest opnieuw en wist de markering
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
      // Wat jullie in de winkel kochten, hoort niet bij de startindeling: dat gaat in de doos, niet weg.
      const bekend = new Set([...r.inrichting, ...r.doos].map(i => i.id));
      const gekocht = [...staat.inrichting, ...staat.doos].filter(i => !bekend.has(i.id)).map(i => ({ id: i.id, soort: i.soort }));
      Object.assign(staat, { inrichting: r.inrichting, doos: r.doos.concat(gekocht), posities: {} });
      bewaar(); teken();
    }
    // ---------- alles tekenen ----------
    let lucht = '#9fd3e6', alleenSchaal = false;
    // Achter alles: één effen luchtkleur (alleen zichtbaar bij het elastisch over de wereldrand trekken).
    function achtergrond() { venster.style.background = lucht; }
    function sceneInfo() {
      if (!scene) return null;
      return { niveau: staat.niveau, getoond: scene.geo.huis.niveau, voorbeeld: scene.voorbeeld, bewerken, Z,
        doos: scene.doos.map(d => ({ id: d.id, naam: H.meubels[d.soort].naam })), echt: scene.echt || null };
    }
    // Decor en lichtlaag zijn in artpx getekend en hangen niet af van de zoom: bij alleen een andere zoomstap
    // (herteken na het vastklikken) worden ze hergebruikt en alleen opnieuw geschaald.
    let decorCache = null;
    const decorSleutel = () => [scene.geo.huis.niveau, scene.voorbeeld ? 'v' : '', scene.geo.W, scene.geo.H, JSON.stringify(scene.inrichting)].join('#');
    function tekenOmgeving(geo, dd, hergebruik) {
      let extra;
      if (hergebruik && decorCache && decorCache.sleutel === decorSleutel()) {
        geo._bomen = decorCache.bomen; geo._lichten = decorCache.lichten; extra = decorCache.extra;
      } else {
        HT.tekenDecor(decor, geo, dd, scene.inrichting);
        const mijden = H.bewoners.map(b => { const p = bewonerPlek(b, geo); return { kamer: p.k.id, x: p.x }; });
        extra = OH.plaatsExtra(geo, scene.inrichting, mijden);     // event-decor en nachtdoek (lichtpunten vóór tekenLicht)
        HT.tekenLicht(licht, geo, dd, scene.inrichting);
        decorCache = { sleutel: decorSleutel(), bomen: geo._bomen, lichten: geo._lichten, extra };
      }
      decor.style.width = px(geo.W * Z); decor.style.height = px(geo.H * Z);
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
      const extra = tekenOmgeving(geo, dd, alleenSchaal);
      alleenSchaal = false;
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
      verteBij(false); deeltjesBij(true);
      tekenSignalen();
      if (zoom && begonnen) zoom.herbereken();
      if (opties.opScene) opties.opScene(sceneInfo());
      testInfo();
    }
    // Alleen lucht, decor, tint en lampen (elke minuut bij het vloeiende verloop); de lopers lopen door.
    function tekenLicht() { if (scene && actief === api) { tekenOmgeving(scene.geo, OH.dagdeel()); verteBij(false); } }

    // ---------- de verte: wereld rondom de scène ----------
    // De wereld loopt opzij, boven (lucht) en onder (aardlagen) door; de pan-grenzen van de zoom zijn de wereldranden.
    const RAND = { opzij: 360, boven: 900, onder: 360 };
    const wereld = g => ({ x0: -RAND.opzij, y0: -RAND.boven, x1: g.W + RAND.opzij, y1: g.H + RAND.onder });
    function zetRegio(e, r) { e.style.left = px(r.x0 * Z); e.style.top = px(r.y0 * Z); e.style.width = px(r.b * Z); e.style.height = px(r.h * Z); }
    // Deeltjes (regen, sneeuw, blad) voor een stuk van de wereld: omgeving-huis.js krijgt een geo voor dat stuk.
    function regioGeo(g, r) {
      return { W: r.b, H: r.h, grondY: g.grondY - r.y0, huis: g.huis,
        kamers: g.kamers.map(k => ({ buiten: k.buiten, y: k.y - r.y0, h: k.h, box: { x: k.box.x - r.x0, b: k.box.b } })),
        _bomen: (g._bomen || []).map(b => Object.assign({}, b, { x: b.x - r.x0, y: b.y - r.y0 })) };
    }
    // De verte is één bitmap van de hele wereld (1 canvaspixel per artpx; niveau 1 ≈ 2,1 Mpx, de villa ≈ 4,6 Mpx).
    // Getekend bij een nieuwe scène of als de lucht echt verandert (dagdeel, weer, sterren), nooit tijdens een gebaar:
    // pannen en zoomen schuiven en schalen alleen de laag.
    let verteSleutel = '';
    function luchtSleutel(dd) {
      const r = v => (v == null ? '' : Math.round(v * 8));
      return [dd.id, (dd.banden || []).map(b => b[0]).join(','), r(dd.sterNiveau), dd.wolken || 1, dd.sterren ? 1 : 0, dd.ver, dd.dicht].join('|');
    }
    function verteBij(nieuweScene) {
      if (!scene || weg || actief !== api) return;
      const g = scene.geo, w = wereld(g), dd = OH.dagdeel();
      const sl = [g.huis.niveau, scene.voorbeeld ? 'v' : '', g.W, g.H, luchtSleutel(dd)].join('#');
      const r = { x0: w.x0, y0: w.y0, b: w.x1 - w.x0, h: w.y1 - w.y0 };
      if (nieuweScene || sl !== verteSleutel) { verteSleutel = sl; window.PQ_HUISVERTE.teken(verte, g, dd, r.x0, r.y0, r.b, r.h); }
      zetRegio(verte, r); zetRegio(tint, r);
    }
    // Deeltjes alleen over het zichtbare stuk (+15%), opnieuw opgezet als het beeld na een gebaar tot rust komt en
    // buiten dat stuk valt. Uitgezoomd (zoom < 1) minder deeltjes en 15 beelden per seconde.
    let weerRegio = null;
    function zichtbaarStuk(st) {
      const m = zoom.maten ? zoom.maten() : { vw: venster.clientWidth || 1, vh: venster.clientHeight || 1 };
      return { x0: -st.tx / st.eff, y0: -st.ty / st.eff, x1: (m.vw - st.tx) / st.eff, y1: (m.vh - st.ty) / st.eff };
    }
    function deeltjesBij(forceer) {
      if (!scene || weg || actief !== api || !zoom) return;
      const st = zoom.stand(), z = zichtbaarStuk(st), w = wereld(scene.geo), laag = st.eff < 1;
      if (!forceer && weerRegio && weerRegio.laag === laag && weerRegio.Z === Z && z.x0 >= weerRegio.x0 && z.y0 >= weerRegio.y0 && z.x1 <= weerRegio.x0 + weerRegio.b && z.y1 <= weerRegio.y0 + weerRegio.h) return;
      const mx = (z.x1 - z.x0) * 0.15, my = (z.y1 - z.y0) * 0.15;
      const x0 = Math.floor(Math.max(w.x0, z.x0 - mx)), y0 = Math.floor(Math.max(w.y0, z.y0 - my));
      const x1 = Math.ceil(Math.min(w.x1, z.x1 + mx)), y1 = Math.ceil(Math.min(Math.min(w.y1, scene.geo.grondY + 4), z.y1 + my));
      weerRegio = { x0, y0, b: Math.max(8, x1 - x0), h: Math.max(8, y1 - y0), Z, laag };
      OH.deeltjes(weer, regioGeo(scene.geo, weerRegio), Z, laag ? { max: 50, interval: 66 } : null);
      zetRegio(weer, weerRegio);
    }
    // Per frame (tijdens gebaren) alleen goedkope dingen: wat zichtbaar is voor het gedrag, en de beeldsnelheid.
    let lageFps = false, zichtStuk = null, fpsNu = -1;
    function bijFrame(st) {
      zichtStuk = zichtbaarStuk(st);
      const fps = lageFps || st.eff < 1 ? 15 : 0;
      if (fps !== fpsNu && G && G.instellen) { fpsNu = fps; G.instellen({ fps, zicht: a => !zichtStuk || (a.x > zichtStuk.x0 - 40 && a.x < zichtStuk.x1 + 40) }); }
    }
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
      // De grens is de getekende wereld, 1 artpx naar binnen: zo valt ook een afgeronde pixel nooit buiten de rand.
      inhoud: () => { const g = scene ? scene.geo : { W: 664, H: 272, grondY: 232 }, w = wereld(g); return { w: g.W, h: g.H, g: g.grondY, wereld: { x0: w.x0 + 1, y0: w.y0 + 1, x1: w.x1 - 1, y1: w.y1 - 1 } }; },
      zr: () => Z,
      herteken: z => { Z = z; alleenSchaal = true; teken(); },
      actief: () => !compact && actief === api,
      magPannen: ev => !(bewerken && ev.target.closest && ev.target.closest('.sleepbaar')),
      opWijzig: st => { aangeraakt = true; if (opties.opZoom) opties.opZoom(st); },
      opToon: bijFrame,
      opRust: () => deeltjesBij(false),
    });
    // Waar Hidde en Tessie staan (scene-artpx): daar begint het beeld.
    function focusPunt(vh, eff) {
      const geo = scene.geo, ps = H.bewoners.map(b => bewonerPlek(b, geo));
      const cx = ps.reduce((s, p) => s + p.k.x + p.x, 0) / ps.length, k = ps[0].k;
      // Volledig scherm: het midden van hun kamer (vloer tot plafond), zodat Hidde, Tessie en de kamer in beeld zijn.
      // De vloer komt op ~2/3 van de hoogte: de kamer met lucht en dak erboven, een strook grond eronder.
      return compact ? { cx, cy: k.vloerY + 14 - vh / 2 / eff } : { cx, cy: k.vloerY - (venster.clientHeight || 800) * 0.16 / 2 };
    }
    // Een bewaarde stand telt alleen als hij zinnig is: een hele stap van 2× tot 4× met een midden in de scène.
    // "Alles in beeld" of een halve meting van een eerdere versie wordt dus nooit de standaard bij het openen.
    function geldigeStand(st) {
      if (!st || !scene || ![st.eff, st.cx, st.cy].every(Number.isFinite)) return null;
      if (st.eff < 2 || st.eff > 4 || Math.abs(st.eff - Math.round(st.eff)) > 1e-6) return null;
      if (st.cx < 0 || st.cx > scene.geo.W || st.cy < 0 || st.cy > scene.geo.H) return null;
      return st;
    }
    // Startzoom: 2× op de kamer van Hidde en Tessie (of een geldige bewaarde stand). Tot iemand het huis aanraakt,
    // wordt dat opnieuw bepaald zodra het venster zijn echte maat heeft (na load, na een resize van de visualViewport,
    // na de eerste frames): op een iPhone kloppen de maten en safe-areas vlak na het mounten nog niet altijd.
    let aangeraakt = false, gemeten = '';
    function begin() {
      begonnen = true;
      zoom.meet();
      gemeten = venster.clientWidth + 'x' + venster.clientHeight;
      if (compact) { zoom.begin({ eff: 1, ...focusPunt(venster.clientHeight, 1) }); return; }
      zoom.begin(geldigeStand(opties.zoomStand && opties.zoomStand()), focusPunt());
    }
    function herstart() {
      if (weg || actief !== api || !begonnen || !venster.clientWidth || !venster.clientHeight) return;
      if (!aangeraakt && gemeten !== venster.clientWidth + 'x' + venster.clientHeight) begin(); else zoom.herbereken();
    }
    for (const t of ['pointerdown', 'wheel']) venster.addEventListener(t, () => { aangeraakt = true; }, { passive: true, capture: true });
    window.addEventListener('load', herstart);
    if (window.visualViewport) window.visualViewport.addEventListener('resize', herstart);
    requestAnimationFrame(() => requestAnimationFrame(herstart));
    setTimeout(herstart, 600);
    let ro = null;
    if (window.ResizeObserver) {
      ro = new ResizeObserver(herstart);
      ro.observe(venster);
    }
    const afmelden = store.abonneer(op => {
      if (eigenOpdracht || weg) return;
      if (actief !== api) { wilTekenen = true; return; }
      if (/^(taak|bedank|voorbeelden)/.test(op.soort)) tekenSignalen(); else teken();
    });

    // ---------- publiek ----------
    const api = {
      teken, tekenLicht, tekenSignalen, feestje, naarDoos, uitDoos, herstel, zoom, element: venster, kies: kiesUit,
      // Schuif het huis zacht zodat de plek van een taak op schermhoogte y staat (bv. boven een open menu).
      kijkNaar(plek, y, x) { const b = plekBox(plek); if (b) zoom.glijNaar(b.x + b.b / 2, b.y, y, x); },
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
      // Menu open over het huis: het huis mag zuiniger (15 beelden per seconde).
      zuinig(aan) { lageFps = !!aan; fpsNu = -1; if (zoom) bijFrame(zoom.stand()); },
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
