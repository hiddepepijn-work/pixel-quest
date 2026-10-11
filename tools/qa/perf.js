// QA performance: frametijd met CPU-throttling 4×, lange taken, pauzeert het huis buiten beeld? En offline fonts.
'use strict';
const { start, server, check, telling, wacht, DIST } = require('./hulp');

const TELLER = `(() => {
  const echt = window.requestAnimationFrame.bind(window);
  window.__qa = { raf: 0, frames: [], timers: 0, lang: [] };
  window.requestAnimationFrame = cb => echt(t => { window.__qa.raf++; cb(t); });
  const st = window.setTimeout.bind(window);
  window.setTimeout = (f, ms, ...a) => { window.__qa.timers++; return st(f, ms, ...a); };
  try { new PerformanceObserver(l => l.getEntries().forEach(e => window.__qa.lang.push(Math.round(e.duration)))).observe({ type: 'longtask', buffered: true }); } catch (e) {}
})();`;

(async () => {
  const { s, url } = await server(DIST);
  const h = await start(), { p, R } = h;
  await p.evaluateOnNewDocument(TELLER);
  await p.goto(url + 'index.html?test', { waitUntil: 'load' }); await wacht(1000);
  await h.tik('.wiekaart[aria-label="Ik ben Hidde"]'); await wacht(1500);
  const cdp = await p.target().createCDPSession();
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  async function meet(naam, ms = 4000) {
    await R(() => { window.__qa.raf = 0; window.__qa.timers = 0; window.__qa.lang = []; window.__qa.d = []; let v = performance.now(); const l = t => { window.__qa.d.push(t - v); v = t; if (window.__qa.meet) requestAnimationFrame(l); }; window.__qa.meet = true; requestAnimationFrame(l); });
    await wacht(ms);
    const r = await R(() => { window.__qa.meet = false; const d = window.__qa.d.slice(2).sort((a, b) => a - b); const q = f => Math.round(d[Math.floor(d.length * f)] || 0); return { fps: Math.round(d.length / (d.reduce((a, b) => a + b, 0) / 1000)), p50: q(0.5), p95: q(0.95), max: Math.round(d[d.length - 1] || 0), raf: window.__qa.raf - d.length - 2, timers: window.__qa.timers, lang: window.__qa.lang }; });
    console.log(`    ${naam}: ${JSON.stringify(r)}`);
    return r;
  }
  console.log('1. Frametijd met CPU 4× trager');
  const v = await meet('Vandaag (compact huis loopt)');
  check('Vandaag: p95 frametijd < 50 ms bij 4× throttling', v.p95 < 50, v);
  await h.tab('huis'); await wacht(1500);
  const hu = await meet('Huis volledig');
  check('Huis: p95 frametijd < 50 ms bij 4× throttling', hu.p95 < 50, hu);
  // pinch-achtig: zoomknoppen met hertekenen
  await R(() => { window.__qa.lang = []; document.querySelector('.zoomknoppen [aria-label="Inzoomen"]').click(); });
  await wacht(1500);
  const lang = await R(() => window.__qa.lang);
  console.log('    lange taken bij inzoomen (hertekenen):', JSON.stringify(lang));
  await h.tab('quests'); await wacht(1500);
  const q = await meet('Quests (huis buiten beeld)', 3000);
  check('buiten beeld: huis vraagt geen animatieframes meer aan', q.raf <= 2, q);
  check('buiten beeld: weinig timers (< 10 in 3 s)', q.timers < 10, q);
  await h.tab('meer'); await wacht(800);
  const m = await meet('Meer', 3000);
  check('Meer: geen animatieframes van het huis', m.raf <= 2, m);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  const f = await h.jsFouten();
  check('0 JS-fouten', f.length === 0, f);
  await h.browser.close();

  console.log('2. Offline: Google Fonts onbereikbaar');
  const o = await start({ offline: true });
  const t0 = Date.now();
  await o.p.goto(url + 'index.html?test', { waitUntil: 'load' }); const laad = Date.now() - t0; await wacht(800);
  await o.tik('.wiekaart[aria-label="Ik ben Tessie"]'); await wacht(1000);
  const fonts = await o.R(async () => { await document.fonts.ready; return { geladen: [...document.fonts].filter(f => f.status === 'loaded').map(f => f.family), h1: getComputedStyle(document.querySelector('h1')).fontFamily }; });
  console.log(`    laadtijd ${laad} ms, fonts ${JSON.stringify(fonts)}`);
  await o.foto('o01-offline-vandaag');
  await o.tab('quests'); await o.foto('o02-offline-quests');
  await o.tab('meer'); await o.foto('o03-offline-meer');
  check('offline: lokale fonts geladen', fonts.geladen.includes('Pixelify Sans') && fonts.geladen.includes('Nunito'), fonts);
  check('offline: app laadt en werkt', await o.R(() => !!document.querySelector('#view-meer .meerkaart')));
  const fo = await o.jsFouten();
  check('offline: 0 JS-fouten', fo.length === 0, fo);
  await o.browser.close(); s.close();
  console.log(JSON.stringify(telling()));
})().catch(e => { console.error('CRASH', e); process.exit(1); });
