// Pixel Quest: de app-schil, huis-eerst. Het huis (scherm 'huis') is altijd het startscherm en vult het scherm.
// Het menu ligt erover, met de tabs Vandaag, Quests, Kast, Winkel, Verbouwen, Pets (collectie) en Meer. Openen: de menuknop
// onderin of vanaf de onderkant omhoog vegen. Sluiten: omlaag vegen, de sluitknop, Escape of een tik op het huis.
// Een scherm registreert zich met PQApp.scherm(naam, { maak(el), toon(), verberg(), ververs(opdracht) }).
// PQApp.ga('quests') opent het menu op dat tabblad; PQApp.ga('huis') sluit het menu.
// Adres: index.html#quests opent het menu op dat tabblad (handig om te testen); ?test toont de JS-foutenteller.
(function (wortel) {
  'use strict';
  const S = wortel.PQStore, U = wortel.PQUI, { el } = U;
  S.laad();
  const MENU = ['vandaag', 'quests', 'kast', 'winkel', 'verbouwen', 'collectie', 'meer'];
  const NAMEN = ['huis', ...MENU];
  const schermen = {}, gemaakt = new Set();
  let tab = null, open = false, gestart = false, wacht = null;
  const $ = s => document.querySelector(s);

  function scherm(naam, def) { schermen[naam] = def; }
  function roep(naam, functie, arg) {
    const def = schermen[naam];
    if (!def) return;
    try {
      if (!gemaakt.has(naam)) { gemaakt.add(naam); def.maak($('#view-' + naam)); }
      if (functie && def[functie]) def[functie](arg || {});
    } catch (e) { toonFout(e); }
  }
  function toonFout(e) {
    console.error(e);
    if (wortel.PQ_TEST) wortel.PQ_TEST.fouten.push('scherm: ' + e.message);
    U.fout('Er ging iets mis bij het tonen van dit scherm. Probeer het opnieuw.');
  }
  function zetHash(h) { if (location.hash !== h) history.replaceState(null, '', h || location.pathname + location.search); }

  // ---------- menu openen en sluiten ----------
  function kiesTab(naam, opties) {
    if (tab && tab !== naam && gemaakt.has(tab) && schermen[tab].verberg) { try { schermen[tab].verberg(); } catch (e) { toonFout(e); } }
    for (const n of MENU) {
      const aan = n === naam;
      $('#view-' + n).hidden = !aan;
      const b = $(`.menu-tabs [data-tab="${n}"]`);
      b.setAttribute('aria-selected', String(aan)); b.tabIndex = aan ? 0 : -1;
    }
    const zelfde = tab === naam && open;
    tab = naam;
    S.zetApparaat('tab', naam);
    if (zelfde && !(opties && (opties.naar || opties.opnieuw))) { $('#view-' + naam).scrollTo({ top: 0, behavior: U.rustig() ? 'auto' : 'smooth' }); return; }
    roep(naam, 'toon', opties);
  }
  function openMenu(naam, opties) {
    clearTimeout(wacht);
    kiesTab(naam || tab || 'vandaag', opties);
    if (!open) {
      open = true;
      const mel = $('#melding');     // een uitlegmelding mag de taken niet bedekken; "Ongedaan maken" blijft staan
      if (mel && !mel.hidden && !mel.querySelector('button')) mel.hidden = true;
      const m = $('#menu');
      m.hidden = false; $('#menuAchter').hidden = false;
      void m.offsetWidth;
      m.classList.add('open'); m.style.transform = '';
      $('#menuKnop').setAttribute('aria-expanded', 'true');
      document.dispatchEvent(new CustomEvent('pq-menu', { detail: { open: true } }));
    }
    zetHash('#' + tab);
    werkBadges();
  }
  function sluitMenu() {
    if (!open) return;
    open = false;
    if (tab && gemaakt.has(tab) && schermen[tab].verberg) { try { schermen[tab].verberg(); } catch (e) { toonFout(e); } }
    const m = $('#menu');
    m.classList.remove('open'); m.style.transform = '';
    $('#menuAchter').hidden = true;
    $('#menuKnop').setAttribute('aria-expanded', 'false');
    document.dispatchEvent(new CustomEvent('pq-menu', { detail: { open: false } }));
    wacht = setTimeout(() => { if (!open) m.hidden = true; }, U.rustig() ? 0 : 280);
    zetHash('');
    if (m.contains(document.activeElement)) $('#menuKnop').focus({ preventScroll: true });
  }
  function ga(naam, opties) {
    if (!NAMEN.includes(naam)) naam = 'vandaag';
    if (!gestart) { tab = naam === 'huis' ? null : naam; return; }
    if (naam === 'huis') sluitMenu(); else openMenu(naam, opties);
  }
  // Rustige badges (geen rood): open voorstellen en verzoeken voor jou.
  function werkBadges() {
    const st = S.staat(), mij = S.ik();
    const voorstellen = st.voorstellen.filter(v => v.status === 'open' && v.door !== mij).length;
    const verzoeken = Object.values(st.taken).filter(t => t.verzoek_aan === mij && wortel.PQRegels.actief(t)).length;
    const zet = (b, n, label) => { if (!b) return; b.hidden = !n; b.textContent = n; b.setAttribute('aria-label', `${n} ${label}`); };
    zet($('.menu-tabs [data-tab="meer"] .tabbadge'), voorstellen, 'voorstellen om goed te keuren');
    zet($('.menu-tabs [data-tab="quests"] .tabbadge'), verzoeken, 'vragen aan jou');
    zet($('#menuKnop .tabbadge'), voorstellen + verzoeken, 'dingen voor jou in het menu');
  }
  // ---------- vegen: omhoog vanaf de onderkant opent, omlaag over de kop sluit ----------
  function veeg(doelEl, richting, klaar, volg) {
    let start = null;
    doelEl.addEventListener('pointerdown', e => {
      if (e.button > 0) return;
      start = { y: e.clientY, x: e.clientX, t: performance.now(), id: e.pointerId, bewogen: false };
    });
    doelEl.addEventListener('pointermove', e => {
      if (!start || e.pointerId !== start.id) return;
      const dy = e.clientY - start.y;
      if (!start.bewogen && Math.abs(dy) > 8 && Math.abs(dy) > Math.abs(e.clientX - start.x)) {
        start.bewogen = true; try { doelEl.setPointerCapture(e.pointerId); } catch (x) { /* */ }
      }
      if (start.bewogen && volg) volg(dy);
    });
    const los = e => {
      if (!start || e.pointerId !== start.id) return;
      const dy = e.clientY - start.y, v = dy / Math.max(1, performance.now() - start.t), was = start.bewogen;
      start = null;
      if (volg) volg(null);
      if (!was) return;
      doelEl.dataset.geveegd = '1'; setTimeout(() => delete doelEl.dataset.geveegd, 50);
      if (richting * dy > 60 || richting * v > 0.5) klaar();
    };
    doelEl.addEventListener('pointerup', los);
    doelEl.addEventListener('pointercancel', los);
  }
  function bediening() {
    const m = $('#menu');
    $('#menuKnop').onclick = e => { if (e.currentTarget.dataset.geveegd) return; U.tik(e.currentTarget); open ? sluitMenu() : openMenu('vandaag'); };
    $('#menuAchter').onclick = sluitMenu;
    $('#menuSluit').onclick = sluitMenu;
    document.querySelectorAll('.menu-tabs [data-tab]').forEach(b => {
      b.onclick = () => { U.tik(b.querySelector('.tabicoon')); openMenu(b.dataset.tab); };
      b.onkeydown = e => {
        const i = MENU.indexOf(b.dataset.tab), d = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
        if (!d) return;
        e.preventDefault();
        const n = MENU[(i + d + MENU.length) % MENU.length];
        openMenu(n); $(`.menu-tabs [data-tab="${n}"]`).focus();
      };
    });
    const breed = () => matchMedia('(min-width: 900px)').matches;
    veeg($('.menu-kop'), 1, sluitMenu, dy => {
      if (breed()) return;
      m.classList.toggle('sleept', dy != null);
      m.style.transform = dy != null && dy > 0 ? `translateY(${dy}px)` : '';
    });
    for (const z of [$('#menuKnop'), $('.veegzone')]) veeg(z, -1, () => openMenu('vandaag'));
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && open && !document.querySelector('.sheet-achter')) sluitMenu(); });
  }

  // ---------- Wie ben jij? ----------
  function wieBenJij(klaar) {
    const kies = id => { S.zetIk(id); vak.remove(); klaar(); };
    const kaart = (id, naam) => el('button.wiekaart', { type: 'button', onclick: () => kies(id), 'aria-label': `Ik ben ${naam}` },
      U.sprite(id, 1.4, naam), el('b', { tekst: naam }));
    const vak = el('div.welkom', { role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'welkomTitel' },
      el('div.welkom-binnen', null,
        el('p.logo-klein', null, el('span.hart', { tekst: '♥' }), ' PIXEL QUEST ', el('span.hart', { tekst: '♥' })),
        el('h1', { id: 'welkomTitel', tekst: 'Wie ben jij?' }),
        el('p', { tekst: 'Deze telefoon onthoudt het. Wisselen kan later onder Menu → Meer.' }),
        el('div.wiekeuze', null, kaart('hidde', 'Hidde'), kaart('tessie', 'Tessie')),
        el('p.noot', { tekst: 'Er is nog geen server: alles blijft op dit apparaat. Samen spelen op twee telefoons komt met de server.' })));
    document.body.append(vak);
    setTimeout(() => vak.querySelector('button').focus(), 50);
  }

  // ---------- start ----------
  function start() {
    gestart = true;
    roep('huis', 'toon');      // maakt ook de menuknop en de veegzone
    bediening();
    S.abonneer(op => {
      werkBadges();
      roep('huis', 'ververs', op);
      if (open && tab && gemaakt.has(tab) && schermen[tab].ververs) { try { schermen[tab].ververs(op); } catch (e) { toonFout(e); } }
      for (const n of gemaakt) if (n !== tab && n !== 'huis' && schermen[n].verouderd) schermen[n].verouderd(op);
    });
    // Elke minuut: claims verlopen en klokken lopen door.
    const tik = () => { if (document.hidden) return; roep('huis', 'ververs', { soort: 'klok' }); if (open && tab) roep(tab, 'ververs', { soort: 'klok' }); };
    setInterval(tik, 60000);
    document.addEventListener('visibilitychange', tik);
    document.addEventListener('pq-profiel', () => { roep('huis', 'ververs', { soort: 'profiel' }); werkBadges(); });
    wortel.addEventListener('hashchange', () => { const n = location.hash.slice(1); if (MENU.includes(n) && (n !== tab || !open)) openMenu(n); else if ((!n || n === 'huis') && open) sluitMenu(); });
    // Het huis is het startscherm. Een #tab in het adres (een link of een test) opent het menu, maar niet na herladen.
    const nav = performance.getEntriesByType && performance.getEntriesByType('navigation')[0];
    const doel = nav && nav.type === 'reload' ? '' : location.hash.slice(1);
    if (!doel) zetHash('');
    werkBadges();
    if (MENU.includes(doel)) openMenu(doel);
    else if (tab && MENU.includes(tab)) openMenu(tab);
    if (!S.opslagOk()) U.fout('Opslaan lukt niet in deze browser (privévenster?). Wat je doet, gaat bij herladen verloren.');
  }
  wortel.PQApp = { scherm, ga, huidig: () => (open ? tab : 'huis'), menuOpen: () => open, badges: werkBadges, sluitMenu };

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
