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
  function migreer(data) {
    if (!data || typeof data !== 'object' || !data.basis || !Array.isArray(data.log)) return null;
    let v = data.versie || 1;
    while (v < VERSIE) { if (!MIGRATIES[v]) return null; data = MIGRATIES[v](data); v = data.versie; }
    return data;
  }
  // Velden die er altijd moeten zijn (ook als een oudere basis ze mist).
  function vulAan(st) {
    for (const [k, v] of Object.entries({ taken: {}, afrondingen: [], bedankjes: [], weekdoel: [], afwezig: [], rustweken: [],
      terugblik: {}, voorstellen: [], overnames: 0 })) if (st[k] == null) st[k] = kloon(v);
    st.pets = Object.assign({ actief: 'draakje', start: { draakje: 0 }, namen: {} }, st.pets);
    st.kleding = Object.assign({ bezit: { hidde: {}, tessie: {} }, looks: { hidde: null, tessie: null } }, st.kleding);
    return st;
  }

  // ---------- opbouwen ----------
  function pas(st, op) {
    const f = VOER[op.soort];
    if (!f) throw new Error('Deze app-versie kent de opdracht "' + op.soort + '" niet.');
    return f(st, op);
  }
  function bouw() {
    staat = vulAan(kloon(basis));
    gezien = new Set();
    for (const op of log) {
      gezien.add(op.id);
      try { pas(staat, op); op.mislukt = undefined; } catch (e) { op.mislukt = e.message; }
    }
    spiegel();
  }
  function laad() {
    const data = migreer(leesJson(SLEUTEL));
    if (!data && leesJson(SLEUTEL)) schrijfJson('pq-app-kapot', leesJson(SLEUTEL));   // bewaren, niet weggooien
    if (data) { basis = data.basis; log = data.log; }
    else { basis = wortel.PQStart.basis(Date.now()); log = []; bewaar(); }
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
  const apparaat = () => leesJson(APPARAAT) || {};
  const zetApparaat = (k, v) => { const a = apparaat(); a[k] = v; schrijfJson(APPARAAT, a); };
  const ik = () => apparaat().ik || null;
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
