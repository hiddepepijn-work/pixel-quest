// QA gebaren: knijpen, pannen, dubbeltik, zoomknoppen, geen paginazoom, scherpte na vastklikken, bewerkmodus.
'use strict';
const { start, server, check, telling, wacht, DIST } = require('./hulp');
const W = +(process.argv[2] || 390), HH = +(process.argv[3] || 844), PF = W === 390 ? 'a' : 'b';

(async () => {
  const { s, url } = await server(DIST);
  const h = await start({ w: W, h: HH }), { p, R } = h;
  const cdp = await p.target().createCDPSession();
  const touch = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map((q, i) => ({ x: q[0], y: q[1], id: i })) });
  async function knijp(cx, cy, van, naar, stappen = 10) {
    const pt = d => [[cx - d / 2, cy], [cx + d / 2, cy]];
    await touch('touchStart', pt(van));
    for (let i = 1; i <= stappen; i++) { await touch('touchMove', pt(van + (naar - van) * i / stappen)); await wacht(16); }
    await touch('touchEnd', []); await wacht(700);
  }
  async function veeg(x0, y0, x1, y1, stappen = 10) {
    await touch('touchStart', [[x0, y0]]);
    for (let i = 1; i <= stappen; i++) { await touch('touchMove', [[x0 + (x1 - x0) * i / stappen, y0 + (y1 - y0) * i / stappen]]); await wacht(16); }
    await touch('touchEnd', []); await wacht(900);
  }
  const zoom = () => R(() => { const t = document.querySelector('#view-huis .podium').style.transform; const m = t.match(/translate\(([-\d.]+)px, ([-\d.]+)px\) scale\(([-\d.e]+)\)/); return { t, tx: +m[1], ty: +m[2], s: +m[3], vv: visualViewport.scale }; });
  await p.goto(url + 'index.html?test', { waitUntil: 'load' }); await wacht(1200);
  await h.tik('.wiekaart[aria-label="Ik ben Hidde"]'); await wacht(1000);
  const meta = await R(() => document.querySelector('meta[name=viewport]').content);
  check('viewport-meta: viewport-fit=cover en user-scalable=no', /viewport-fit=cover/.test(meta) && /user-scalable=no/.test(meta), meta);
  const ta = await R(() => ({ html: getComputedStyle(document.documentElement).overscrollBehaviorY, body: getComputedStyle(document.body).overscrollBehaviorY, view: getComputedStyle(document.querySelector('#view-vandaag')).overscrollBehaviorY, menukop: getComputedStyle(document.querySelector('.menu-kop')).touchAction }));
  check('overscroll none op html/body, contain op de menutabs; menukop touch-action none (vegen)', ta.html === 'none' && ta.body === 'none' && ta.view === 'contain' && ta.menukop === 'none', ta);

  console.log('1. Knijpen in het open menu (Vandaag): geen paginazoom');
  await h.tab('vandaag');
  await knijp(W / 2, HH - 200, 100, 260);
  check('visualViewport.scale blijft 1 in het menu', (await R(() => visualViewport.scale)) === 1, await R(() => visualViewport.scale));

  console.log('2. Huis: knijpen, vastklikken, pannen, dubbeltik, knoppen');
  await h.tab('huis'); await wacht(1200);
  await h.sheetDicht();
  const ta2 = await R(() => getComputedStyle(document.querySelector('#view-huis .huisvenster')).touchAction);
  check('huisvenster touch-action none', ta2 === 'none', ta2);
  const z0 = await zoom();
  await knijp(W / 2, HH / 2, 120, 300);
  const z1 = await zoom();
  const eff1 = await R(() => window.PQStore.apparaat().huisZoom2);
  console.log('    voor', JSON.stringify(z0), 'na', JSON.stringify(z1), JSON.stringify(eff1));
  check('knijpen zoomt in en klikt vast op hele stap (scale 1 na hertekenen)', z1.s === 1 && eff1 && Math.abs(eff1.eff - Math.round(eff1.eff)) < 1e-6 && eff1.eff > (z0.s || 0), { z1, eff1 });
  check('geen paginazoom op Huis', z1.vv === 1);
  check('translate op hele schermpixels na vastklikken', Math.abs(z1.tx * 3 - Math.round(z1.tx * 3)) < 0.01 && Math.abs(z1.ty * 3 - Math.round(z1.ty * 3)) < 0.01, z1);
  await h.foto(PF + 'g01-ingezoomd');
  const scherp = await R(() => [...document.querySelectorAll('#view-huis .podium canvas, #view-huis .podium img')].filter(c => c.offsetParent).slice(0, 40).map(c => getComputedStyle(c).imageRendering));
  check('pixelated rendering bij zoom ≥ 1', scherp.every(x => x === 'pixelated' || x === 'crisp-edges'), [...new Set(scherp)]);
  await veeg(W / 2, HH / 2, W / 2 - 120, HH / 2 - 40);
  const z2 = await zoom();
  check('pannen met één vinger verschuift', Math.abs(z2.tx - z1.tx) > 30, { z1, z2 });
  // dubbeltik op een lege plek (lucht)
  await R(() => document.querySelector('.zoomknoppen .pas').click()); await wacht(900);
  const zp = await R(() => window.PQStore.apparaat().huisZoom2);
  const leeg = await R(() => { const v = document.querySelector('#view-huis .huisvenster').getBoundingClientRect(); return [v.left + v.width / 2, v.top + 140]; });
  for (let i = 0; i < 2; i++) { await touch('touchStart', [leeg]); await touch('touchEnd', []); await wacht(120); }
  await wacht(900);
  const zd = await R(() => window.PQStore.apparaat().huisZoom2);
  console.log('    pas', JSON.stringify(zp), 'dubbeltik', JSON.stringify(zd));
  check('dubbeltik zoomt in naar 3×', zd.eff === 3, zd);
  await R(() => document.querySelector('.zoomknoppen [aria-label="Uitzoomen"]').click()); await wacht(900);
  check('knop − : 2×', (await R(() => window.PQStore.apparaat().huisZoom2.eff)) === 2);
  await R(() => document.querySelector('.zoomknoppen [aria-label="Inzoomen"]').click()); await wacht(900);
  check('knop + : 3×', (await R(() => window.PQStore.apparaat().huisZoom2.eff)) === 3);
  await R(() => document.querySelector('.zoomknoppen .pas').click()); await wacht(900);
  await h.foto(PF + 'g02-alles-in-beeld');
  const pasZ = await zoom();
  check('alles in beeld: scène past in het venster', await R(() => { const v = document.querySelector('#view-huis .huisvenster').getBoundingClientRect(), d = document.querySelector('#view-huis .diorama').getBoundingClientRect(); return d.width <= v.width + 2; }), pasZ);

  console.log('3. Bewerkmodus: slepen vs pannen');
  await h.tik('.hud-tools'); await h.tikTekst('.sheet button', 'Bewerken'); await wacht(600);
  await R(() => document.querySelector('.zoomknoppen [aria-label="Inzoomen"]').click()); await wacht(900);
  const m = await R(() => { const e = [...document.querySelectorAll('#view-huis .sleepbaar')].find(e => { const r = e.getBoundingClientRect(); return r.width > 20 && r.top > 120 && r.bottom < innerHeight - 160 && r.left > 0 && r.right < innerWidth; }); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, id: e.dataset.id }; });
  const logVoor = await R(() => window.PQStore.log().length), zb = await zoom();
  if (m) {
    await veeg(m.x, m.y, m.x + 40, m.y, 8);
    const za = await zoom(), logNa = await R(() => window.PQStore.log().length);
    check('meubel slepen boekt een opdracht en pant niet', logNa > logVoor && Math.abs(za.tx - zb.tx) < 1, { m, logVoor, logNa, zb, za });
  } else check('sleepbaar meubel gevonden', false);
  await h.foto(PF + 'g03-bewerken');
  await h.tikTekst('#view-huis button', 'Klaar'); await wacht(500);
  const f = await h.jsFouten();
  check('0 JS-fouten', f.length === 0, f);
  await h.browser.close(); s.close();
  console.log(JSON.stringify(telling()));
})().catch(e => { console.error('CRASH', e); process.exit(1); });
