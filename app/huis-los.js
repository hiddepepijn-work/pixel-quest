// huis.html: het huis-component los, met dezelfde store als de app (voor de bouwer en voor schermafbeeldingen).
// ?niveau=N toont niveau N als voorbeeld, ?bewerk zet de bewerkmodus aan, ?markeer markeert placeholders.
(function () {
  'use strict';
  const S = window.PQStore, U = window.PQUI, q = new URLSearchParams(location.search);
  S.laad();
  const $ = s => document.querySelector(s);
  window.PQHuis.laad().then(() => {
    const h = window.PQHuis.mount($('#huis'), {
      store: S, meld: t => U.meld(t), instellingen: { markeer: q.has('markeer') },
      opScene: i => { $('#info').textContent = i ? `niveau ${i.getoond}${i.voorbeeld ? ' (voorbeeld)' : ''} · render ${i.Z}× · doos ${i.doos.length}` : ''; },
      opTaak: id => U.meld('Taak: ' + ((S.staat().taken[id] || {}).titel || id)),
      taken: () => Object.values(S.staat().taken).filter(t => t.plek && t.status === 'open').map(t => {
        const k = window.PQRegels.klok(t, Date.now()), s = k ? k.stand : window.PQRegels.STANDEN[0];
        return { id: t.id, titel: t.titel, plek: t.plek, signaal: s.signaal, tekst: s.tekst };
      }),
    });
    h.hervat();
    if (q.get('niveau')) h.bekijk(+q.get('niveau'));
    if (q.has('bewerk')) h.bewerk(true);
    $('#markeer').checked = q.has('markeer');
    $('#markeer').onchange = e => h.markeer(e.target.checked);
    $('#in').onclick = () => h.zoom.in(); $('#uit').onclick = () => h.zoom.uit(); $('#pas').onclick = () => h.zoom.pas();
    $('#bewerk').onclick = () => { h.bewerk(!h.bewerkt()); $('#bewerk').setAttribute('aria-pressed', String(h.bewerkt())); };
    window.PQ_OMGEVINGHUIS.bediening($('#omgeving'));
  }).catch(e => { $('#info').textContent = 'Laden mislukt: ' + e; if (window.PQ_TEST) window.PQ_TEST.fouten.push('laden: ' + e); });
})();
