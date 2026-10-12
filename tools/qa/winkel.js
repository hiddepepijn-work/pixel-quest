// QA winkel (docs/winkel.md): winkel openen, elke afdeling, te weinig munten, kopen met akkoord + "Aantrekken",
// set-korting naar rato, passen en de stel-preview, een meubel kopen → verhuisdoos → plaatsen in Bewerken,
// uitgelicht wisselt per week (klok verzet), een drop bij een mijlpaal, set-glinstering, herladen: alles bewaard.
//   PQ_PUPPETEER=<pad>/node_modules/puppeteer-core node tools/qa/winkel.js [breedte hoogte]
'use strict';
const { start, server, check, telling, wacht, DIST } = require('./hulp');
const W = +(process.argv[2] || 390), HH = +(process.argv[3] || 844), PF = 'w' + W + '-';

(async () => {
  const { s, url } = await server(DIST);
  const h = await start({ w: W, h: HH }), { p, R } = h;
  console.log(`== winkel ${W}×${HH}`);
  await p.goto(url + 'index.html?test', { waitUntil: 'load' }); await wacht(1500);
  await h.tik('.wiekaart[aria-label="Ik ben Hidde"]'); await wacht(1000);
  const afd = async a => { await R(a => document.querySelector(`#view-winkel [data-afd="${a}"]`).click(), a); await wacht(450); };
  const pot = async () => (await h.week()).pot.saldo;
  const knopVoet = () => R(() => { const b = document.querySelector('.sheet-voet .knop:last-of-type, .sheet-voet .knoprij .knop'); return b ? { t: b.textContent.trim(), uit: b.disabled } : null; });
  const tikVoet = async t => { await h.tikTekst('.sheet-voet button', t); await wacht(500); };
  const sheetTitel = () => R(() => { const a = [...document.querySelectorAll('.sheet h2')]; return a.length ? a[a.length - 1].textContent : ''; });

  console.log('1. Winkel openen met een lege pot');
  await h.tab('winkel');
  check('winkel-tab open, geen JS-fouten', await R(() => !document.getElementById('view-winkel').hidden) && !(await h.jsFouten()).length);
  check('lege toestand: "Nog geen munten?"', await R(() => /Nog geen munten/.test(document.querySelector('.winkel-leeg').textContent)));
  check('tab Winkel in het menu tussen Kast en Bouwen', await R(() => [...document.querySelectorAll('.menu-tabs [data-tab]')].map(b => b.dataset.tab).join() === 'vandaag,quests,kast,winkel,verbouwen,collectie,meer'));
  await h.foto(PF + '01-leeg');
  await afd('kleding');
  await R(() => document.querySelector('#view-winkel .wtegel[data-id="petje"]').click()); await wacht(500);
  const kb0 = await knopVoet();
  check('te weinig munten: knop uit met "Nog 30 sparen"', kb0 && kb0.uit && /Nog 30 sparen/.test(kb0.t), kb0);
  await h.foto(PF + '02-te-weinig');
  const r0 = await R(() => window.PQStore.doe('voorstel.nieuw', { soort: 'kleding', data: { fid: 'hidde', item: 'petje', kleur: 'petrol' } }));
  check('voorstel met lege pot geweigerd in gewone taal', !r0.ok && /te weinig/.test(r0.fout), r0);
  await h.sheetDicht();

  console.log('2. Pot vullen en elke afdeling');
  await h.tab('meer'); await R(() => { document.querySelector('details.debug').open = true; });
  await h.tikTekst('#view-meer button', '+ 2 testweken'); await wacht(500);
  const p0 = await pot();
  check('pot gevuld (600)', p0 === 600, p0);
  await h.tab('winkel');
  for (const a of ['uitgelicht', 'kleding', 'sets', 'meubels', 'zeldzaam', 'bouwen']) {
    await afd(a);
    const info = await R(() => ({ n: document.querySelector('.winkel-inhoud').children.length, tekst: document.querySelector('.winkel-inhoud').textContent.length }));
    check(`afdeling ${a}: inhoud, geen horizontale scroll`, info.n > 0 && info.tekst > 20 && !(await h.horizontaal()), info);
    await h.foto(PF + '03-' + a);
  }
  await afd('uitgelicht');
  check('uitgelicht: set van de week en 2–3 items', await R(() => !!document.querySelector('.winkelsectie .setkaart') && document.querySelectorAll('.winkelsectie')[1].querySelectorAll('.wtegel').length >= 2));
  check('prijslabels met het munt-item', await R(() => [...document.querySelectorAll('#view-winkel .prijslabel img')].every(i => /items\/bron\/munt\.png/.test(i.src)) && document.querySelectorAll('#view-winkel .prijslabel img').length > 3));

  console.log('3. Kopen met akkoord, feestje en Aantrekken');
  await afd('kleding');
  await R(() => document.querySelector('#view-winkel .wtegel[data-id="petje"]').click()); await wacht(500);
  check('petje-sheet: "Kopen 30"', /Kopen\s*30/.test((await knopVoet() || {}).t || ''), await knopVoet());
  await tikVoet('Kopen'); await wacht(300);
  check('voorstel-sheet open', /Voorstel gedaan/.test(await sheetTitel()));
  await tikVoet('keurt goed (op dit apparaat)'); await wacht(400);
  check('gekocht-sheet met feestje', /Gekocht/.test(await sheetTitel()));
  await h.foto(PF + '04-gekocht');
  await tikVoet('Aantrekken');
  let st = await h.st();
  check('petje in bezit, pot −30, Hidde draagt het', (st.kleding.bezit.hidde.petje || []).length === 1 && (await pot()) === p0 - 30 && st.kleding.looks.hidde.hoofd.item === 'petje', st.kleding.looks.hidde);

  console.log('4. Set-korting naar rato');
  // Een set uit PQ_KAST.sets (geen vaste id's): verkoopbaar voor Hidde, minstens 3 items, nog niets van in bezit.
  const keus = await R(() => { const P = window.PQWinkel, st = window.PQStore.staat();
    const s = P.verkoopbareSets().find(x => { const i = P.setInfo(st, 'hidde', x); return i.compleet && i.getekend.length >= 3 && !i.inBezit && i.som <= 400; });
    const d = P.setDelen(s, 'hidde').getekend, eerst = d[d.length - 1], som = d.reduce((t, i) => t + i.prijs, 0);
    return { id: s.id, naam: s.naam, items: d.map(i => i.id), eerst: eerst.id, kleur: eerst.kleuren[0], vol: Math.round(0.8 * som), prijs: Math.round(0.8 * (som - eerst.prijs)) }; });
  const rs = await R(k => { const S = window.PQStore; const v = S.doe('voorstel.nieuw', { soort: 'kleding', data: { fid: 'hidde', item: k.eerst, kleur: k.kleur } }); return S.doe('voorstel.akkoord', { id: v.id }, { namens: 'tessie' }).ok; }, keus);
  await afd('sets');
  const setTekst = await R(id => document.querySelector(`#view-winkel .setkaart[data-set="${id}"]`).textContent, keus.id);
  check(`${keus.naam} met 1 item in bezit: ${keus.prijs} in plaats van ${keus.vol} (korting naar rato)`, rs && setTekst.includes(String(keus.prijs)) && /al 1/.test(setTekst), { keus, setTekst });
  await R(id => document.querySelector(`#view-winkel .setkaart[data-set="${id}"]`).click(), keus.id); await wacht(500);
  await h.foto(PF + '05-set-sheet');
  const p1 = await pot();
  await tikVoet('Kopen'); await wacht(300); await tikVoet('keurt goed (op dit apparaat)'); await wacht(300);
  check(`set gekocht: pot −${keus.prijs}, alle ${keus.items.length} in bezit`, (await pot()) === p1 - keus.prijs && (await R(ids => ids.every(id => (window.PQStore.staat().kleding.bezit.hidde[id] || []).length), keus.items)));
  await tikVoet('Aantrekken'); await wacht(300);

  console.log('5. Passen en de stel-preview');
  await afd('kleding');
  await R(() => document.querySelector('#view-winkel .wtegel[data-id="bril"]').click()); await wacht(500);
  const een = await R(() => document.querySelectorAll('.sheet .pasfiguur').length);
  await h.tikTekst('.sheet .paskeuze .chip', 'Samen'); await wacht(300);
  const pas = await R(() => [...document.querySelectorAll('.sheet .pasfiguur canvas')].map(c => { const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i]) n++; return n; }));
  check('passen: eerst 1 figuur, stel-look 2 getekende figuren', een === 1 && pas.length === 2 && pas.every(n => n > 500), { een, pas });
  await h.foto(PF + '06-stel-look');
  await h.sheetDicht();

  console.log('6. Meubel: vraagt tuin, kopen, verhuisdoos, plaatsen');
  await afd('meubels');
  check('vogelhuisje: "vraagt tuin (niveau 4)"', await R(() => /vraagt tuin \(niveau 4\)/.test(document.querySelector('#view-winkel .wtegel[data-id="vogelhuisje"]').textContent)));
  await R(() => document.querySelector('#view-winkel .wtegel[data-id="monstera"]').click()); await wacht(500);
  await h.foto(PF + '07-meubel-sheet');
  await tikVoet('Kopen'); await wacht(300); await tikVoet('keurt goed (op dit apparaat)'); await wacht(300);
  check('monstera in de verhuisdoos', (await h.st()).huis.doos.some(d => d.id === 'monstera-w1'));
  check('vol starthuisje: "Ruimte maken" in plaats van Plaatsen', /Ruimte maken/.test((await knopVoet() || {}).t || ''), await knopVoet());
  await tikVoet('Verder winkelen');
  await R(() => document.querySelector('#view-winkel .wtegel[data-id="hangplant"]').click()); await wacht(500);
  await tikVoet('Kopen'); await wacht(300); await tikVoet('keurt goed (op dit apparaat)'); await wacht(300);
  await tikVoet('Plaatsen'); await wacht(900);
  st = await h.st();
  check('hangplant plaatsen: menu dicht, bewerkmodus, in huis', !(await R(() => window.PQApp.menuOpen())) && (await R(() => document.querySelector('#view-huis').classList.contains('bewerkt'))) &&
    st.huis.inrichting.some(i => i.id === 'hangplant-w1') && !st.huis.doos.some(d => d.id === 'hangplant-w1'), st.huis.doos);
  check('hangplant gekozen en in beeld', await R(() => { const e = document.querySelector('.meubel[data-id="hangplant-w1"]'); if (!e) return false; const r = e.getBoundingClientRect(); return e.classList.contains('gekozen') && r.bottom > 0 && r.top < innerHeight; }));
  await h.foto(PF + '08-plaatsen');
  await h.tikTekst('#view-huis button', 'Klaar'); await wacht(500);
  check(`set-glinstering in huis (${keus.naam})`, await R(n => window.PQ_TEST.info.glans_hidde === n && !!document.querySelector('#view-huis .glans'), keus.naam), await R(() => window.PQ_TEST.info.glans_hidde));
  await h.foto(PF + '09-glinster');

  console.log('7. Uitgelicht wisselt per week (klok +7 dagen) en een drop bij 3 gehaalde weken');
  const uitg = () => R(() => { const u = window.PQWinkel.uitgelicht(window.PQRegels.weekVan(Date.now()), 'hidde'); return (u.set && u.set.id) + ':' + u.items.map(i => i.id).join(',') + ':' + u.nummer; });
  const u1 = await uitg();
  await h.klok(7);
  const u2 = await uitg();
  check('uitgelicht anders in de volgende week', u1 !== u2, { u1, u2 });
  await h.tab('meer'); await R(() => { document.querySelector('details.debug').open = true; });
  await h.tikTekst('#view-meer button', '+ 2 testweken'); await wacht(1200);
  st = await h.st();
  const drop = (st.winkel.drops || []).find(d => d.sleutel === 'gehaald:3');
  check('drop bij 3 gehaalde weken: zeldzame kleur voor allebei', drop && drop.items.length === 2 && drop.items.every(i => (st.kleding.bezit[i.fid][i.item] || []).includes(i.kleur)), st.winkel);
  check('drop-melding', await R(() => /Drop!/.test(document.getElementById('melding').textContent)));
  await h.foto(PF + '10-drop');
  const kleur = drop && drop.items[0].kleur;
  const rz = await R(k => window.PQStore.doe('voorstel.nieuw', { soort: 'kleding', data: { fid: 'hidde', item: 'petje', kleur: k } }).fout, kleur);
  check('zeldzame kleur niet te koop', /drop/.test(rz || ''), rz);
  await h.tab('winkel'); await afd('zeldzaam');
  check('Zeldzaam: drop in de lijst, stel-sets op slot met voorwaarde', await R(() => document.querySelectorAll('.droplijst li').length === 1 && /Op slot: komt vrij bij 4 gehaalde weken/.test(document.querySelector('[data-stelset="samen_warm"]').textContent)));
  await h.foto(PF + '11-zeldzaam');
  await h.tab('collectie');
  check('drop in de collectie (Pets)', await R(() => !!document.querySelector('#meer-zeldzaam .droplijst li')));
  await h.tab('meer');
  check('aankoopgeschiedenis in Meer', await R(() => { const t = document.getElementById('meer-aankopen').textContent; return /Monstera/.test(t) && /Petje/.test(t) && /drop/.test(t); }));
  await R(() => document.getElementById('meer-aankopen').scrollIntoView()); await wacht(200);
  await h.foto(PF + '12-aankopen');

  console.log('8. Herladen: alles staat er nog');
  const voor = await h.st();
  await p.reload({ waitUntil: 'load' }); await wacht(1600);
  const na = await h.st();
  const kern = s => JSON.stringify([s.kleding.bezit, s.kleding.looks, s.winkel, s.huis.inrichting, s.huis.doos, s.voorstellen.map(v => v.status)]);
  check('na herladen: bezit, looks, drops, meubels en aankopen gelijk', kern(voor) === kern(na));
  await h.tab('winkel');
  check('winkel na herladen zonder fouten', await R(() => document.querySelectorAll('#view-winkel .wtegel, #view-winkel .setkaart').length > 0));
  const f = await h.jsFouten();
  check('0 JS-fouten', f.length === 0, f);
  await h.browser.close(); s.close();
  console.log(JSON.stringify(telling()));
})().catch(e => { console.error('CRASH', e); process.exit(1); });
