// Automatische kleding (spec: huiskleding, weerkleding, taakkleding). Puur: geen DOM, geen opslag.
// Nog NIET aangesloten op het huis; getest met node (zie docs/kleding.md).
//   kiesAutoLook(look, omgevingsstatus, bezit, opties) -> nieuwe look
//   look      { slot: { item, kleur } }  de eigen gekozen look (blijft overdag de standaard)
//   status    omgevingsstatus uit de spec: { licht: { fase }, weer: { type, temp_c }, ... }
//   bezit     { itemId: [kleur, ...] } van deze persoon, of een lijst item-id's
//   opties    { catalogus, fid, nu (Date), huisTijd '21:00', uit: { huis, weer, taak }, taak: 'keuken', uitleg: [] }
(function (wortel) {
  'use strict';
  const REGEN = ['motregen', 'regen', 'onweer', 'hagel', 'storm'];

  function minuten(hhmm) {
    const [h, m] = String(hhmm || '21:00').split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  }

  function kiesAutoLook(look, status, bezit, opties) {
    opties = opties || {};
    const cat = opties.catalogus || (wortel.PQ_KAST && wortel.PQ_KAST.items) || [];
    const fid = opties.fid || 'hidde';
    const uit = opties.uit || {};
    const uitleg = opties.uitleg || [];
    const heb = Array.isArray(bezit) ? Object.fromEntries(bezit.map(id => [id, []])) : (bezit || {});
    const nieuw = JSON.parse(JSON.stringify(look || {}));
    const st = status || {}, weer = st.weer || {}, licht = st.licht || {};

    // Eerste item in de kast (catalogusvolgorde) met dit slot en deze tag, alleen wat je hebt.
    function zoek(slot, tag) {
      return cat.find(i => i.slot === slot && (i.tags || []).includes(tag) && heb[i.id] &&
        i.status === 'klaar' && (!i.lichaam || i.lichaam.includes(fid))) || null;
    }
    function trekAan(slot, tag, reden) {
      const it = zoek(slot, tag);
      if (!it) return false;
      const kleuren = heb[it.id] && heb[it.id].length ? heb[it.id] : it.kleuren;
      nieuw[slot] = { item: it.id, kleur: kleuren[0] };
      uitleg.push(`${reden}: ${it.naam || it.id}`);
      return true;
    }

    // 1. weerkleding
    if (!uit.weer) {
      const t = typeof weer.temp_c === 'number' ? weer.temp_c : null;
      const sneeuw = weer.type === 'sneeuw', vorst = t !== null && t <= 0;
      if (sneeuw || vorst) {
        if (!trekAan('jas', 'sneeuw', 'sneeuw/vorst')) trekAan('jas', 'warm', 'sneeuw/vorst');
      } else if (REGEN.includes(weer.type)) {
        trekAan('jas', 'regen', 'regen');
      }
      if (sneeuw || vorst || (t !== null && t < 5)) {
        trekAan('hoofd', 'warm', 'koud');
        trekAan('accessoire', 'warm', 'koud');
      }
      if (t !== null && t > 25) trekAan('onder', 'zomer', 'warm weer');
    }

    // 2. huiskleding: na het instelbare tijdstip of bij nacht in het raam
    if (!uit.huis) {
      const nu = opties.nu || new Date();
      const laat = nu.getHours() * 60 + nu.getMinutes() >= minuten(opties.huisTijd);
      if (laat || licht.fase === 'nacht') {
        if (trekAan('heel_lichaam', 'nacht', 'avond')) {
          for (const s of ['jas', 'hoofd']) if (nieuw[s]) { delete nieuw[s]; uitleg.push(`avond: ${s} uit`); }
        }
        trekAan('schoenen', 'huis', 'avond');
      }
    }

    // 3. taakkleding: even het schort bij het feestje na een keukentaak
    if (!uit.taak && opties.taak === 'keuken') trekAan('heel_lichaam', 'keuken', 'keukentaak');

    return nieuw;
  }

  const api = { kiesAutoLook };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else wortel.PQ_KASTAUTO = api;
})(typeof window !== 'undefined' ? window : globalThis);
