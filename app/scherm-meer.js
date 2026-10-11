// Meer: profiel, voorstellen, de collectie (14 pets), de weekterugblik, instellingen, sync-status, het debugscherm
// (de oude assetcontrole) en een reset.
(function (wortel) {
  'use strict';
  const R = wortel.PQRegels, S = wortel.PQStore, U = wortel.PQUI, T = wortel.PQTaken, V = wortel.PQVoorstel, { el } = U;
  const MAN = () => wortel.PQ_MANIFEST;
  let root, inhoud, tbWeek = null;
  const petNaam = id => S.staat().pets.namen[id] || (MAN().assets.find(a => a.id === id) || {}).naam || id;
  const kaart = (id, titel, ...kids) => el('section.kaart.meerkaart', { id: 'meer-' + id, 'aria-labelledby': 'mk-' + id }, el('h2.meerkop', { id: 'mk-' + id, tekst: titel }), ...kids);

  // ---------- profiel ----------
  function profiel() {
    const mij = S.ik(), ander = S.ander();
    return kaart('profiel', 'Profiel',
      el('div.profielrij', null, el('span.avatarknop.' + mij, { 'aria-hidden': 'true' }, U.sprite(mij, 0.62)),
        el('p', null, 'Je bent ', el('b', { tekst: U.naam(mij) }), ' op dit apparaat.')),
      el('button.knop.breed', { type: 'button', onclick: async () => {
        if (await U.vraag(`Wisselen naar ${U.naam(ander)}?`, `Dit apparaat doet dan alles als ${U.naam(ander)}. Handig om samen op één telefoon te testen.`, 'Wissel', 'Annuleer')) {
          S.zetIk(ander); U.meld(`Je bent nu ${U.naam(ander)}.`); wortel.PQApp.ga('meer', { opnieuw: true }); wortel.PQApp.badges();
        } } }, `Ik ben ${U.naam(ander)}`));
  }
  function voorstellen() {
    const open = S.staat().voorstellen.filter(v => v.status === 'open');
    if (!open.length) return null;
    return kaart('voorstellen', 'Voorstellen', el('p.noot', { tekst: 'Kopen uit de huispot doen jullie samen.' }), ...open.map(v => V.kaart(v, teken)));
  }

  // ---------- collectie ----------
  function collectie() {
    const st = S.staat(), nu = Date.now(), col = R.collectie(st, nu), actief = st.pets.actief, p = R.pet(st, nu);
    const vakken = col.map(c => {
      const naam = petNaam(c.id), aan = c.id === actief;
      const inhoudVak = c.uit ? U.sprite(c.id, 1.1, naam) : U.ei(30, `Ei van ${naam}`);
      return el('button.petvakje' + (aan ? '.actief' : '') + (c.uit ? '' : '.slot'), { type: 'button', 'aria-label': c.uit ? `${naam}${aan ? ', loopt mee' : ''}` : `${naam}: ei, ${c.stand} van ${c.doel}`,
        onclick: () => petSheet(c) }, el('span.petbeeld', null, inhoudVak), el('b', { tekst: c.uit ? naam : '???' }),
        c.uit ? el('small', { tekst: aan ? 'loopt mee' : 'uitgekomen' }) : el('span.mini-balk', null, el('i', { stijl: { width: (c.stand / c.doel * 100) + '%' } })));
    });
    return kaart('collectie', 'Collectie',
      el('p.noot', { tekst: `${col.filter(c => c.uit).length} van ${col.length} uitgekomen. Eieren komen uit op samen-mijlpalen; pets gaan nooit dood.` }),
      el('div.collectie-raster', null, vakken),
      el('p.noot', { tekst: p.ei ? `${petNaam(p.id)} is nog een ei.` : `${petNaam(p.id)} loopt mee: ${p.stadium}, ${U.getal(p.xp)} XP.` }));
  }
  function petSheet(c) {
    const naam = petNaam(c.id), st = S.staat();
    if (!c.uit) {
      return U.sheet({ titel: 'Ei', inhoud: [el('div.petgroot', null, U.ei(64, 'Ei')),
        el('p', { tekst: `Komt uit na ${c.tekst}. Nu: ${c.stand} van ${c.doel}.` }),
        el('div.xpbalk', { role: 'progressbar', 'aria-valuenow': c.stand, 'aria-valuemax': c.doel, 'aria-valuemin': 0 }, el('div.vul', { stijl: { width: (c.stand / c.doel * 100) + '%' } })),
        el('p.noot', { tekst: 'Taken van allebei tellen mee. Er zijn geen munten of sterren voor nodig.' })] });
    }
    const invoer = el('input.invoer', { type: 'text', maxlength: 24, value: st.pets.namen[c.id] || '', placeholder: naam, 'aria-label': 'Naam' });
    const s = U.sheet({ titel: naam, inhoud: [el('div.petgroot', null, U.sprite(c.id, 2.2, naam)),
      el('label.veld', null, el('span', { tekst: 'Naam' }), invoer)],
      knoppen: [el('button.knop.stil', { type: 'button', onclick: () => { const r = S.doe('pet.naam', { id: c.id, naam: invoer.value }); if (!r.ok) U.fout(r.fout); s.sluit(); } }, 'Bewaar naam'),
        st.pets.actief === c.id ? el('button.knop', { type: 'button', disabled: true }, 'Loopt al mee')
          : el('button.knop.goud', { type: 'button', onclick: () => { const r = S.doe('pet.actief', { id: c.id }); if (!r.ok) return U.fout(r.fout); U.meld(`${naam} loopt nu mee.`); s.sluit(); } }, 'Laat meelopen')] });
  }
  // ---------- weekterugblik: de week in woorden en een privé cijfer 1–5 ----------
  const SOORTNAAM = { doen: 'doen', plannen: 'plannen', bijhouden: 'bijhouden' };
  function weekInWoorden(st, w) {
    const af = st.afrondingen.filter(a => R.telt(a) && a.week === w);
    return ['hidde', 'tessie'].map(p => {
      const mijn = af.filter(a => a.door === p || a.samen);
      if (!mijn.length) return el('p', null, el('b', { tekst: U.naam(p) + ': ' }), 'nog niets deze week.');
      const delen = Object.keys(SOORTNAAM).map(s => {
        const titels = [...new Set(mijn.filter(a => a.soort_werk === s).map(a => a.titel.toLowerCase()))];
        return titels.length ? `${SOORTNAAM[s]}: ${titels.slice(0, 6).join(', ')}${titels.length > 6 ? '…' : ''}` : null;
      }).filter(Boolean);
      return el('p', null, el('b', { tekst: U.naam(p) + ': ' }), delen.join('; ') + '.');
    });
  }
  function cijferSheet(w, namens) {
    const wie = namens || S.ik();
    let cijfer = 0;
    const knoppen = [1, 2, 3, 4, 5].map(n => el('button.chip', { type: 'button', role: 'radio', 'aria-checked': 'false', 'aria-label': `${n} van 5`,
      onclick: () => { cijfer = n; knoppen.forEach((k, i) => { k.setAttribute('aria-pressed', String(i + 1 === n)); k.setAttribute('aria-checked', String(i + 1 === n)); }); } }, String(n)));
    const trots = el('textarea', { rows: 2, maxlength: 200, 'aria-label': 'Trots op', placeholder: 'Trots op… (mag leeg)' });
    const dwars = el('textarea', { rows: 2, maxlength: 200, 'aria-label': 'Zat me dwars', placeholder: 'Zat me dwars… (mag leeg)' });
    const s = U.sheet({ titel: namens ? `${U.naam(wie)} vult in (op dit apparaat)` : 'Voelde deze week eerlijk?', inhoud: [
      el('p.noot', { tekst: 'Privé: de ander ziet je antwoord pas als jullie samen onthullen. Daarna wordt de tekst gewist, alleen het cijfer blijft.' }),
      el('fieldset.veld', null, el('legend', { tekst: '1 = helemaal niet, 5 = helemaal' }), el('div.keuzes.cijfers', { role: 'radiogroup' }, knoppen)),
      el('label.veld', null, el('span', { tekst: 'Trots op' }), trots), el('label.veld', null, el('span', { tekst: 'Zat me dwars' }), dwars)],
      knoppen: [el('button.knop.goud', { type: 'button', onclick: () => {
        if (!cijfer) return U.fout('Kies eerst een cijfer van 1 tot 5.');
        const r = S.doe('terugblik', { week: w, cijfer, trots: trots.value, dwars: dwars.value }, namens ? { namens } : undefined);
        if (!r.ok) return U.fout(r.fout);
        s.sluit(); U.meld('Bewaard. Privé tot jullie onthullen.');
      } }, 'Bewaar (privé)')] });
  }
  function onthul(w) {
    const r = S.doe('terugblik.onthul', { week: w });
    if (!r.ok) return U.fout(r.fout);
    const tb = S.staat().terugblik[w], verschil = Math.abs(tb.hidde.cijfer - tb.tessie.cijfer);
    U.sheet({ titel: 'Onthuld', inhoud: [
      ...['hidde', 'tessie'].map(p => el('div.onthul', null, el('b', { tekst: `${U.naam(p)}: ${tb[p].cijfer} van 5` }),
        tb[p].trots ? el('p', { tekst: 'Trots op: ' + tb[p].trots }) : null, tb[p].dwars ? el('p', { tekst: 'Zat me dwars: ' + tb[p].dwars }) : null)),
      verschil >= 2 ? el('p.kaart', { tekst: 'Jullie cijfers liggen uit elkaar. Eén vraag voor samen: wat zou volgende week voor jullie allebei eerlijker voelen?' }) : el('p.noot', { tekst: 'Jullie zitten op één lijn.' }),
      el('p.noot', { tekst: 'Als je dit sluit, wordt de tekst gewist. Alleen de cijfers blijven bewaard.' })],
      opSluit: () => S.doe('terugblik.wis', { week: w }) });
  }
  function terugblik() {
    const st = S.staat(), nu = Date.now(), wk = R.weken(st, nu), nuW = R.weekVan(nu);
    const w = tbWeek || nuW, rec = wk.lijst.find(x => x.week === w) || wk.nu, tb = st.terugblik[w] || {}, mij = S.ik(), ander = S.ander();
    const dank = st.bedankjes.filter(b => R.weekVan(b.op) === w);
    const status = [];
    if (tb.onthuld) {
      status.push(el('p', null, el('b', { tekst: `Voelde eerlijk: Hidde ${tb.hidde.cijfer}, Tessie ${tb.tessie.cijfer}` })));
      if (Math.abs(tb.hidde.cijfer - tb.tessie.cijfer) >= 2) status.push(el('p.noot', { tekst: 'Gespreksvraag: wat zou volgende week voor jullie allebei eerlijker voelen?' }));
    } else {
      status.push(tb[mij] ? el('p', { tekst: `Jouw cijfer is bewaard (privé).` }) : el('button.knop.goud.breed', { type: 'button', onclick: () => cijferSheet(w) }, 'Start terugblik: voelde deze week eerlijk?'));
      if (!tb[ander]) status.push(el('p.noot', { tekst: `${U.naam(ander)} heeft nog niet ingevuld.` }), el('button.knop.mini.stil', { type: 'button', onclick: () => cijferSheet(w, ander) }, `${U.naam(ander)} vult in (op dit apparaat)`));
      if (tb.hidde && tb.tessie) status.push(el('button.knop.goud.breed', { type: 'button', onclick: () => onthul(w) }, 'Onthul samen'));
    }
    const kies = el('div.chips', null, [[nuW, 'Deze week'], [R.weekPlus(nuW, -1), 'Vorige week']].map(([x, n]) =>
      el('button.chip', { type: 'button', 'aria-pressed': String(x === w), onclick: () => { tbWeek = x; teken(); } }, n)));
    return kaart('terugblik', 'Weekterugblik', kies,
      el('p.weektitel', null, el('b', { tekst: `Samen ${U.getal(rec.totaal)} van ${U.getal(rec.norm)}` }),
        rec.bevroren ? ' – rustweek' : rec.gehaald ? ' – gehaald' : rec.open ? '' : rec.rustweek ? ' – rustweek gebruikt' : ' – niet gehaald, niets verloren'),
      el('p.noot', { tekst: `Streak ${wk.streak} · record ${wk.record} · ${wk.gehaald} gehaalde weken in totaal` }),
      ...weekInWoorden(st, w),
      dank.length ? el('p.noot', { tekst: `♥ ${dank.length} ${dank.length === 1 ? 'bedankje' : 'bedankjes'} deze week` }) : null,
      ...status);
  }
  // ---------- instellingen ----------
  function instellingen() {
    const st = S.staat(), nu = Date.now(), w = R.weekVan(nu), doelNu = R.weekdoelVoor(st, w), doelVolgend = R.weekdoelVoor(st, R.weekPlus(w, 1));
    let waarde = doelVolgend;
    const out = el('output', { tekst: U.getal(waarde) });
    const zet = v => { waarde = Math.max(100, Math.min(3000, v)); out.textContent = U.getal(waarde); };
    const weekdoel = el('div.veld', null, el('span', { tekst: 'Weekdoel samen' }),
      el('div.stepper', null, el('button.rond', { type: 'button', 'aria-label': 'Weekdoel lager', onclick: () => zet(waarde - 50) }, '−'), out,
        el('button.rond', { type: 'button', 'aria-label': 'Weekdoel hoger', onclick: () => zet(waarde + 50) }, '+'),
        el('button.knop.mini', { type: 'button', onclick: () => { if (T.doe('weekdoel', { waarde }, `Weekdoel ${waarde}: gaat in vanaf volgende week.`)) teken(); } }, 'Bewaar')),
      el('small.noot', { tekst: `Deze week: ${doelNu}${doelVolgend !== doelNu ? `, vanaf volgende week: ${doelVolgend}` : ''}. Een wijziging gaat de week erna in.` }));
    // afwezigheid: ziek, weg of samen op vakantie verlaagt de norm
    const vandaag = R.dagSleutel(nu);
    const wie = el('select', { 'aria-label': 'Wie' }, el('option', { value: S.ik(), tekst: `${U.naam(S.ik())} is ziek of weg` }),
      el('option', { value: S.ander(), tekst: `${U.naam(S.ander())} is ziek of weg` }), el('option', { value: 'samen', tekst: 'Samen op vakantie' }));
    const van = el('input.invoer', { type: 'date', value: vandaag, 'aria-label': 'Van' }), tot = el('input.invoer', { type: 'date', value: vandaag, 'aria-label': 'Tot en met' });
    const lijst = st.afwezig.filter(a => a.tot >= R.weekPlus(w, -4)).map(a => el('li', null, el('span', { tekst: `${a.wie === 'samen' ? 'Samen weg' : U.naam(a.wie) + ' ' + a.soort} · ${U.datumTekst(a.van)} – ${U.datumTekst(a.tot)}` }),
      el('button.knop.mini.stil', { type: 'button', onclick: () => { if (T.doe('afwezig.weg', { id: a.id }, 'Verwijderd.')) teken(); } }, 'Weg')));
    const afwezig = el('div.veld', null, el('span', { tekst: 'Ziek of afwezig' }),
      el('p.noot', { tekst: `Per dag zakt de norm met het aandeel van wie weg is (nu deze week ${R.normVoor(st, w)}).` }), wie, el('div.rijtwee', null, van, tot),
      el('button.knop.mini', { type: 'button', onclick: () => { if (T.doe('afwezig.nieuw', { wie: wie.value, van: van.value, tot: tot.value }, 'Genoteerd. De norm past zich aan.')) teken(); } }, 'Toevoegen'),
      lijst.length ? el('ul.doos', null, lijst) : null);
    const rust = el('div.veld', null, el('span', { tekst: 'Rustweek' }),
      el('p.noot', { tekst: 'Eén per kalendermaand. Haal je een week niet, dan zet de app hem vanzelf in. Je kunt hem ook vooraf aankondigen.' }),
      R.rustweekVrij(st, w, nu) ? el('button.knop.mini', { type: 'button', onclick: async () => { if (await U.vraag('Rustweek nemen?', 'Deze week telt dan niet en breekt niets. Het is je rustweek van deze maand.', 'Neem rustweek', 'Toch niet') && T.doe('rustweek', { week: w }, 'Rustweek. Doe rustig aan.')) teken(); } }, 'Deze week is een rustweek')
        : el('p.noot', { tekst: 'De rustweek van deze maand is al gebruikt.' }));
    const omgeving = el('div.omgevingsbalk.balk');
    wortel.PQ_OMGEVINGHUIS.bediening(omgeving);
    const vb = Object.values(st.taken).filter(t => t.voorbeeld && t.status !== 'weg').length;
    return kaart('instellingen', 'Instellingen', weekdoel, afwezig, rust,
      el('div.veld', null, el('span', { tekst: 'Plaats, licht en weer' }), el('p.noot', { tekst: 'Het licht volgt de echte zon op jullie plaats. Geen GPS: kies een stad.' }), omgeving),
      vb ? el('div.veld', null, el('span', { tekst: 'Voorbeeldtaken' }), el('button.knop.mini', { type: 'button', onclick: async () => {
        if (await U.vraag('Voorbeeldtaken verwijderen?', `De ${vb} voorbeeldtaken verdwijnen. Wat al gedaan is, blijft meetellen.`, 'Verwijder', 'Laat staan', true) && T.doe('voorbeelden.weg', {}, 'Voorbeelden verwijderd.')) teken();
      } }, `Verwijder ${vb} voorbeeldtaken`)) : null);
  }
  // ---------- over, sync, debug en reset ----------
  function over() {
    const log = S.log();
    return kaart('over', 'Over en sync',
      el('p.sync', null, el('b', { tekst: 'Nog niet gesynchroniseerd met ' + U.naam(S.ander()) + '; dat komt met de server.' })),
      el('p.noot', { tekst: `Alles staat op dit apparaat: ${log.length} ${log.length === 1 ? 'opdracht' : 'opdrachten'} in het logboek. Elke wijziging is al een opdracht met een eigen id, zodat de server ze later precies één keer kan verwerken.` }),
      S.opslagOk() ? null : el('p.noot', { stijl: { color: 'var(--koraal)', opacity: 1 } }, 'Opslaan lukt niet in deze browser. Wat je doet, gaat bij herladen verloren.'),
      el('div.knoprij', null, el('button.knop.mini', { type: 'button', onclick: () => {
        const a = el('a', { href: URL.createObjectURL(new Blob([S.exporteer()], { type: 'application/json' })), download: 'pixelquest-' + R.dagSleutel(Date.now()) + '.json' });
        document.body.append(a); a.click(); a.remove();
      } }, 'Exporteer (JSON)')),
      el('details.debug', null, el('summary', { tekst: 'Voor de bouwer (debug)' }),
        el('div.knoprij', null, el('a.knop.mini', { href: 'assets.html' }, 'Assetcontrole'), el('a.knop.mini', { href: 'huis.html?test' }, 'Huis los'),
          el('a.knop.mini', { href: 'kledingkast.html?test' }, 'Kledingkast los'), el('a.knop.mini', { href: 'huis-filmstrip.html?test' }, 'Filmstrip')),
        el('p.noot', { tekst: 'Test: zet afrondingen in de afgelopen weken, zodat er munten in de pot komen. Ze staan gewoon in het logboek.' }),
        el('button.knop.mini', { type: 'button', onclick: testWeken }, '+ 2 testweken (vult de pot)')),
      el('button.knop.gevaar.breed', { type: 'button', stijl: { marginTop: '12px' }, onclick: async () => {
        if (await U.vraag('Alles wissen?', 'Taken, afrondingen, het huis, de kast en de pot op dit apparaat gaan weg. Dit kun je niet ongedaan maken.', 'Wis alles', 'Annuleer', true)) {
          S.reset(); location.hash = ''; location.reload();
        } } }, 'Reset dit apparaat'));
  }
  // Test: twee gehaalde weken in het verleden (beide personen, gewone voorbeeldtaken), met de tijd van toen.
  function testWeken() {
    const nu = Date.now();
    let n = 0;
    for (let w = 1; w <= 2; w++) for (let i = 0; i < 14; i++) {
      const tijd = R.weekStart(R.weekPlus(R.weekVan(nu), -w)) + 36e5 * (8 + i * 9);
      const r = S.doe('taak.nieuw', { titel: 'Testklus', minuten: 45, zwaarte: 1, eigenaar: i % 2 ? 'hidde' : 'tessie' }, { tijd });
      if (r.ok && S.doe('taak.klaar', { id: r.resultaat }, { tijd: tijd + 6e5, namens: i % 2 ? 'hidde' : 'tessie' }).ok) n++;
    }
    U.meld(`${n} testafrondingen toegevoegd. De pot is gevuld.`);
    teken();
  }

  function teken() {
    if (!inhoud) return;
    inhoud.replaceChildren(...[profiel(), voorstellen(), collectie(), terugblik(), instellingen(), over()].filter(Boolean));
  }
  function maak(r) {
    root = r;
    inhoud = el('div.meer-inhoud');
    root.append(el('header.kopregel', null, el('div', null, el('h1', { tekst: 'Meer' }), el('p.sub', { tekst: 'Collectie, terugblik en instellingen' }))), inhoud);
  }
  wortel.PQApp.scherm('meer', {
    maak,
    toon(o) {
      teken();
      if (o && o.naar) { const d = root.querySelector('#meer-' + o.naar); if (d) setTimeout(() => d.scrollIntoView({ block: 'start', behavior: U.rustig() ? 'auto' : 'smooth' }), 30); }
    },
    ververs(op) { if (!op || op.soort !== 'klok') teken(); },
    verberg() { if (inhoud) inhoud.replaceChildren(); },     // de omgevingsbediening heeft vaste id's: maar één tegelijk
  });
})(window);
