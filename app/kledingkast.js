// Kledingkast: modulaire kleding per slot (kastitems als lagen), stel-outfits, eigen outfits en pixel-editor.
// Leest window.PQ_KLEDING (assets/kleding.js) en window.PQ_KAST (assets/kast.js), beide gegenereerd.
// Tekenen gebeurt in app/figuur.js (tekenLook); dat bestand deelt het huis.
// In de app (PQStore aanwezig) komen looks en bezit uit de store: een look boekt 'kleding.look', kopen is een voorstel
// via window.PQKastKoop (scherm-kast.js) dat de ander goedkeurt. Los (kledingkast.html) werkt alles zoals voorheen.
(function () {
  'use strict';
  const D = window.PQ_KLEDING, F = window.PQ_FIGUUR, KAST = F.KAST;
  const $ = s => document.querySelector(s);
  const CHARS = Object.keys(D.characters);
  const SLOTNAAM = { hoofd: 'Hoofd', boven: 'Boven', jas: 'Jas', onder: 'Onder', heel_lichaam: 'Heel lichaam',
    schoenen: 'Schoenen', accessoire: 'Accessoire' };
  // Oude zone-recolor <-> uitgesneden items (de stel-outfits en het huis gebruiken nog zones).
  const ZONE_ITEM = { shirt: 'tshirt_basis', broek: 'broek_basis', schoenen: 'sneakers_basis', accessoire: 'ketting_basis' };
  const TEST = /[?&]test(=|&|$)/.test(location.search);
  const S = window.PQStore || null;
  const kloon = o => JSON.parse(JSON.stringify(o));
  const { OPSLAG_KAST: OPSLAG, laadBeeld, laadAlles, verkleur, accRaster, tekenLook, itemVan, kastItems, draagbaar } = F;

  // ---------- opslag (altijd in try/catch) ----------
  function lees(sleutel, standaard) {
    try {
      const v = localStorage.getItem(sleutel);
      return v ? JSON.parse(v) : standaard;
    } catch (e) { return standaard; }
  }
  function schrijf(sleutel, waarde) {
    try { localStorage.setItem(sleutel, JSON.stringify(waarde)); return true; } catch (e) {
      if ($('#opslagMelding')) $('#opslagMelding').hidden = false;
      return false;
    }
  }

  // ---------- staat ----------
  const staat = Object.assign({
    char: 'hidde', variant: 'bron', achtergrond: 'creme',
    keuze: { hidde: {}, tessie: {} }, acc: { hidde: [], tessie: [] }, outfitNaam: 'Startkast', slot: 'hoofd', gekozen: null,
  }, lees(OPSLAG.staat, {}));
  let eigenAcc = lees(OPSLAG.acc, []);          // eigen items uit de editor, met slot
  let eigenOutfits = lees(OPSLAG.outfits, []);
  const looks = S ? kloon(S.staat().kleding.looks || {}) : (lees(OPSLAG.look, {}) || {});
  let bezit = S ? kloon(S.staat().kleding.bezit || {}) : (lees(OPSLAG.bezit, {}) || {});
  function startBezit(fid) {   // startkast: shirt, broek, schoenen, pyjama (en Tessies kettinkje uit het goedgekeurde figuur)
    const b = {};
    for (const it of KAST.items) if (it.startkast && it.lichaam.includes(fid)) b[it.id] = [it.kleuren[0]];
    return b;
  }
  for (const f of CHARS) {
    if (!looks[f] || typeof looks[f] !== 'object') looks[f] = F.standaardLook(f);
    if (!bezit[f] || typeof bezit[f] !== 'object') bezit[f] = startBezit(f);
  }
  let pas = null;   // { fid, slot, item, kleur }: passen zonder bezit, wordt niet bewaard

  const isEigen = id => eigenAcc.some(a => a.id === id) || id === '__ontwerp';
  const heeftKleur = (fid, id, kleur) => isEigen(id) || (bezit[fid][id] || []).includes(kleur);
  const heeftItem = (fid, id) => isEigen(id) || (bezit[fid][id] || []).length > 0;

  function zoneKeuze(look) {
    const k = {};
    for (const [zone, id] of Object.entries(ZONE_ITEM)) {
      const e = Object.values(look).find(x => x && x.item === id);
      if (e && e.kleur && e.kleur !== 'origineel') k[zone] = e.kleur;
    }
    return k;
  }
  function lookUitZones(fid, keuze, basis) {
    const look = Object.assign({}, basis || looks[fid]);
    for (const [zone, id] of Object.entries(ZONE_ITEM)) {
      const it = itemVan(id);
      if (!draagbaar(it, fid)) continue;
      look[it.slot] = { item: id, kleur: (keuze || {})[zone] || 'origineel' };
    }
    return look;
  }
  function bewaar() {
    for (const f of CHARS) {
      // Het huis leest nog de oude staat (zones + pixel-accessoires): die houden we in sync.
      staat.keuze[f] = zoneKeuze(looks[f]);
      staat.acc[f] = Object.values(looks[f]).map(x => x && x.item).filter(id => eigenAcc.some(a => a.id === id));
    }
    schrijf(OPSLAG.staat, staat);
    if (S) {   // alleen een opdracht als de look echt veranderde
      for (const f of CHARS) if (JSON.stringify(S.staat().kleding.looks[f] || F.standaardLook(f)) !== JSON.stringify(looks[f])) S.doe('kleding.look', { fid: f, look: looks[f] });
      return;
    }
    schrijf(OPSLAG.look, looks);
    schrijf(OPSLAG.bezit, bezit);
  }
  // Na een goedgekeurde aankoop (of een wijziging van de ander): bezit en looks opnieuw uit de store.
  function herlaad() {
    if (!S) return;
    bezit = kloon(S.staat().kleding.bezit || {});
    for (const f of CHARS) {
      if (!bezit[f]) bezit[f] = startBezit(f);
      const l = S.staat().kleding.looks[f];
      looks[f] = l ? kloon(l) : F.standaardLook(f);
    }
  }

  // Eigen items + het ontwerp in de editor bekendmaken bij figuur.js.
  let ontwerp = null;
  function registreer() { F.registreerItems(ontwerp ? eigenAcc.concat([ontwerp]) : eigenAcc); }
  function effectieveLook(fid) {
    const l = Object.assign({}, looks[fid]);
    if (pas && pas.fid === fid) l[pas.slot] = { item: pas.item, kleur: pas.kleur };
    if (ontwerp) l[ontwerp.slot] = { item: '__ontwerp' };
    return l;
  }
  function trekAan(fid, it, kleur) {
    // Heel lichaam verbergt boven en onder bij het tekenen; die blijven in de look voor als het weer uit gaat.
    looks[fid][it.slot] = { item: it.id, kleur };
    pas = null;
    staat.outfitNaam = 'Eigen look';
  }
  function trekUit(fid, slot) { delete looks[fid][slot]; pas = null; staat.outfitNaam = 'Eigen look'; }

  // ---------- preview ----------
  function tekenPreview() {
    const fid = staat.char;
    // Het ontwerp in de editor live in zijn slot tonen.
    ontwerp = $('#edToon').checked && ed.heeftPixels() ? ed.alsItem('__ontwerp') : null;
    registreer();
    tekenLook($('#preview'), fid, staat.variant, effectieveLook(fid), { metAnkers: $('#toonAnkers').checked });
    $('#spiegel').className = 'spiegel bg-' + staat.achtergrond;
    $('#outfitNaam').textContent = staat.outfitNaam;
    const pb = $('#pasBalk');
    pb.hidden = !(pas && pas.fid === fid);
    if (!pb.hidden) {
      const it = itemVan(pas.item);
      pb.replaceChildren(document.createTextNode(`Je past ${it.naam} (${pas.kleur}). Nog niet in bezit. `),
        knop('Stop met passen', () => { pas = null; alles(); }));
    }
    tekenLookLijst();
    if (window.PQ_TEST) window.PQ_TEST.info.look = Object.entries(looks[fid]).map(([s, v]) => `${s}=${v.item}:${v.kleur || ''}`).join(' ');
  }
  function tekenLookLijst() {
    const fid = staat.char, ul = $('#lookLijst');
    ul.replaceChildren();
    for (const slot of F.SLOTS) {
      const e = looks[fid][slot], it = e && itemVan(e.item);
      const li = document.createElement('li');
      let tekst = it ? `${it.naam}${e.kleur && e.kleur !== 'origineel' ? ' · ' + e.kleur : ''}` : '–';
      if (it && !draagbaar(it, fid)) tekst += ' (wacht op art)';
      if (it && slot !== 'heel_lichaam' && looks[fid].heel_lichaam && (slot === 'boven' || slot === 'onder') &&
          draagbaar(itemVan(looks[fid].heel_lichaam.item), fid)) tekst += ' (onder heel lichaam)';
      li.innerHTML = `<b>${SLOTNAAM[slot]}</b><span>${escape(tekst)}</span>`;
      ul.append(li);
    }
  }

  // ---------- kast: slots, items, detail ----------
  const UITSNEDE = { hoofd: [14, 58], boven: [44, 86], jas: [44, 86], onder: [64, 108], heel_lichaam: [40, 108],
    schoenen: [90, 110], accessoire: [34, 82] };
  const vol = document.createElement('canvas');
  function tegelBeeld(fid, slot, it, kleur) {
    const look = Object.assign({}, looks[fid]);
    if (it && draagbaar(it, fid)) look[slot] = { item: it.id, kleur };
    tekenLook(vol, fid, 'native', look);
    const [y0, y1] = UITSNEDE[slot], h = y1 - y0, c = document.createElement('canvas');
    c.width = 48; c.height = h;
    const ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(vol, 8, y0, 48, h, 0, 0, 48, h);
    c.style.width = '96px';
    return c;
  }
  const lichaamNaam = fid => D.characters[fid].naam;
  function itemsInSlot(slot) { return kastItems().filter(i => i.slot === slot && i.id !== '__ontwerp'); }
  function tekenSlotTabs() {
    const box = $('#slotTabs');
    box.replaceChildren();
    for (const slot of F.SLOTS) {
      const b = document.createElement('button');
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-selected', String(staat.slot === slot));
      b.setAttribute('aria-pressed', String(staat.slot === slot));
      b.textContent = `${SLOTNAAM[slot]} ${itemsInSlot(slot).length}`;
      b.onclick = () => { staat.slot = slot; staat.gekozen = null; alles(); };
      box.append(b);
    }
  }
  function herkomstLabel(it) {
    if (it.soort === 'pixels') return '<span class="label eigen">eigen</span>';
    if (it.status !== 'klaar') return '<span class="label wacht">wacht op art</span>';
    return it.herkomst === 'uitgesneden' ? '<span class="label blad">uitgesneden</span>' : '<span class="label nieuw">nieuw getekend</span>';
  }
  function tekenRooster() {
    const fid = staat.char, box = $('#itemRooster');
    box.replaceChildren();
    const gedragen = looks[fid][staat.slot];
    for (const it of itemsInSlot(staat.slot)) {
      const b = document.createElement('button');
      const kan = draagbaar(it, fid), aan = gedragen && gedragen.item === it.id;
      b.className = 'tegel' + (kan ? '' : ' wacht') + (aan ? ' aan' : '');
      b.setAttribute('aria-pressed', String(staat.gekozen === it.id));
      const kleur = aan ? gedragen.kleur : (it.kleuren[0] || null);
      b.append(tegelBeeld(fid, staat.slot, kan ? it : null, kleur));
      const staatTekst = !it.lichaam.includes(fid) ? `alleen ${it.lichaam.map(lichaamNaam).join(', ')}`
        : it.status !== 'klaar' ? 'wacht op art' : aan ? 'draag je' : heeftItem(fid, it.id) ? 'in bezit' : `${it.prijs} munten`;
      b.insertAdjacentHTML('beforeend', `<b>${escape(it.naam)}</b><small>${staatTekst}</small>${herkomstLabel(it)}`);
      b.onclick = () => kiesItem(it);
      box.append(b);
    }
  }
  function kiesItem(it) {
    const fid = staat.char;
    staat.gekozen = it.id;
    if (draagbaar(it, fid)) {
      const huidig = looks[fid][it.slot];
      const kleur = huidig && huidig.item === it.id ? huidig.kleur
        : ((bezit[fid][it.id] || [])[0] || it.kleuren[0] || null);
      if (heeftKleur(fid, it.id, kleur) || it.soort === 'pixels') trekAan(fid, it, kleur);
      else pas = { fid, slot: it.slot, item: it.id, kleur };
    }
    alles();
  }

  function tekenDetail() {
    const fid = staat.char, box = $('#itemDetail');
    box.replaceChildren();
    const gedragen = looks[fid][staat.slot];
    const it = itemVan(staat.gekozen) || (gedragen && itemVan(gedragen.item));
    if (!it || it.slot !== staat.slot) {
      box.innerHTML = `<p class="noot">${SLOTNAAM[staat.slot]}: niets gekozen. Tik op een item.</p>`;
      return;
    }
    const kan = draagbaar(it, fid), aan = gedragen && gedragen.item === it.id;
    const set = KAST.sets.find(s => s.id === it.set_id);
    const regels = [`<b>${escape(it.naam)}</b> ${herkomstLabel(it)}`,
      it.soort === 'pixels' ? 'Eigen item, gratis.' :
        `${it.prijs} munten · ${it.zeldzaamheid}${set ? ' · set ' + set.naam : ''}${it.tags.length ? ' · ' + it.tags.join(', ') : ''}`,
      `Voor: ${it.lichaam.map(lichaamNaam).join(' en ')}`];
    if (it.status !== 'klaar') regels.push('Dit item verandert de vorm van het lichaam en wacht op het nieuwe basislichaam (zie docs/kleding-art-brief.md).');
    else if (!kan) regels.push(`Bestaat nog niet voor ${lichaamNaam(fid)}.`);
    if (it.herkomst === 'uitgesneden') regels.push('Het lichaam draagt dit nog zelf; uittrekken kan pas met het basislichaam in onderkleding.');
    box.innerHTML = regels.map(r => `<p>${r}</p>`).join('');
    if (it.kleuren.length) {
      const sws = document.createElement('div');
      sws.className = 'swatches';
      const actief = pas && pas.item === it.id ? pas.kleur : aan ? gedragen.kleur : null;
      for (const k of it.kleuren) {
        const b = document.createElement('button');
        b.className = 'sw' + (heeftKleur(fid, it.id, k) ? '' : ' slot');
        b.title = k + (heeftKleur(fid, it.id, k) ? '' : ' (niet in bezit)');
        b.setAttribute('aria-label', `${it.naam}: ${k}`);
        b.setAttribute('aria-pressed', String(actief === k));
        b.innerHTML = k === 'origineel' ? '' : [...D.rampen[k].stops].reverse().map(c => `<i style="background:${c}"></i>`).join('');
        if (k === 'origineel') { b.classList.add('orig'); b.textContent = 'O'; }
        b.disabled = !kan;
        b.onclick = () => {
          if (heeftKleur(fid, it.id, k)) trekAan(fid, it, k);
          else pas = { fid, slot: it.slot, item: it.id, kleur: k };
          alles();
        };
        sws.append(b);
      }
      box.append(sws);
    }
    const knoppen = document.createElement('div');
    knoppen.className = 'knoppen links';
    const kleur = pas && pas.item === it.id ? pas.kleur : aan ? gedragen.kleur : it.kleuren[0];
    if (kan && !aan && heeftItem(fid, it.id)) knoppen.append(knop('Aantrekken', () => kiesItem(it)));
    if (aan && it.herkomst !== 'uitgesneden') knoppen.append(knop('Uittrekken', () => { trekUit(fid, it.slot); alles(); }));
    if (S && window.PQKastKoop && it.soort !== 'pixels' && kleur && kan && !heeftKleur(fid, it.id, kleur)) {
      const open = window.PQKastKoop.open(fid, it.id, kleur);
      const tekort = window.PQKastKoop.saldo ? it.prijs - window.PQKastKoop.saldo() : 0;   // zoals bij Verbouwen: vooraf zeggen
      const k = knop(open ? 'Voorstel staat open' : tekort > 0 ? `Nog ${tekort} sparen (${it.prijs})` : `Kopen: ${it.prijs} munten`, () => window.PQKastKoop.koop(fid, it, kleur));
      k.classList.add('goud'); k.disabled = !!open || tekort > 0;
      knoppen.append(k);
    } else if (!S && it.soort !== 'pixels' && kleur && !heeftKleur(fid, it.id, kleur)) {
      knoppen.append(knop(`Test: ${kleur} in bezit zetten`, () => {
        bezit[fid][it.id] = [...new Set([...(bezit[fid][it.id] || []), kleur])];
        if (kan) trekAan(fid, it, kleur);
        alles();
      }));
    }
    if (kan && it.soort !== 'pixels' && it.herkomst === 'nieuw getekend' && ['hoofd', 'accessoire', 'jas'].includes(it.slot)) {
      knoppen.append(knop('Bewerk als kopie', () => ed.laadItem(it, fid)));
    }
    if (it.soort === 'pixels' && it.id !== '__ontwerp') {
      knoppen.append(knop('Bewerk', () => ed.laad(it)), knop('Verwijder', () => {
        eigenAcc = eigenAcc.filter(x => x.id !== it.id);
        schrijf(OPSLAG.acc, eigenAcc);
        for (const f of CHARS) for (const s of Object.keys(looks[f])) if (looks[f][s].item === it.id) delete looks[f][s];
        staat.gekozen = null;
        alles();
      }));
    }
    box.append(knoppen);
  }

  // ---------- stel-outfits (catalogus) en eigen outfits ----------
  function miniFiguur(fid, look, breed = 64) {
    const c = document.createElement('canvas'), v = document.createElement('canvas');
    tekenLook(v, fid, 'native', look);
    c.width = 48; c.height = 92;
    const ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(v, 8, 18, 48, 92, 0, 0, 48, 92);
    c.style.width = breed + 'px';
    return c;
  }
  function tekenCatalogus() {
    const box = $('#catalogus');
    box.replaceChildren();
    const start = { id: 'start', naam: 'Startkast', omschrijving: 'Zoals goedgekeurd.', hidde: {}, tessie: {} };
    for (const o of [start, ...D.catalogus]) {
      const b = document.createElement('button');
      b.className = 'outfit';
      b.setAttribute('aria-pressed', String(staat.outfitNaam === o.naam));
      const duo = document.createElement('div');
      duo.className = 'duo-mini';
      duo.append(...CHARS.map(f => miniFiguur(f, lookUitZones(f, o[f], F.standaardLook(f)))));
      b.append(duo);
      b.insertAdjacentHTML('beforeend', `<b>${o.naam}</b><small>${o.omschrijving}</small>`);
      b.onclick = () => {
        for (const f of CHARS) looks[f] = lookUitZones(f, o[f], F.standaardLook(f));
        pas = null;
        staat.outfitNaam = o.naam;
        alles();
      };
      box.append(b);
    }
  }
  function outfitLook(o, fid) {
    if (o.look && o.look[fid]) return o.look[fid];
    const look = lookUitZones(fid, (o.keuze || {})[fid], F.standaardLook(fid));   // oud formaat: zones + accessoires
    for (const id of ((o.acc || {})[fid] || [])) { const it = itemVan(id); if (it) look[it.slot] = { item: id }; }
    return look;
  }
  function tekenEigenOutfits() {
    const box = $('#eigenOutfits');
    box.replaceChildren();
    if (!eigenOutfits.length) {
      box.innerHTML = '<li><span class="noot">Nog geen eigen outfits. Stel een look samen en sla op.</span></li>';
      return;
    }
    for (const o of eigenOutfits) {
      const li = document.createElement('li');
      li.append(...CHARS.map(f => miniFiguur(f, outfitLook(o, f), 40)));
      li.insertAdjacentHTML('beforeend', `<span class="naam">${escape(o.naam)}</span>`);
      li.append(knop('Aantrekken', () => {
        for (const f of CHARS) looks[f] = JSON.parse(JSON.stringify(outfitLook(o, f)));
        pas = null;
        staat.outfitNaam = o.naam;
        alles();
      }), knop('JSON', () => download(`${slug(o.naam)}.json`, new Blob([JSON.stringify(o, null, 2)], { type: 'application/json' }))),
      knop('Verwijder', () => {
        eigenOutfits = eigenOutfits.filter(x => x !== o);
        schrijf(OPSLAG.outfits, eigenOutfits);
        tekenEigenOutfits();
      }));
      box.append(li);
    }
  }
  $('#outfitOpslaan').onclick = () => {
    const naam = $('#outfitInvoer').value.trim() || `Outfit ${eigenOutfits.length + 1}`;
    eigenOutfits.push({ id: 'outfit-' + Date.now(), naam, look: JSON.parse(JSON.stringify(looks)),
      keuze: Object.fromEntries(CHARS.map(f => [f, zoneKeuze(looks[f])])) });
    schrijf(OPSLAG.outfits, eigenOutfits);
    staat.outfitNaam = naam;
    $('#outfitInvoer').value = '';
    alles();
  };

  // ---------- pixel-editor: maakt items in een slot naar keuze (hoofd, accessoire, jas-overlay) ----------
  const STANDAARD_ANKER = { hoofd: 'kruin', accessoire: 'nek', jas: 'nek' };
  const ed = (function () {
    let W = 16, H = 10, cel = new Array(W * H).fill(null), anker = [8, 9], kleur = D.palet.nacht;
    let gereedschap = 'potlood', bewerktId = null, schuif = { hidde: [0, 0], tessie: [0, 0] };
    let basisKleur = 'nacht', richting = 'rechts';
    const doek = $('#edRaster');
    let celpx = 20;

    function maat() {
      const ruimte = Math.max(120, Math.min(doek.parentElement.parentElement.clientWidth || 320, window.innerWidth - 72, 520) - 6);
      celpx = Math.max(6, Math.min(26, Math.floor(ruimte / W)));
      doek.width = W * celpx; doek.height = H * celpx;
    }
    function teken() {
      maat();
      const ctx = doek.getContext('2d');
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const k = cel[y * W + x];
        ctx.fillStyle = k || (((x + y) % 2) ? '#f1ece0' : '#ffffff');
        ctx.fillRect(x * celpx, y * celpx, celpx, celpx);
      }
      ctx.strokeStyle = 'rgba(43,54,79,.18)'; ctx.lineWidth = 1;
      for (let x = 0; x <= W; x++) { ctx.beginPath(); ctx.moveTo(x * celpx + .5, 0); ctx.lineTo(x * celpx + .5, H * celpx); ctx.stroke(); }
      for (let y = 0; y <= H; y++) { ctx.beginPath(); ctx.moveTo(0, y * celpx + .5); ctx.lineTo(W * celpx, y * celpx + .5); ctx.stroke(); }
      ctx.strokeStyle = '#f16446'; ctx.lineWidth = 3;
      ctx.strokeRect(anker[0] * celpx + 2, anker[1] * celpx + 2, celpx - 4, celpx - 4);
      const s = schuif[staat.char];
      $('#edVerschuivingTekst').textContent = `${s[0]}, ${s[1]}`;
    }
    function zet(x, y, k) {
      if (x < 0 || y < 0 || x >= W || y >= H) return;
      cel[y * W + x] = k;
      if ($('#edSymmetrie').checked) cel[y * W + (W - 1 - x)] = k;
    }
    function vul(x, y, k) {
      const doel = cel[y * W + x];
      if (doel === k) return;
      const stapel = [[x, y]];
      while (stapel.length) {
        const [a, b] = stapel.pop();
        if (a < 0 || b < 0 || a >= W || b >= H || cel[b * W + a] !== doel) continue;
        cel[b * W + a] = k;
        stapel.push([a + 1, b], [a - 1, b], [a, b + 1], [a, b - 1]);
      }
    }
    function gebruik(e) {
      const r = doek.getBoundingClientRect();
      const x = Math.floor((e.clientX - r.left) / r.width * W), y = Math.floor((e.clientY - r.top) / r.height * H);
      if (x < 0 || y < 0 || x >= W || y >= H) return;
      if (gereedschap === 'potlood') zet(x, y, kleur);
      else if (gereedschap === 'gum') zet(x, y, null);
      else if (gereedschap === 'vullen') vul(x, y, kleur);
      else if (gereedschap === 'ankerpunt') anker = [x, y];
      teken(); tekenPreview();
    }
    let tekenend = false;
    doek.addEventListener('pointerdown', e => { tekenend = true; doek.setPointerCapture(e.pointerId); gebruik(e); e.preventDefault(); });
    doek.addEventListener('pointermove', e => { if (tekenend && (gereedschap === 'potlood' || gereedschap === 'gum')) gebruik(e); });
    doek.addEventListener('pointerup', () => { tekenend = false; });
    doek.addEventListener('pointercancel', () => { tekenend = false; });

    function herschaal(nw, nh) {
      nw = Math.max(1, Math.min(40, nw | 0)); nh = Math.max(1, Math.min(48, nh | 0));
      const nieuw = new Array(nw * nh).fill(null);
      for (let y = 0; y < Math.min(H, nh); y++) for (let x = 0; x < Math.min(W, nw); x++) nieuw[y * nw + x] = cel[y * W + x];
      W = nw; H = nh; cel = nieuw;
      anker = [Math.min(anker[0], W - 1), Math.min(anker[1], H - 1)];
      $('#edB').value = W; $('#edH').value = H;
      teken(); tekenPreview();
    }
    $('#edB').onchange = () => herschaal(+$('#edB').value, H);
    $('#edH').onchange = () => herschaal(W, +$('#edH').value);
    $('#edSpiegel').onclick = () => {
      const n = cel.slice();
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) n[y * W + x] = cel[y * W + (W - 1 - x)];
      cel = n; anker = [W - 1 - anker[0], anker[1]];
      teken(); tekenPreview();
    };
    $('#edWissen').onclick = () => { cel.fill(null); bewerktId = null; teken(); tekenPreview(); };
    document.querySelectorAll('[data-schuif]').forEach(b => b.onclick = () => {
      const [dx, dy] = b.dataset.schuif.split(',').map(Number);
      const s = schuif[staat.char];
      s[0] += dx; s[1] += dy;
      teken(); tekenPreview();
    });
    document.querySelectorAll('#gereedschap button').forEach(b => b.onclick = () => {
      gereedschap = b.dataset.tool;
      document.querySelectorAll('#gereedschap button').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    });
    ['#edAnker', '#edLaag', '#edToon'].forEach(s => $(s).addEventListener('change', tekenPreview));
    $('#edSlot').addEventListener('change', () => { $('#edAnker').value = STANDAARD_ANKER[$('#edSlot').value]; tekenPreview(); });

    function tekenPalet() {
      const p = $('#edPalet'), t = $('#edTinten');
      p.replaceChildren(); t.replaceChildren();
      for (const [naam, hex] of Object.entries(D.palet)) {
        const b = document.createElement('button');
        b.className = 'sw'; b.title = naam; b.style.background = hex; b.setAttribute('aria-label', 'Kleur ' + naam);
        b.setAttribute('aria-pressed', String(kleur === hex));
        b.onclick = () => { kleur = hex; basisKleur = naam; kiesPotlood(); tekenPalet(); };
        p.append(b);
      }
      for (const hex of D.rampen[basisKleur].stops) {
        const b = document.createElement('button');
        b.className = 'sw'; b.title = `${basisKleur} ${hex}`; b.style.background = hex;
        b.setAttribute('aria-label', 'Tint ' + hex);
        b.setAttribute('aria-pressed', String(kleur === hex));
        b.onclick = () => { kleur = hex; kiesPotlood(); tekenPalet(); };
        t.append(b);
      }
    }
    function kiesPotlood() {
      if (gereedschap === 'gum' || gereedschap === 'ankerpunt') document.querySelector('[data-tool="potlood"]').click();
    }

    function heeftPixels() { return cel.some(Boolean); }
    // Het ontwerp als item (soort 'pixels': rijen tekens + kleuren + anker), in het gekozen slot.
    function alsItem(id) {
      const letters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      const naarLetter = new Map(), kleuren = {};
      const palNaam = Object.fromEntries(Object.entries(D.palet).map(([n, h]) => [h, n]));
      const pixels = [];
      for (let y = 0; y < H; y++) {
        let rij = '';
        for (let x = 0; x < W; x++) {
          const k = cel[y * W + x];
          if (!k) { rij += '.'; continue; }
          if (!naarLetter.has(k)) {
            const l = letters[naarLetter.size % letters.length];
            naarLetter.set(k, l); kleuren[l] = palNaam[k] || k;
          }
          rij += naarLetter.get(k);
        }
        pixels.push(rij);
      }
      return {
        id: id || bewerktId || 'ontwerp', soort: 'pixels', slot: $('#edSlot').value,
        naam: $('#edNaam').value.trim() || 'Mijn item',
        anker: $('#edAnker').value, laag: $('#edLaag').value, ankerpunt: anker.slice(),
        kijkrichting: richting, herkomst: 'eigen (zelf getekend)', kleuren, pixels,
        verschuiving: JSON.parse(JSON.stringify(schuif)),
      };
    }
    function laad(acc, scroll = true) {
      const r = accRaster(acc);
      W = r.w; H = r.h; cel = r.cel.slice();
      anker = acc.ankerpunt.slice();
      richting = acc.kijkrichting || 'rechts';
      $('#edB').value = W; $('#edH').value = H;
      $('#edNaam').value = acc.bron === 'import' || acc.soort === 'pixels' ? acc.naam : acc.naam + ' (kopie)';
      $('#edSlot').value = acc.slot || 'accessoire';
      $('#edAnker').value = acc.anker || STANDAARD_ANKER[$('#edSlot').value]; $('#edLaag').value = acc.laag || 'voor';
      schuif = { hidde: [0, 0], tessie: [0, 0], ...(acc.verschuiving || {}) };
      bewerktId = eigenAcc.some(a => a.id === acc.id) ? acc.id : null;
      $('#edToon').checked = true;
      teken(); alles();
      if (scroll) $('#editorKaart').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    // Kopie van een getekend kastitem: de pixels van dit lichaam, uitgesneden rond hun vorm.
    function laadItem(it, fid) {
      const kl = looks[fid][it.slot] && looks[fid][it.slot].item === it.id ? looks[fid][it.slot].kleur : it.kleuren[0];
      const img = F.verkleurItem(it, fid, 'native', kl), d = img.data;
      let x0 = 99, y0 = 999, x1 = -1, y1 = -1;
      for (let y = 0; y < img.height; y++) for (let x = 0; x < img.width; x++) if (d[(y * img.width + x) * 4 + 3]) {
        x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
      }
      if (x1 < 0) return;
      x1 = Math.min(x1, x0 + 39); y1 = Math.min(y1, y0 + 47);
      const ankNaam = it.slot === 'hoofd' ? 'kruin' : it.id === 'bril' ? 'ogen' : 'nek';
      const [ax, ay] = D.characters[fid].ankers[ankNaam], hex = v => v.toString(16).padStart(2, '0');
      const rijen = [], kleuren = {}, codes = new Map();
      for (let y = y0; y <= y1; y++) {
        let rij = '';
        for (let x = x0; x <= x1; x++) {
          const i = (y * img.width + x) * 4;
          if (!d[i + 3]) { rij += '.'; continue; }
          const k = '#' + hex(d[i]) + hex(d[i + 1]) + hex(d[i + 2]);
          if (!codes.has(k)) { const l = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'[codes.size % 52]; codes.set(k, l); kleuren[l] = k; }
          rij += codes.get(k);
        }
        rijen.push(rij);
      }
      laad({ id: null, naam: it.naam, slot: it.slot, anker: ankNaam, laag: 'voor', ankerpunt: [ax - x0, ay - y0],
        kijkrichting: D.characters[fid].kijkrichting, kleuren, pixels: rijen });
    }
    $('#edOpslaan').onclick = () => {
      if (!heeftPixels()) return;
      const a = alsItem(bewerktId || 'eigen-' + Date.now());
      eigenAcc = eigenAcc.filter(x => x.id !== a.id).concat([a]);
      schrijf(OPSLAG.acc, eigenAcc);
      bewerktId = a.id;
      registreer();
      for (const f of CHARS) looks[f][a.slot] = { item: a.id };
      $('#edToon').checked = false;
      staat.slot = a.slot; staat.gekozen = a.id;
      alles();
    };
    $('#edPng').onclick = () => {
      if (!heeftPixels()) return;
      const c = document.createElement('canvas');
      c.width = W; c.height = H;
      const ctx = c.getContext('2d');
      cel.forEach((k, i) => { if (k) { ctx.fillStyle = k; ctx.fillRect(i % W, Math.floor(i / W), 1, 1); } });
      c.toBlob(b => download(slug($('#edNaam').value || 'item') + '.png', b));
    };
    $('#edJson').onclick = () => download(slug($('#edNaam').value || 'item') + '.json',
      new Blob([JSON.stringify(alsItem(), null, 2)], { type: 'application/json' }));
    $('#edImport').onchange = e => {
      const f = e.target.files[0];
      if (!f) return;
      const r = new FileReader();
      r.onload = () => {
        try {
          const a = JSON.parse(r.result);
          if (!Array.isArray(a.pixels) || !a.kleuren || !Array.isArray(a.ankerpunt)) throw new Error('geen item');
          a.bron = 'import'; a.anker = a.anker || 'kruin';
          laad(a);
          $('#edNaam').value = a.naam || 'Import';
        } catch (err) { if (window.PQUI) window.PQUI.fout('Dit bestand is geen item-JSON.'); else $('#edNaam').value = 'Geen item-JSON'; }
      };
      r.readAsText(f);
      e.target.value = '';
    };
    window.addEventListener('resize', teken);
    return { teken, tekenPalet, heeftPixels, alsItem, laad, laadItem };
  })();

  // ---------- van het blad ----------
  function tekenBlad() {
    const box = $('#figuren');
    if (!box) return;
    box.replaceChildren();
    for (const f of D.figuurvarianten) {
      const fig = document.createElement('figure');
      const img = new Image();
      img.src = '../assets/' + f.bestanden.bron;
      img.alt = f.naam;
      img.style.width = Math.round(f.afmetingen.bron[0] / f.bronpx_per_artpixel * 2) + 'px';
      img.width = Math.round(f.afmetingen.bron[0] / f.bronpx_per_artpixel * 2);
      fig.append(img);
      fig.insertAdjacentHTML('beforeend', `<figcaption><b>${f.naam}</b><span class="label blad">uitgesneden</span><br>${f.beperking}</figcaption>`);
      box.append(fig);
    }
    const ib = $('#items');
    ib.replaceChildren();
    for (const it of D.items) {
      const fig = document.createElement('figure');
      const img = new Image();
      img.src = '../assets/' + it.bestanden.native;
      img.alt = it.naam;
      img.style.width = img.style.height = '72px';
      fig.append(img);
      fig.insertAdjacentHTML('beforeend', `<figcaption><b>${it.naam}</b></figcaption>`);
      ib.append(fig);
    }
  }

  // ---------- hulp ----------
  function knop(tekst, fn) {
    const b = document.createElement('button');
    b.className = 'knop mini'; b.textContent = tekst; b.onclick = fn;
    return b;
  }
  function escape(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
  function slug(s) { return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'export'; }
  function download(naam, blob) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = naam;
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }

  function alles() {
    document.querySelectorAll('#charKeuze button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.char === staat.char)));
    $('#variant').value = staat.variant;
    $('#achtergrond').value = staat.achtergrond;
    registreer();
    tekenPreview(); tekenSlotTabs(); tekenRooster(); tekenDetail(); tekenCatalogus(); tekenEigenOutfits(); ed.teken();
    bewaar();
  }
  window.PQ_KLEDINGKAST = { alles: () => alles(), herlaad: () => { herlaad(); alles(); }, char: () => staat.char,
    zetChar: f => { staat.char = f; staat.gekozen = null; alles(); }, klaar: null };

  document.querySelectorAll('#charKeuze button').forEach(b => b.onclick = () => { staat.char = b.dataset.char; staat.gekozen = null; alles(); });
  $('#variant').onchange = e => { staat.variant = e.target.value; alles(); };
  $('#achtergrond').onchange = e => { staat.achtergrond = e.target.value; tekenPreview(); bewaar(); };
  $('#toonAnkers').onchange = () => tekenPreview();
  $('#naarOrigineel').onclick = () => {
    for (const f of CHARS) looks[f] = F.standaardLook(f);
    pas = null; staat.outfitNaam = 'Startkast'; alles();
  };
  $('#exportPreview').onclick = () => $('#preview').toBlob(b => download(`${staat.char}-${slug(staat.outfitNaam)}.png`, b));

  // Controles: JS-recolor = Python-recolor (zones), en tekenLook = tools/kast.py samenstel() (lagen).
  async function controle() {
    const c = D.controle;
    if (!$('#pariteit')) return;
    if (c) {
      const verwacht = await laadBeeld(c.verwacht);
      const o = D.catalogus.find(x => x.id === c.outfit);
      const js = verkleur(c.character, c.variant, o[c.character]);
      let max = 0;
      for (let i = 0; i < js.data.length; i++) max = Math.max(max, Math.abs(js.data[i] - verwacht.data[i]));
      $('#pariteit').textContent = `Controle recolor JS = Python (${o.naam}, ${c.character}, ${c.variant}): ` +
        (max <= 1 ? `OK, max verschil ${max}` : `AFWIJKING, max verschil ${max}`);
    }
    if (KAST && KAST.controle) {
      const delen = [];
      for (const [fid, look] of Object.entries(KAST.controle.look)) {
        const verwacht = await laadBeeld(KAST.controle.verwacht[fid]);
        const cv = document.createElement('canvas');
        tekenLook(cv, fid, 'native', look);
        const js = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
        let max = 0, n = 0;
        for (let i = 0; i < js.length; i += 4) {
          let d = 0;
          for (let k = 0; k < 4; k++) d = Math.max(d, Math.abs(js[i + k] - verwacht.data[i + k]));
          if (d > 1) n++;
          max = Math.max(max, d);
        }
        delen.push(`${fid} ${n === 0 ? 'OK' : `AFWIJKING ${n} px`} (max ${max})`);
      }
      $('#pariteitLook').textContent = 'Controle lagen tekenLook = kast.py: ' + delen.join(', ');
      if (window.PQ_TEST) window.PQ_TEST.info.lagen = delen.join(', ');
    }
  }

  // Directe link naar een toestand, bv.
  // ?char=tessie&variant=native&slot=hoofd&bezit=alles&hlook=hoofd:beanie:mos,jas:regenjas&tlook=hoofd:baret:nacht
  function uitAdres() {
    const q = new URLSearchParams(location.search);
    if (CHARS.includes(q.get('char'))) staat.char = q.get('char');
    if (['bron', 'native'].includes(q.get('variant'))) staat.variant = q.get('variant');
    if (F.SLOTS.includes(q.get('slot'))) { staat.slot = q.get('slot'); staat.gekozen = null; }
    if (q.get('bezit') === 'alles') for (const f of CHARS) for (const it of KAST.items) bezit[f][it.id] = it.kleuren.slice();
    if (q.get('bezit') === 'start') for (const f of CHARS) bezit[f] = startBezit(f);
    const o = D.catalogus.find(x => x.id === q.get('outfit'));
    if (o) { for (const f of CHARS) looks[f] = lookUitZones(f, o[f]); staat.outfitNaam = o.naam; }
    for (const [p, f] of [['hlook', 'hidde'], ['tlook', 'tessie'], ['look', staat.char]]) {
      if (!q.has(p)) continue;
      if (p !== 'look' || !q.has(f[0] + 'look')) looks[f] = F.standaardLook(f);
      for (const deel of q.get(p).split(',').filter(Boolean)) {
        const [slot, id, kleur] = deel.split(':'), it = itemVan(id);
        if (!it || it.slot !== slot) continue;
        looks[f][slot] = { item: id, kleur: kleur || it.kleuren[0] };
        if (!isEigen(id)) bezit[f][id] = [...new Set([...(bezit[f][id] || []), looks[f][slot].kleur])];   // testlink: in bezit
      }
      staat.outfitNaam = 'Eigen look';
    }
    if (q.has('ankers')) $('#toonAnkers').checked = true;
    if (q.has('kies')) staat.gekozen = q.get('kies');
    return q.get('bewerk');
  }

  laadAlles().then(() => {
    registreer();
    ed.tekenPalet();
    const bewerk = uitAdres();
    alles();
    const bi = bewerk && itemVan(bewerk);
    if (bi) bi.soort === 'pixels' ? ed.laad(bi, false) : ed.laadItem(bi, staat.char);
    tekenBlad();
    if (window.PQ_TEST) window.PQ_TEST.info.items = `${KAST.items.length} in catalogus, ${KAST.items.filter(i => i.status === 'klaar').length} getekend`;
    return controle();
  }).then(() => { if (window.PQ_KLEDINGKAST.klaar) window.PQ_KLEDINGKAST.klaar(); })
    .catch(e => { if ($('#pariteit')) $('#pariteit').textContent = 'Laden mislukt: ' + e; if (window.PQ_TEST) window.PQ_TEST.fouten.push('kast: ' + e); console.error(e); });
})();
