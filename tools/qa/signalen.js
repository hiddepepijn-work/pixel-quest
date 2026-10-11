// Overlap tussen taaksignalen en de gezichten van Hidde en Tessie, in de compacte scène en op Huis (meerdere zoomstanden).
'use strict';
const { start, server, check, telling, wacht, DIST } = require('./hulp');
const W = +(process.argv[2] || 390), HH = +(process.argv[3] || 844);

(async () => {
  const { s, url } = await server(DIST);
  const h = await start({ w: W, h: HH }), { p, R } = h;
  await p.goto(url + 'index.html?test', { waitUntil: 'load' }); await wacht(1200);
  await h.tik('.wiekaart[aria-label="Ik ben Hidde"]'); await wacht(1500);
  // Meer signalen: zet extra taken op meubels die hangend zijn.
  await R(() => {
    const S = window.PQStore, st = S.staat();
    for (const it of st.huis.inrichting.slice(0, 12)) S.doe('taak.nieuw', { titel: 'Test ' + it.soort, minuten: 10, interval: 1, plek: { meubel: it.id } });
  });
  const overlap = () => R(() => {
    const uit = [];
    const koppen = [...document.querySelectorAll('.figuur')].filter(f => f.offsetParent && /hidde|tessie/.test(f.dataset.id || f.className)).map(f => {
      const c = f.querySelector('canvas'); const r = (c || f).getBoundingClientRect();
      return { id: f.dataset.id, r };
    });
    const sig = [...document.querySelectorAll('.signaal')].filter(e => e.offsetParent).map(e => e.getBoundingClientRect());
    for (const k of koppen) {
      // gezicht: in het figuurvak zit het hoofd in de bovenste ~30% van het zichtbare figuur; neem een ruime marge
      const a = window.PQ_MANIFEST.assets.find(x => x.id === k.id);
      const sx = k.r.width / a.afmetingen.bron[0], sy = k.r.height / a.afmetingen.bron[1];
      const [ax, ay] = a.anker.bron, [fw, fh] = a.figuur.bron;
      const top = k.r.top + (ay - fh) * sy, links = k.r.left + (ax - fw / 2) * sx;
      const gezicht = { left: links + fw * sx * 0.2, right: links + fw * sx * 0.8, top: top + fh * sy * 0.08, bottom: top + fh * sy * 0.3 };
      for (const b of sig) if (b.left < gezicht.right && b.right > gezicht.left && b.top < gezicht.bottom && b.bottom > gezicht.top) uit.push(k.id);
    }
    return { koppen: koppen.length, signalen: sig.length, overlap: uit };
  });
  let slecht = 0, metingen = 0, info;
  for (let i = 0; i < 12; i++) { info = await overlap(); metingen++; if (info.overlap.length) slecht++; await wacht(700); }
  console.log('compact:', JSON.stringify(info));
  check(`Vandaag (compact): geen signaal over een gezicht (${slecht}/${metingen} momenten)`, slecht === 0 && info.koppen > 0 && info.signalen > 0, info);
  await h.foto('s01-vandaag-signalen');
  await h.tab('huis'); await wacht(1500);
  for (const z of ['pas', 'in', 'in', 'in']) {
    await R(z => document.querySelector(z === 'pas' ? '.zoomknoppen .pas' : '.zoomknoppen [aria-label="Inzoomen"]').click(), z); await wacht(900);
    slecht = 0;
    for (let i = 0; i < 8; i++) { info = await overlap(); if (info.overlap.length) slecht++; await wacht(600); }
    const eff = await R(() => document.querySelector('.podium').style.transform);
    console.log('huis', z, eff, JSON.stringify(info));
    check(`Huis ${z}: geen signaal over een gezicht (${slecht}/8)`, slecht === 0, info);
    await h.foto('s02-huis-signalen-' + z + '-' + metingen++);
  }
  const f = await h.jsFouten();
  check('0 JS-fouten', f.length === 0, f);
  await h.browser.close(); s.close();
  console.log(JSON.stringify(telling()));
})().catch(e => { console.error('CRASH', e); process.exit(1); });
