// Het hoofdscherm: het huis vult het scherm, met knijpzoom en pannen (huis-zoom.js). Erboven een dunne HUD (profiel,
// "Samen X / Y", streak, huispot, het pet met zijn groei, en de huis-gereedschappen); onderin de menuknop, "+ Taak"
// en de zoomknoppen. Taakbubbels in het huis openen de taak; afvinken geeft het feestje in het huis zelf.
// Bewerken, de verhuisdoos en weer/seizoen zitten achter de gereedschapsknop in de HUD (en onder Menu → Bouwen).
(function (wortel) {
  'use strict';
  const R = wortel.PQRegels, S = wortel.PQStore, U = wortel.PQUI, T = wortel.PQTaken, V = wortel.PQVoorstel, { el } = U;
  const H = () => wortel.PQ_HUIS, MAN = () => wortel.PQ_MANIFEST;
  let root, huis = null, hud, balkOnder, voorbeeldBalk, gekozenTekst, naarDoosKnop, laatsteInfo = null;

  function maak(r) {
    root = r;
    // Migratie: de zoomstand van v0.1.x (huisZoom) kon "alles in beeld" zijn en werd dan de start. Die vervalt.
    if (S.apparaat().huisZoom !== undefined) S.zetApparaat('huisZoom', undefined);
    const vak = el('div.huis-vol');
    hud = el('header.hud', { 'aria-label': 'Jullie stand' });
    voorbeeldBalk = el('div.huis-balk.voorbeeld', { hidden: true });
    gekozenTekst = el('span', { tekst: 'Tik op een meubel om het te kiezen' });
    naarDoosKnop = el('button.knop.mini', { type: 'button', disabled: true, onclick: () => huis.naarDoos() }, 'In de doos');
    balkOnder = el('div.huis-balk.onder', { hidden: true }, el('p.noot', null, gekozenTekst),
      el('div.knoprij', null, naarDoosKnop, el('button.knop.mini', { type: 'button', onclick: doos }, 'Doos'),
        el('button.knop.mini.stil', { type: 'button', onclick: async () => { if (await U.vraag('Indeling herstellen?', 'Alle meubels gaan terug naar hun startplek. Wat in de doos zit, komt terug.', 'Herstel', 'Laat zo')) huis.herstel(); } }, 'Herstel'),
        el('button.knop.mini.goud', { type: 'button', onclick: () => bewerk(false) }, 'Klaar')));
    const zoomKnoppen = el('div.zoomknoppen', { role: 'group', 'aria-label': 'Zoom' },
      el('button.rond', { type: 'button', 'aria-label': 'Inzoomen', onclick: () => huis.zoom.in() }, '+'),
      el('button.rond', { type: 'button', 'aria-label': 'Uitzoomen', onclick: () => huis.zoom.uit() }, '−'),
      el('button.rond.pas', { type: 'button', 'aria-label': 'Alles in beeld', onclick: () => huis.zoom.pas() }, el('span.ic-pas', { 'aria-hidden': 'true' })));
    const menuKnop = el('button.menuknop', { id: 'menuKnop', type: 'button', 'aria-label': 'Menu openen: taken van vandaag, quests, kast, bouwen, pets en meer', 'aria-expanded': 'false', 'aria-controls': 'menu' },
      el('img', { src: U.ASSETS + 'items/bron/rugzak.png', alt: '' }), 'Menu', el('span.tabbadge', { hidden: true }));
    const fab = el('button.knop.huis-fab', { type: 'button', onclick: () => T.bewerk(), 'aria-label': 'Nieuwe taak' }, '+ Taak');
    root.append(vak, hud, voorbeeldBalk, balkOnder, zoomKnoppen, el('div.veegzone', { 'aria-hidden': 'true' }), fab, menuKnop);
    huis = wortel.PQHuis.mount(vak, {
      store: S, meld: t => U.meld(t), opTaak: id => T.detail(id),
      taken: wortel.PQVandaag.huisTaken, pets: wortel.PQVandaag.uitgekomen, petNaam: id => S.staat().pets.namen[id],
      zoomStand: () => S.apparaat().huisZoom2,
      opZoom: st => S.zetApparaat('huisZoom2', st && st.eff >= 2 ? { eff: st.eff, cx: Math.round(st.cx), cy: Math.round(st.cy) } : null),
      opKies: k => { gekozenTekst.textContent = k ? 'Gekozen: ' + k.naam : 'Tik op een meubel om het te kiezen'; naarDoosKnop.disabled = !k || k.soort !== 'meubel'; },
      opScene: scene, instellingen: { markeer: !!S.apparaat().markeer },
    });
    // Afvinken: het feestje in het huis, bij het meubel of de kamer van de taak, anders boven wie hem deed.
    // Staat het menu open (telefoon), dan schuift het huis eerst zo dat het feestje boven het menu te zien is.
    document.addEventListener('pq-afgerond', e => {
      const a = e.detail.afronding || {}, plek = e.detail.taak.plek || { bewoner: a.samen ? 'samen' : (a.door || S.ik()) };
      const menu = wortel.PQApp.menuOpen(), z = zichtbaar();
      if (menu) huis.kijkNaar(plek, z.midden, z.rechts / 2);
      setTimeout(() => { huis.feestje(plek, a.inzet ? '+' + a.inzet : null); blij(); }, menu ? 320 : 0);
    });
    // Menu open op de telefoon: het huis schuift zodat Hidde en Tessie boven het menu staan; bij sluiten terug.
    let voorMenu = null;
    document.addEventListener('pq-menu', e => {
      if (huis.bewerkt()) return;
      if (e.detail.open) {
        const z = zichtbaar();
        voorMenu = huis.zoom.stand(); huis.zoom.zetVeld({ boven: z.boven, onder: z.onder, rechts: z.rechts });
        huis.kijkNaar({ bewoner: 'samen' }, breed() ? (z.boven + z.onder) / 2 - 40 : z.kruin, z.rechts / 2);
      } else { huis.zoom.zetVeld(null); if (voorMenu) huis.zoom.terugNaar(voorMenu); voorMenu = null; }
    });
    document.addEventListener('pq-bedankt', blij);
    if (!S.apparaat().zoomUitleg) {
      S.zetApparaat('zoomUitleg', 1);
      setTimeout(() => { if (!document.querySelector('.sheet-achter') && !wortel.PQApp.menuOpen()) U.meld('Knijp om te zoomen, sleep om rond te kijken. Het menu opent onderin.', { soort: 'boven', duur: 5000 }); }, 900);
    }
  }
  const breed = () => matchMedia('(min-width: 900px)').matches;
  // Het zichtbare stuk huis tussen de HUD en het (open) menu, in schermpixels.
  function zichtbaar() {
    const m = document.getElementById('menu'), top = hud.getBoundingClientRect().bottom;
    // Telefoon: het menu ligt onderin; breed scherm: het menu is een zijpaneel rechts.
    const onder = breed() ? innerHeight : innerHeight - (m ? m.offsetHeight : 0), rechts = breed() ? innerWidth - (m ? m.offsetWidth : 0) : innerWidth;
    return { boven: top, onder, rechts, midden: (top + onder) / 2 + 20, kruin: top + 58 };
  }
  function blij() {
    const p = hud.querySelector('.hud-pet');
    if (p && !U.rustig()) { p.classList.remove('blij'); void p.offsetWidth; p.classList.add('blij'); }
    const pot = hud.querySelector('.hud-pot');
    if (pot) U.tik(pot);
  }

  // ---------- HUD ----------
  function tekenHud() {
    const st = S.staat(), nu = Date.now(), mij = S.ik(), wk = R.weken(st, nu), w = wk.nu, pot = R.pot(st, nu), p = R.pet(st, nu);
    const pct = w.norm ? Math.min(100, w.totaal / w.norm * 100) : 100;
    const petNaam = st.pets.namen[p.id] || (MAN().assets.find(a => a.id === p.id) || {}).naam;
    const petPct = p.ei ? p.ei_stand / p.ei_doel * 100 : p.tot ? (p.xp - p.vanaf) / (p.tot - p.vanaf) * 100 : 100;
    hud.replaceChildren(
      el('button.hud-profiel.' + mij, { type: 'button', 'aria-label': `Je bent ${U.naam(mij)}. Profiel in Meer.`, onclick: () => wortel.PQApp.ga('meer', { naar: 'profiel' }) }, U.sprite(mij, 0.5, U.naam(mij))),
      el('button.hud-week', { type: 'button', onclick: weekSheet, 'aria-label': `Samen ${w.totaal} van ${w.norm} deze week${w.gehaald ? ', gehaald' : ''}. Details.` },
        el('span.hud-label', { tekst: 'SAMEN' }), el('b', { tekst: `${U.getal(w.totaal)} / ${U.getal(w.norm)}` }),
        el('span.hud-balk' + (w.gehaald ? '.gehaald' : ''), { 'aria-hidden': 'true' }, el('i', { stijl: { width: pct + '%' } }), el('s'))),
      el('span.hud-chip', { title: 'Streak: weken op rij gehaald', 'aria-label': `Streak ${wk.streak} ${wk.streak === 1 ? 'week' : 'weken'}` }, U.item('ster', 18), String(wk.streak)),
      el('button.hud-chip.hud-pot', { type: 'button', 'aria-label': `${pot.saldo} munten in de huispot. Bouwen.`, onclick: () => wortel.PQApp.ga('verbouwen') }, U.munt(18), U.getal(pot.saldo)),
      el('button.hud-pet', { type: 'button', 'aria-label': p.ei ? `Ei van ${petNaam}, ${p.ei_stand} van ${p.ei_doel}. Pets.` : `${petNaam}, ${p.stadium}. Pets.`, onclick: () => wortel.PQApp.ga('collectie') },
        el('span.petmini', null, p.ei ? U.ei(20, 'Ei') : U.sprite(p.id, 0.55, petNaam)), el('span.mini-balk', null, el('i', { stijl: { width: petPct + '%' } }))),
      el('button.hud-tools', { type: 'button', 'aria-label': 'Weer, seizoen en weergave', onclick: gereedschap }, '☼'));
  }
  function weekSheet() {
    const st = S.staat(), nu = Date.now(), wk = R.weken(st, nu), w = wk.nu, pot = R.pot(st, nu);
    const pct = w.norm ? Math.min(100, w.totaal / w.norm * 100) : 100;
    const tekst = w.bevroren ? 'Rustweek: deze week telt niet en breekt niets.' : w.gehaald ? 'Gehaald! Alles erboven is extra.' : `Nog ${Math.max(0, Math.ceil(R.P.drempel * w.norm - w.totaal))} tot de week gehaald is (80%).`;
    const s = U.sheet({ titel: 'Samen deze week', inhoud: [
      el('section.kaart.weekdoel', null,
        el('div.getallen', null, el('span', { tekst: 'Samen' }), el('span.groot', { tekst: `${U.getal(w.totaal)} / ${U.getal(w.norm)}` })),
        el('div.balk-week' + (w.gehaald ? '.gehaald' : ''), { role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': w.norm, 'aria-valuenow': w.totaal },
          el('div.vul', { stijl: { width: pct + '%' } }), el('div.drempel', { stijl: { left: '80%' } })),
        el('p.noot', { tekst })),
      el('p', null, el('b', { tekst: `Streak ${wk.streak} ${wk.streak === 1 ? 'week' : 'weken'}` }), ` · record ${wk.record} · ${wk.gehaald} gehaalde weken in totaal`),
      el('p.potregel', null, U.munt(18), `${U.getal(pot.saldo)} in de huispot (+${pot.dezeWeek} deze week, hooguit ${pot.maxWeek})`),
      el('p.noot', { tekst: 'Geen stand per persoon en geen winnaar: jullie doen het samen. De week in woorden staat in de terugblik.' })],
      knoppen: [el('button.knop.stil', { type: 'button', onclick: () => { s.sluit(); wortel.PQApp.ga('meer', { naar: 'terugblik' }); } }, 'Terugblik'),
        el('button.knop.goud', { type: 'button', onclick: () => { s.sluit(); wortel.PQApp.ga('vandaag'); } }, 'Taken van vandaag')] });
  }
  // ---------- gereedschap: bewerken, verhuisdoos, weer en weergave ----------
  function gereedschap() {
    const info = huis.scene() || { doos: [] };
    const s = U.sheet({ titel: 'Het huis', inhoud: [
      el('div.knoprij', null,
        el('button.knop.goud', { type: 'button', onclick: () => { s.sluit(); bewerk(true); } }, 'Bewerken'),
        el('button.knop', { type: 'button', onclick: () => { s.sluit(); doos(); } }, `Verhuisdoos (${info.doos.length})`),
        el('button.knop', { type: 'button', onclick: () => { s.sluit(); wortel.PQApp.ga('verbouwen'); } }, 'Verbouwen')),
      el('h3', { tekst: 'Weer en weergave', stijl: { marginTop: '16px' } }), ...weergave()] });
  }
  function weergave() {
    const box = el('div.omgevingsbalk.balk');
    wortel.PQ_OMGEVINGHUIS.bediening(box);
    const markeer = el('input', { type: 'checkbox', checked: !!S.apparaat().markeer, onchange: () => { S.zetApparaat('markeer', markeer.checked); huis.markeer(markeer.checked); } });
    return [el('p.noot', { tekst: 'Licht en weer volgen standaard jullie plaats en de echte klok. Hier kun je ze voor de lol vastzetten.' }), box,
      el('label.schakel', null, markeer, el('span', { tekst: 'Markeer placeholder-meubels' })),
      el('p.noot', { tekst: 'Zoomen: knijp met twee vingers, dubbeltik of gebruik + en −. Op een computer: Ctrl + scrollwiel of knijpen op het trackpad.' })];
  }
  function instellingen() { U.sheet({ titel: 'Weer en weergave', inhoud: weergave() }); }
  function doos() {
    const info = huis.scene();
    const lijst = info.doos.length ? el('ul.doos', null, info.doos.map(d => el('li', null, el('span', { tekst: d.naam }),
      el('button.knop.mini', { type: 'button', onclick: () => { huis.uitDoos(d.id); s.sluit(); } }, 'Zet neer'))))
      : el('div.leeg', null, el('b', { tekst: 'De doos is leeg' }), 'Past er na een verbouwing iets niet meer, dan gaat het hierin. In de bewerkmodus kun je ook zelf iets in de doos doen.');
    const s = U.sheet({ titel: 'Verhuisdoos', inhoud: lijst });
  }
  function bewerk(aan) {
    if (aan) wortel.PQApp.ga('huis');
    huis.bewerk(aan);
    if (aan) U.meld('Sleep meubels of jullie twee naar een andere plek. Een lege plek slepen kijkt rond.');
  }

  // ---------- scène: bewerkbalk en voorbeeldbalk ----------
  function scene(info) {
    if (!info) return;
    laatsteInfo = info;
    root.classList.toggle('bewerkt', !!info.bewerken && !info.voorbeeld);
    balkOnder.hidden = !info.bewerken || info.voorbeeld;
    voorbeeldBalk.hidden = !info.voorbeeld;
    if (!info.voorbeeld) return;
    const n = info.getoond, hv = H().niveaus.find(x => x.niveau === n), volgende = n === info.niveau + 1;
    const doosNamen = info.doos.map(d => d.naam.toLowerCase());
    voorbeeldBalk.style.top = (hud.offsetTop + hud.offsetHeight + 6) + 'px';
    voorbeeldBalk.replaceChildren(el('div', null, el('b', { tekst: `Voorbeeld ${n}: ${hv.naam}` }),
      el('small', { tekst: (n > info.niveau ? `${U.getal(hv.prijs)} munten. ` : 'Een eerder niveau. ') + 'Lichte meubels zijn nieuw.' + (doosNamen.length ? ` In de doos: ${doosNamen.join(', ')}.` : '') })),
      el('div.knoprij', null, el('button.knop.mini', { type: 'button', onclick: () => huis.bekijk(null) }, 'Terug'),
        volgende ? el('button.knop.mini.goud', { type: 'button', onclick: () => V.nieuw('verbouwing', { niveau: n }) }, 'Kopen') : null));
  }

  wortel.PQHuisScherm = {
    huis: () => huis, info: () => laatsteInfo, bewerk, doos, instellingen, gereedschap,
    // Voorbeeld van een niveau: het menu dicht en het hele (nieuwe) huis in beeld, niet alleen de lucht.
    bekijk(n) { wortel.PQApp.ga('huis'); huis.bekijk(n); setTimeout(() => huis.zoom.pas(), 320); },
  };
  wortel.PQApp.scherm('huis', {
    maak,
    toon() { tekenHud(); huis.hervat(); },
    ververs() { tekenHud(); },
    verberg() { if (huis.bewerkt()) huis.bewerk(false); huis.pauze(); },
  });
})(window);
