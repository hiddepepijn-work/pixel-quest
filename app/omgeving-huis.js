// Omgeving op de huispagina: houdt de omgevingsstatus bij (elke minuut opnieuw berekend), haalt het weer op,
// tekent de bediening (weer, seizoen, plaats, altijd dag, feestdagen), de weerdeeltjes, het event-decor in huis en
// de nachtplekjes van de pets. Leest PQ_OMGEVING, PQ_OMGEVINGTEKEN, PQ_HUIS en PQ_HUISMODEL.
// Testadres: huis.html?test&schoon&datum=2026-12-10&uur=20&weer=sneeuw&seizoen=winter&stad=rotterdam&dagnacht=0
window.PQ_OMGEVINGHUIS = (function (OG, OT, H, HM) {
  'use strict';
  const q = new URLSearchParams(location.search);
  const SCHOON = q.has('schoon');
  const rustig = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const inst = SCHOON ? JSON.parse(JSON.stringify(OG.STANDAARD)) : OG.leesInstellingen();
  // URL-overrides (niet opgeslagen)
  const tijdelijk = {};
  if (q.has('weer')) tijdelijk.weer = q.get('weer');
  if (q.has('seizoen')) tijdelijk.seizoen = q.get('seizoen');
  if (q.has('dagnacht')) tijdelijk.altijdDag = q.get('dagnacht') === '0';
  if (q.has('stad')) tijdelijk.stad = q.get('stad');
  if (q.get('autokleding') === '0') inst.autoKleding = { hidde: false, tessie: false };
  let record = null, status = null, dd = null, sleutel = '', opnieuw = () => {};
  let lichtSleutel = '', lichtAnders = false, lichtOpnieuw = () => {};

  // Het moment waarvoor we rekenen: de klok, of ?datum=JJJJ-MM-DD en/of ?uur=HH (ook 20.5) of ?tijd=HH:MM.
  function nu() {
    const d = new Date();
    if (q.has('datum')) {
      const [j, m, dg] = q.get('datum').split('-').map(Number);
      if (j && m && dg) d.setFullYear(j, m - 1, dg);
    }
    let uur = null;
    if (q.has('tijd')) { const [h, mi] = q.get('tijd').split(':').map(Number); uur = h + (mi || 0) / 60; }
    else if (q.has('uur')) uur = +q.get('uur');
    if (uur != null && Number.isFinite(uur)) d.setHours(Math.floor(uur), Math.round((uur % 1) * 60), 0, 0);
    return d;
  }
  const effectief = () => Object.assign({}, inst, tijdelijk, { events: inst.events });
  function bereken() {
    const e = effectief(), plek = OG.plekVan(e);
    status = OG.bereken({ datum: nu(), lat: plek.lat, lon: plek.lon, weer: record, instellingen: e });
    status.plek = plek.naam;
    dd = OT.dagdeel(status);
    // Alleen opnieuw tekenen als er iets zichtbaars verandert.
    const s = [status.licht.fase, status.licht.lampen, status.weer.type, status.seizoen.naam, status.sneeuwlaag, status.events.join()].join('|');
    const anders = s !== sleutel;
    sleutel = s;
    // Vloeiend verloop: lucht, zon, maan, tint en lampsterkte schuiven elke minuut een beetje. Dan alleen het decor en
    // het licht opnieuw (de lopers en pets blijven doorlopen).
    const r = (v, n) => (v == null ? '' : Math.round(v * n));
    const ls = [r(dd.mengsel, 64), r(dd.sterkte, 200), r(dd.lampSterkte, 40), r(dd.sterNiveau, 20), dd.tint,
      dd.zonStand ? r(dd.zonStand.azimut, 2) + ',' + r(dd.zonStand.hoogte, 2) : '', dd.maanStand ? r(dd.maanStand.azimut, 1) + ',' + r(dd.maanStand.hoogte, 1) : ''].join('|');
    lichtAnders = ls !== lichtSleutel;
    lichtSleutel = ls;
    return anders;
  }
  function bewaar() { if (!SCHOON) OG.bewaarInstellingen(inst); }

  // Start: status berekenen, weer ophalen (als fetch werkt), en elke minuut opnieuw rekenen.
  function start(teken, lichtTeken) {
    opnieuw = teken;
    if (lichtTeken) lichtOpnieuw = lichtTeken;
    const plek = OG.plekVan(effectief());
    record = SCHOON ? null : OG.leesWeerCache(plek.lat, plek.lon);
    bereken();
    haal();
    setInterval(() => { if (bereken()) opnieuw(); else { if (lichtAnders) lichtOpnieuw(); toonStatus(); } }, 6e4);
    setInterval(haal, 20 * 6e4);
  }
  async function haal() {
    const e = effectief();
    if (e.weer && e.weer !== 'echt') return;          // test-weer: niet ophalen
    if (q.has('geenweer')) return;
    const plek = OG.plekVan(e);
    const r = await OG.haalWeer(plek.lat, plek.lon);
    if (r && (!record || r.tijd !== record.tijd)) { record = r; if (bereken()) opnieuw(); else toonStatus(); }
  }
  function tijd(ms) {
    return ms ? new Date(ms).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' }) : '–';
  }
  function statusTekst() {
    if (!status) return '';
    const w = status.weer, t = w.temp_c != null ? ` ${Math.round(w.temp_c)} °C` : '';
    const bron = w.bron === 'open-meteo' ? '' : w.bron === 'test' ? ' (test)' : ' (geen weerdata)';
    return `${status.plek} · ${OT.FASENAAM[status.licht.fase]} · ${OT.WEERNAAM[w.type]}${t}${bron} · ${status.seizoen.naam} · ` +
      `zon op ${tijd(status.licht.op)}, onder ${tijd(status.licht.onder)}` + (status.events.length ? ' · ' + status.events.join(', ') : '');
  }
  function toonStatus() {
    const e = document.getElementById('omgevingStatus');
    if (e) e.textContent = statusTekst();
  }

  // ---------- bediening in de balk ----------
  // In #omgevingBalk: weerkiezer, seizoenkiezer, plaats (stad of eigen lat/lon), altijd dag, feestdagen, status.
  function bediening(box) {
    if (!box) return;
    const el = (tag, attrs, tekst) => { const e = document.createElement(tag); Object.assign(e, attrs || {}); if (tekst != null) e.textContent = tekst; return e; };
    const kiezer = (label, id, opties, waarde, wijzig) => {
      const l = el('label', null, label + ' '), s = el('select', { id });
      for (const [v, t] of opties) s.append(new Option(t, v));
      s.value = waarde;
      s.onchange = () => wijzig(s.value);
      l.appendChild(s);
      return l;
    };
    const vink = (label, id, aan, wijzig) => {
      const l = el('label', { className: 'vink' }), c = el('input', { type: 'checkbox', id, checked: !!aan });
      c.onchange = () => wijzig(c.checked);
      l.append(c, ' ' + label);
      return l;
    };
    const klaar = () => { bewaar(); bereken(); opnieuw(); };
    const e = effectief();
    box.textContent = '';
    box.appendChild(kiezer('Weer:', 'omgWeer', [['echt', 'echt'], ['helder', 'helder'], ['bewolkt', 'bewolkt'], ['regen', 'regen'], ['sneeuw', 'sneeuw']],
      e.weer || 'echt', v => { inst.weer = v; delete tijdelijk.weer; klaar(); if (v === 'echt') haal(); }));
    box.appendChild(kiezer('Seizoen:', 'omgSeizoen', [['echt', 'op datum'], ['lente', 'lente'], ['zomer', 'zomer'], ['herfst', 'herfst'], ['winter', 'winter']],
      e.seizoen || 'echt', v => { inst.seizoen = v; delete tijdelijk.seizoen; klaar(); }));
    const steden = OG.STEDEN.map(s => [s.id, s.naam]).concat([['eigen', 'eigen lat/lon']]);
    const isStad = OG.STEDEN.some(s => s.id === e.stad);
    const eigen = el('span', { className: 'eigenplek', hidden: isStad });
    const lat = el('input', { type: 'number', step: '0.01', min: -90, max: 90, value: e.lat, ariaLabel: 'Breedtegraad', className: 'getal' });
    const lon = el('input', { type: 'number', step: '0.01', min: -180, max: 180, value: e.lon, ariaLabel: 'Lengtegraad', className: 'getal' });
    const ok = el('button', { className: 'knop mini', type: 'button' }, 'OK');
    ok.onclick = () => { inst.stad = 'eigen'; inst.lat = +lat.value; inst.lon = +lon.value; record = null; klaar(); haal(); };
    eigen.append(lat, lon, ok);
    const plaats = kiezer('Plaats:', 'omgStad', steden, isStad ? e.stad : 'eigen', v => {
      eigen.hidden = v !== 'eigen';
      delete tijdelijk.stad;
      if (v === 'eigen') return;
      inst.stad = v; const s = OG.STEDEN.find(x => x.id === v); inst.lat = s.lat; inst.lon = s.lon;
      record = SCHOON ? null : OG.leesWeerCache(s.lat, s.lon); klaar(); haal();
    });
    plaats.appendChild(eigen);
    box.appendChild(plaats);
    box.appendChild(vink('Altijd dag', 'omgDag', e.altijdDag, v => { inst.altijdDag = v; delete tijdelijk.altijdDag; klaar(); }));
    const feest = el('details', { className: 'feestkeuze' });
    feest.appendChild(el('summary', null, 'Feestdagen'));
    feest.appendChild(vink('Sinterklaas', 'omgSint', inst.events.sinterklaas !== false, v => { inst.events.sinterklaas = v; klaar(); }));
    feest.appendChild(vink('Kerst', 'omgKerst', inst.events.kerst !== false, v => { inst.events.kerst = v; klaar(); }));
    feest.appendChild(vink('Kerstsfeer-sneeuw (20 dec – 6 jan)', 'omgKerstsfeer', inst.kerstsfeer !== false, v => { inst.kerstsfeer = v; klaar(); }));
    box.appendChild(feest);
    // Automatische weerkleding per persoon (regenjas bij regen, puffer/beanie/sjaal bij sneeuw of vorst; alleen wat je hebt)
    const auto = el('details', { className: 'feestkeuze' });
    auto.appendChild(el('summary', null, 'Weerkleding'));
    for (const [fid, naam] of [['hidde', 'Hidde'], ['tessie', 'Tessie']]) {
      auto.appendChild(vink(naam, 'omgAuto_' + fid, inst.autoKleding[fid] !== false, v => { inst.autoKleding[fid] = v; klaar(); }));
    }
    box.appendChild(auto);
    box.appendChild(el('span', { className: 'noot omgevingstatus', id: 'omgevingStatus' }, statusTekst()));
  }

  // ---------- event-decor en nachtdoek: plek zoeken op de vloer ----------
  const M = H.maten;
  function bezet(k, inrichting, extra) {
    const uit = (k.blok || []).slice();
    for (const i of inrichting) {
      const d = H.meubels[i.soort];
      if (i.kamer === k.id && d && d.op === 'vloer') { const m = HM.maat(i.soort); uit.push([i.x, i.x + m.b]); }
    }
    for (const e of extra) if (e.kamer === k.id && e.vloer) uit.push([e.kx, e.kx + e.w]);
    return uit;
  }
  // Vrije x (binnen de kamer, 2 artpx marge) zo dicht mogelijk bij wens; null als er geen plek is.
  function vrijeX(k, b, wens, lijst, marge = 2) {
    let beste = null;
    for (let x = 0; x <= k.b - b; x += 2) {
      if (lijst.some(([p, e]) => x < e + marge && p < x + b + marge)) continue;
      if (beste == null || Math.abs(x - wens) < Math.abs(beste - wens)) beste = x;
    }
    return beste;
  }
  // Radiatoren onder klassieke ramen (zoals huis-teken.js ze tekent): de "kachel" voor de schoen.
  function radiatorX(geo, k) {
    if (geo.huis.stijl === 'modern') return null;
    const v = k.y + k.h - M.vloer - M.plint;
    const r = k.ramen.find(r => v - (k.y + (r.y != null ? r.y : M.raam_y) + (r.h || M.raam_h)) >= 38 && r.b >= 24);
    return r ? r.x + Math.round(r.b / 2) - 8 : null;
  }
  // Lijst met event-items en het nachtdoek: { soort, x, y (scene-artpx, linksboven), w, h, z, canvas }.
  // Lichtpunten (kerstboom) gaan in geo._lichten, dus aanroepen na tekenDecor en vóór tekenLicht.
  // Kerstboom: een vrij vak; anders achter een laag meubel (bank, bed, tafel), op een plek waar Hidde en Tessie
  // er niet voor staan (mijden: [{ kamer, x }] voetankers van de bewoners).
  const LAAG = ['bank', 'loungebank', 'bed', 'logeerbed', 'salontafel', 'tafel', 'bureau', 'wasmand'];
  function boomPlek(kamers, inrichting, uit, mijden) {
    for (const k of kamers) {
      const x = vrijeX(k, 32, k.b - 60, bezet(k, inrichting, uit), 1);
      if (x != null) return { k, x, z: 2 };
    }
    let beste = null;
    for (const k of kamers) {
      const mensen = (mijden || []).filter(m => m.kamer === k.id).map(m => m.x);
      for (const it of inrichting.filter(i => i.kamer === k.id && LAAG.includes(i.soort))) {
        const m = HM.maat(it.soort);
        if (m.h > 44) continue;
        for (let x = it.x - 8; x <= it.x + m.b - 24; x += 2) {
          if (x < 0 || x > k.b - 32) continue;
          const score = mensen.reduce((s, mx) => s + Math.max(0, 34 - Math.abs(x + 16 - mx)), 0) + Math.abs(x - (k.b - 60)) / 100;
          if (!beste || score < beste.score) beste = { k, x, z: 1, score };
        }
      }
    }
    return beste;
  }
  function plaatsExtra(geo, inrichting, mijden) {
    if (!status) return [];
    const uit = [], aan = !!dd.lampen, ev = status.events;
    const zet = (soort, k, kx, y, z, vloer) => {
      const s = OT.sprite(soort, aan);
      const it = { soort, kamer: k.id, kx, w: s.w, h: s.h, x: k.x + kx, y: y - s.h, z, vloer, canvas: s.canvas };
      for (const l of s.lichten) (geo._lichten = geo._lichten || []).push({ x: it.x + l.x, y: it.y + l.y, r: l.r, kleur: l.kleur });
      uit.push(it);
      return it;
    };
    const woon = ['woonkamer', 'woonkeuken', 'keuken', 'werkkamer', 'slaapkamer', 'slaaphoek', 'master'];
    const kamers = woon.map(t => geo.kamers.find(k => k.type === t)).filter(Boolean);
    if (ev.includes('kerst') && kamers.length) {
      const b = boomPlek(kamers, inrichting, uit, mijden);
      if (b) zet('kerstboom', b.k, b.x, b.k.vloerY, b.z, b.z === 2);
      else zet('kerstboom', kamers[0], Math.max(0, kamers[0].b - 60), kamers[0].vloerY + 3, 3, true);
    }
    if (ev.includes('sinterklaas') && kamers.length) {
      const k = kamers[0], wens = radiatorX(geo, k);
      let x = vrijeX(k, 16, wens != null ? wens : k.b / 2, bezet(k, inrichting, uit));
      const sch = zet('schoen', k, x != null ? x : (wens || 0), k.vloerY + (x != null ? 0 : 3), x != null ? 2 : 3, true);
      const tafel = inrichting.find(i => i.kamer === k.id && i.soort === 'salontafel');
      if (tafel) zet('pepernoten', k, tafel.x + 17, k.vloerY + 3 - HM.maat('salontafel').h, 4, false);
      else {
        x = vrijeX(k, 14, sch.kx + 20, bezet(k, inrichting, uit));
        zet('pepernoten', k, x != null ? x : sch.kx + 18, k.vloerY + (x != null ? 0 : 3), x != null ? 2 : 3, true);
      }
    }
    // Nachtdoek over het vogelstokje, als de parkiet erop zit.
    const parkiet = H.pets.find(p => p.id === 'parkietje' && p.plek);
    const stok = parkiet && inrichting.find(i => i.id === parkiet.plek[0]);
    const ks = stok && geo.kamers.find(k => k.id === stok.kamer);
    if (status.licht.fase === 'nacht' && ks) {
      const top = ks.vloerY - stok.y - HM.maat(stok.soort).h;
      zet('doek', ks, stok.x + 7 - 11, top + 15, 3, false);
    }
    return uit;
  }
  function zetExtra(laag, lijst, Z) {
    for (const it of lijst) {
      const e = document.createElement('div');
      e.className = 'omgevingitem ' + it.soort;
      e.setAttribute('aria-hidden', 'true');
      Object.assign(e.style, { left: it.x * Z + 'px', top: it.y * Z + 'px', width: it.w * Z + 'px', height: it.h * Z + 'px', zIndex: it.z });
      it.canvas.style.width = '100%'; it.canvas.style.height = '100%';
      e.appendChild(it.canvas);
      laag.appendChild(e);
    }
  }
  // Nachtplek van een pet: de kat slaapt 's nachts in de petmand (of op het bed als er nog geen mand is).
  // Geeft het voetanker in scene-artpx, of null (dan gewoon het eigen plekje).
  function petPlek(p, geo, inrichting) {
    if (!status || status.licht.fase !== 'nacht' || p.id !== 'katje') return null;
    for (const [soort, dx, dy] of [['mand', 16, 8], ['bed', 80, 26]]) {
      const it = inrichting.find(i => i.soort === soort && !i.voorbeeld), k = it && geo.kamers.find(x => x.id === it.kamer);
      if (k) return { x: k.x + it.x + dx, y: k.vloerY - dy };
    }
    return null;
  }

  // ---------- weerdeeltjes op een eigen canvas boven de scène (max ~150) ----------
  // Regen: schuine strepen (schuiner bij wind), sneeuw: dwarrelende vlokken, herfst: vallende blaadjes, lente:
  // bloesemblaadjes. Niet in de kamers (binnen regent het niet). Minder beweging: geen deeltjes, alleen het
  // stilstaande weerbeeld (dat staat al op het decor: lucht, druppels op het glas, plassen, sneeuwlaag).
  let anim = null;
  // o: { max (hooguit zoveel deeltjes), interval (ms per beeld; standaard 33 = ~30 per seconde) }
  function deeltjes(canvas, geo, Z, o) {
    o = o || {};
    if (anim) { cancelAnimationFrame(anim); anim = null; }
    if (!canvas || !status) return;
    canvas.width = geo.W; canvas.height = geo.H;
    canvas.style.width = geo.W * Z + 'px'; canvas.style.height = geo.H * Z + 'px';
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, geo.W, geo.H);
    const w = status.weer.type, s = status.seizoen.naam;
    // Bloesemblaadjes alleen in april (of met Seizoen: lente) en alleen vanuit de kersenbomen (huis-bomen.js).
    const kersen = (geo._bomen || []).filter(b => b.soort === 'kers');
    const april = nu().getMonth() === 3 || effectief().seizoen === 'lente';
    const soort = w === 'regen' ? 'regen' : w === 'sneeuw' ? 'sneeuw' : s === 'herfst' ? 'blad' : s === 'lente' && april && kersen.length ? 'bloesem' : null;
    canvas.dataset.soort = soort || '';
    if (!soort || rustig) return;
    const binnen = geo.kamers.filter(k => !k.buiten).map(k => [k.box.x, k.y - M.vloerplaat, k.box.x + k.box.b + M.muur, k.y + k.h]);
    const isBinnen = (x, y) => binnen.some(([a, b, c, d]) => x >= a && x < c && y >= b && y < d);
    const max = Math.min(o.max || 150, soort === 'regen' ? Math.min(150, Math.round(geo.W / 6)) : soort === 'sneeuw' ? Math.min(150, Math.round(geo.W / 8)) : 14);
    const wind = Math.min(60, status.weer.wind_kmh || 8), nacht = status.licht.fase === 'nacht';
    const KL = { regen: [nacht ? 'nacht.3' : 'petrol.4'], sneeuw: ['creme.4'], blad: ['koraal.2', 'abrikoos.2', 'goud.3'], bloesem: ['koraal.4', 'creme.4'] }[soort];
    const kleur = KL.map(k => HM.kleur(k));
    const uitKers = () => { const k = kersen[Math.floor(Math.random() * kersen.length)]; return [k.x + (Math.random() - 0.5) * 2 * k.rx, k.y + (Math.random() - 0.4) * k.ry]; };
    const nieuw = (top) => soort === 'bloesem' ? (([x, y]) => ({ x, y, v: 0.12 + Math.random() * 0.14, f: Math.random() * 6.28, k: Math.floor(Math.random() * kleur.length), g: 1 }))(uitKers()) : ({
      x: Math.random() * (geo.W + 60), y: top ? -4 - Math.random() * 30 : Math.random() * geo.grondY,
      v: soort === 'regen' ? 6 + Math.random() * 3 : soort === 'sneeuw' ? 0.5 + Math.random() * 0.6 : 0.35 + Math.random() * 0.3,
      f: Math.random() * 6.28, k: Math.floor(Math.random() * kleur.length), g: Math.random() < 0.3 ? 2 : 1,
    });
    const lijst = Array.from({ length: max }, () => nieuw(false));
    const vx = soort === 'regen' ? -(1 + wind / 18) : -(0.2 + wind / 60);
    let vorige = 0;
    const stap = t => {
      anim = requestAnimationFrame(stap);
      if (document.hidden || t - vorige < (o.interval || 33)) return;      // standaard ~30 beelden per seconde
      vorige = t;
      ctx.clearRect(0, 0, geo.W, geo.H);
      ctx.globalAlpha = soort === 'regen' ? 0.75 : 1;
      for (const d of lijst) {
        d.y += d.v;
        d.x += soort === 'regen' ? vx : vx + Math.sin(t / 700 + d.f) * (soort === 'sneeuw' ? 0.35 : 0.6);
        if (d.y > geo.grondY || d.x < -8) Object.assign(d, nieuw(true));
        if (isBinnen(d.x, d.y)) continue;
        ctx.fillStyle = kleur[d.k];
        if (soort === 'regen') for (let i = 0; i < 4; i++) ctx.fillRect(Math.round(d.x - vx * i / d.v), Math.round(d.y - i), 1, 1);
        else if (soort === 'blad') ctx.fillRect(Math.round(d.x), Math.round(d.y), 2, Math.sin(t / 300 + d.f) > 0 ? 1 : 2);
        else ctx.fillRect(Math.round(d.x), Math.round(d.y), d.g, d.g);
      }
      ctx.globalAlpha = 1;
    };
    anim = requestAnimationFrame(stap);
  }

  const autoAan = fid => !inst.autoKleding || inst.autoKleding[fid] !== false;

  return { start, bereken, bediening, nu, autoAan, toonStatus, statusTekst, plaatsExtra, zetExtra, petPlek, deeltjes,
    dagdeel: () => dd, status: () => status, rustig };
})(window.PQ_OMGEVING, window.PQ_OMGEVINGTEKEN, window.PQ_HUIS, window.PQ_HUISMODEL);
