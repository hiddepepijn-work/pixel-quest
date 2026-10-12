// Winkel-UI, deel 3: na een aankoop een feestje met "Aantrekken" of "Plaatsen", en de drops: zodra jullie een
// samen-mijlpaal of streak halen, boekt dit apparaat de opdracht 'drop' (één keer per mijlpaal) met een melding.
(function (wortel) {
  'use strict';
  const S = wortel.PQStore, U = wortel.PQUI, P = wortel.PQWinkel, WU = wortel.PQWinkelUI, WS = wortel.PQWinkelSheet, { el } = U;

  // ---------- na de aankoop ----------
  function gekocht(v) {
    const kleding = v.soort === 'kleding' || v.soort === 'set', fid = v.data.fid;
    const extra = v.soort === 'kleding' ? [{ item: v.data.item, kleur: v.data.kleur }]
      : v.soort === 'set' ? P.setDelen(P.sets().find(s => s.id === v.data.set), fid).getekend.map(it => ({ item: it.id, kleur: (S.staat().kleding.bezit[fid][it.id] || [])[0] || it.kleuren[0] })) : [];
    const beeld = kleding ? el('div.paspop', null, el('figure.pasfiguur.' + fid, null, WU.figuur(fid, WU.metItems(fid, extra), 112, `${U.naam(fid)} in de nieuwe look`)))
      : el('div.meubelvak.groot', null, WU.meubelBeeld(v.data.soort, 220, 140));
    const s = U.sheet({ titel: 'Gekocht!', inhoud: [el('div.gekocht', null, el('span.gekocht-ster', { 'aria-hidden': 'true', tekst: '★' }), beeld),
      el('p', null, el('b', { tekst: v.naam }), ` · ${U.getal(v.prijs)} munten uit de huispot.`),
      el('p.noot', { tekst: kleding ? `Het hangt in de kast van ${U.naam(fid)}.` : P.meubelPlek(S.staat(), v.data.soort) ? 'Hij staat in de verhuisdoos. Zet hem neer in Bewerken.' : 'Hij staat in de verhuisdoos. Er is nu geen vrije plek: maak eerst wat ruimte.' })],
    knoppen: [el('button.knop.stil', { type: 'button', onclick: () => s.sluit() }, 'Verder winkelen'),
      kleding ? el('button.knop.goud', { type: 'button', onclick: () => { s.sluit(); WS.aantrekken(fid, extra); } }, 'Aantrekken')
        : P.meubelPlek(S.staat(), v.data.soort) ? el('button.knop.goud', { type: 'button', onclick: () => { s.sluit(); wortel.PQHuisScherm.plaats(v.meubel_id); } }, 'Plaatsen')
        : el('button.knop.goud', { type: 'button', onclick: () => { s.sluit(); wortel.PQHuisScherm.bewerk(true); U.meld('Er is nog geen vrije plek. Doe iets in de doos, en zet daarna via Doos de nieuwe neer.', { duur: 6000 }); } }, 'Ruimte maken')] });
    setTimeout(() => { const r = s.paneel.querySelector('.gekocht'); if (r) U.feestBij(r); }, 260);
  }
  document.addEventListener('pq-gekocht', e => {
    const v = e.detail;
    if (!v || !['kleding', 'set', 'meubel'].includes(v.soort)) return;
    // Alleen als de aankoop uit de winkel kwam of de winkel open staat: elders (Meer, de kast) volstaat de melding.
    if (WS.uitWinkel() || (wortel.PQApp && wortel.PQApp.huidig() === 'winkel')) setTimeout(() => gekocht(S.staat().voorstellen.find(x => x.id === v.id) || v), 60);
  });

  // ---------- drops ----------
  function meldDrop(d) {
    if (!d) return;
    let tekst;
    if (d.soort === 'stelset') {
      const s = wortel.PQ_WINKELDATA.stelsets.find(x => x.id === d.stelset);
      tekst = `Stel-set vrijgekomen: ${s ? s.naam : d.stelset}! Hij hangt in jullie kast (${d.tekst}).`;
    } else {
      const wie = d.items.map(i => `${U.naam(i.fid)}: ${(P.item(i.item) || {}).naam || i.item}`).join(', ');
      tekst = `Drop! ${P.kleurNaam(d.kleur)} voor ${d.tekst}${wie ? ` (${wie})` : ''}. Zie Winkel → Zeldzaam.`;
    }
    U.meld(tekst, { duur: 6000 });
    if (!U.rustig()) U.feestje(innerWidth / 2, innerHeight / 3, 20);
  }
  let bezig = false;
  function kijk() {
    if (bezig || !S.ik() || !S.staat()) return;
    bezig = true;
    try {
      for (const m of P.openDrops(S.staat(), Date.now())) {
        const r = S.doe('drop', { sleutel: m.sleutel });
        if (r.ok && !r.dubbel) meldDrop(S.staat().winkel.drops.find(d => d.sleutel === m.sleutel));
      }
    } catch (e) { if (wortel.PQ_TEST) wortel.PQ_TEST.fouten.push('drop: ' + e.message); } finally { bezig = false; }
  }
  S.abonneer(op => { if (op && op.soort !== 'drop') setTimeout(kijk, 0); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) kijk(); });
  document.addEventListener('DOMContentLoaded', () => setTimeout(kijk, 2000));
  setInterval(() => { if (!document.hidden) kijk(); }, 5 * 60e3);
  wortel.PQWinkelFeest = { gekocht, kijk, meldDrop };
})(window);
