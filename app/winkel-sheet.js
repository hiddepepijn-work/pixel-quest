// Winkel-UI, deel 2: de sheets om te bekijken, te passen en te kopen (kleding, set, meubel), het feestje na een
// aankoop met "Aantrekken" of "Plaatsen", en de drops (zeldzame kleuren en stel-sets bij samen-mijlpalen).
// Kopen is altijd een voorstel uit de gedeelde huispot dat de ander goedkeurt (app-voorstel.js).
(function (wortel) {
  'use strict';
  const R = wortel.PQRegels, S = wortel.PQStore, U = wortel.PQUI, P = wortel.PQWinkel, V = wortel.PQVoorstel, WU = wortel.PQWinkelUI, { el } = U;
  const F = () => wortel.PQ_FIGUUR;
  let laatsteWinkelSheet = 0;   // een aankoop uit de winkel krijgt na het akkoord een vervolg-sheet

  function koopKnop(prijs, soort, data, opties) {
    opties = opties || {};
    const open = V.open(soort, d => JSON.stringify(d) === JSON.stringify(data));
    if (open) return el('button.knop', { type: 'button', disabled: true }, 'Voorstel staat open');
    if (opties.uit) return el('button.knop', { type: 'button', disabled: true }, opties.uit);
    const tekort = WU.sparen(prijs);
    if (tekort) return el('button.knop', { type: 'button', disabled: true }, tekort);
    return el('button.knop.goud', { type: 'button', onclick: () => { laatsteWinkelSheet = Date.now(); U.sluitAlles(); setTimeout(() => V.nieuw(soort, data), 230); } },
      'Kopen ', U.munt(16), U.getal(prijs));
  }
  const openKaart = (soort, f) => { const v = V.open(soort, f); return v ? V.kaart(v, () => U.sluitAlles()) : null; };

  // ---------- aantrekken: de look van iemand bijwerken (zoals de kast) ----------
  function aantrekken(fid, extra) {
    const look = WU.metItems(fid, extra);
    const r = S.doe('kleding.look', { fid, look });
    if (!r.ok) return U.fout(r.fout);
    if (wortel.PQ_KLEDINGKAST) wortel.PQ_KLEDINGKAST.herlaad();
    U.meld(`${U.naam(fid)} draagt het nu. Kijk maar in huis.`);
  }

  // ---------- kleding ----------
  function kleding(fid, id, kleur) {
    const it = P.item(id);
    if (!it) return;
    const w = R.weekVan(Date.now()), heb = () => S.staat().kleding.bezit[fid][it.id] || [];
    const kleuren = [...it.kleuren, ...heb().filter(k => !it.kleuren.includes(k))];
    let gekozen = kleur || (heb().length && !heb().includes(it.kleuren[0]) ? heb()[0] : it.kleuren[0]);
    const pp = WU.paspop(fid, f => (it.lichaam.includes(f) ? [{ item: it.id, kleur: gekozen }] : []));
    const stalen = el('div.swatches'), info = el('div.koopinfo'), voet = el('div.knoprij');
    const s = U.sheet({ titel: it.naam, inhoud: [pp.el, el('p.noot.kleurkop', { tekst: 'Kleuren · ✓ in bezit · gestreept = niet deze week' }), stalen, info], knoppen: [voet] });
    function teken() {
      const st = S.staat(), hebK = heb().includes(gekozen), zeld = P.isZeldzaam(gekozen), teKoop = !zeld && P.kleurTeKoop(it, gekozen, w);
      const prijs = P.kledingPrijs(st, fid, it, gekozen), set = P.sets().find(x => x.id === it.set_id);
      stalen.replaceChildren(...kleuren.map(k => WU.staal(k, { aan: k === gekozen, heb: heb().includes(k), slot: !heb().includes(k) && (P.isZeldzaam(k) || !P.kleurTeKoop(it, k, w)),
        label: `${P.kleurNaam(k)}${heb().includes(k) ? ' (in bezit)' : P.isZeldzaam(k) ? ' (alleen als drop)' : P.kleurTeKoop(it, k, w) ? ' (te koop)' : ' (komt terug)'}`,
        onclick: () => { gekozen = k; teken(); pp.teken(); } })));
      const regels = [
        el('p.prijsregel', null, hebK ? el('span.label.blad', { tekst: 'in bezit' }) : WU.prijsLabel(prijs),
          el('span', { tekst: ` ${P.kleurNaam(gekozen)} · ${WU.SLOTNAAM[it.slot].toLowerCase()} · voor ${U.naam(fid)}` })),
        heb().length ? el('p.noot', { tekst: `Je hebt ${heb().length} van ${kleuren.length} kleuren.${!hebK && teKoop && gekozen !== it.kleuren[0] ? ' Een extra kleur kost de helft.' : ''}` }) : null,
        !hebK && zeld ? el('p.noot', { tekst: 'Zeldzame kleur: niet te koop. Komt als drop bij een samen-mijlpaal.' }) : null,
        !hebK && !zeld && !teKoop ? el('p.noot', { tekst: 'Deze kleur is deze week niet in de winkel. Hij komt vanzelf terug; kijk bij Uitgelicht.' }) : null,
        set ? el('button.linkknop', { type: 'button', onclick: () => { s.sluit(); setTimeout(() => setSheet(fid, set.id), 230); } }, `Hoort bij de set ${set.naam} →`) : null,
        !it.lichaam.includes(fid) ? el('p.noot', { tekst: `Bestaat (nog) niet voor ${U.naam(fid)}.` }) : null,
        openKaart('kleding', d => d.fid === fid && d.item === it.id && d.kleur === gekozen)];
      info.replaceChildren(...regels.filter(Boolean));
      voet.replaceChildren(hebK
        ? el('button.knop.goud', { type: 'button', onclick: () => { aantrekken(fid, [{ item: it.id, kleur: gekozen }]); s.sluit(); } }, 'Aantrekken')
        : koopKnop(prijs, 'kleding', { fid, item: it.id, kleur: gekozen }, { uit: zeld ? 'Alleen als drop' : !teKoop ? 'Komt terug in de winkel' : !it.lichaam.includes(fid) ? 'Niet voor ' + U.naam(fid) : null }));
    }
    teken();
    return s;
  }

  // ---------- set ----------
  function setSheet(fid, id) {
    const set = P.sets().find(x => x.id === id);
    if (!set) return;
    const i = P.setInfo(S.staat(), fid, set);
    const extra = f => P.setDelen(set, f).getekend.map(it => ({ item: it.id, kleur: (S.staat().kleding.bezit[f][it.id] || [])[0] || it.kleuren[0] }));
    const pp = WU.paspop(fid, extra);
    const lijst = el('ul.setlijst', null, i.alle.map(it => el('li', null, el('span', { tekst: it.naam }),
      it.status !== 'klaar' ? el('span.label', { tekst: 'wacht op art' }) : P.heeftItem(S.staat(), fid, it.id) ? el('span.label.blad', { tekst: 'in bezit' }) : WU.prijsLabel(it.prijs, 'los'))));
    const uitleg = i.start ? 'Deze set zit in jullie startkast.' : !i.compleet ? (i.wacht ? `Nog ${i.wacht} van ${i.alle.length} items in de maak. Daarna te koop.` : `Bestaat niet voor ${U.naam(fid)}.`)
      : !i.mist.length ? 'Je hebt de hele set. Draag hem compleet voor een glinstering in huis.'
      : i.inBezit ? `Los ${i.som}, als set ${i.vol}. Je hebt al ${i.inBezit} van ${i.getekend.length}, dus je betaalt alleen voor de rest: ${i.prijs}.` : `Los ${i.som}, als set ${i.vol}: 20% korting.`;
    const kan = i.teKoop;
    const s = U.sheet({ titel: 'Set ' + set.naam, inhoud: [pp.el, lijst, el('p.noot', { tekst: uitleg }),
      el('p.noot', { tekst: 'Een complete set dragen geeft een kleine glinstering in huis.' }), openKaart('set', d => d.fid === fid && d.set === set.id)].filter(Boolean),
      knoppen: [kan ? koopKnop(i.prijs, 'set', { fid, set: set.id })
        : i.mist.length === 0 && i.compleet ? el('button.knop.goud', { type: 'button', onclick: () => { aantrekken(fid, extra(fid)); s.sluit(); } }, 'Set aantrekken')
        : el('button.knop', { type: 'button', disabled: true }, i.start ? 'In de startkast' : 'Nog niet te koop')] });
    return s;
  }

  // ---------- meubel ----------
  function meubelSheet(soort) {
    const m = P.meubel(soort);
    if (!m) return;
    const st = S.staat(), vraagt = P.meubelVraagt(soort, st.huis.niveau), aantal = P.meubelAantal(st, soort);
    const kamers = [...new Set(m.def.hoort || [])].join(', ');
    const s = U.sheet({ titel: m.naam, inhoud: [
      el('div.meubelvak.groot', null, WU.meubelBeeld(soort, 220, 150)),
      el('p.prijsregel', null, WU.prijsLabel(m.prijs), el('span', { tekst: ` · ${m.def.op === 'muur' ? 'aan de muur' : m.def.op === 'vrij' ? 'los neer te zetten' : 'op de vloer'}` }),
        m.def.sprite ? null : el('span.label.voorbeeld', { tekst: 'placeholder' })),
      el('p.noot', { tekst: `Past in: ${kamers}.` }),
      vraagt ? el('p.vraagt', { tekst: vraagt.niveau ? `Vraagt een ${vraagt.kamer} (verbouwing ${vraagt.niveau}).` : 'Past nog in geen enkele kamer.' })
        : !P.meubelPlek(st, soort) ? el('p.vraagt', { tekst: 'Er is nu geen vrije plek. Kopen kan wel: hij wacht in de verhuisdoos tot jullie ruimte maken (iets in de doos) of verbouwen.' }) : null,
      aantal ? el('p.noot', { tekst: `Jullie hebben er ${aantal}. Na het kopen staat hij in de verhuisdoos; je zet hem neer in Bewerken.` })
        : el('p.noot', { tekst: 'Na het kopen staat hij in de verhuisdoos; je zet hem neer in Bewerken.' }),
      m.def.sprite ? null : el('p.noot', { tekst: 'De tekening is een placeholder, net als de meubels in huis; de echte pixel-art volgt.' }),
      openKaart('meubel', d => d.soort === soort)].filter(Boolean),
      knoppen: [koopKnop(m.prijs, 'meubel', { soort }, { uit: vraagt ? (vraagt.niveau ? `Vraagt ${vraagt.kamer} (niveau ${vraagt.niveau})` : 'Past nergens') : null })] });
    return s;
  }

  wortel.PQWinkelSheet = { kleding, set: setSheet, meubel: meubelSheet, aantrekken, koopKnop, uitWinkel: () => Date.now() - laatsteWinkelSheet < 10 * 60e3 };
})(window);
