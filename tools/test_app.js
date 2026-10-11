// Scenariotest van de app in Edge (puppeteer-core), telefoon 402×874 met touch en daarna desktop 1400×900.
//   node tools/test_app.js [--dist] [--uit map]
// puppeteer-core hoort niet in de repo: installeer het ergens anders en wijs ernaar met PQ_PUPPETEER, bv.
//   PQ_PUPPETEER=C:/pad/node_modules/puppeteer-core node tools/test_app.js
// Scenario: eerste start + "Wie ben jij?", taak maken, afronden (feestje, weekdoel en pot stijgen), ongedaan maken,
// claimen, Huis: knijpzoom met twee vingers en pannen, verbouwing kopen met akkoord, kleding kopen, herladen
// (alles bewaard), en elk tabblad zonder JS-fouten en zonder horizontale scroll. Schermafbeeldingen in --uit.
'use strict';
const path = require('path'), fs = require('fs'), os = require('os');
const puppeteer = require(process.env.PQ_PUPPETEER || 'puppeteer-core');
const arg = n => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : null; };
const DIST = process.argv.includes('--dist');
const ROOT = path.resolve(__dirname, '..');
const PAGINA = 'file:///' + path.join(ROOT, DIST ? 'dist' : 'app', 'index.html').replace(/\\/g, '/');
const UIT = path.resolve(arg('--uit') || path.join(ROOT, 'test-uitvoer', DIST ? 'dist' : 'app'));
const EDGE = process.env.PQ_EDGE || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
fs.mkdirSync(UIT, { recursive: true });
const wacht = ms => new Promise(r => setTimeout(r, ms));
let ok = 0, mis = 0;
function check(naam, waar, extra) {
  if (waar) { ok++; console.log('  ✓ ' + naam); } else { mis++; console.log('  ✗ ' + naam + (extra != null ? '  (' + JSON.stringify(extra) + ')' : '')); }
}

(async () => {
  const profiel = fs.mkdtempSync(path.join(os.tmpdir(), 'pq-test-'));
  const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', userDataDir: profiel, args: ['--allow-file-access-from-files'] });
  const p = await browser.newPage();
  await p.setViewport({ width: 402, height: 874, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const fouten = [];
  p.on('pageerror', e => fouten.push('pageerror: ' + e.message));
  p.on('console', m => { if (m.type() === 'error' && !/fonts\.g/.test(m.text())) fouten.push('console: ' + m.text()); });
  const st = () => p.evaluate(() => JSON.parse(JSON.stringify(window.PQStore.staat())));
  const R = (f, ...a) => p.evaluate(f, ...a);
  const week = () => R(() => { const R = window.PQRegels, S = window.PQStore; return { w: R.weken(S.staat(), Date.now()).nu, pot: R.pot(S.staat(), Date.now()) }; });
  async function foto(naam) {
    await p.evaluate(() => { const t = document.getElementById('pq-test'); if (t) t.style.visibility = 'hidden'; });
    await p.screenshot({ path: path.join(UIT, naam + '.png') });
    await p.evaluate(() => { const t = document.getElementById('pq-test'); if (t) t.style.visibility = ''; });
  }
  const tik = async sel => { await p.waitForSelector(sel, { visible: true, timeout: 5000 }); await p.tap(sel); };
  const tikTekst = async (sel, tekst) => {
    const h = await p.evaluateHandle((s, t) => [...document.querySelectorAll(s)].find(e => e.textContent.includes(t) && e.offsetParent), sel, tekst);
    if (!h.asElement()) throw new Error(`niet gevonden: ${sel} "${tekst}"`);
    await h.asElement().tap();
  };
  const tab = async n => { await tik(`.tabbalk [data-tab="${n}"]`); await wacht(700); };

  console.log('1. Eerste start en "Wie ben jij?"');
  await p.goto(PAGINA + '?test&geenweer', { waitUntil: 'load' });
  await wacht(1500);
  check('welkomstscherm zichtbaar', await R(() => !!document.querySelector('.welkom')));
  await foto('01-wie-ben-jij');
  await tik('.wiekaart[aria-label="Ik ben Hidde"]');
  await wacht(1200);
  check('profiel is Hidde', await R(() => window.PQStore.ik() === 'hidde'));
  check('Vandaag zichtbaar', await R(() => !document.getElementById('view-vandaag').hidden));
  check('voorbeeldtaken geladen', Object.keys((await st()).taken).length >= 10);
  await foto('02-vandaag');

  console.log('2. Taak maken');
  await tikTekst('#view-vandaag button', '+ Taak');
  await wacht(400);
  await p.type('.sheet input[type=text]', 'Ramen lappen');
  await tikTekst('.sheet .chip', 'Ik');
  await foto('03-taak-maken');
  await tikTekst('.sheet-voet .knop', 'Op het bord');
  await wacht(500);
  let s = await st();
  const taak = Object.values(s.taken).find(t => t.titel === 'Ramen lappen');
  check('taak bestaat met eigenaar Hidde', taak && taak.eigenaar === 'hidde', taak);
  check('taak staat op Vandaag', await R(id => !!document.querySelector(`#view-vandaag [data-taak="${id}"]`), taak.id));
  console.log('3. Afronden: feestje, weekdoel en pot stijgen');
  const voor = await week();
  await tik(`#view-vandaag [data-taak="${taak.id}"] .gieter`);
  await wacht(150);
  check('feestje (sterretjes) verschijnt', await R(() => !!document.querySelector('.feestlaag .ster')));
  await foto('04-afgerond-feestje');
  const na = await week();
  const inzet = Math.round(taak.minuten * (1 + 0.3 * taak.zwaarte));
  check(`weekdoel +${inzet}`, na.w.totaal === voor.w.totaal + inzet, [voor.w.totaal, na.w.totaal]);
  check('huispot stijgt', na.pot.saldo > voor.pot.saldo, [voor.pot.saldo, na.pot.saldo]);
  check('melding met "Ongedaan maken"', await R(() => /Ongedaan/.test(document.getElementById('melding').textContent) && !document.getElementById('melding').hidden));

  console.log('4. Ongedaan maken');
  await tikTekst('#melding .knop', 'Ongedaan');
  await wacht(400);
  const terug = await week();
  check('weekdoel terug', terug.w.totaal === voor.w.totaal, terug.w.totaal);
  check('pot terug', terug.pot.saldo === voor.pot.saldo, terug.pot.saldo);
  check('taak weer open', (await st()).taken[taak.id].status === 'open');

  console.log('5. Claimen');
  await tab('quests');
  await tikTekst('#view-quests .chip', 'Open');
  await wacht(300);
  await foto('05-quests-open');
  const openId = await R(() => { const li = document.querySelector('#view-quests .taak .actie .knop'); return li && li.closest('.taak').dataset.taak; });
  await tikTekst('#view-quests .taak .actie .knop', 'Ik pak het');
  await wacht(300);
  s = await st();
  check('taak geclaimd door Hidde', s.taken[openId] && s.taken[openId].claim && s.taken[openId].claim.door === 'hidde', s.taken[openId] && s.taken[openId].claim);

  console.log('6. Huis: knijpzoom en pannen');
  await tab('huis');
  await wacht(900);
  const cdp = await p.target().createCDPSession();
  const zs = () => R(() => window.PQHuis.actief().zoom.stand());
  const touch = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts });
  async function knijp(cx, cy, van, naar) {
    const pts = d => [{ x: cx - d / 2, y: cy, id: 0 }, { x: cx + d / 2, y: cy, id: 1 }];
    await touch('touchStart', pts(van));
    for (let i = 1; i <= 10; i++) { await touch('touchMove', pts(van + (naar - van) * i / 10)); await wacht(16); }
    await touch('touchEnd', []);
    await wacht(700);
  }
  const z0 = await zs();
  await knijp(200, 450, 80, 200);
  const z1 = await zs();
  check('twee vingers uit elkaar: inzoomen', z1.eff > z0.eff, [z0.eff, z1.eff]);
  check('na het gebaar een hele zoomstap (scherp)', Math.abs(z1.eff - Math.round(z1.eff)) < 1e-6 && z1.zr === Math.round(z1.eff), z1);
  await foto('06-huis-ingezoomd');
  await knijp(200, 450, 260, 60);
  const z2 = await zs();
  check('twee vingers naar elkaar: uitzoomen', z2.eff < z1.eff, [z1.eff, z2.eff]);
  await R(() => window.PQHuis.actief().zoom.naar(300, 150, 2));
  const p0 = await zs();
  await touch('touchStart', [{ x: 260, y: 450, id: 0 }]);
  for (let i = 1; i <= 8; i++) { await touch('touchMove', [{ x: 260 - i * 15, y: 450, id: 0 }]); await wacht(16); }
  await touch('touchEnd', []);
  await wacht(1200);
  const p1 = await zs();
  check('één vinger slepen: pannen', p1.tx < p0.tx - 20, [p0.tx, p1.tx]);
  await tik('.zoomknoppen .pas');
  await wacht(500);
  const z3 = await zs(), grens = await R(() => window.PQHuis.actief().zoom.grens());
  check('"alles in beeld" zoomt naar de kleinste stand', Math.abs(z3.eff - grens.min) < 0.01, [z3.eff, grens.min]);
  await foto('07-huis-alles-in-beeld');
  await tik('.zoomknoppen [aria-label="Inzoomen"]');
  await wacht(600);
  check('knop + zoomt in', (await zs()).eff > z3.eff);
  const zbewaard = await R(() => window.PQStore.apparaat().huisZoom);
  check('zoom wordt bewaard', zbewaard && zbewaard.eff > 0, zbewaard);

  console.log('6b. Bewerken: meubel slepen, lege plek pant');
  await tikTekst('#view-huis .knop', 'Bewerken');
  await wacht(600);
  await R(() => window.PQHuis.actief().zoom.naar(330, 160, 2));
  await wacht(200);
  const kandidaten = await R(() => {
    const inr = window.PQStore.staat().huis.inrichting, H = window.PQ_HUIS, vw = innerWidth, vh = innerHeight - 80;
    return [...document.querySelectorAll('#view-huis .meubel.sleepbaar')].map(e => ({ id: e.dataset.id, r: e.getBoundingClientRect() }))
      .filter(x => { const i = inr.find(y => y.id === x.id); return i && H.meubels[i.soort].op === 'vloer' && x.r.left > 0 && x.r.right < vw - 60 && x.r.top > 240 && x.r.bottom < vh; })
      .map(x => ({ id: x.id, x: x.r.left + x.r.width / 2, y: x.r.top + x.r.height / 2 }));
  });
  check('een sleepbaar meubel in beeld', kandidaten.length > 0, kandidaten.length);
  let verschoven = false, panVast = true;
  for (const doel of kandidaten) {
    for (const dx of [-80, 80]) {
      const voorM = (await st()).huis.inrichting.find(i => i.id === doel.id), voorZ = await zs();
      await touch('touchStart', [{ x: doel.x, y: doel.y, id: 0 }]);
      for (let i = 1; i <= 8; i++) { await touch('touchMove', [{ x: doel.x + dx * i / 8, y: doel.y, id: 0 }]); await wacht(16); }
      await touch('touchEnd', []);
      await wacht(500);
      const naM = (await st()).huis.inrichting.find(i => i.id === doel.id), naZ = await zs();
      if (Math.abs(naZ.tx - voorZ.tx) >= 1) panVast = false;
      if (naM && (naM.x !== voorM.x || naM.kamer !== voorM.kamer)) { verschoven = true; break; }
    }
    if (verschoven) break;
  }
  check('meubel verschoven (opdracht huis.inrichting)', verschoven);
  check('slepen van een meubel pant niet', panVast);
  const lv = await zs();
  await touch('touchStart', [{ x: 200, y: 300, id: 0 }]);
  for (let i = 1; i <= 8; i++) { await touch('touchMove', [{ x: 200 + i * 12, y: 300, id: 0 }]); await wacht(16); }
  await touch('touchEnd', []);
  await wacht(1200);
  check('bewerkmodus: een lege plek pant wel', Math.abs((await zs()).tx - lv.tx) > 20);
  await foto('07b-huis-bewerken');
  await tikTekst('#view-huis .knop', 'Klaar');
  await wacht(400);

  console.log('7. Verbouwen met akkoord');
  await tab('meer');
  await R(() => { document.querySelector('details.debug').open = true; });
  await tikTekst('#view-meer .knop', 'testweken');
  await wacht(500);
  const potVoor = (await week()).pot.saldo;
  check('pot gevuld voor de test', potVoor >= 400, potVoor);
  await tab('huis');
  await tikTekst('#view-huis .knop', 'Verbouwen');
  await wacht(600);
  await foto('08-verbouwen');
  await tikTekst('.sheet .knop', 'Kopen (voorstel)');
  await wacht(500);
  check('voorstel staat open', (await st()).voorstellen.some(v => v.status === 'open' && v.soort === 'verbouwing'));
  await foto('09-voorstel');
  await tikTekst('.sheet .knop', 'keurt goed (op dit apparaat)');
  await wacht(900);
  s = await st();
  check('huis is niveau 2', s.huis.niveau === 2, s.huis.niveau);
  check('400 munten uit de pot', (await week()).pot.saldo === potVoor - 400);
  await foto('10-huis-niveau-2');

  console.log('8. Kleding kopen met akkoord');
  await tab('kast');
  await wacht(600);
  await tikTekst('#itemRooster .tegel', 'Petje');
  await wacht(300);
  await foto('11-kast-petje');
  await tikTekst('#itemDetail .knop', 'Kopen');
  await wacht(400);
  await tikTekst('.sheet .knop', 'keurt goed (op dit apparaat)');
  await wacht(700);
  s = await st();
  check('petje in bezit van Hidde', s.kleding.bezit.hidde.petje && s.kleding.bezit.hidde.petje.length === 1, s.kleding.bezit.hidde.petje);
  await foto('12-kast-gekocht');
  console.log('9. Herladen: alles bewaard');
  const logVoor = await R(() => window.PQStore.log().length);
  await p.reload({ waitUntil: 'load' });
  await wacht(1600);
  s = await st();
  check('geen "Wie ben jij?" meer', await R(() => !document.querySelector('.welkom')));
  check('logboek even lang', (await R(() => window.PQStore.log().length)) === logVoor);
  check('huis nog niveau 2', s.huis.niveau === 2);
  check('petje nog in bezit', !!s.kleding.bezit.hidde.petje);
  check('claim bewaard', s.taken[openId].claim && s.taken[openId].claim.door === 'hidde');
  check('taak "Ramen lappen" bewaard', Object.values(s.taken).some(t => t.titel === 'Ramen lappen'));
  check('zelfde tabblad na herladen (kast)', await R(() => !document.getElementById('view-kast').hidden));

  console.log('10. Elk tabblad: 0 JS-fouten, geen horizontale scroll');
  for (const n of ['vandaag', 'quests', 'huis', 'kast', 'meer']) {
    await tab(n);
    await wacht(500);
    const breed = await R(n => { const v = document.getElementById('view-' + n); return { v: v.scrollWidth - v.clientWidth, d: document.documentElement.scrollWidth - innerWidth }; }, n);
    check(`${n}: geen horizontale scroll`, breed.v <= 1 && breed.d <= 0, breed);
    await foto('20-telefoon-' + n);
    if (n !== 'huis') { await R(n => { const v = document.getElementById('view-' + n); v.scrollTop = v.scrollHeight; }, n); await wacht(300); await foto('20-telefoon-' + n + '-onder'); }
  }
  // Sheets: taakdetails, weekterugblik en instellingen als schermafbeelding.
  await tab('vandaag');
  await R(() => document.querySelector('#view-vandaag .taak .open-knop').click());
  await wacht(400); await foto('21-taakdetails');
  await R(() => window.PQUI.sluitAlles()); await wacht(300);
  await tab('meer');
  await R(() => document.getElementById('meer-terugblik').scrollIntoView()); await wacht(200); await foto('22-meer-terugblik');
  await R(() => document.getElementById('meer-instellingen').scrollIntoView()); await wacht(200); await foto('23-meer-instellingen');
  await R(() => document.getElementById('meer-over').scrollIntoView()); await wacht(200); await foto('24-meer-sync');
  const jsFouten = await R(() => (window.PQ_TEST ? window.PQ_TEST.fouten : ['geen testindicator']));
  check('0 JS-fouten (telefoon)', !jsFouten.length && !fouten.length, jsFouten.concat(fouten));

  console.log('11. Desktop 1400×900');
  const d = await browser.newPage();
  const dFouten = [];
  d.on('pageerror', e => dFouten.push(e.message));
  await d.setViewport({ width: 1400, height: 900 });
  for (const n of ['vandaag', 'quests', 'huis', 'kast', 'meer']) {
    await d.goto(PAGINA + '?test&geenweer#' + n, { waitUntil: 'load' });
    await wacht(1300);
    await d.evaluate(() => { const t = document.getElementById('pq-test'); if (t) t.style.visibility = 'hidden'; });
    await d.screenshot({ path: path.join(UIT, '30-desktop-' + n + '.png') });
  }
  await d.goto(PAGINA + '?test&geenweer#huis', { waitUntil: 'load' });
  await wacht(1200);
  const voorW = await d.evaluate(() => window.PQHuis.actief().zoom.stand().eff);
  await d.mouse.move(700, 450);
  await d.keyboard.down('Control'); await d.mouse.wheel({ deltaY: -400 }); await d.keyboard.up('Control');
  await wacht(800);
  const naW = await d.evaluate(() => window.PQHuis.actief().zoom.stand().eff);
  check('desktop: Ctrl + scrollwiel zoomt in', naW > voorW, [voorW, naW]);
  const dT = await d.evaluate(() => (window.PQ_TEST ? window.PQ_TEST.fouten : []));
  check('0 JS-fouten (desktop)', !dT.length && !dFouten.length, dT.concat(dFouten));

  console.log('12. Minder beweging');
  const m = await browser.newPage();
  await m.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await m.setViewport({ width: 402, height: 874, isMobile: true, hasTouch: true });
  await m.goto(PAGINA + '?test&geenweer#vandaag', { waitUntil: 'load' });
  await wacht(1200);
  check('reduced motion: 0 JS-fouten', (await m.evaluate(() => window.PQ_TEST.fouten.length)) === 0);

  await browser.close();
  try { fs.rmSync(profiel, { recursive: true, force: true }); } catch (e) { /* Edge houdt soms nog een bestand vast */ }
  console.log(`\n${ok} goed, ${mis} fout. Schermafbeeldingen: ${UIT}`);
  process.exit(mis ? 1 : 0);
})().catch(e => { console.error('TEST AFGEBROKEN:', e.message); console.log(`${ok} goed, ${mis} fout (tot de breuk)`); process.exit(2); });
