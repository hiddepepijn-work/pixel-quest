// Huis: de scène op volledig scherm met knijpzoom en pannen (huis-zoom.js), zoomknoppen en "alles in beeld",
// Verbouwen (kopen uit de huispot met akkoord van de ander), Bewerken (meubels slepen; alleen een lege plek pant),
// instellingen voor weer en seizoen, de verhuisdoos, en taaksignalen bij het meubel of de kamer van de echte taken.
(function (wortel) {
  'use strict';
  const R = wortel.PQRegels, S = wortel.PQStore, U = wortel.PQUI, T = wortel.PQTaken, V = wortel.PQVoorstel, { el } = U;
  const H = () => wortel.PQ_HUIS;
  let root, huis = null, balkBoven, balkOnder, voorbeeldBalk, gekozenTekst, doosKnop, naarDoosKnop, bewerkKnop;

  function maak(r) {
    root = r;
    const vak = el('div.huis-vol');
    bewerkKnop = el('button.knop.mini', { type: 'button', 'aria-pressed': 'false', onclick: () => zetBewerken(!huis.bewerkt()) }, 'Bewerken');
    balkBoven = el('div.huis-balk.boven', null,
      el('div.huis-titel', null, el('h1', { tekst: 'Ons huis' }), el('span.sub.niveau')),
      el('div.knoprij', null,
        el('button.knop.mini.goud', { type: 'button', onclick: verbouwen }, U.munt(16), 'Verbouwen'),
        bewerkKnop,
        el('button.rond.klein', { type: 'button', 'aria-label': 'Weer, seizoen en weergave', onclick: instellingen }, '☼')));
    voorbeeldBalk = el('div.huis-balk.voorbeeld', { hidden: true });
    gekozenTekst = el('span', { tekst: 'Tik op een meubel om het te kiezen' });
    naarDoosKnop = el('button.knop.mini', { type: 'button', disabled: true, onclick: () => huis.naarDoos() }, 'In de doos');
    doosKnop = el('button.knop.mini', { type: 'button', onclick: doos }, 'Doos');
    balkOnder = el('div.huis-balk.onder', { hidden: true }, el('p.noot', null, gekozenTekst),
      el('div.knoprij', null, naarDoosKnop, doosKnop,
        el('button.knop.mini.stil', { type: 'button', onclick: async () => { if (await U.vraag('Indeling herstellen?', 'Alle meubels gaan terug naar hun startplek. Wat in de doos zit, komt terug.', 'Herstel', 'Laat zo')) huis.herstel(); } }, 'Herstel'),
        el('button.knop.mini.goud', { type: 'button', onclick: () => zetBewerken(false) }, 'Klaar')));
    const zoomKnoppen = el('div.zoomknoppen', { role: 'group', 'aria-label': 'Zoom' },
      el('button.rond', { type: 'button', 'aria-label': 'Inzoomen', onclick: () => huis.zoom.in() }, '+'),
      el('button.rond', { type: 'button', 'aria-label': 'Uitzoomen', onclick: () => huis.zoom.uit() }, '−'),
      el('button.rond.pas', { type: 'button', 'aria-label': 'Alles in beeld', onclick: () => huis.zoom.pas() }, el('span.ic-pas', { 'aria-hidden': 'true' })));
    root.append(vak, balkBoven, voorbeeldBalk, balkOnder, zoomKnoppen);
    huis = wortel.PQHuis.mount(vak, {
      store: S, meld: t => U.meld(t), opTaak: id => T.detail(id),
      taken: wortel.PQVandaag.huisTaken, pets: wortel.PQVandaag.uitgekomen, petNaam: id => S.staat().pets.namen[id],
      zoomStand: () => S.apparaat().huisZoom, opZoom: st => S.zetApparaat('huisZoom', st),
      opKies: k => { gekozenTekst.textContent = k ? 'Gekozen: ' + k.naam : 'Tik op een meubel om het te kiezen'; naarDoosKnop.disabled = !k || k.soort !== 'meubel'; },
      opScene: scene, instellingen: { markeer: !!S.apparaat().markeer },
    });
    document.addEventListener('pq-afgerond', e => { if (wortel.PQApp.huidig() === 'huis' && e.detail.taak.plek) huis.feestje(e.detail.taak.plek); });
    if (!S.apparaat().zoomUitleg) {
      S.zetApparaat('zoomUitleg', 1);
      setTimeout(() => U.meld('Knijp met twee vingers om te zoomen, sleep om rond te kijken. Dubbeltik zoomt in.'), 600);
    }
  }
  function scene(info) {
    if (!info) return;
    const h = H().niveaus.find(x => x.niveau === info.niveau);
    root.querySelector('.niveau').textContent = `Niveau ${info.niveau}: ${h ? h.naam : ''}`;
    doosKnop.textContent = `Doos (${info.doos.length})`;
    bewerkKnop.setAttribute('aria-pressed', String(info.bewerken));
    bewerkKnop.textContent = info.bewerken ? 'Bewerken aan' : 'Bewerken';
    bewerkKnop.disabled = info.voorbeeld;
    balkOnder.hidden = !info.bewerken || info.voorbeeld;
    voorbeeldBalk.hidden = !info.voorbeeld;
    // Onder de bovenbalk, hoe hoog die ook is (op een smalle telefoon lopen de knoppen over twee regels).
    if (info.voorbeeld) voorbeeldBalk.style.top = (balkBoven.offsetTop + balkBoven.offsetHeight + 6) + 'px';
    if (info.voorbeeld) {
      const n = info.getoond, hv = H().niveaus.find(x => x.niveau === n), volgende = n === info.niveau + 1;
      const doosNamen = info.doos.map(d => d.naam.toLowerCase());
      voorbeeldBalk.replaceChildren(el('div', null, el('b', { tekst: `Voorbeeld ${n}: ${hv.naam}` }),
        el('small', { tekst: (n > info.niveau ? `${U.getal(hv.prijs)} munten. ` : 'Een eerder niveau. ') + 'Lichte meubels zijn nieuw.' + (doosNamen.length ? ` In de doos: ${doosNamen.join(', ')}.` : '') })),
        el('div.knoprij', null, el('button.knop.mini', { type: 'button', onclick: () => huis.bekijk(null) }, 'Terug'),
          volgende ? el('button.knop.mini.goud', { type: 'button', onclick: () => koop(n) }, 'Kopen') : null));
    }
  }
  function zetBewerken(aan) {
    huis.bewerk(aan);
    if (aan) U.meld('Sleep meubels of jullie twee naar een andere plek. Een lege plek slepen kijkt rond.');
  }
  function koop(n) {
    if (V.nieuw('verbouwing', { niveau: n })) { /* het voorstel-sheet legt uit wat er nu gebeurt */ }
  }
  // ---------- Verbouwen: alle niveaus, de volgende is te koop ----------
  function verbouwen() {
    const st = S.staat(), nu = Date.now(), pot = R.pot(st, nu), gehaald = R.weken(st, nu).gehaald;
    const kaarten = H().niveaus.map(h => {
      const stand = h.niveau <= st.huis.niveau ? 'gedaan' : h.niveau === st.huis.niveau + 1 ? 'volgende' : 'later';
      const c = el('canvas', { 'aria-label': `Het huis na verbouwing ${h.niveau}: ${h.naam}` });
      wortel.PQHuis.mini(c, h.niveau, 300);
      const open = V.open('verbouwing', d => d.niveau === h.niveau);
      const blok = h.voorwaarde && h.voorwaarde.aantal && gehaald < h.voorwaarde.aantal;
      const knoppen = el('div.knoprij', null,
        h.niveau !== st.huis.niveau ? el('button.knop.mini', { type: 'button', onclick: () => { s.sluit(); huis.bekijk(h.niveau); } }, 'Bekijk') : el('span.label.goud', { tekst: 'jullie huis' }));
      if (stand === 'volgende') {
        if (open) knoppen.append(...V.knoppen(open, () => { s.sluit(); verbouwen(); }));
        else knoppen.append(el('button.knop.mini.goud', { type: 'button', disabled: blok || pot.saldo < h.prijs, onclick: () => { s.sluit(); koop(h.niveau); } },
          pot.saldo < h.prijs ? `Nog ${U.getal(h.prijs - pot.saldo)} sparen` : 'Kopen (voorstel)'));
      }
      return el('article.huiskaart' + (h.niveau === st.huis.niveau ? '.huidig' : ''), null,
        el('div.kopregel-klein', null, el('h3', { tekst: `${h.niveau}. ${h.naam}` }), el('span.label.' + (stand === 'gedaan' ? 'blad' : stand === 'volgende' ? 'goud' : 'prikbord'), { tekst: stand })),
        el('div.minivak', null, c), el('p.noot', { tekst: h.omschrijving }),
        el('p.prijs', null, U.munt(18), h.prijs ? `${U.getal(h.prijs)} munten · ~${String(Math.round(h.prijs / 300 * 2) / 2).replace('.', ',')} weken volle pot` : 'Startniveau'),
        h.voorwaarde ? el('p.noot', { tekst: `Pas te koop ${h.voorwaarde.tekst}${blok ? ` (nu ${gehaald})` : ''}.` }) : null,
        el('p.noot.kamers', { tekst: wortel.PQHuis.kamerTekst(h.niveau) }), knoppen);
    });
    const s = U.sheet({ titel: 'Verbouwen',
      inhoud: [el('p.potregel.groot', null, U.munt(22), `${U.getal(pot.saldo)} munten in de huispot`),
        el('p.noot', { tekst: `Er komt 0,5 munt per inzet in, hooguit ${pot.maxWeek} per week. Kopen doen jullie samen: de ander keurt goed. Er verdwijnt nooit een kamer.` }),
        el('div.huizenraster', null, kaarten)] });
    const volg = s.binnen.querySelector('.huiskaart.huidig');
    if (volg) setTimeout(() => volg.scrollIntoView({ block: 'start', behavior: 'auto' }), 60);
  }

  // ---------- instellingen: weer, seizoen, plaats, altijd dag, feestdagen, weerkleding, placeholders ----------
  function instellingen() {
    const box = el('div.omgevingsbalk.balk');
    wortel.PQ_OMGEVINGHUIS.bediening(box);
    const markeer = el('input', { type: 'checkbox', checked: !!S.apparaat().markeer, onchange: () => { S.zetApparaat('markeer', markeer.checked); huis.markeer(markeer.checked); } });
    const s = U.sheet({ titel: 'Weer en weergave', inhoud: [
      el('p.noot', { tekst: 'Licht en weer volgen standaard jullie plaats en de echte klok. Hier kun je ze voor de lol vastzetten.' }), box,
      el('label.schakel', null, markeer, el('span', { tekst: 'Markeer placeholder-meubels' })),
      el('p.noot', { tekst: 'Zoomen: knijp met twee vingers of gebruik + en −. Op een computer: Ctrl + scrollwiel of knijpen op het trackpad.' })] });
    return s;
  }
  function doos() {
    const info = huis.scene();
    const lijst = info.doos.length ? el('ul.doos', null, info.doos.map(d => el('li', null, el('span', { tekst: d.naam }),
      el('button.knop.mini', { type: 'button', onclick: () => { huis.uitDoos(d.id); s.sluit(); } }, 'Zet neer'))))
      : el('div.leeg', null, el('b', { tekst: 'De doos is leeg' }), 'Past er na een verbouwing iets niet meer, dan gaat het hierin. Ook jij kunt iets in de doos doen.');
    const s = U.sheet({ titel: 'Verhuisdoos', inhoud: lijst });
  }

  wortel.PQApp.scherm('huis', {
    maak,
    toon() { huis.hervat(); },
    verberg() { if (huis.bewerkt()) huis.bewerk(false); huis.pauze(); },
  });
})(window);
