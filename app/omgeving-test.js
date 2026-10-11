// Node-test voor app/omgeving.js (pure rekenregels). Draaien: node app/omgeving-test.js
// Zonnetijden vergeleken met Open-Meteo (daily sunrise/sunset, opgehaald 11 okt 2026, Europe/Amsterdam).
'use strict';
process.env.TZ = 'Europe/Amsterdam';
global.window = {};
require('./omgeving.js');
const O = window.PQ_OMGEVING;
let fout = 0;
const ok = (wat, goed, detail) => { if (!goed) fout++; console.log((goed ? 'ok   ' : 'FOUT ') + wat + (detail ? '  ' + detail : '')); };
const hhmm = ms => new Date(ms).toLocaleTimeString('nl-NL', { timeZone: 'Europe/Amsterdam', hour: '2-digit', minute: '2-digit' });
const min = s => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };

// 1. zonsopkomst en -ondergang binnen 5 minuten van Open-Meteo
for (const [naam, dag, lat, lon, op, onder] of [
  ['Zevenaar', '2026-10-11', 51.93, 6.07, '07:53', '18:50'],
  ['Amsterdam', '2026-10-11', 52.37, 4.9, '07:58', '18:54'],
]) {
  const t = O.zonTijden(Date.parse(dag + 'T12:00:00Z'), lat, lon);
  const d1 = Math.abs(min(hhmm(t.op)) - min(op)), d2 = Math.abs(min(hhmm(t.onder)) - min(onder));
  ok(`zon ${naam} ${dag}: op ${hhmm(t.op)} (Open-Meteo ${op}), onder ${hhmm(t.onder)} (${onder})`, d1 <= 5 && d2 <= 5);
}

// 2. lichtfases door de dag (Zevenaar, 11 okt 2026)
const fase = u => O.lichtfase(Date.parse(`2026-10-11T${u}:00+02:00`), 51.93, 6.07).fase;
for (const [u, f] of [['03:00', 'nacht'], ['07:30', 'dageraad'], ['08:30', 'ochtend'], ['13:00', 'middag'], ['18:20', 'gouden_uur'], ['19:05', 'schemering'], ['21:00', 'nacht']]) {
  ok(`fase ${u} = ${f}`, fase(u) === f, fase(u));
}

// 3. events: Sinterklaas (intocht = eerste zaterdag op/na 12 nov t/m 5 dec) en Kerst (1-26 dec)
for (const [d, ev] of [
  ['2026-11-13', ''], ['2026-11-14', 'sinterklaas'], ['2026-12-05', 'sinterklaas,kerst'], ['2026-12-06', 'kerst'],
  ['2026-12-26', 'kerst'], ['2026-12-27', ''], ['2027-11-12', ''], ['2027-11-13', 'sinterklaas'], ['2027-12-01', 'sinterklaas,kerst'],
]) ok(`events ${d} = [${ev}]`, O.eventsOp(new Date(d + 'T12:00:00')).join() === ev);
ok('events uit te zetten', O.eventsOp(new Date('2026-12-10T12:00:00'), { kerst: false }).length === 0);

// 4. WMO-code naar weertype
for (const [c, t] of [[0, 'helder'], [2, 'halfbewolkt'], [3, 'bewolkt'], [45, 'bewolkt'], [53, 'regen'], [63, 'regen'], [81, 'regen'], [95, 'regen'], [73, 'sneeuw'], [86, 'sneeuw'], [null, 'halfbewolkt']]) {
  ok(`WMO ${c} = ${t}`, O.weertype(c) === t);
}

// 5. status: fallback na 3 uur, sneeuwlaag, kerstsfeer, altijd dag
const rec = { tijd: Date.parse('2026-10-11T12:00:00+02:00'), code: 61, temp_c: 11, wind_kmh: 20 };
const st = d => O.bereken({ datum: new Date(d), weer: rec });
ok('weer uit record', st('2026-10-11T13:00:00+02:00').weer.type === 'regen');
ok('na 3 uur licht bewolkt', st('2026-10-11T15:30:00+02:00').weer.type === 'halfbewolkt');
ok('kerstsfeer: poedertje op 24 dec', O.bereken({ datum: new Date('2026-12-24T12:00:00') }).sneeuwlaag === 1);
ok('kerstsfeer uit', O.bereken({ datum: new Date('2026-12-24T12:00:00'), instellingen: { kerstsfeer: false } }).sneeuwlaag === 0);
ok('sneeuwweer: laagje', O.bereken({ datum: new Date('2027-01-15T12:00:00'), instellingen: { weer: 'sneeuw' } }).sneeuwlaag === 2);
const nacht = O.bereken({ datum: new Date('2026-10-11T23:00:00+02:00'), instellingen: { altijdDag: true } }).licht;
ok('altijd dag: middag en lampen uit', nacht.fase === 'middag' && !nacht.lampen);
ok('bewolkt: lampen eerder aan', O.bereken({ datum: new Date('2026-10-11T18:15:00+02:00'), instellingen: { weer: 'bewolkt' } }).licht.lampen);
ok('seizoen 15 apr = lente', O.seizoenOp(new Date('2026-04-15')).naam === 'lente');

console.log(fout ? `\n${fout} FOUT(EN)` : '\nalles ok');
process.exit(fout ? 1 : 0);
