// Spelregels en store met node (geen browser): golden test A en B uit puntensysteem §11, ongedaan maken,
// idempotent naspelen, pot en voorstel met akkoord.   node tools/test_regels.js
'use strict';
const A = require('path').resolve(__dirname, '..') + '/';
const mem = {};
global.window = globalThis;
global.localStorage = { getItem: k => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); }, removeItem: k => { delete mem[k]; } };
for (const f of ['assets/huis.js', 'assets/kast.js', 'app/huis-model.js', 'app/store-regels.js', 'app/store-week.js',
  'app/store-opdrachten.js', 'app/store-winkel.js', 'app/store-start.js', 'app/store.js']) require(A + f);
const S = globalThis.PQStore, R = globalThis.PQRegels;
let mis = 0;
const check = (naam, waar, extra) => { console.log((waar ? '  ✓ ' : '  ✗ ') + naam + (waar ? '' : '  ' + JSON.stringify(extra))); if (!waar) mis++; };

S.laad();
check('zonder profiel geen opdracht', !S.doe('taak.nieuw', { titel: 'x' }).ok);
S.zetIk('hidde');
const maak = (titel, minuten, zwaarte, eigenaar) => S.doe('taak.nieuw', { titel, minuten, zwaarte, eigenaar }).resultaat;
const H = [['Koken', 40, 0, 2], ['Vaatwasser', 10, 1, 3], ['Stofzuigen', 30, 1, 1], ['Afval', 5, 1, 2], ['Badkamer', 45, 2, 1], ['Fietsband plakken', 40, 1, 1], ['Geld', 20, 0, 1]];
const T = [['Koken', 40, 0, 3], ['Vaatwasser', 10, 1, 4], ['Boodschappen', 45, 1, 1], ['Was draaien', 25, 0, 2], ['Was vouwen', 20, 1, 1], ['Planten', 5, 0, 4], ['Weekmenu', 30, 0, 1], ['Sociale agenda', 20, 0, 1]];
const tot = { hidde: 0, tessie: 0 };
for (const [p, lijst] of [['hidde', H], ['tessie', T]]) for (const [t, m, z, n] of lijst) for (let i = 0; i < n; i++) {
  S.doe('taak.klaar', { id: maak(t, m, z, p) }, { namens: p });
  tot[p] += S.staat().afrondingen[S.staat().afrondingen.length - 1].inzet;
}
const nu = Date.now(), wk = R.weken(S.staat(), nu);
check('golden A: Hidde 316, Tessie 377', tot.hidde === 316 && tot.tessie === 377, tot);
check('golden A: samen 693 van 600, gehaald', wk.nu.totaal === 693 && wk.nu.gehaald, wk.nu);
check('huispot: 0,5 × min(693, 600) = 300', R.pot(S.staat(), nu).saldo === 300, R.pot(S.staat(), nu));
check('draakje uit het ei, 693 XP', !R.pet(S.staat(), nu).ei && R.pet(S.staat(), nu).xp === 693);
const laatste = S.staat().afrondingen[S.staat().afrondingen.length - 1];
S.doe('taak.ongedaan', { afronding: laatste.id });
check('ongedaan maken: tegenregel', R.weken(S.staat(), nu).nu.totaal === 693 - laatste.inzet);
const st = JSON.parse(JSON.stringify(S.staat())), w = R.weekVan(nu);
st.afwezig = [{ wie: 'tessie', van: R.dagenVanWeek(w)[2], tot: R.dagenVanWeek(w)[3] }];
check('golden B: Tessie 2 dagen ziek, norm 514', R.normVoor(st, w) === 514, R.normVoor(st, w));
const voor = JSON.stringify(S.staat());
S.laad();
check('naspelen uit het log geeft dezelfde staat', voor === JSON.stringify(S.staat()));
check('dezelfde opdracht nog eens telt niet', S.ontvang([S.log()[3]]) === 0);
const v = S.doe('voorstel.nieuw', { soort: 'kleding', data: { fid: 'hidde', item: 'beanie', kleur: globalThis.PQ_KAST.items.find(i => i.id === 'beanie').kleuren[0] } });
check('voorstel kleding', v.ok, v);
check('zelf goedkeuren mag niet', !S.doe('voorstel.akkoord', { id: v.id }).ok);
check('de ander keurt goed: in bezit', S.doe('voorstel.akkoord', { id: v.id }, { namens: 'tessie' }).ok && !!S.staat().kleding.bezit.hidde.beanie);
// Rustweek: één per kalendermaand, ook als een gemiste week hem al automatisch gebruikte (puntensysteem §8).
{
  const DAG = 864e5, t0 = new Date(2026, 9, 5, 12).getTime();   // ma 5 okt 2026
  const rs = { start: t0, taken: {}, afrondingen: [], rustweken: [], afwezig: [], weekdoel: [], voorstellen: [] };
  const af = (dagNa, inzet) => rs.afrondingen.push({ inzet, op: t0 + dagNa * DAG, week: R.weekVan(t0 + dagNa * DAG) });
  af(1, 500); af(15, 500);                       // week 5 okt gehaald, 12 okt gemist (auto-rustweek), 19 okt gehaald
  const op26 = t0 + 21 * DAG;                     // ma 26 okt
  check('rustweek: gemiste week gebruikt de oktober-rustweek, streak 2', R.weken(rs, op26).streak === 2, R.weken(rs, op26).streak);
  check('rustweek: in oktober niet meer vrij', !R.rustweekVrij(rs, R.weekVan(op26), op26));
  let fout = null;
  try { globalThis.PQOpdrachten.VOER.rustweek(rs, { data: {}, tijd: op26 }); } catch (e) { fout = e.message; }
  check('rustweek: aankondigen geweigerd, streak blijft 2', fout && R.weken(rs, op26).streak === 2, { fout, streak: R.weken(rs, op26).streak });
  check('rustweek: november wel vrij', R.rustweekVrij(rs, R.weekVan(t0 + 28 * DAG), t0 + 28 * DAG));
}
console.log(mis ? `${mis} fout` : 'alles goed');
process.exit(mis ? 1 : 0);
