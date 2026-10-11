// QA deel 1: eerste start, profiel wisselen, taak maken/bewerken/verwijderen, claimen, "Kun jij?", bedanken,
// afronden + ongedaan, lange titels. Via http (zoals capacitor://localhost) en een korte rook-test via file://.
'use strict';
const { start, server, check, telling, wacht, DIST } = require('./hulp');
const W = +(process.argv[2] || 390), HH = +(process.argv[3] || 844), PF = W === 390 ? 'a' : 'b';

(async () => {
  const { s, url } = await server(DIST);
  const h = await start({ w: W, h: HH }), { p, R } = h;
  console.log(`== ${W}×${HH} via ${url}`);
  await p.goto(url + 'index.html?test', { waitUntil: 'load' }); await wacht(1500);
  console.log('1. Eerste start');
  check('welkom zichtbaar', await R(() => !!document.querySelector('.welkom')));
  check('tabbalk niet bereikbaar achter welkom', await R(() => { const w = document.querySelector('.welkom'); const r = w.getBoundingClientRect(); return r.height >= innerHeight - 1; }));
  await h.foto(PF + '01-welkom');
  await h.tik('.wiekaart[aria-label="Ik ben Tessie"]'); await wacht(1200);
  check('ik = tessie', await R(() => window.PQStore.ik() === 'tessie'));
  await h.foto(PF + '02-vandaag');
  // Vandaag doorscrollen
  for (const [i, y] of [[1, 700], [2, 1400], [3, 3000]]) { await R(y => document.querySelector('#view-vandaag').scrollTo(0, y), y); await wacht(300); await h.foto(PF + '02-vandaag-' + i); }
  await R(() => document.querySelector('#view-vandaag').scrollTo(0, 0));

  console.log('2. Profiel wisselen');
  await h.tik('#view-vandaag .avatarknop'); await wacht(700);
  check('naar Meer bij avatar', await R(() => !document.getElementById('view-meer').hidden));
  await h.tikTekst('#view-meer button', 'Ik ben Hidde'); await wacht(400);
  await h.foto(PF + '03-wissel-vraag');
  await h.tikTekst('.sheet-voet button', 'Wissel'); await wacht(600);
  check('ik = hidde', await R(() => window.PQStore.ik() === 'hidde'));
  await h.tab('vandaag');
  check('avatar Vandaag = hidde', await R(() => document.querySelector('#view-vandaag .avatarknop').classList.contains('hidde')));

  console.log('3. Taak maken, bewerken, verwijderen');
  const lang = 'Heel erg lange taaknaam om te testen of de layout niet breekt: zolderkamer opruimen en dozen sorteren';
  await h.tikTekst('#view-vandaag button', '+ Taak'); await wacht(500);
  await h.foto(PF + '04-nieuwe-taak');
  await p.type('.sheet input[type=text]', lang);
  await h.tikTekst('.sheet .chip', 'Ik');
  await h.tikTekst('.sheet summary', 'Meer');
  await h.foto(PF + '04-nieuwe-taak-meer');
  await R(() => document.querySelector('.sheet-binnen').scrollTo(0, 9999)); await wacht(200);
  await h.foto(PF + '04-nieuwe-taak-onder');
  check('sheet-voet in beeld (Meer open)', await R(() => { const v = document.querySelector('.sheet-voet').getBoundingClientRect(), k = document.querySelector('.sheet-kop').getBoundingClientRect(); return v.bottom <= innerHeight + 1 && k.top >= 0; }));
  await h.tikTekst('.sheet-voet .knop', 'Op het bord'); await wacht(500);
  let st = await h.st();
  const t1 = Object.values(st.taken).find(t => t.titel.startsWith('Heel erg lange'));
  check('lange taak gemaakt, titel max 80', t1 && t1.titel.length === 80 && t1.eigenaar === 'hidde', t1 && t1.titel.length);
  await h.tab('quests');
  await h.tikTekst('#view-quests .chip', 'Mijn');
  await h.foto(PF + '05-quests-mijn');
  check('geen horizontale scroll (quests, lange titel)', !(await h.horizontaal()));
  // bewerken
  await h.tik(`#view-quests [data-taak="${t1.id}"] .open-knop`); await wacht(500);
  await h.foto(PF + '06-detail-lang');
  await h.tikTekst('.sheet-voet button', 'Bewerken'); await wacht(500);
  await p.$eval('.sheet input[type=text]', e => { e.value = ''; });
  await p.type('.sheet input[type=text]', 'Zolder opruimen');
  await h.tikTekst('.sheet .chip', 'Samen');
  await h.tikTekst('.sheet-voet .knop', 'Opslaan'); await wacht(500);
  st = await h.st();
  check('bewerkt: titel + samen', st.taken[t1.id].titel === 'Zolder opruimen' && st.taken[t1.id].eigenaar === 'samen', st.taken[t1.id]);
  // verwijderen
  await h.tikTekst('#view-quests .chip', 'Alles');
  await h.tik(`#view-quests [data-taak="${t1.id}"] .open-knop`); await wacht(500);
  await h.tikTekst('.sheet button', 'Verwijder taak'); await wacht(400);
  await h.foto(PF + '07-verwijder-vraag');
  await h.tikTekst('.sheet-voet button', 'Verwijder'); await wacht(600);
  st = await h.st();
  check('verwijderd', st.taken[t1.id].status === 'weg');
  check('geen sheets meer open na verwijderen', await R(() => document.querySelectorAll('.sheet-achter').length === 0));
  check('niet meer in de lijst', await R(id => !document.querySelector(`#view-quests [data-taak="${id}"]`), t1.id));

  console.log('4. Claimen, Kun jij?, bedanken');
  await h.tikTekst('#view-quests .chip', 'Open');
  const open1 = await R(() => document.querySelector('#view-quests .takenlijst li.taak')?.dataset.taak);
  await h.tikTekst(`#view-quests [data-taak="${open1}"] button`, 'Ik pak het'); await wacht(400);
  st = await h.st();
  check('claim door hidde', st.taken[open1].claim && st.taken[open1].claim.door === 'hidde');
  // Kun jij, Tessie? op een prikbordtaak
  const open2 = await R(() => document.querySelector('#view-quests .takenlijst li.taak')?.dataset.taak);
  await h.tik(`#view-quests [data-taak="${open2}"] .open-knop`); await wacht(500);
  await h.foto(PF + '08-detail-prikbord');
  await h.tikTekst('.sheet button', 'Kun jij, Tessie?'); await wacht(400);
  st = await h.st();
  check('verzoek aan tessie', st.taken[open2].verzoek_aan === 'tessie');
  // als Tessie: verzoek aannemen en afronden
  await R(() => window.PQStore.zetIk('tessie')); await p.reload({ waitUntil: 'load' }); await wacht(1200);
  await h.tab('vandaag');
  check('Tessie: "Gevraagd aan jou" zichtbaar', await R(() => [...document.querySelectorAll('#view-vandaag h2')].some(e => /Gevraagd/.test(e.textContent))));
  check('badge op Quests = 1', await R(() => document.querySelector('[data-tab="quests"] .tabbadge').textContent === '1'));
  await h.foto(PF + '09-tessie-gevraagd');
  await h.tikTekst(`#view-vandaag [data-taak="${open2}"] button`, 'Ja, ik doe het'); await wacht(400);
  st = await h.st();
  check('tessie claimt na ja', st.taken[open2].claim && st.taken[open2].claim.door === 'tessie' && !st.taken[open2].verzoek_aan);
  await h.tik(`#view-vandaag [data-taak="${open2}"] .gieter`); await wacht(400);
  st = await h.st();
  const af = st.afrondingen.find(a => a.taak === open2);
  check('afgerond door tessie', af && af.door === 'tessie');
  await R(() => window.PQStore.zetIk('hidde')); await p.reload({ waitUntil: 'load' }); await wacht(1200);
  await h.tab('quests');
  await R(() => document.querySelector('#view-quests details.later:last-of-type summary')?.click()); await wacht(300);
  await R(() => document.querySelector('#view-quests').scrollTo(0, 99999)); await wacht(300);
  await h.foto(PF + '10-gedaan-deze-week');
  await h.tikTekst('#view-quests .lijst-gedaan button', 'Bedank'); await wacht(400);
  st = await h.st();
  check('bedankje van hidde aan tessie', st.bedankjes.some(b => b.van === 'hidde' && b.aan === 'tessie'));

  console.log('5. Afronden en ongedaan');
  await h.tab('vandaag');
  const vk = await h.week();
  const eerste = await R(() => document.querySelector('#view-vandaag li.taak')?.dataset.taak);
  await h.tik(`#view-vandaag [data-taak="${eerste}"] .gieter`); await wacht(200);
  await h.foto(PF + '11-afgerond-melding');
  const vk2 = await h.week();
  check('weektotaal steeg', vk2.nu.totaal > vk.nu.totaal, [vk.nu.totaal, vk2.nu.totaal]);
  await h.tikTekst('#melding button', 'Ongedaan maken'); await wacht(400);
  const vk3 = await h.week();
  check('ongedaan: totaal terug', vk3.nu.totaal === vk.nu.totaal);
  check('taak weer zichtbaar', await R(id => !!document.querySelector(`#view-vandaag [data-taak="${id}"]`), eerste));
  // melding mag de tabbalk niet bedekken
  check('melding boven tabbalk', await R(() => { const m = document.getElementById('melding'), t = document.querySelector('.tabbalk'); if (m.hidden) return true; return m.getBoundingClientRect().bottom <= t.getBoundingClientRect().top; }));

  const f = await h.jsFouten();
  check('0 JS-fouten (http)', f.length === 0, f);
  await h.browser.close();

  console.log('6. file:// rooktest');
  const h2 = await start({ w: W, h: HH });
  await h2.p.goto('file:///' + DIST.replace(/\\/g, '/') + '/index.html', { waitUntil: 'load' }); await wacht(1500);
  await h2.tik('.wiekaart[aria-label="Ik ben Hidde"]'); await wacht(800);
  for (const n of ['quests', 'huis', 'kast', 'meer', 'vandaag']) await h2.tab(n);
  const f2 = await h2.jsFouten();
  check('0 JS-fouten (file://)', f2.length === 0, f2);
  await h2.browser.close(); s.close();
  console.log(JSON.stringify(telling()));
})().catch(e => { console.error('CRASH', e); process.exit(1); });
