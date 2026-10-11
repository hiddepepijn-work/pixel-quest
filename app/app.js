// Pixel Quest: de app-schil. Laadt de store, vraagt bij de eerste start "Wie ben jij?", regelt de tabbalk
// (Vandaag, Quests, Huis, Kast, Meer) en zegt elk scherm wanneer het zichtbaar wordt, ververst of verdwijnt.
// Een scherm registreert zich met PQApp.scherm(naam, { maak(el), toon(), verberg(), ververs(opdracht) }).
// Adres: index.html#quests opent dat tabblad (handig om te testen); ?test toont de JS-foutenteller.
(function (wortel) {
  'use strict';
  const S = wortel.PQStore, U = wortel.PQUI, { el } = U;
  S.laad();
  const NAMEN = ['vandaag', 'quests', 'huis', 'kast', 'meer'];
  const schermen = {}, gemaakt = new Set();
  let huidig = null, gestart = false;
  const $ = s => document.querySelector(s);

  function scherm(naam, def) { schermen[naam] = def; }
  function ga(naam, opties) {
    if (!NAMEN.includes(naam)) naam = 'vandaag';
    if (!gestart) { huidig = naam; return; }
    const vorige = huidig;
    if (vorige === naam && gemaakt.has(naam) && !(opties && opties.opnieuw)) { const v = $('#view-' + naam); v.scrollTo({ top: 0, behavior: U.rustig() ? 'auto' : 'smooth' }); return; }
    if (vorige && schermen[vorige] && gemaakt.has(vorige) && schermen[vorige].verberg) schermen[vorige].verberg();
    for (const n of NAMEN) {
      const v = $('#view-' + n), aan = n === naam;
      v.hidden = !aan;
      const tab = $(`.tabbalk [data-tab="${n}"]`);
      tab.setAttribute('aria-selected', String(aan));
      tab.tabIndex = aan ? 0 : -1;
    }
    huidig = naam;
    S.zetApparaat('tab', naam);
    if (location.hash !== '#' + naam) history.replaceState(null, '', '#' + naam);
    const def = schermen[naam];
    if (def && !gemaakt.has(naam)) { gemaakt.add(naam); try { def.maak($('#view-' + naam)); } catch (e) { toonFout(e); } }
    if (def && def.toon) { try { def.toon(opties || {}); } catch (e) { toonFout(e); } }
    werkBadges();
  }
  function toonFout(e) {
    console.error(e);
    if (wortel.PQ_TEST) wortel.PQ_TEST.fouten.push('scherm: ' + e.message);
    U.fout('Er ging iets mis bij het tonen van dit scherm. Probeer het opnieuw.');
  }
  // Rustige badges (geen rood): open voorstellen en verzoeken voor jou.
  function werkBadges() {
    const st = S.staat(), mij = S.ik();
    const voorstellen = st.voorstellen.filter(v => v.status === 'open' && v.door !== mij).length;
    const verzoeken = Object.values(st.taken).filter(t => t.verzoek_aan === mij && wortel.PQRegels.actief(t)).length;
    const zet = (tab, n, label) => {
      const b = $(`.tabbalk [data-tab="${tab}"] .tabbadge`);
      b.hidden = !n; b.textContent = n; b.setAttribute('aria-label', `${n} ${label}`);
    };
    zet('meer', voorstellen, 'voorstellen om goed te keuren');
    zet('quests', verzoeken, 'vragen aan jou');
  }

  // ---------- Wie ben jij? ----------
  function wieBenJij(klaar) {
    const kies = id => { S.zetIk(id); scherm.remove(); klaar(); };
    const kaart = (id, naam) => el('button.wiekaart', { type: 'button', onclick: () => kies(id), 'aria-label': `Ik ben ${naam}` },
      U.sprite(id, 1.4, naam), el('b', { tekst: naam }));
    const scherm = el('div.welkom', { role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'welkomTitel' },
      el('div.welkom-binnen', null,
        el('p.logo-klein', null, el('span.hart', { tekst: '♥' }), ' PIXEL QUEST ', el('span.hart', { tekst: '♥' })),
        el('h1', { id: 'welkomTitel', tekst: 'Wie ben jij?' }),
        el('p', { tekst: 'Deze telefoon onthoudt het. Wisselen kan later onder Meer.' }),
        el('div.wiekeuze', null, kaart('hidde', 'Hidde'), kaart('tessie', 'Tessie')),
        el('p.noot', { tekst: 'Er is nog geen server: alles blijft op dit apparaat. Samen spelen op twee telefoons komt met de server.' })));
    document.body.append(scherm);
    setTimeout(() => scherm.querySelector('button').focus(), 50);
  }

  // ---------- start ----------
  function start() {
    gestart = true;
    document.querySelectorAll('.tabbalk [data-tab]').forEach(b => {
      b.onclick = () => { U.tik(b.querySelector('.tabicoon')); ga(b.dataset.tab); };
      b.onkeydown = e => {
        const i = NAMEN.indexOf(b.dataset.tab), d = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
        if (!d) return;
        e.preventDefault();
        const n = NAMEN[(i + d + NAMEN.length) % NAMEN.length];
        ga(n); $(`.tabbalk [data-tab="${n}"]`).focus();
      };
    });
    S.abonneer(op => {
      werkBadges();
      const def = schermen[huidig];
      if (def && def.ververs && gemaakt.has(huidig)) { try { def.ververs(op); } catch (e) { toonFout(e); } }
      for (const n of gemaakt) if (n !== huidig && schermen[n].verouderd) schermen[n].verouderd(op);
    });
    // Elke minuut: claims verlopen en klokken lopen door.
    setInterval(() => { if (!document.hidden && schermen[huidig] && schermen[huidig].ververs) schermen[huidig].ververs({ soort: 'klok' }); }, 60000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden && schermen[huidig] && schermen[huidig].ververs) schermen[huidig].ververs({ soort: 'klok' }); });
    wortel.addEventListener('hashchange', () => { const n = location.hash.slice(1); if (NAMEN.includes(n) && n !== huidig) ga(n); });
    const doel = location.hash.slice(1);
    const eerst = NAMEN.includes(doel) ? doel : (S.apparaat().tab || 'vandaag');
    huidig = null;
    ga(eerst);
    if (!S.opslagOk()) U.fout('Opslaan lukt niet in deze browser (privévenster?). Wat je doet, gaat bij herladen verloren.');
  }
  wortel.PQApp = { scherm, ga, huidig: () => huidig, badges: werkBadges };

  document.addEventListener('DOMContentLoaded', () => {
    // Paginazoom van de browser zelf uit (alleen het huis zoomt), ook in Safari.
    document.addEventListener('gesturestart', e => e.preventDefault());
    // Vraag de browser de opslag niet op te ruimen bij ruimtegebrek (best effort; iOS mag het negeren).
    try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {}); } catch (e) { /* */ }
    wortel.PQHuis.laad().catch(e => { if (wortel.PQ_TEST) wortel.PQ_TEST.fouten.push('laden: ' + e); }).then(() => {
      if (S.ik()) start(); else wieBenJij(start);
    });
  });
})(window);
