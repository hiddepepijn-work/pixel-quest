// De store van Pixel Quest: één opdrachtenlog waaruit de staat wordt opgebouwd (app-ontwerp §5.2).
//   PQStore.doe(soort, data) -> { ok, id, resultaat } of { ok: false, fout }    (fout in gewone taal)
//   PQStore.staat()          -> de opgebouwde staat (alleen lezen)
//   PQStore.abonneer(fn)     -> fn(opdracht) na elke wijziging; geeft een afmelder terug
// Elke opdracht is { id (uuid), soort, data, door, tijd, v }. Dezelfde id twee keer = één keer uitgevoerd, zodat een
// server later precies hetzelfde log kan ontvangen en naspelen. Er is nog geen server: alles blijft op dit apparaat.
// Opslag: localStorage 'pq-app' = { versie, basis, log }; per apparaat 'pq-apparaat' = { ik, tab, huisZoom, ... }.
(function (wortel) {
  'use strict';
  const VERSIE = 1, SLEUTEL = 'pq-app', APPARAAT = 'pq-apparaat';
  const { VOER } = wortel.PQOpdrachten;
  const kloon = o => JSON.parse(JSON.stringify(o));
  let basis = null, log = [], staat = null, gezien = new Set(), opslagOk = true, laatsteFout = null;
  const luisteraars = new Set();

  function uuid() {
    try { if (wortel.crypto && wortel.crypto.randomUUID) return wortel.crypto.randomUUID(); } catch (e) { /* file:// */ }
    const h = () => Math.floor(Math.random() * 0x10000).toString(16).padStart(4, '0');
    return `${h()}${h()}-${h()}-4${h().slice(1)}-${h()}-${h()}${h()}${h()}`;
  }
  function leesJson(sleutel) { try { return JSON.parse(localStorage.getItem(sleutel) || 'null'); } catch (e) { return null; } }
  function schrijfJson(sleutel, waarde) {
    try { localStorage.setItem(sleutel, JSON.stringify(waarde)); return true; } catch (e) { return false; }
  }

  // ---------- migraties: MIGRATIES[n] zet een bestand van versie n om naar n + 1 ----------
  const MIGRATIES = {};
  const isObj = o => !!o && typeof o === 'object' && !Array.isArray(o);
  function migreer(data) {
    if (!isObj(data) || !isObj(data.basis) || !Array.isArray(data.log)) return null;
    let v = data.versie || 1;
    while (v < VERSIE) { if (!MIGRATIES[v]) return null; data = MIGRATIES[v](data); v = data.versie; }
    return data;
  }
  // Velden die er altijd moeten zijn (ook als een oudere of beschadigde basis ze mist of iets anders bevat).
  function vulAan(st) {
    for (const [k, v] of Object.entries({ taken: {}, afrondingen: [], bedankjes: [], weekdoel: [], afwezig: [], rustweken: [],
      terugblik: {}, voorstellen: [], overnames: 0 })) if (st[k] == null || (typeof st[k]) !== (typeof v) || Array.isArray(st[k]) !== Array.isArray(v)) st[k] = kloon(v);
    for (const [id, t] of Object.entries(st.taken)) {
      if (!isObj(t)) { delete st.taken[id]; continue; }
      t.id = id; t.titel = String(t.titel == null ? 'Taak' : t.titel);
    }
    for (const k of ['afrondingen', 'bedankjes', 'weekdoel', 'afwezig', 'voorstellen']) st[k] = st[k].filter(isObj);
    st.pets = Object.assign({ actief: 'draakje', start: { draakje: 0 }, namen: {} }, isObj(st.pets) ? st.pets : {});
    for (const k of ['start', 'namen']) if (!isObj(st.pets[k])) st.pets[k] = k === 'start' ? { draakje: 0 } : {};
    st.kleding = Object.assign({ bezit: { hidde: {}, tessie: {} }, looks: { hidde: null, tessie: null } }, isObj(st.kleding) ? st.kleding : {});
    if (!isObj(st.kleding.bezit)) st.kleding.bezit = { hidde: {}, tessie: {} };
    if (!isObj(st.kleding.looks)) st.kleding.looks = { hidde: null, tessie: null };
    for (const f of ['hidde', 'tessie']) if (!isObj(st.kleding.bezit[f])) st.kleding.bezit[f] = {};
    st.winkel = isObj(st.winkel) ? st.winkel : {};
    if (!Array.isArray(st.winkel.drops)) st.winkel.drops = [];
    const HM = wortel.PQ_HUISMODEL;
    const huisOk = isObj(st.huis) && st.huis.versie === 3 && Array.isArray(st.huis.inrichting) && Array.isArray(st.huis.doos);
    if (HM && !huisOk) { try { st.huis = HM.normaliseer(isObj(st.huis) ? st.huis : null); } catch (e) { st.huis = HM.normaliseer(null); } }
    afgeleid(st);
    return st;
  }
  // De winkel leidt de startkast en vrijgekomen stel-sets af uit de kast-data (winkel-drops.js), na elke opdracht.
  const afgeleid = st => { if (wortel.PQWinkel && wortel.PQWinkel.afgeleid) wortel.PQWinkel.afgeleid(st); return st; };
  const geldigeOp = op => isObj(op) && typeof op.id === 'string' && typeof op.soort === 'string' && isObj(op.data);

  // ---------- opbouwen ----------
  function pas(st, op) {
    const f = VOER[op.soort];
    if (!f) throw new Error('Deze app-versie kent de opdracht "' + op.soort + '" niet.');
    const uit = f(st, op);
    afgeleid(st);
    return uit;
  }
  function bouw() {
    staat = vulAan(kloon(basis));
    gezien = new Set();
    log = log.filter(geldigeOp);     // rommel in het log (beschadigd bestand) overslaan in plaats van vastlopen
    for (const op of log) {
      gezien.add(op.id);
      try { pas(staat, op); op.mislukt = undefined; } catch (e) { op.mislukt = e.message; }
    }
    spiegel();
  }
  // Een beschadigd bestand wordt letterlijk bewaard als 'pq-app-kapot' (niet weggooien) en de app begint schoon.
  function laad() {
    let ruw = null, data = null;
    try { ruw = localStorage.getItem(SLEUTEL); } catch (e) { /* geen opslag: schoon beginnen */ }
    try { data = migreer(JSON.parse(ruw || 'null')); } catch (e) { data = null; }
    if (data) {
      basis = data.basis; log = data.log;
      try { bouw(); return staat; } catch (e) { data = null; }
    }
    if (ruw) { try { localStorage.setItem('pq-app-kapot', ruw); } catch (e) { /* */ } }
    basis = wortel.PQStart.basis(Date.now()); log = []; bewaar();
    bouw();
    return staat;
  }
  function bewaar() {
    opslagOk = schrijfJson(SLEUTEL, { versie: VERSIE, basis, log });
    return opslagOk;
  }
  // figuur.js (lookVoor) en het huis lezen de look en het bezit van de kledingkast nog uit hun eigen sleutels.
  function spiegel() {
    const k = staat.kleding, look = {};
    for (const f of ['hidde', 'tessie']) if (k.looks[f]) look[f] = k.looks[f];
    schrijfJson('pq-kk-look', look);
    schrijfJson('pq-kk-bezit', k.bezit);
  }

  // ---------- doen ----------
  function doe(soort, data, opties) {
    opties = opties || {};
    const door = opties.namens || ik();
    if (!door) return { ok: false, fout: 'Kies eerst wie je bent.' };
    const op = { id: opties.id || uuid(), soort, data: kloon(data || {}), door, tijd: opties.tijd || Date.now(), v: VERSIE };
    if (gezien.has(op.id)) return { ok: true, id: op.id, dubbel: true };
    const proef = kloon(staat);
    let resultaat;
    try { resultaat = pas(proef, op); } catch (e) { laatsteFout = e.message; return { ok: false, fout: e.message }; }
    staat = proef; log.push(op); gezien.add(op.id);
    bewaar(); spiegel();
    for (const fn of luisteraars) { try { fn(op); } catch (e) { if (wortel.PQ_TEST) wortel.PQ_TEST.fouten.push('luisteraar: ' + e.message); } }
    return { ok: true, id: op.id, resultaat, opgeslagen: opslagOk };
  }
  // Later: opdrachten van de server (of de ander) ontvangen. Al geziene id's worden overgeslagen; de volgorde is die van tijd.
  function ontvang(ops) {
    const nieuw = (ops || []).filter(o => o && o.id && !gezien.has(o.id));
    if (!nieuw.length) return 0;
    log = log.concat(nieuw).sort((a, b) => a.tijd - b.tijd);
    bouw(); bewaar();
    for (const fn of luisteraars) fn({ soort: 'sync', aantal: nieuw.length });
    return nieuw.length;
  }

  // ---------- apparaat (niet gedeeld, niet in het log) ----------
  // Zonder opslag (privévenster) of met rommel in de sleutel onthoudt de app het in het geheugen, tot herladen.
  let apparaatGeheugen = {};
  function apparaat() {
    const a = leesJson(APPARAAT);
    if (isObj(a)) apparaatGeheugen = a;
    return Object.assign({}, apparaatGeheugen);
  }
  const zetApparaat = (k, v) => { const a = apparaat(); a[k] = v; apparaatGeheugen = a; schrijfJson(APPARAAT, a); };
  const ik = () => { const i = apparaat().ik; return i === 'hidde' || i === 'tessie' ? i : null; };
  function reset() {
    for (const k of [SLEUTEL, APPARAAT, 'pq-kk-look', 'pq-kk-bezit', 'pq-huis-staat']) { try { localStorage.removeItem(k); } catch (e) { /* */ } }
    basis = wortel.PQStart.basis(Date.now(), true); log = [];
    bewaar(); bouw();
    for (const fn of luisteraars) fn({ soort: 'reset' });
  }

  wortel.PQStore = {
    laad, doe, ontvang, reset, uuid, VERSIE,
    staat: () => staat, log: () => log, opslagOk: () => opslagOk, laatsteFout: () => laatsteFout,
    abonneer(fn) { luisteraars.add(fn); return () => luisteraars.delete(fn); },
    apparaat, zetApparaat, ik, zetIk: id => zetApparaat('ik', id), ander: () => (ik() === 'tessie' ? 'hidde' : 'tessie'),
    exporteer: () => JSON.stringify({ versie: VERSIE, basis, log }, null, 1),
  };
})(typeof window !== 'undefined' ? window : globalThis);
