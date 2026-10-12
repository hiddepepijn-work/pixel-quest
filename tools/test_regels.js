// Spelregels en store met node (geen browser): golden test A en B uit puntensysteem §11, ongedaan maken,
// idempotent naspelen, pot en voorstel met akkoord.   node tools/test_regels.js
'use strict';
const A = require('path').resolve(__dirname, '..') + '/';
const mem = {};
global.window = globalThis;
global.localStorage = { getItem: k => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); }, removeItem: k => { delete mem[k]; } };
for (const f of ['assets/kleding.js', 'assets/huis.js', 'assets/kast.js', 'app/huis-model.js', 'app/winkel-data.js', 'app/store-regels.js',
  'app/store-week.js', 'app/winkel-regels.js', 'app/winkel-drops.js', 'app/store-opdrachten.js', 'app/store-winkel.js', 'app/store-start.js', 'app/store.js']) require(A + f);
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
  // Begonnen op zondag: die halve week kost geen rustweek (anders is de oktober-rustweek op dag 1 al weg).
  const zo = { start: t0 + 6 * DAG, taken: {}, afrondingen: [], rustweken: [], afwezig: [], weekdoel: [], voorstellen: [] };
  const wz = R.weken(zo, t0 + 8 * DAG).lijst[0];
  check('aanloopweek: geen rustweek gebruikt, oktober nog vrij', !wz.rustweek && wz.aanloop && R.rustweekVrij(zo, R.weekVan(t0 + 8 * DAG), t0 + 8 * DAG), wz);
}
// Klok van het toestel vóór de start van de app (tijdzone, handmatig verzet): de week bestaat gewoon.
{ const st = JSON.parse(JSON.stringify(S.staat())), terug = st.start - 3 * 864e5, w = R.weken(st, terug);
  check('klok vóór de start: lopende week bestaat (geen crash)', !!w.nu && Number.isFinite(w.nu.totaal), w.nu);
  check('klok vóór de start: pot is een getal', Number.isFinite(R.pot(st, terug).saldo)); }
// Winkel (docs/winkel.md): startkast, setkorting naar rato, extra kleuren, uitgelicht, meubels, drops, economie.
{
  const P = globalThis.PQWinkel, K = globalThis.PQ_KAST, nu2 = Date.now(), b = () => S.staat().kleding.bezit;
  check('startkast: shirt, broek en schoenen gratis voor allebei', ['hidde', 'tessie'].every(f => ['tshirt_basis', 'broek_basis', 'sneakers_basis'].every(id => (b()[f][id] || []).length)), b().tessie);
  const pyj = K.items.find(i => i.id === 'pyjama'), was = pyj.status;
  check('startkast: pyjama pas na tekenen', !b().hidde.pyjama || was === 'klaar');
  pyj.status = 'klaar'; S.laad();
  check('startkast: pyjama vanzelf in de kast zodra hij klaar is', (b().hidde.pyjama || []).length === 1 && (b().tessie.pyjama || []).length === 1);
  pyj.status = was; S.laad();
  // Een set uit de data (geen vaste id's): verkoopbaar voor Tessie, minstens 3 items, binnen de pot.
  const ww = P.verkoopbareSets().find(s => { const d = P.setDelen(s, 'tessie'); return d.compleet && d.getekend.length >= 3 && d.getekend.reduce((t, i) => t + i.prijs, 0) <= 200; });
  const delen = P.setDelen(ww, 'tessie').getekend, som = delen.reduce((t, i) => t + i.prijs, 0), eerst = delen[0];
  const voor = P.setInfo(S.staat(), 'tessie', ww), kort = x => ({ som: x.som, somMist: x.somMist, prijs: x.prijs, teKoop: x.teKoop });
  check(`set: som min 20% (${ww.naam} ${som} → ${Math.round(0.8 * som)})`, voor.som === som && voor.prijs === Math.round(0.8 * som) && voor.teKoop, kort(voor));
  const r1 = S.doe('voorstel.nieuw', { soort: 'kleding', data: { fid: 'tessie', item: eerst.id, kleur: eerst.kleuren[0] } });
  S.doe('voorstel.akkoord', { id: r1.id }, { namens: 'tessie' });
  const na = P.setInfo(S.staat(), 'tessie', ww), rest = som - eerst.prijs, setPrijs = Math.round(0.8 * rest);
  check(`set: korting naar rato na ${eerst.naam} (${rest} → ${setPrijs})`, na.somMist === rest && na.prijs === setPrijs, kort(na));
  const r2 = S.doe('voorstel.nieuw', { soort: 'set', data: { fid: 'tessie', set: ww.id } });
  const potS = R.pot(S.staat(), nu2).saldo;
  check(`set kopen met akkoord: alles in bezit, pot − ${setPrijs}`, r2.ok && S.doe('voorstel.akkoord', { id: r2.id }, { namens: 'tessie' }).ok &&
    delen.every(it => (b().tessie[it.id] || []).length) && R.pot(S.staat(), nu2).saldo === potS - setPrijs, r2);
  const beanie = K.items.find(i => i.id === 'beanie'), w0 = R.weekVan(nu2);
  const rot = P.rotatie(w0), ditweek = rot.find(p => p.item === 'beanie'), nietDitWeek = beanie.kleuren.slice(1).find(k => !rot.some(p => p.item === 'beanie' && p.kleur === k));
  check('extra kleur van een item dat je hebt: halve prijs (30 → 15)', P.kledingPrijs(S.staat(), 'hidde', beanie, beanie.kleuren[1]) === 15);
  if (nietDitWeek) check('extra kleur buiten de rotatie: niet te koop', !S.doe('voorstel.nieuw', { soort: 'kleding', data: { fid: 'hidde', item: 'beanie', kleur: nietDitWeek } }).ok);
  if (ditweek) check('extra kleur in de rotatie: te koop', S.doe('voorstel.nieuw', { soort: 'kleding', data: { fid: 'hidde', item: 'beanie', kleur: ditweek.kleur } }).ok);
  check('zeldzame kleur is nooit te koop', /drop/.test(S.doe('voorstel.nieuw', { soort: 'kleding', data: { fid: 'hidde', item: 'beanie', kleur: 'glitter' } }).fout || ''));
  const weken = [0, 1, 2, 3].map(i => P.uitgelicht(R.weekPlus(w0, i)));
  check('uitgelicht: zelfde week = zelfde keuze', JSON.stringify(P.uitgelicht(w0)) === JSON.stringify(weken[0]));
  check('uitgelicht: wisselt per week (set en 2–3 items)', weken.every(u => u.set && u.items.length >= 2 && u.items.length <= 3) &&
    new Set(weken.map(u => u.set.id + u.items.map(i => i.id).join())).size === 4, weken.map(u => [u.set && u.set.id, u.items.map(i => i.id)]));
  check('rotatie: elke week 8 andere kleuren', new Set([0, 1].map(i => JSON.stringify(P.rotatie(R.weekPlus(w0, i))))).size === 2 && rot.length === 8);
  const vh = S.doe('voorstel.nieuw', { soort: 'meubel', data: { soort: 'vogelhuisje' } });
  check('meubel voor de tuin op niveau 1: "vraagt een tuin (verbouwing 4)"', !vh.ok && /tuin \(verbouwing 4\)/.test(vh.fout), vh);
  const kp = S.doe('voorstel.nieuw', { soort: 'meubel', data: { soort: 'monstera' } });
  check('meubel kopen: in de verhuisdoos', kp.ok && S.doe('voorstel.akkoord', { id: kp.id }, { namens: 'tessie' }).ok && S.staat().huis.doos.some(d => d.id === 'monstera-w1'), S.staat().huis.doos);
  // Drop bij een mijlpaal: 3 gehaalde weken (gebouwd op een kopie van de staat).
  const st3 = JSON.parse(JSON.stringify(S.staat())), DAG = 864e5;
  check('drop: nog geen mijlpaal → geweigerd', !S.doe('drop', { sleutel: 'gehaald:3' }).ok);
  for (let i = 1; i <= 3; i++) st3.afrondingen.push({ id: 'x' + i, inzet: 600, op: nu2 - i * 7 * DAG, week: R.weekVan(nu2 - i * 7 * DAG), categorie: null });
  check('mijlpaal: 3 gehaalde weken geeft een open drop', P.openDrops(st3, nu2).some(m => m.sleutel === 'gehaald:3'));
  const VOER = globalThis.PQOpdrachten.VOER;
  VOER.drop(st3, { id: 'd1', data: { sleutel: 'gehaald:3' }, door: 'hidde', tijd: nu2 });
  VOER.drop(st3, { id: 'd2', data: { sleutel: 'gehaald:3' }, door: 'tessie', tijd: nu2 });
  const d = st3.winkel.drops;
  check('drop: één keer, voor allebei een zeldzame kleur op een eigen item', d.length === 1 && d[0].items.length === 2 &&
    d[0].items.every(i => P.isZeldzaam(i.kleur) && st3.kleding.bezit[i.fid][i.item].includes(i.kleur)), d);
  const prijzen = P.klaar().map(i => i.prijs), gem = prijzen.reduce((s, x) => s + x, 0) / prijzen.length;
  check(`economie: gemiddeld item ${Math.round(gem)} munten = ${P.dagen(gem, S.staat(), nu2, true)} dagen sparen per persoon`, P.dagen(gem, S.staat(), nu2, true) >= 1 && P.dagen(gem, S.staat(), nu2, true) <= 4);
  const setGem = Math.round(P.verkoopbareSets().map(x => P.setInfo({ kleding: { bezit: {} } }, 'tessie', x).vol).filter(Boolean).reduce((t, x, i, a) => t + x / a.length, 0));
  check(`economie: gemiddelde set ${setGem} = ${P.dagen(setGem, S.staat(), nu2, true)} dagen per persoon (~een week)`, P.dagen(setGem, S.staat(), nu2, true) >= 4 && P.dagen(setGem, S.staat(), nu2, true) <= 9);
  const voorLaad = JSON.stringify(S.staat()); S.laad();
  check('winkel: naspelen geeft dezelfde staat', voorLaad === JSON.stringify(S.staat()));
}
console.log(mis ? `${mis} fout` : 'alles goed');
process.exit(mis ? 1 : 0);
