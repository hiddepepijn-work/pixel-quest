// Sheets voor taken: details (afvinken, claimen, loslaten, vragen, bedanken, ongedaan maken) en maken/bewerken.
(function (wortel) {
  'use strict';
  const R = wortel.PQRegels, S = wortel.PQStore, U = wortel.PQUI, T = wortel.PQTaken, { el } = U;
  const ik = () => S.ik(), ander = () => S.ander();
  const H = () => wortel.PQ_HUIS, HM = () => wortel.PQ_HUISMODEL;

  // Plekken in het huis waar een taak bij kan horen: kamers en meubels van het huidige niveau.
  function plekken() {
    const st = S.staat(), hm = HM();
    if (!hm) return [];
    const geo = hm.bouw(hm.niveauVan(st.huis.niveau)), uit = [];
    for (const k of geo.kamers) if (!k.trap) {
      uit.push({ waarde: 'kamer:' + k.id, tekst: k.naam });
      for (const i of st.huis.inrichting.filter(i => i.kamer === k.id)) uit.push({ waarde: 'meubel:' + i.id, tekst: '  ' + H().meubels[i.soort].naam + ' (' + k.naam.toLowerCase() + ')' });
    }
    return uit;
  }
  function plekTekst(plek) {
    if (!plek) return null;
    const p = plekken().find(x => x.waarde === (plek.meubel ? 'meubel:' + plek.meubel : 'kamer:' + plek.kamer));
    return p ? p.tekst.trim() : 'een plek die er (nog) niet is';
  }

  // ---------- details ----------
  function detail(id) {
    const st = S.staat(), t = st.taken[id];
    if (!t) return U.fout('Deze taak bestaat niet meer.');
    const x = T.verrijk(t, Date.now()), mij = ik();
    const regels = [];
    regels.push(el('p.meta-groot', null, T.wieLabel(x), ' ', T.standEl(x)));
    if (x.k) regels.push(el('p', { tekst: `Ongeveer elke ${t.interval === 1 ? 'dag' : t.interval + ' dagen'} · ${R.klokTekst(t, Date.now())}` }));
    if (t.deadline) regels.push(el('p', { tekst: `Deadline: ${U.datumTekst(t.deadline)}` }));
    if (t.tijdslot) regels.push(el('p', { tekst: `Tijdslot: ${U.datumTekst(t.tijdslot.slice(0, 10))} om ${t.tijdslot.slice(11, 16)}` }));
    regels.push(el('p.inzetvoorbeeld', { tekst: t.prive ? `${t.minuten} min · privé: telt niet mee` : `${t.minuten} min · ${T.ZWAARTE[t.zwaarte || 0]} · inzet ${x.inzet}${R.isSamen(t) ? ' (ieder de helft)' : ''}` }));
    const pt = plekTekst(t.plek);
    if (pt) regels.push(el('p.noot', { tekst: 'In huis: ' + pt }));
    if (t.voorbeeld) regels.push(el('p.noot', null, el('span.label.voorbeeld', { tekst: 'voorbeeld' }), ' Een voorbeeldtaak. Pas hem aan of verwijder hem.'));
    // Recente afrondingen van deze taak, met bedankje en ongedaan maken.
    const recent = st.afrondingen.filter(a => a.taak === id && !a.ongedaan).slice(-3).reverse();
    if (recent.length) {
      const ul = el('ul.afgerond');
      for (const a of recent) {
        const bedankt = st.bedankjes.some(b => b.afronding === a.id && b.van === mij);
        const kanDanken = (a.door !== mij || a.samen) && !t.prive;
        ul.append(el('li', null, el('span', { tekst: `${U.naam(a.door)} · ${new Date(a.op).toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short' })}` }),
          kanDanken ? el('button.knop.mini' + (bedankt ? '.goud' : ''), { type: 'button', disabled: bedankt, 'aria-label': `Bedank ${U.naam(a.samen ? ander() : a.door)}`,
            onclick: () => { if (T.doe('bedank', { afronding: a.id }, `♥ Bedankt! ${U.naam(a.samen ? ander() : a.door)} ziet je hartje.`)) { s.sluit(); document.dispatchEvent(new CustomEvent('pq-bedankt')); } } }, bedankt ? '♥ bedankt' : '♥ Bedank') : null,
          el('button.knop.mini.stil', { type: 'button', onclick: () => { if (T.doe('taak.ongedaan', { afronding: a.id }, 'Afronding teruggedraaid.')) s.sluit(); } }, 'Ongedaan')));
      }
      regels.push(el('h3', { tekst: 'Laatst gedaan' }), ul);
    }
    const knoppen = [];
    const wie = x.wie;
    if (!wie || (wie !== mij && wie !== 'samen')) knoppen.push(el('button.knop', { type: 'button', onclick: () => { if (T.claim(id)) s.sluit(); } }, wie ? 'Neem over' : 'Ik pak het'));
    if (t.claim && t.claim.door === mij) knoppen.push(el('button.knop', { type: 'button', onclick: () => { if (T.doe('taak.los', { id }, 'Terug op het prikbord.')) s.sluit(); } }, 'Loslaten'));
    if (!t.prive && wie !== ander() && !t.verzoek_aan) knoppen.push(el('button.knop', { type: 'button', onclick: () => { if (T.doe('taak.verzoek', { id }, `Gevraagd aan ${U.naam(ander())}. Nee zeggen mag.`)) s.sluit(); } }, `Kun jij, ${U.naam(ander())}?`));
    const voet = [el('button.knop.stil', { type: 'button', onclick: () => { s.sluit(); bewerk(id); } }, 'Bewerken'),
      el('button.knop.goud', { type: 'button', onclick: () => { s.sluit(); T.afronden(id, document.querySelector(`[data-taak="${CSS.escape(id)}"] .gieter`)); } },
        el('img', { src: U.ASSETS + 'items/bron/gieter.png', alt: '', stijl: { width: '22px' } }), 'Gedaan')];
    const s = U.sheet({ titel: t.titel, inhoud: [...regels, knoppen.length ? el('div.knoprij.tussen', null, knoppen) : null,
      el('button.knop.mini.stil.verwijder', { type: 'button', onclick: async () => {
        if (await U.vraag('Taak verwijderen?', `"${t.titel}" verdwijnt van de lijst. Wat al gedaan is, blijft meetellen.`, 'Verwijder', 'Laat staan', true)) {
          if (T.doe('taak.verwijder', { id }, 'Verwijderd.')) s.sluit();
        } } }, 'Verwijder taak')], knoppen: voet, focus: '.sheet-voet .goud' });
    return s;
  }
  T.detail = detail;
  T.plekken = plekken;
  T.plekTekst = plekTekst;
  // ---------- maken en bewerken ----------
  function keuzeGroep(label, opties, waarde, wijzig) {
    const groep = el('fieldset.veld', null, el('legend', { tekst: label }));
    const rij = el('div.keuzes', { role: 'radiogroup', 'aria-label': label });
    const knoppen = opties.map(([v, tekst]) => el('button.chip', { type: 'button', role: 'radio', 'aria-checked': String(v === waarde), 'aria-pressed': String(v === waarde),
      onclick: () => { waarde = v; knoppen.forEach(k => { const aan = k._v === v; k.setAttribute('aria-pressed', String(aan)); k.setAttribute('aria-checked', String(aan)); }); wijzig(v); } }, tekst));
    knoppen.forEach((k, i) => { k._v = opties[i][0]; });
    rij.append(...knoppen); groep.append(rij);
    return groep;
  }
  function stepper(label, waarde, min, max, stap, wijzig, eenheid) {
    const out = el('output', { tekst: waarde + (eenheid || '') });
    const zet = v => { waarde = Math.min(max, Math.max(min, v)); out.textContent = waarde + (eenheid || ''); wijzig(waarde); };
    return el('div.veld', null, el('span', { tekst: label }), el('div.stepper', null,
      el('button.rond', { type: 'button', 'aria-label': label + ' minder', onclick: () => zet(waarde - stap) }, '−'), out,
      el('button.rond', { type: 'button', 'aria-label': label + ' meer', onclick: () => zet(waarde + stap) }, '+')));
  }
  function bewerk(id, voor) {
    const st = S.staat(), oud = id ? st.taken[id] : null, mij = ik();
    const d = Object.assign({ titel: '', minuten: 15, zwaarte: 0, eigenaar: null, interval: null, soort_werk: 'doen', prive: false, plek: null, deadline: null, tijdslot: null },
      oud ? JSON.parse(JSON.stringify(oud)) : {}, voor || {});
    let wieKeuze = oud ? (oud.eigenaar === mij ? 'ik' : oud.eigenaar === 'samen' ? 'samen' : oud.eigenaar ? 'ander' : 'prikbord') : (voor && voor.wie) || 'prikbord';
    let wanneer = d.tijdslot ? 'tijdslot' : d.deadline ? 'deadline' : 'geen';
    const titel = el('input.invoer', { type: 'text', value: d.titel, maxlength: 80, placeholder: 'Bijvoorbeeld: lamp in de gang vervangen', 'aria-label': 'Wat moet er gebeuren?', autocomplete: 'off' });
    titel.addEventListener('input', () => { d.titel = titel.value; });
    const inzetEl = el('p.inzetvoorbeeld', { 'aria-live': 'polite' });
    const toonInzet = () => { inzetEl.textContent = d.prive ? 'Privé: telt nergens mee, levert niets op.' : `Inzet ${R.inzetVan(d)} = ${d.minuten} min × ${(1 + 0.3 * d.zwaarte).toFixed(1).replace('.', ',')}${wieKeuze === 'samen' ? ' (ieder de helft)' : ''}`; };
    const sjablonen = el('div.chips', { 'aria-label': 'Sjablonen' }, T.SJABLONEN.map(([n, m, z, soort]) => el('button.chip', { type: 'button', onclick: () => {
      titel.value = d.titel = n; d.minuten = m; d.zwaarte = z; d.soort_werk = soort; s.sluit(); bewerk(id, Object.assign({}, d, { wie: wieKeuze })); } }, n)));
    const minuten = stepper('Minuten', d.minuten, 5, 300, 5, v => { d.minuten = v; toonInzet(); }, ' min');
    const zwaarte = keuzeGroep('Hoe zwaar of vervelend?', T.ZWAARTE.map((z, i) => [i, z]), d.zwaarte, v => { d.zwaarte = v; toonInzet(); });
    const wie = keuzeGroep('Wie?', [['prikbord', 'Prikbord'], ['ik', 'Ik'], ['samen', 'Samen'], ['ander', `Vraag ${U.naam(ander())}`]], wieKeuze, v => { wieKeuze = v; toonInzet(); });
    const intervalVak = el('div', { hidden: !d.interval });
    const herhaal = keuzeGroep('Herhalen?', [[false, 'Eenmalig'], [true, '~Elke paar dagen']], !!d.interval, v => { d.interval = v ? (d.interval || 7) : null; intervalVak.hidden = !v; });
    intervalVak.append(stepper('Ongeveer elke', d.interval || 7, 1, 60, 1, v => { d.interval = v; }, ' d'));
    const datum = el('input.invoer', { type: 'date', value: d.deadline || '', 'aria-label': 'Deadline' });
    const tijd = el('input.invoer', { type: 'datetime-local', value: d.tijdslot || '', 'aria-label': 'Tijdslot' });
    datum.hidden = wanneer !== 'deadline'; tijd.hidden = wanneer !== 'tijdslot';
    const wanneerG = keuzeGroep('Wanneer?', [['geen', 'Geen'], ['deadline', 'Vóór…'], ['tijdslot', 'Op…']], wanneer, v => { wanneer = v; datum.hidden = v !== 'deadline'; tijd.hidden = v !== 'tijdslot'; });
    wanneerG.append(datum, tijd);
    const soort = keuzeGroep('Soort werk', [['doen', 'Doen'], ['plannen', 'Plannen'], ['bijhouden', 'Bijhouden']], d.soort_werk, v => { d.soort_werk = v; });
    const plekSel = el('select', { 'aria-label': 'Plek in huis' }, el('option', { value: '', tekst: 'Nergens in het bijzonder' }),
      plekken().map(p => el('option', { value: p.waarde, tekst: p.tekst })));
    plekSel.value = d.plek ? (d.plek.meubel ? 'meubel:' + d.plek.meubel : 'kamer:' + d.plek.kamer) : '';
    const prive = el('input', { type: 'checkbox', checked: !!d.prive, onchange: () => { d.prive = prive.checked; toonInzet(); } });
    const meer = el('details.meer-opties', { open: !!(oud || (voor && voor.titel)) }, el('summary', { tekst: 'Meer: tijd, zwaarte, plek in huis' }),
      minuten, zwaarte, soort, el('label.veld', null, el('span', { tekst: 'Waar in huis?' }), plekSel),
      el('label.schakel', null, prive, el('span', { tekst: 'Privé: alleen voor mij, telt nergens mee' })));
    toonInzet();
    const opslaan = () => {
      const data = { titel: titel.value, minuten: d.minuten, zwaarte: d.zwaarte, interval: d.interval, soort_werk: d.soort_werk, prive: d.prive,
        eigenaar: wieKeuze === 'ik' ? mij : wieKeuze === 'samen' ? 'samen' : wieKeuze === 'ander' && oud && oud.eigenaar === ander() ? ander() : null,
        deadline: wanneer === 'deadline' ? (datum.value || null) : null, tijdslot: wanneer === 'tijdslot' ? (tijd.value || null) : null,
        plek: plekSel.value ? { [plekSel.value.split(':')[0]]: plekSel.value.split(':').slice(1).join(':') } : null };
      if (wanneer === 'deadline' && !datum.value) return U.fout('Kies een datum voor de deadline.');
      if (wanneer === 'tijdslot' && !tijd.value) return U.fout('Kies een dag en tijd voor het tijdslot.');
      const r = S.doe(oud ? 'taak.bewerk' : 'taak.nieuw', oud ? Object.assign({ id }, data) : data);
      if (!r.ok) { U.fout(r.fout); titel.focus(); return; }
      const nieuwId = oud ? id : r.resultaat;
      if (wieKeuze === 'ander' && !(oud && oud.eigenaar === ander())) S.doe('taak.verzoek', { id: nieuwId });
      s.sluit();
      U.meld(oud ? 'Opgeslagen.' : wieKeuze === 'ander' ? `Op het bord, en gevraagd aan ${U.naam(ander())}.` : wieKeuze === 'prikbord' ? 'Op het prikbord. Wie wil, pakt hem.' : 'Opgeslagen.');
      document.dispatchEvent(new CustomEvent('pq-taak-opgeslagen', { detail: { id: nieuwId } }));
    };
    const s = U.sheet({ titel: oud ? 'Taak bewerken' : 'Nieuwe taak', focus: 'input',
      inhoud: [el('label.veld', null, el('span', { tekst: 'Wat?' }), titel), oud ? null : sjablonen, wie, herhaal, intervalVak, wanneerG, inzetEl, meer],
      knoppen: [el('button.knop.stil', { type: 'button', onclick: () => s.sluit() }, 'Annuleer'), el('button.knop.goud', { type: 'button', onclick: opslaan }, oud ? 'Opslaan' : 'Op het bord')] });
    titel.addEventListener('keydown', e => { if (e.key === 'Enter') opslaan(); });
    return s;
  }
  T.bewerk = bewerk;
})(window);
