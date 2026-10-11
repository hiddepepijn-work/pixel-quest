// Kleine fixes nalopen: melding wegtikken, export in de app (Capacitor nagebootst), terugblik op maandag.
'use strict';
const { start, server, check, telling, wacht, DIST } = require('./hulp');
(async () => {
  const { s, url } = await server(DIST);
  const h = await start(), { p, R } = h;
  await p.evaluateOnNewDocument(() => { window.Capacitor = { isNativePlatform: () => true }; });
  await p.goto(url + 'index.html?test', { waitUntil: 'load' }); await wacht(1000);
  const basis = await R(() => new Date(2026, 9, 11, 20, 0).getTime() - Date.now());
  await R(b => localStorage.setItem('qa-klok', String(b)), basis); await p.reload({ waitUntil: 'load' }); await wacht(1000);
  await h.tik('.wiekaart[aria-label="Ik ben Hidde"]'); await wacht(800);
  await R(() => window.PQUI.meld('Test melding'));
  await h.tik('#melding span'); await wacht(200);
  check('melding verdwijnt bij tik', await R(() => document.getElementById('melding').hidden));
  await h.tab('meer');
  await R(() => document.querySelector('#meer-over').scrollIntoView());
  await h.tikTekst('#view-meer button', 'Exporteer (JSON)'); await wacht(400);
  check('export in de app: sheet met tekst', await R(() => /"versie"/.test(document.querySelector('.sheet textarea').value)));
  await h.foto('k01-export-sheet');
  await h.sheetDicht();
  // zondag 20:00 Hidde vult in, maandag opent de terugblik op vorige week
  await R(() => { const S = window.PQStore, R = window.PQRegels; S.doe('terugblik', { week: R.weekVan(Date.now()), cijfer: 4 }); });
  await R(b => localStorage.setItem('qa-klok', String(b + 864e5 * 0.6)), basis); await p.reload({ waitUntil: 'load' }); await wacht(1200);
  await h.tab('meer');
  const txt = await R(() => document.querySelector('#meer-terugblik').textContent);
  check('maandag: terugblik toont vorige week (cijfer bewaard)', /Jouw cijfer is bewaard/.test(txt), txt.slice(0, 200));
  const f = await h.jsFouten(); check('0 JS-fouten', f.length === 0, f);
  await h.browser.close(); s.close(); console.log(JSON.stringify(telling()));
})().catch(e => { console.error('CRASH', e); process.exit(1); });
