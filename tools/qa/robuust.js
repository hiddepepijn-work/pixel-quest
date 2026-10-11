// QA robuustheid: rommel in localStorage, geen storage (privémodus), vol geheugen, inputs < 16 px, :hover-regels.
'use strict';
const { start, server, check, telling, wacht, DIST } = require('./hulp');

const ROMMEL = [
  ['pq-app', '{kapot'],
  ['pq-app', '5'],
  ['pq-app', '{"versie":1,"basis":5,"log":[]}'],
  ['pq-app', '{"versie":1,"basis":{"taken":5},"log":[null, 3, {"id":"a","soort":"bestaat.niet","data":{}}]}'],
  ['pq-app', '{"versie":1,"basis":{"taken":{"x":null,"y":{"titel":7}},"huis":"nee","kleding":5,"pets":[]},"log":[{"id":"b","soort":"taak.klaar","data":{"id":"x"}}]}'],
  ['pq-app', '{"versie":99,"basis":{},"log":[]}'],
  ['pq-apparaat', '5'],
  ['pq-apparaat', '"hidde"'],
  ['pq-apparaat', '{"ik":"bob","tab":"nergens","huisZoom":{"eff":"x","cx":null}}'],
  ['pq-apparaat', '{"ik":"hidde","huisZoom":{"eff":1e9,"cx":1e9,"cy":-1e9},"questFilter":"raar"}'],
  ['pq-kk-look', '{"hidde":5,"tessie":"x"}'],
  ['pq-kk-bezit', '[1,2'],
  ['pq-huis-staat', '{"niveau":"zeven","inrichting":5}'],
];

(async () => {
  const { s, url } = await server(DIST);
  console.log('1. Rommel in localStorage');
  for (const [k, v] of ROMMEL) {
    const h = await start(), { p, R } = h;
    await p.goto(url + 'index.html?test', { waitUntil: 'load' }); await wacht(800);
    await R(() => { localStorage.clear(); localStorage.setItem('pq-apparaat', JSON.stringify({ ik: 'hidde' })); });
    await R((k, v) => localStorage.setItem(k, v), k, v);
    await p.reload({ waitUntil: 'load' }); await wacht(1500);
    if (await R(() => !!document.querySelector('.welkom'))) { await h.tik('.wiekaart[aria-label="Ik ben Hidde"]'); await wacht(800); }
    for (const n of ['quests', 'huis', 'kast', 'meer', 'vandaag']) { await R(n => window.PQApp && window.PQApp.ga(n), n); await wacht(500); }
    const werkt = await R(() => !!(window.PQStore && window.PQStore.staat() && document.querySelector('#view-vandaag .weekdoel')));
    const r = await R(() => window.PQStore.doe('taak.nieuw', { titel: 'Na rommel' }).ok).catch(() => false);
    const f = await h.jsFouten();
    check(`${k} = ${v.slice(0, 50)}: app werkt, taak maken lukt, 0 fouten`, werkt && r && f.length === 0, { werkt, r, f: f.slice(0, 3) });
    await h.browser.close();
  }

  console.log('2. Geen localStorage (privémodus/geblokkeerd) en vol geheugen');
  for (const modus of ['gooit', 'vol']) {
    const h = await start(), { p, R } = h;
    await p.evaluateOnNewDocument(m => {
      if (m === 'gooit') Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('Toegang geweigerd', 'SecurityError'); } });
      else { const echt = Storage.prototype.setItem; Storage.prototype.setItem = function (k, v) { if (String(k).startsWith('pq-app')) throw new DOMException('vol', 'QuotaExceededError'); return echt.call(this, k, v); }; }
    }, modus);
    await p.goto(url + 'index.html?test', { waitUntil: 'load' }); await wacht(1500);
    const welkom = await R(() => !!document.querySelector('.welkom'));
    if (welkom) { await h.tik('.wiekaart[aria-label="Ik ben Tessie"]'); await wacht(800); }
    const ik = await R(() => window.PQStore.ik());
    const melding = await R(() => { const m = document.getElementById('melding'); return m.hidden ? '' : m.textContent; });
    for (const n of ['quests', 'huis', 'kast', 'meer', 'vandaag']) { await R(n => window.PQApp && window.PQApp.ga(n), n); await wacht(400); }
    const doe = await R(() => window.PQStore.doe('taak.nieuw', { titel: 'Zonder opslag' }));
    const f = await h.jsFouten();
    console.log(`    ${modus}: welkom=${welkom} ik=${ik} melding="${melding}" doe=${JSON.stringify(doe)}`);
    check(`${modus}: app bruikbaar na "Wie ben jij?" (ik blijft gekozen)`, ik === 'tessie' && !(await R(() => !!document.querySelector('.welkom'))), { ik });
    check(`${modus}: waarschuwing over opslaan`, /Opslaan lukt niet/.test(melding) || /Opslaan lukt niet/.test(await R(() => document.body.textContent)), melding);
    check(`${modus}: 0 JS-fouten`, f.length === 0, f.slice(0, 4));
    await h.foto('r-' + modus);
    await h.browser.close();
  }

  console.log('3. Inputs kleiner dan 16 px en :hover-regels');
  {
    const h = await start(), { p, R } = h;
    await p.goto(url + 'index.html?test', { waitUntil: 'load' }); await wacht(1000);
    await h.tik('.wiekaart[aria-label="Ik ben Hidde"]'); await wacht(800);
    const klein = new Set();
    const meet = async waar => (await R(() => [...document.querySelectorAll('input:not([type=checkbox]):not([type=radio]):not([type=file]), select, textarea')]
      .filter(e => parseFloat(getComputedStyle(e).fontSize) < 16).map(e => (e.id || e.getAttribute('aria-label') || e.className || e.type) + ' ' + getComputedStyle(e).fontSize))).forEach(x => klein.add(waar + ': ' + x));
    for (const n of ['vandaag', 'quests', 'huis', 'kast', 'meer']) { await h.tab(n); await R(() => document.querySelectorAll('details').forEach(d => { d.open = true; })); await wacht(300); await meet(n); }
    await R(() => window.PQTaken.bewerk()); await wacht(400); await R(() => document.querySelectorAll('.sheet details').forEach(d => { d.open = true; })); await meet('taaksheet'); await h.sheetDicht();
    await h.tab('huis'); await R(() => document.querySelector('#view-huis [aria-label="Weer, seizoen en weergave"]').click()); await wacht(400); await R(() => document.querySelectorAll('.sheet details').forEach(d => { d.open = true; })); await meet('weer-sheet'); await h.sheetDicht();
    console.log('    ' + [...klein].join('\n    '));
    check('geen tekstvelden kleiner dan 16 px (iOS zoomt anders in)', klein.size === 0, klein.size);
    const hover = await R(() => { const uit = []; for (const sh of document.styleSheets) { let rules; try { rules = sh.cssRules; } catch (e) { continue; } for (const r of rules) if (r.selectorText && /:hover/.test(r.selectorText)) uit.push((sh.href || '').split('/').pop() + ': ' + r.selectorText); } return uit; });
    console.log('    hover buiten @media (hover: hover):\n      ' + hover.join('\n      '));
    check('geen :hover-regels buiten @media (hover: hover)', hover.length === 0, hover.length);
    await h.browser.close();
  }
  s.close();
  console.log(JSON.stringify(telling()));
})().catch(e => { console.error('CRASH', e); process.exit(1); });
