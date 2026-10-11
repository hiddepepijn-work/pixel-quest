// QA deel 3: verbouwen en kleding kopen (te weinig munten, voorstel, akkoord), collectie, pet kiezen, reset.
'use strict';
const { start, server, check, telling, wacht, DIST } = require('./hulp');

(async () => {
  const { s, url } = await server(DIST);
  const h = await start(), { p, R } = h;
  await p.goto(url + 'index.html?test', { waitUntil: 'load' }); await wacht(1200);
  await h.tik('.wiekaart[aria-label="Ik ben Hidde"]'); await wacht(800);

  console.log('1. Verbouwen met lege pot');
  await h.tab('huis'); await wacht(800);
  await h.foto('d01-huis');
  await h.tab('verbouwen'); await wacht(500);
  await h.foto('d02-verbouwen-leeg');
  check('kopen uitgeschakeld met lege pot', await R(() => { const b = [...document.querySelectorAll('#view-verbouwen button')].find(b => /sparen/.test(b.textContent)); return b && b.disabled; }));
  const r0 = await R(() => window.PQStore.doe('voorstel.nieuw', { soort: 'verbouwing', data: { niveau: 2 } }));
  check('voorstel met lege pot geweigerd, in gewone taal', !r0.ok && /te weinig/.test(r0.fout), r0);
  await h.sheetDicht();
  // kleding met lege pot
  await h.tab('kast'); await wacht(800);
  await h.foto('d03-kast');
  const koopKnop = await R(() => { const b = [...document.querySelectorAll('#view-kast button')].find(b => /Kopen/.test(b.textContent)); return b ? b.textContent + '|' + b.disabled : null; });
  console.log('    koopknop in kast:', koopKnop);
  // Kies een item dat je niet hebt en probeer te kopen
  const tegel = await R(() => { const t = [...document.querySelectorAll('#itemRooster .tegel')].find(t => /munt|\d{2,}/.test(t.textContent) && !/klaar|bezit/.test(t.className)); if (t) { t.scrollIntoView({ block: 'center' }); return true; } return false; });
  if (tegel) {
    await R(() => [...document.querySelectorAll('#itemRooster .tegel')].find(t => /munt|\d{2,}/.test(t.textContent)).click()); await wacht(400);
    await R(() => document.querySelector('#itemDetail').scrollIntoView({ block: 'center' })); await wacht(200);
    await h.foto('d04-kast-item');
    const kb = await R(() => { const b = [...document.querySelectorAll('#itemDetail button')].find(b => /Kopen|sparen/i.test(b.textContent)); if (!b) return null; const t = b.textContent + '|' + b.disabled; b.click(); return t; });
    console.log('    item-knop:', kb);
    await wacht(500);
    await h.foto('d05-kast-te-weinig');
    const melding = await R(() => { const m = document.getElementById('melding'); return m.hidden ? '' : m.textContent; });
    console.log('    melding:', melding);
    check('te weinig munten: duidelijke melding of uitgeschakelde knop', /te weinig|sparen/i.test(melding + kb), { melding, kb });
    await h.sheetDicht();
  }

  console.log('2. Pot vullen (testweken) en verbouwing 2 kopen');
  await h.tab('meer');
  await R(() => { document.querySelector('details.debug').open = true; });
  await h.tikTekst('#view-meer button', '+ 2 testweken'); await wacht(500);
  let wk = await h.week();
  console.log('    pot:', JSON.stringify(wk.pot), 'gehaald', wk.gehaald);
  await h.tab('verbouwen'); await wacht(500);
  await h.tikTekst('#view-verbouwen button', 'Kopen (voorstel)'); await wacht(600);
  await h.foto('d06-voorstel');
  check('voorstel-sheet open', await R(() => /Voorstel gedaan/.test(document.querySelector('.sheet h2').textContent)));
  await h.tikTekst('.sheet-voet button', 'Wacht op akkoord'); await wacht(400);
  // als Tessie goedkeuren via Meer
  await R(() => window.PQStore.zetIk('tessie')); await p.reload({ waitUntil: 'load' }); await wacht(1300);
  check('Tessie: badge op de menuknop', await R(() => document.querySelector('#menuKnop .tabbadge').textContent === '1' && !document.querySelector('#menuKnop .tabbadge').hidden));
  check('Tessie: badge op Meer', await R(() => document.querySelector('[data-tab="meer"] .tabbadge').textContent === '1'));
  await h.tab('meer');
  await h.foto('d07-tessie-voorstel');
  const potVoor = (await h.week()).pot.saldo;
  await h.tikTekst('#meer-voorstellen button', 'Goedkeuren'); await wacht(600);
  wk = await h.week();
  const st = await h.st();
  check('huis niveau 2, pot −400', st.huis.niveau === 2 && wk.pot.saldo === potVoor - 400, { niveau: st.huis.niveau, voor: potVoor, na: wk.pot.saldo });
  await h.tab('huis'); await wacht(800);
  await h.foto('d08-huis-niveau2');

  console.log('3. Kleding kopen met akkoord');
  await h.tab('kast'); await wacht(600);
  const item = await R(() => { const K = window.PQ_KAST, b = window.PQStore.staat().kleding.bezit.tessie; const it = K.items.find(i => i.status === 'klaar' && i.prijs && i.lichaam.includes('tessie') && !b[i.id]); return it && { id: it.id, kleur: it.kleuren[0], prijs: it.prijs }; });
  console.log('    item:', JSON.stringify(item));
  const v = await R(i => window.PQStore.doe('voorstel.nieuw', { soort: 'kleding', data: { fid: 'tessie', item: i.id, kleur: i.kleur } }), item);
  check('kleding-voorstel', v.ok, v);
  await R(() => window.PQApp.ga('kast', { opnieuw: true })); await wacht(400);
  await h.foto('d09-kast-voorstel-open');
  const pot2 = (await h.week()).pot.saldo;
  await h.tikTekst('#view-kast .voorstel button', 'keurt goed'); await wacht(500);
  const st2 = await h.st();
  check('kleding in bezit, pot − prijs', !!(st2.kleding.bezit.tessie[item.id] || []).includes(item.kleur) && (await h.week()).pot.saldo === pot2 - item.prijs);

  console.log('4. Collectie en pet');
  await h.tab('collectie'); await wacht(200);
  await h.foto('d10-collectie');
  const uit = await R(() => window.PQRegels.collectie(window.PQStore.staat(), Date.now()).filter(c => c.uit).map(c => c.id));
  console.log('    uitgekomen:', uit.join(','));
  check('draakje en konijntje uit na 2 gehaalde weken', uit.includes('draakje') && uit.includes('konijntje'));
  await R(() => [...document.querySelectorAll('.petvakje')].find(b => /Konijntje/i.test(b.getAttribute('aria-label'))).click()); await wacht(400);
  await h.foto('d11-pet-sheet');
  await p.type('.sheet input', 'Flap');
  await h.tikTekst('.sheet-voet button', 'Bewaar naam'); await wacht(300);
  await R(() => [...document.querySelectorAll('.petvakje')].find(b => /Flap/i.test(b.getAttribute('aria-label'))).click()); await wacht(400);
  await h.tikTekst('.sheet-voet button', 'Laat meelopen'); await wacht(400);
  const st3 = await h.st();
  check('konijntje heet Flap en loopt mee', st3.pets.actief === 'konijntje' && st3.pets.namen.konijntje === 'Flap');
  await R(() => [...document.querySelectorAll('.petvakje.slot')][0].click()); await wacht(400);
  await h.foto('d12-ei-sheet'); await h.sheetDicht();
  await h.tab('vandaag');
  await R(() => document.querySelector('#view-vandaag').scrollTo(0, 99999)); await wacht(300);
  await h.foto('d13-vandaag-pet');
  check('Vandaag toont Flap', await R(() => /Flap/.test(document.querySelector('.petkaart').textContent)));

  console.log('5. Reset');
  await h.tab('meer');
  await R(() => document.querySelector('#meer-over').scrollIntoView()); await wacht(200);
  await h.tikTekst('#view-meer button', 'Reset dit apparaat'); await wacht(400);
  await h.foto('d14-reset-vraag');
  await h.tikTekst('.sheet-voet button', 'Wis alles'); await wacht(2000);
  check('na reset: welkom', await R(() => !!document.querySelector('.welkom')));
  const st4 = await R(() => JSON.parse(localStorage.getItem('pq-app')));
  check('na reset: leeg log, geen voorbeeldtaken? (gedrag vastleggen)', st4 && st4.log.length === 0, { log: st4 && st4.log.length, taken: st4 && Object.keys(st4.basis.taken).length });
  console.log('    taken na reset:', st4 && Object.keys(st4.basis.taken).length, 'niveau', st4 && st4.basis.huis.niveau);
  await h.tik('.wiekaart[aria-label="Ik ben Hidde"]'); await wacht(800);
  await h.foto('d15-na-reset');
  const f = await h.jsFouten();
  check('0 JS-fouten', f.length === 0, f);
  await h.browser.close(); s.close();
  console.log(JSON.stringify(telling()));
})().catch(e => { console.error('CRASH', e); process.exit(1); });
