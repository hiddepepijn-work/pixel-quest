// QA deel 2: de klok vooruit. Terugkerende taak komt terug, weekwissel (streak, rustweek, ziek), zondagterugblik.
'use strict';
const { start, server, check, telling, wacht, DIST } = require('./hulp');

(async () => {
  const { s, url } = await server(DIST);
  const h = await start(), { p, R } = h;
  await p.goto(url + 'index.html?test', { waitUntil: 'load' }); await wacht(1200);
  // Begin op zondag 11 okt 2026 14:00 lokale tijd, wat de echte klok ook zegt.
  const basis = await R(() => { const d = new Date(2026, 9, 11, 14, 0); return d.getTime() - Date.now(); });
  const dag = n => R((b, n) => localStorage.setItem('qa-klok', String(b + n * 864e5)), basis, n);
  const naar = async n => { await dag(n); await p.reload({ waitUntil: 'load' }); await wacht(1300); };
  await naar(0);
  await h.tik('.wiekaart[aria-label="Ik ben Hidde"]'); await wacht(800);
  check('klok staat op zo 11 okt', await R(() => new Date().toDateString()), null);
  console.log('   ', await R(() => new Date().toString()));

  console.log('1. Terugkerende taak komt terug');
  await h.tab('vandaag');
  const plant = 'vb-7';   // Planten water geven, elke 3 dagen, Hidde
  check('planten staat op Vandaag (dorstig)', await R(id => !!document.querySelector(`#view-vandaag [data-taak="${id}"]`), plant));
  await h.tik(`#view-vandaag [data-taak="${plant}"] .gieter`); await wacht(500);
  await h.tab('quests'); await h.tab('vandaag');
  check('na afronden niet meer op Vandaag', await R(id => !document.querySelector(`#view-vandaag [data-taak="${id}"]`), plant));
  await naar(2.2);
  await h.tab('vandaag');
  check('na 2,2 dagen weer op Vandaag (dorstig)', await R(id => { const e = document.querySelector(`#view-vandaag [data-taak="${id}"] .stand`); return e && e.classList.contains('dorstig'); }, plant));
  await naar(3.5); await h.tab('vandaag');
  check('na 3,5 dagen hangend', await R(id => { const e = document.querySelector(`#view-vandaag [data-taak="${id}"] .stand`); return e && e.classList.contains('hangend'); }, plant));
  await naar(0);

  console.log('2. Weekwissel: gehaald, streak');
  // Een grote klus om de week te halen (300 min × 1,6 = 480 = 80% van 600).
  const groot = await R(() => window.PQStore.doe('taak.nieuw', { titel: 'Grote klus', minuten: 300, zwaarte: 2, eigenaar: 'hidde', interval: 1 }).resultaat);
  await p.reload({ waitUntil: 'load' }); await wacht(1200); await h.tab('quests'); await h.tikTekst('#view-quests .chip', 'Mijn');
  await h.tik(`#view-quests [data-taak="${groot}"] .gieter`); await wacht(500);
  let wk = await h.week();
  check('week 5 okt gehaald (480/600)', wk.nu.gehaald && wk.nu.totaal >= 480, wk.nu);
  await naar(1);   // ma 12 okt 14:00
  wk = await h.week();
  check('ma 12 okt: streak 1', wk.streak === 1, { streak: wk.streak, lijst: wk.lijst.map(x => [x.week, x.totaal, x.norm, x.gehaald, x.rustweek]) });
  await h.tab('vandaag');
  check('Vandaag toont Streak 1 week', await R(() => /Streak 1 week(?!en)/.test(document.querySelector('.weekdoel').textContent)));
  await h.foto('c01-streak1');

  console.log('3. Week 12 okt niets: automatische rustweek');
  await naar(8);   // ma 19 okt
  wk = await h.week();
  const w12 = wk.lijst.find(x => x.week === '2026-10-12');
  check('week 12 okt: rustweek automatisch, streak blijft 1', w12 && w12.rustweek && wk.streak === 1, w12);
  await h.tab('meer');
  await h.tikTekst('#view-meer .chip', 'Vorige week'); await wacht(300);
  check('terugblik vorige week zegt "rustweek gebruikt"', await R(() => /rustweek gebruikt/.test(document.querySelector('#meer-terugblik').textContent)));
  await R(() => document.querySelector('#meer-instellingen').scrollIntoView()); await wacht(200);
  await h.foto('c02-instellingen-na-auto-rustweek');
  const knopRust = await R(() => [...document.querySelectorAll('#meer-instellingen button')].some(b => /rustweek/.test(b.textContent)));
  check('rustweek-knop weg als de maandrustweek al automatisch gebruikt is', !knopRust);

  console.log('4. Week 19 okt: Tessie ziek wo+do');
  await R(() => document.querySelector('#meer-instellingen').scrollIntoView());
  await p.select('#meer-instellingen select', 'tessie');
  await p.$eval('#meer-instellingen input[aria-label="Van"]', e => { e.value = '2026-10-21'; });
  await p.$eval('#meer-instellingen input[aria-label="Tot en met"]', e => { e.value = '2026-10-22'; });
  await h.tikTekst('#meer-instellingen button', 'Toevoegen'); await wacht(400);
  wk = await h.week();
  check('norm 514 bij twee dagen ziek', wk.nu.norm === 514, wk.nu.norm);
  await h.foto('c03-ziek');
  // Hidde doet 2× een klus van 260 min × 1,6 → 416 + ... (drempel 411)
  await R(() => { const S = window.PQStore; const id = S.doe('taak.nieuw', { titel: 'Klus 416', minuten: 260, zwaarte: 2, eigenaar: 'hidde' }).resultaat; S.doe('taak.klaar', { id }); });
  wk = await h.week();
  check('416 van 514 = gehaald (≥ 411)', wk.nu.gehaald, wk.nu);

  console.log('5. Week 26 okt: rustweek aankondigen mag niet meer (oktober is op)');
  await naar(15);   // ma 26 okt
  wk = await h.week();
  check('streak 2 na week 19 okt', wk.streak === 2, wk.streak);
  const r = await R(() => window.PQStore.doe('rustweek', {}));
  check('rustweek aankondigen in oktober geweigerd', !r.ok, r);
  const wk2 = await h.week();
  check('aankondigen breekt de streak niet achteraf', wk2.streak === 2, wk2.streak);
  await naar(22);   // ma 2 nov: week 26 okt niet gehaald, oktober-rustweek op → streak breekt
  wk = await h.week();
  check('streak 0, record 2', wk.streak === 0 && wk.record === 2, { s: wk.streak, r: wk.record });
  await h.tab('vandaag');
  check('Vandaag toont record 2', await R(() => /record 2/.test(document.querySelector('.weekdoel').textContent)));
  await h.foto('c04-streak-gebroken');
  // November: rustweek vooraf aankondigen via de UI
  await h.tab('meer');
  await h.tikTekst('#view-meer button', 'Deze week is een rustweek'); await wacht(300);
  await h.tikTekst('.sheet-voet button', 'Neem rustweek'); await wacht(400);
  wk = await h.week();
  check('rustweek nov: norm 0, bevroren', wk.nu.norm === 0 && wk.nu.bevroren, wk.nu);
  await h.tab('vandaag');
  await h.foto('c05-rustweek-vandaag');

  console.log('6. Zondagterugblik (zo 8 nov 20:00)');
  await dag(28.25); await p.reload({ waitUntil: 'load' }); await wacht(1300);
  console.log('   ', await R(() => new Date().toString()));
  await h.tab('meer');
  await R(() => document.querySelector('#meer-terugblik').scrollIntoView()); await wacht(200);
  await h.foto('c06-terugblik');
  await h.tikTekst('#meer-terugblik button', 'Start terugblik'); await wacht(400);
  await h.tikTekst('.sheet .chip', '5');
  await p.type('.sheet textarea[aria-label="Trots op"]', 'Badkamer samen gedaan');
  await h.foto('c07-terugblik-cijfer');
  await h.tikTekst('.sheet-voet button', 'Bewaar (privé)'); await wacht(400);
  await h.tikTekst('#meer-terugblik button', 'Tessie vult in'); await wacht(400);
  await h.tikTekst('.sheet .chip', '2');
  await p.type('.sheet textarea[aria-label="Zat me dwars"]', 'De was bleef liggen');
  await h.tikTekst('.sheet-voet button', 'Bewaar (privé)'); await wacht(400);
  await h.tikTekst('#meer-terugblik button', 'Onthul samen'); await wacht(500);
  check('gespreksvraag bij verschil 3', await R(() => /Eén vraag voor samen/.test(document.querySelector('.sheet').textContent)));
  await h.foto('c08-onthuld');
  await h.sheetDicht();
  const st = await h.st(), wkey = Object.keys(st.terugblik).pop(), tb = st.terugblik[wkey];
  check('tekst gewist na sluiten, cijfers blijven', tb.hidde.trots === '' && tb.tessie.dwars === '' && tb.hidde.cijfer === 5 && tb.tessie.cijfer === 2, tb);
  await h.foto('c09-terugblik-na');

  const f = await h.jsFouten();
  check('0 JS-fouten', f.length === 0, f);
  await h.browser.close(); s.close();
  console.log(JSON.stringify(telling()));
})().catch(e => { console.error('CRASH', e); process.exit(1); });
