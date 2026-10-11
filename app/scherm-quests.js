// Quests: alle taken met de filters Mijn, Open (prikbord), Samen en Alles. Gesorteerd op behoefte-klok × inzet;
// wat nu nodig is bovenaan, de rest onder "Deze week" en "Later". Onderaan wat er recent gedaan is, met bedankjes.
(function (wortel) {
  'use strict';
  const R = wortel.PQRegels, S = wortel.PQStore, U = wortel.PQUI, T = wortel.PQTaken, { el } = U;
  let root, lijst, chips, filterNu = 'mijn';
  const FILTERS = [['mijn', 'Mijn'], ['open', 'Open'], ['samen', 'Samen'], ['alles', 'Alles']];
  const LEEG = {
    mijn: ['Niets op jouw naam', 'Pak iets van het prikbord, of maak een nieuwe taak.'],
    open: ['Het prikbord is leeg', 'Alles heeft een eigenaar. Nieuwe taken zonder "wie" landen hier.'],
    samen: ['Geen samen-taken', 'Kies bij "Wie?" voor Samen: dan krijgt ieder de helft van de inzet.'],
    alles: ['Nog geen taken', 'Maak de eerste taak met de knop "+ Taak" bovenaan.'],
  };
  function binnenWeek(x, nu) {
    if (x.k) return x.k.waarde >= 1 - 7 / x.t.interval;
    if (x.t.deadline) return R.uitSleutel(x.t.deadline) - nu < 7 * 864e5;
    return !!x.t.tijdslot;
  }
  function teken() {
    if (!lijst) return;
    const nu = Date.now(), alle = T.filter(filterNu, nu), mij = S.ik();
    for (const c of chips.children) {
      c.setAttribute('aria-selected', String(c.dataset.f === filterNu));
      c.querySelector('.tel').textContent = T.filter(c.dataset.f, nu).length;
    }
    const nodig = alle.filter(x => x.nodig), week = alle.filter(x => !x.nodig && binnenWeek(x, nu)), later = alle.filter(x => !x.nodig && !binnenWeek(x, nu));
    const delen = [];
    if (!alle.length) {
      const [kop, tekst] = LEEG[filterNu];
      delen.push(el('div.leeg', null, el('b', { tekst: kop }), tekst));
    }
    if (nodig.length) delen.push(el('div.sectiekop', null, el('h2', { tekst: 'Nu' })), T.lijstEl(nodig, null, { pak: true }));
    if (week.length) delen.push(el('div.sectiekop', null, el('h2', { tekst: 'Deze week' })), T.lijstEl(week, null, { pak: filterNu === 'open' }));
    if (later.length) {
      delen.push(el('details.later', { open: !nodig.length && !week.length }, el('summary', null, el('h2', { tekst: `Later (${later.length})` })), T.lijstEl(later)));
    }
    // Recent gedaan (7 dagen): bedankje geven of ongedaan maken.
    const st = S.staat(), recent = st.afrondingen.filter(a => !a.ongedaan && nu - a.op < 7 * 864e5 && (!a.prive || a.door === mij)).slice(-12).reverse();
    if (recent.length) {
      const ul = el('ul.afgerond.lijst-gedaan');
      for (const a of recent) {
        const bedankt = st.bedankjes.some(b => b.afronding === a.id && b.van === mij), magDanken = (a.door !== mij || a.samen) && !a.prive;
        ul.append(el('li', null,
          el('span.gedaan-tekst', null, el('b', { tekst: a.titel }), el('small', { tekst: `${U.naam(a.door)}${a.samen ? ' (samen)' : ''} · ${new Date(a.op).toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric' })} · +${a.inzet}` })),
          magDanken ? el('button.knop.mini' + (bedankt ? '.goud' : ''), { type: 'button', disabled: bedankt, 'aria-label': `Bedank voor ${a.titel}`,
            onclick: () => { if (T.doe('bedank', { afronding: a.id }, '♥ Bedankje gegeven. Het pet springt van blijdschap.')) document.dispatchEvent(new CustomEvent('pq-bedankt')); } }, bedankt ? '♥' : '♥ Bedank') : null));
      }
      delen.push(el('details.later', null, el('summary', null, el('h2', { tekst: `Gedaan deze week (${recent.length})` })), ul));
    }
    lijst.replaceChildren(...delen);
  }
  function maak(r) {
    root = r;
    chips = el('div.chips', { role: 'tablist', 'aria-label': 'Filter' }, FILTERS.map(([f, n]) => el('button.chip', { type: 'button', role: 'tab', 'data-f': f,
      onclick: () => { filterNu = f; S.zetApparaat('questFilter', f); teken(); } }, n, el('span.tel'))));
    filterNu = S.apparaat().questFilter || 'mijn';
    lijst = el('div.quests-lijst');
    root.append(
      el('header.kopregel', null, el('div', null, el('h1', { tekst: 'Quests' }), el('p.sub', { tekst: 'Wie wil, pakt. Niemand is de manager.' })),
        el('button.knop.mini.goud', { type: 'button', onclick: () => T.bewerk(), 'aria-label': 'Nieuwe taak' }, '+ Taak')),
      chips, lijst);
  }
  wortel.PQApp.scherm('quests', { maak, toon: teken, ververs: teken });
})(window);
