// Test voor app/kast-auto.js (kiesAutoLook). Draaien:  node tools/test_kast_auto.js
'use strict';
const assert = require('assert');
const path = require('path');
const { kiesAutoLook } = require(path.join(__dirname, '..', 'app', 'kast-auto.js'));
const kast = require(path.join(__dirname, '..', 'assets', 'kast.json'));

// Voor de test doen we alsof de items die op art wachten al klaar zijn.
const cat = kast.items.map(i => Object.assign({}, i, { status: 'klaar' }));
const echt = kast.items;
const eigen = { boven: { item: 'tshirt_basis', kleur: 'petrol' }, onder: { item: 'broek_basis', kleur: 'origineel' },
  schoenen: { item: 'sneakers_basis', kleur: 'origineel' } };
const dag = new Date(2026, 9, 11, 14, 0), avond = new Date(2026, 9, 11, 21, 30);
const alles = Object.fromEntries(cat.map(i => [i.id, i.kleuren.slice(0, 1)]));
let n = 0;
function t(naam, fn) { fn(); n++; console.log('ok', naam); }

t('overdag bij helder weer blijft de eigen look', () => {
  const l = kiesAutoLook(eigen, { weer: { type: 'helder', temp_c: 15 }, licht: { fase: 'middag' } }, alles, { catalogus: cat, nu: dag });
  assert.deepStrictEqual(l, eigen);
});
t('regen: regenjas, alleen als je hem hebt', () => {
  const st = { weer: { type: 'regen', temp_c: 12 } };
  assert.strictEqual(kiesAutoLook(eigen, st, alles, { catalogus: cat, nu: dag }).jas.item, 'regenjas');
  assert.strictEqual(kiesAutoLook(eigen, st, { tshirt_basis: [] }, { catalogus: cat, nu: dag }).jas, undefined);
});
t('sneeuw: puffer, muts en sjaal', () => {
  const l = kiesAutoLook(eigen, { weer: { type: 'sneeuw', temp_c: -2 } }, alles, { catalogus: cat, nu: dag });
  assert.strictEqual(l.jas.item, 'puffer');
  assert.strictEqual(l.hoofd.item, 'beanie');
  assert.strictEqual(l.accessoire.item, 'sjaal');
});
t('onder 5 graden zonder neerslag: muts en sjaal, geen jas', () => {
  const l = kiesAutoLook(eigen, { weer: { type: 'bewolkt', temp_c: 3 } }, alles, { catalogus: cat, nu: dag });
  assert.strictEqual(l.hoofd.item, 'beanie');
  assert.strictEqual(l.jas, undefined);
});
t('boven 25 graden: korte broek', () => {
  const l = kiesAutoLook(eigen, { weer: { type: 'helder', temp_c: 28 } }, alles, { catalogus: cat, nu: dag });
  assert.strictEqual(l.onder.item, 'korte_broek');
});
t('na 21:00: pyjama en sloffen, jas en muts uit', () => {
  const uitleg = [];
  const l = kiesAutoLook(eigen, { weer: { type: 'sneeuw', temp_c: -1 } }, alles, { catalogus: cat, nu: avond, uitleg });
  assert.strictEqual(l.heel_lichaam.item, 'pyjama');
  assert.strictEqual(l.schoenen.item, 'sloffen');
  assert.strictEqual(l.jas, undefined);
  assert.ok(uitleg.length > 0);
});
t('nacht in het raam telt ook, instelbaar tijdstip', () => {
  const l = kiesAutoLook(eigen, { licht: { fase: 'nacht' } }, alles, { catalogus: cat, nu: dag });
  assert.strictEqual(l.heel_lichaam.item, 'pyjama');
  const m = kiesAutoLook(eigen, {}, alles, { catalogus: cat, nu: avond, huisTijd: '22:30' });
  assert.strictEqual(m.heel_lichaam, undefined);
});
t('per persoon uit te zetten', () => {
  const l = kiesAutoLook(eigen, { weer: { type: 'regen' }, licht: { fase: 'nacht' } }, alles,
    { catalogus: cat, nu: dag, uit: { weer: true, huis: true } });
  assert.deepStrictEqual(l, eigen);
});
t('keukentaak: schort', () => {
  assert.strictEqual(kiesAutoLook(eigen, {}, alles, { catalogus: cat, nu: dag, taak: 'keuken' }).heel_lichaam.item, 'schort');
});
t('lichaam telt: teddyjas alleen voor Tessie', () => {
  const alleenTeddy = { teddyjas: ['creme'] };
  const st = { weer: { type: 'sneeuw' } };
  assert.strictEqual(kiesAutoLook({}, st, alleenTeddy, { catalogus: cat, nu: dag, fid: 'tessie' }).jas.item, 'teddyjas');
  assert.strictEqual(kiesAutoLook({}, st, alleenTeddy, { catalogus: cat, nu: dag, fid: 'hidde' }).jas, undefined);
});
t('met de echte catalogus: wat op art wacht, wordt nooit gekozen', () => {
  const l = kiesAutoLook(eigen, { licht: { fase: 'nacht' }, weer: { type: 'helder', temp_c: 30 } }, alles, { catalogus: echt, nu: dag });
  assert.strictEqual(l.heel_lichaam, undefined);
  assert.strictEqual(l.onder.item, 'broek_basis');
});
t('kleur: eerste kleur die je bezit', () => {
  const l = kiesAutoLook({}, { weer: { type: 'regen' } }, { regenjas: ['petrol', 'goud'] }, { catalogus: cat, nu: dag });
  assert.strictEqual(l.jas.kleur, 'petrol');
});
console.log(`${n} tests geslaagd`);
