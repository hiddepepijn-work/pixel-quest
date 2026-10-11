// Schermafbeeldingen van elk scherm en elke sheet, met nagebootste safe-areas van een iPhone (notch + home-indicator).
'use strict';
const { start, server, check, telling, wacht, DIST } = require('./hulp');
const W = +(process.argv[2] || 390), HH = +(process.argv[3] || 844), PF = 'v' + W + '-';
const IPHONE = `(() => { const go = () => {
  const st = document.createElement('style');
  st.textContent = ':root { --veilig-boven: 59px !important; --veilig-onder: 34px !important; } #qa-iphone { position: fixed; inset: 0; pointer-events: none; z-index: 99999; }'
    + '#qa-iphone i { position: absolute; left: 50%; transform: translateX(-50%); background: #000; } #qa-iphone .eiland { top: 11px; width: 126px; height: 37px; border-radius: 20px; }'
    + '#qa-iphone .home { bottom: 8px; width: 134px; height: 5px; border-radius: 3px; } #qa-iphone .zone { left: 0; right: 0; transform: none; background: rgba(255,0,0,.08); }';
  document.head.append(st);
  const o = document.createElement('div'); o.id = 'qa-iphone';
  o.innerHTML = '<i class="zone" style="top:0;height:59px"></i><i class="zone" style="bottom:0;height:34px"></i><i class="eiland"></i><i class="home"></i>';
  document.body.append(o); };
  if (document.body) go(); else document.addEventListener('DOMContentLoaded', go); })();`;

(async () => {
  const { s, url } = await server(DIST);
  const h = await start({ w: W, h: HH }), { p, R } = h;
  await p.evaluateOnNewDocument(IPHONE);
  await p.goto(url + 'index.html?test', { waitUntil: 'load' }); await wacht(1200);
  const basis = await R(() => new Date(2026, 9, 11, 14, 0).getTime() - Date.now());
  await R(b => localStorage.setItem('qa-klok', String(b)), basis); await p.reload({ waitUntil: 'load' }); await wacht(1200);
  const f = n => h.foto(PF + n);
  const scroll = async (sel, y) => { await R((s, y) => document.querySelector(s).scrollTo(0, y), sel, y); await wacht(250); };
  await f('01-welkom');
  await h.tik('.wiekaart[aria-label="Ik ben Hidde"]'); await wacht(1500);
  // Wat testafrondingen voor een levendige week
  await R(() => { const S = window.PQStore; for (const id of ['vb-2', 'vb-4', 'vb-11']) S.doe('taak.klaar', { id }, { namens: id === 'vb-4' ? 'tessie' : 'hidde' }); });
  await h.tab('vandaag'); await f('02-vandaag');
  check('kop onder de notch', await R(() => document.querySelector('#view-vandaag h1').getBoundingClientRect().top >= 59));
  await h.tab('huis'); await R(() => { document.getElementById('melding').hidden = true; }); await f('01b-start-huis'); await h.tab('vandaag');
  await scroll('#view-vandaag', 600); await f('03-vandaag-midden');
  await scroll('#view-vandaag', 99999); await f('04-vandaag-onder');
  check('menutabs onder de notch', await R(() => document.querySelector('.menu-tabs button').getBoundingClientRect().top >= 59));
  await h.tab('huis');
  check('menuknop boven de home-indicator', await R(() => document.getElementById('menuKnop').getBoundingClientRect().bottom <= innerHeight - 34 + 1));
  check('HUD onder de notch', await R(() => document.querySelector('.hud').getBoundingClientRect().top >= 59));
  await h.tab('quests'); check('geen horizontale scroll: quests', !(await h.horizontaal())); await f('05-quests-mijn');
  for (const fl of ['Open', 'Samen', 'Alles']) { await h.tikTekst('#view-quests .chip', fl); await f('06-quests-' + fl.toLowerCase()); }
  await scroll('#view-quests', 99999); await f('07-quests-onder');
  await R(() => window.PQTaken.detail('vb-1')); await wacht(500); await f('08-sheet-detail');
  await h.sheetDicht();
  await R(() => window.PQTaken.detail('vb-17')); await wacht(500); await f('08b-sheet-detail-deadline'); await h.sheetDicht();
  await R(() => window.PQTaken.bewerk()); await wacht(500); await f('09-sheet-nieuw');
  await h.tikTekst('.sheet summary', 'Meer'); await scroll('.sheet-binnen', 99999); await f('10-sheet-nieuw-meer');
  check('sheet-voet boven home-indicator', await R(() => document.querySelector('.sheet-voet').getBoundingClientRect().bottom <= innerHeight - 34 + 1));
  await h.sheetDicht();
  await R(() => window.PQTaken.bewerk('vb-6')); await wacht(500); await f('11-sheet-bewerk'); await h.sheetDicht();
  await h.tab('huis'); await wacht(1500); await R(() => { const m = document.getElementById('melding'); m.hidden = true; }); await f('12-huis');
  await h.tik('.hud-tools'); await wacht(400); await f('12b-sheet-huis-gereedschap');
  await h.tikTekst('.sheet button', 'Bewerken'); await wacht(600); await R(() => { document.getElementById('melding').hidden = true; }); await f('13-huis-bewerken');
  await h.tikTekst('#view-huis button', 'Doos'); await wacht(400); await f('14-sheet-doos'); await h.sheetDicht();
  await h.tikTekst('#view-huis button', 'Klaar'); await wacht(400);
  await h.tab('verbouwen'); await wacht(500); await R(() => { document.getElementById('melding').hidden = true; }); await f('15-menu-bouwen');
  await h.tikTekst('#view-verbouwen button', 'Bekijk'); await wacht(1200); await f('16-huis-voorbeeld');
  await h.tikTekst('#view-huis button', 'Terug'); await wacht(600);
  await R(() => document.querySelector('#view-huis [aria-label="Weer, seizoen en weergave"]').click()); await wacht(500); await f('17-sheet-weer');
  await R(() => { const t = [...document.querySelectorAll('.sheet h3')].find(h => /Weer/.test(h.textContent)); if (t) t.scrollIntoView(); }); await wacht(200);
  await scroll('.sheet-binnen', 99999); await f('17b-sheet-weer-onder'); await h.sheetDicht();
  await h.tab('kast'); check('geen horizontale scroll: kast', !(await h.horizontaal())); await wacht(800); await f('18-kast');
  await scroll('#view-kast', 700); await f('19-kast-midden');
  await R(() => document.querySelectorAll('#view-kast details').forEach(d => { d.open = true; })); await wacht(300);
  await scroll('#view-kast', 1600); await f('20-kast-meer');
  await scroll('#view-kast', 2600); await f('20b-kast-editor');
  await scroll('#view-kast', 99999); await f('21-kast-onder');
  await h.tab('meer'); check('geen horizontale scroll: meer', !(await h.horizontaal())); await f('22-meer');
  for (const [i, y] of [[1, 700], [2, 1400], [3, 2100], [4, 2800], [5, 99999]]) { await scroll('#view-meer', y); await f('23-meer-' + i); }
  await h.tab('collectie'); check('geen horizontale scroll: pets', !(await h.horizontaal())); await f('23b-pets');
  await R(() => [...document.querySelectorAll('.petvakje')][0].click()); await wacht(400); await f('24-sheet-pet'); await h.sheetDicht();
  await R(() => [...document.querySelectorAll('.petvakje.slot')][3].click()); await wacht(400); await f('25-sheet-ei'); await h.sheetDicht();
  // Lege toestanden
  await R(() => { const S = window.PQStore; S.doe('voorbeelden.weg', {}); });
  await h.tab('vandaag'); await scroll('#view-vandaag', 400); await f('26-leeg-vandaag');
  await h.tab('quests'); check('geen horizontale scroll: quests', !(await h.horizontaal())); await h.tikTekst('#view-quests .chip', 'Samen'); await f('27-leeg-quests-samen');
  await h.tikTekst('#view-quests .chip', 'Mijn'); await f('27b-leeg-quests-mijn');
  const fo = await h.jsFouten();
  check('0 JS-fouten op alle schermen en sheets', fo.length === 0, fo);
  check('nergens horizontale scroll', !(await h.horizontaal()));
  await h.browser.close(); s.close();
  console.log(JSON.stringify(telling()));
})().catch(e => { console.error('CRASH', e); process.exit(1); });
