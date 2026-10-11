// Menu → Bouwen: het huis aanpassen. Bovenaan de huis-gereedschappen (bewerken, verhuisdoos, weer en weergave),
// daaronder alle 10 verbouwingen. "Bekijk" sluit het menu en toont dat niveau als voorbeeld in het huis; de volgende
// verbouwing koop je als voorstel uit de huispot, dat de ander goedkeurt.
(function (wortel) {
  'use strict';
  const R = wortel.PQRegels, S = wortel.PQStore, U = wortel.PQUI, V = wortel.PQVoorstel, { el } = U;
  const H = () => wortel.PQ_HUIS, HS = () => wortel.PQHuisScherm;
  let root, inhoud;

  function kaart(h, st, pot, gehaald) {
    const stand = h.niveau <= st.huis.niveau ? 'gedaan' : h.niveau === st.huis.niveau + 1 ? 'volgende' : 'later';
    const c = el('canvas', { 'aria-label': `Het huis na verbouwing ${h.niveau}: ${h.naam}` });
    wortel.PQHuis.mini(c, h.niveau, 300);
    const open = V.open('verbouwing', d => d.niveau === h.niveau);
    const blok = h.voorwaarde && h.voorwaarde.aantal && gehaald < h.voorwaarde.aantal;
    const knoppen = el('div.knoprij', null,
      h.niveau !== st.huis.niveau ? el('button.knop.mini', { type: 'button', onclick: () => HS().bekijk(h.niveau) }, 'Bekijk in huis') : el('span.label.goud', { tekst: 'jullie huis' }));
    if (stand === 'volgende') {
      if (open) knoppen.append(...V.knoppen(open, teken));
      else knoppen.append(el('button.knop.mini.goud', { type: 'button', disabled: blok || pot.saldo < h.prijs, onclick: () => V.nieuw('verbouwing', { niveau: h.niveau }) },
        pot.saldo < h.prijs ? `Nog ${U.getal(h.prijs - pot.saldo)} sparen` : 'Kopen (voorstel)'));
    }
    return el('article.huiskaart' + (h.niveau === st.huis.niveau ? '.huidig' : ''), { 'data-niveau': h.niveau },
      el('div.kopregel-klein', null, el('h3', { tekst: `${h.niveau}. ${h.naam}` }), el('span.label.' + (stand === 'gedaan' ? 'blad' : stand === 'volgende' ? 'goud' : 'prikbord'), { tekst: stand })),
      el('div.minivak', null, c), el('p.noot', { tekst: h.omschrijving }),
      el('p.prijs', null, U.munt(18), h.prijs ? `${U.getal(h.prijs)} munten · ~${String(Math.round(h.prijs / 300 * 2) / 2).replace('.', ',')} weken volle pot` : 'Startniveau'),
      h.voorwaarde ? el('p.noot', { tekst: `Pas te koop ${h.voorwaarde.tekst}${blok ? ` (nu ${gehaald})` : ''}.` }) : null,
      el('p.noot.kamers', { tekst: wortel.PQHuis.kamerTekst(h.niveau) }), knoppen);
  }
  function teken() {
    if (!inhoud) return;
    const st = S.staat(), nu = Date.now(), pot = R.pot(st, nu), gehaald = R.weken(st, nu).gehaald;
    const info = HS() && HS().info(), volgende = H().niveaus.find(h => h.niveau === st.huis.niveau + 1);
    inhoud.replaceChildren(
      el('section.kaart.huisgereedschap', { 'aria-label': 'Het huis aanpassen' },
        el('h2.meerkop', { tekst: 'Jullie huis' }),
        el('div.knoprij', null,
          el('button.knop.mini', { type: 'button', onclick: () => HS().bewerk(true) }, 'Meubels verplaatsen'),
          el('button.knop.mini', { type: 'button', onclick: () => HS().doos() }, `Verhuisdoos (${info ? info.doos.length : 0})`),
          el('button.knop.mini', { type: 'button', onclick: () => HS().instellingen() }, 'Weer en weergave'))),
      el('p.potregel.groot', null, U.munt(22), `${U.getal(pot.saldo)} munten in de huispot`),
      el('p.noot', { tekst: `Er komt 0,5 munt per inzet in, hooguit ${pot.maxWeek} per week. Kopen doen jullie samen: de ander keurt goed. Er verdwijnt nooit een kamer.` }),
      ...(volgende ? [el('div.sectiekop', null, el('h2', { tekst: 'Volgende verbouwing' })), kaart(volgende, st, pot, gehaald)] : [el('p.noot', { tekst: 'Jullie huis is af: een villa met zwembad.' })]),
      el('div.sectiekop', null, el('h2', { tekst: 'Alle niveaus' })),
      el('div.huizenraster', null, H().niveaus.filter(h => h !== volgende).map(h => kaart(h, st, pot, gehaald))));
  }
  function maak(r) {
    root = r;
    inhoud = el('div.verbouw-inhoud');
    root.append(el('header.kopregel.klein', null, el('div', null, el('h1', { tekst: 'Bouwen' }), el('p.sub', { tekst: 'Eén huis dat met jullie meegroeit.' }))), inhoud);
  }
  wortel.PQApp.scherm('verbouwen', {
    maak,
    toon: teken,
    ververs(op) { if (!op || op.soort !== 'klok') teken(); },
  });
})(window);
