// QA zoom-fix: startzoom op een (nagebootste) iPhone, een bewaarde te kleine zoom, een viewport die pas na het mounten
// zijn echte maat krijgt, de grens van uitzoomen, en of lucht, erf en grond het scherm altijd vullen (geen leeg vlak).
// Dekking: het venster krijgt in de test een magenta achtergrond; elke magenta pixel in beeld is een gat in de wereld.
'use strict';
const { start, server, check, telling, wacht, DIST } = require('./hulp');
const W = +(process.argv[2] || 390), HH = +(process.argv[3] || 844), PF = 'z' + W + '-';
const IPHONE = `(() => { const go = () => { const st = document.createElement('style');
  st.textContent = ':root { --veilig-boven: 59px !important; --veilig-onder: 34px !important; }'; document.head.append(st); };
  if (document.head) go(); else document.addEventListener('DOMContentLoaded', go); })();`;
// Een eerdere versie bewaarde "alles in beeld" als huiszoom; dat mag niet meer de start zijn.
const OUD = `try { if (!localStorage.getItem('qa-oud')) { localStorage.setItem('qa-oud', '1');
  localStorage.setItem('pq-apparaat', JSON.stringify({ ik: 'hidde', huisZoom: { eff: 0.587, cx: 332, cy: 136 }, huisZoom2: { eff: 0.587, cx: 300, cy: 100 } })); } } catch (e) {}`;

(async () => {
  const { s, url } = await server(DIST);
  const h = await start({ w: W, h: 300 }), { p, R } = h;      // eerst een te lage viewport: de echte maat komt na het mounten
  await p.evaluateOnNewDocument(IPHONE);
  await p.evaluateOnNewDocument(OUD);
  await p.goto(url + 'index.html?test&geenweer', { waitUntil: 'domcontentloaded' });
  await wacht(250);
  await p.setViewport({ width: W, height: HH, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  await wacht(1600);
  const zs = () => R(() => window.PQHuis.actief().zoom.stand());
  const magenta = async naam => {
    await R(() => { const t = document.getElementById('pq-test'); if (t) t.style.visibility = 'hidden'; const m = document.getElementById('melding'); if (m) m.hidden = true; });
    await R(() => { document.querySelector('#view-huis .huisvenster').style.setProperty('background', '#ff00ff', 'important'); });
    await wacht(150);
    const b64 = await p.screenshot({ encoding: 'base64' });
    await h.foto(PF + naam);
    return R(async b64 => {
      const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode();
      const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
      const x = c.getContext('2d'); x.drawImage(img, 0, 0);
      const d = x.getImageData(0, 0, c.width, c.height).data; let n = 0;
      for (let i = 0; i < d.length; i += 4) if (d[i] > 240 && d[i + 1] < 20 && d[i + 2] > 240) n++;
      return n;
    }, b64);
  };

  console.log(`== ${W}×${HH}: oude zoom 0,587 bewaard, viewport eerst 300 hoog`);
  const z0 = await zs();
  check('startzoom 2× ondanks bewaarde "alles in beeld" en late viewportmaat', Math.abs(z0.eff - 2) < 1e-6, z0);
  check('oude huisZoom opgeruimd, ongeldige huisZoom2 niet gebruikt', await R(() => { const a = window.PQStore.apparaat(); return a.huisZoom === undefined; }));
  check('Hidde en Tessie in beeld bij de start', await R(() => [...document.querySelectorAll('#view-huis .figuur')].filter(f => { const r = f.getBoundingClientRect(); return r.right > 0 && r.left < innerWidth && r.bottom > 0 && r.top < innerHeight; }).length >= 2));
  check('start: geen gat in de wereld', (await magenta('01-start')) === 0);

  console.log('Uitzoomen tot de grens');
  await R(() => window.PQHuis.actief().zoom.pas()); await wacht(900);
  const zp = await zs(), g = await R(() => window.PQHuis.actief().zoom.grens());
  check('uitzoomen stopt bij de grens (huis vult de breedte of de hoogte)', Math.abs(zp.eff - g.min) < 0.01 && zp.eff > 0.5, { zp, g });
  check('maximaal uitgezoomd: geen gat (lucht en grond lopen door)', (await magenta('02-uitgezoomd')) === 0);

  console.log('Pannen naar de randen van de wereld (op 2×)');
  for (const [naam, cx, cy] of [['03-lucht', 330, -5000], ['04-grond', 330, 5000], ['05-links', -5000, 150], ['06-rechts', 5000, 150]]) {
    await R((cx, cy) => window.PQHuis.actief().zoom.naar(cx, cy, 2), cx, cy); await wacht(400);
    check(`${naam.slice(3)}: geen gat`, (await magenta(naam)) === 0);
  }
  // Echt gebaar: één vinger een flink stuk omlaag slepen = naar boven kijken
  await R(() => window.PQHuis.actief().zoom.naar(330, 150, 2)); await wacht(200);
  const cdp = await p.target().createCDPSession(), voor = await zs();
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: W / 2, y: 260, id: 0 }] });
  for (let i = 1; i <= 10; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: W / 2, y: 260 + i * 40, id: 0 }] }); await wacht(16); }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await wacht(1400);
  check('één vinger slepen pant omhoog de lucht in', (await zs()).ty > voor.ty + 100);
  check('na het slepen: geen gat', (await magenta('07-gesleept-lucht')) === 0);

  console.log('Villa (niveau 10 als voorbeeld), uitgezoomd');
  await R(() => window.PQHuisScherm.bekijk(10)); await wacht(1400);
  await R(() => window.PQHuis.actief().zoom.pas()); await wacht(900);
  check('villa uitgezoomd: geen gat', (await magenta('08-villa-uitgezoomd')) === 0);
  check('villa uitgezoomd: niet piepklein (zoom ≥ 0,45)', (await zs()).eff >= 0.45, await zs());
  const f = await h.jsFouten();
  check('0 JS-fouten', f.length === 0, f);
  await h.browser.close(); s.close();
  console.log(JSON.stringify(telling()));
})().catch(e => { console.error('CRASH', e); process.exit(1); });
