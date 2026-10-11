// Opdrachten: elke wijziging is een idempotente opdracht { id, soort, data, door, tijd }. VOER[soort](staat, opdracht)
// past hem toe op de staat. Deterministisch: alleen de opdracht telt (geen Date.now(), geen Math.random()), zodat
// de server later precies dezelfde staat uit hetzelfde log opbouwt. Een fout is een Error in gewone taal.
(function (wortel) {
  'use strict';
  const R = wortel.PQRegels;
  const fout = tekst => { throw new Error(tekst); };
  const ander = p => (p === 'hidde' ? 'tessie' : 'hidde');
  const naam = p => ({ hidde: 'Hidde', tessie: 'Tessie' }[p] || p);
  const taakVan = (st, id) => st.taken[id] || fout('Deze taak bestaat niet meer.');
  const VELDEN = ['titel', 'minuten', 'zwaarte', 'eigenaar', 'interval', 'deadline', 'tijdslot', 'plek', 'soort_werk', 'prive', 'notitie', 'categorie'];

  function schoonTaak(d) {
    const t = {};
    for (const k of VELDEN) if (d[k] !== undefined) t[k] = d[k];
    if ('titel' in t) { t.titel = String(t.titel || '').trim().slice(0, 80); if (!t.titel) fout('Geef de taak een naam.'); }
    if ('minuten' in t) { t.minuten = Math.round(+t.minuten); if (!(t.minuten >= 1 && t.minuten <= 600)) fout('Minuten moet tussen 1 en 600 liggen.'); }
    if ('zwaarte' in t) t.zwaarte = Math.min(R.P.zwaarteMax, Math.max(0, Math.round(+t.zwaarte || 0)));
    if ('interval' in t) t.interval = t.interval ? Math.max(1, Math.min(365, Math.round(+t.interval))) : null;
    if ('eigenaar' in t && ![null, 'hidde', 'tessie', 'samen'].includes(t.eigenaar)) fout('Onbekende eigenaar.');
    if ('soort_werk' in t && !['doen', 'plannen', 'bijhouden'].includes(t.soort_werk)) t.soort_werk = 'doen';
    return t;
  }

  const VOER = {
    'taak.nieuw'(st, o) {
      const t = Object.assign({ minuten: 15, zwaarte: 0, eigenaar: null, interval: null, soort_werk: 'doen', prive: false },
        schoonTaak(o.data));
      if (!t.titel) fout('Geef de taak een naam.');
      const id = o.data.id || 't-' + o.id;
      if (st.taken[id]) return;   // dezelfde opdracht nog eens: niets doen
      st.taken[id] = Object.assign(t, { id, status: 'open', gemaakt_door: o.door, gemaakt_op: o.tijd, voorbeeld: !!o.data.voorbeeld,
        laatst: o.data.laatst != null ? o.data.laatst : null });
      return id;
    },
    'taak.bewerk'(st, o) { Object.assign(taakVan(st, o.data.id), schoonTaak(o.data)); },
    'taak.verwijder'(st, o) { taakVan(st, o.data.id).status = 'weg'; },
    'voorbeelden.weg'(st) { for (const t of Object.values(st.taken)) if (t.voorbeeld && t.status !== 'weg') t.status = 'weg'; },
    'taak.claim'(st, o) {
      const t = taakVan(st, o.data.id), nu = R.eigenaarNu(t, o.tijd);
      if (t.status !== 'open') fout('Deze taak is al klaar.');
      if (nu && nu !== 'samen' && nu !== o.door) st.overnames = (st.overnames || 0) + 1;   // overnemen, zonder bonus
      t.claim = { door: o.door, tot: R.claimTot(o.tijd, t.deadline) };
      t.verzoek_aan = null;
    },
    'taak.los'(st, o) { const t = taakVan(st, o.data.id); t.claim = null; if (t.eigenaar === o.door) t.eigenaar = null; },
    'taak.verzoek'(st, o) { taakVan(st, o.data.id).verzoek_aan = ander(o.door); },
    'taak.verzoek.ja'(st, o) {
      const t = taakVan(st, o.data.id);
      t.claim = { door: o.door, tot: R.claimTot(o.tijd, t.deadline) }; t.verzoek_aan = null;
    },
    'taak.verzoek.nee'(st, o) { taakVan(st, o.data.id).verzoek_aan = null; },
    'taak.klaar'(st, o) {
      const t = taakVan(st, o.data.id);
      if (t.status !== 'open') fout('Deze taak is al afgevinkt.');
      const samen = R.isSamen(t), inzet = t.prive ? 0 : R.inzetVan(t);
      const opTijd = !!(t.tijdslot || t.deadline) && (t.tijdslot ? o.tijd <= Date.parse(t.tijdslot) + 36e5 : R.dagSleutel(o.tijd) <= t.deadline);
      st.afrondingen.push({ id: o.id, taak: t.id, titel: t.titel, door: o.door, samen, inzet, prive: !!t.prive,
        soort_werk: t.soort_werk || 'doen', categorie: R.categorieVan(t), minuten: t.minuten, op_tijd: opTijd,
        op: o.tijd, week: R.weekVan(o.tijd), vorige: { laatst: t.laatst, status: t.status, claim: t.claim || null } });
      t.claim = null; t.verzoek_aan = null;
      if (t.interval) t.laatst = o.tijd; else t.status = 'klaar';
      return o.id;
    },
    'taak.ongedaan'(st, o) {
      const a = st.afrondingen.find(x => x.id === o.data.afronding) || fout('Deze afronding bestaat niet.');
      if (a.ongedaan) return;
      a.ongedaan = { door: o.door, op: o.tijd, opdracht: o.id };   // tegenregel: telt niet meer mee
      const t = st.taken[a.taak];
      if (t && a.vorige) { t.laatst = a.vorige.laatst; t.status = a.vorige.status === 'weg' ? 'weg' : 'open'; t.claim = a.vorige.claim; }
    },
    'bedank'(st, o) {
      const a = st.afrondingen.find(x => x.id === o.data.afronding) || fout('Deze afronding bestaat niet.');
      if (a.door === o.door && !a.samen) fout('Een bedankje geef je aan de ander.');
      if (st.bedankjes.some(b => b.afronding === a.id && b.van === o.door)) return;
      st.bedankjes.push({ id: o.id, afronding: a.id, van: o.door, aan: a.samen ? ander(o.door) : a.door, op: o.tijd });
    },
    'weekdoel'(st, o) {
      const w = Math.round(+o.data.waarde);
      if (!(w >= 100 && w <= 3000)) fout('Kies een weekdoel tussen 100 en 3000.');
      const vanaf = R.weekPlus(R.weekVan(o.tijd), 1);
      st.weekdoel = (st.weekdoel || []).filter(d => d.vanaf !== vanaf).concat([{ vanaf, waarde: w }]);
    },
    'afwezig.nieuw'(st, o) {
      const { wie, van, tot } = o.data;
      if (!['hidde', 'tessie', 'samen'].includes(wie)) fout('Kies wie er weg is.');
      if (!van || !tot || tot < van) fout('De einddatum ligt voor de begindatum.');
      st.afwezig.push({ id: o.id, wie, van, tot, soort: o.data.soort || (wie === 'samen' ? 'vakantie' : 'ziek') });
    },
    'afwezig.weg'(st, o) { st.afwezig = st.afwezig.filter(a => a.id !== o.data.id); },
    'rustweek'(st, o) {
      const w = o.data.week || R.weekVan(o.tijd);
      if (w < R.weekVan(o.tijd)) fout('Een rustweek kondig je vooraf aan, niet achteraf.');
      if (!R.rustweekVrij(st, w, o.tijd)) fout('Deze maand is de rustweek al gebruikt.');
      st.rustweken.push(w);
    },
    'terugblik'(st, o) {
      const w = o.data.week, c = Math.round(+o.data.cijfer);
      if (!(c >= 1 && c <= 5)) fout('Kies een cijfer van 1 tot 5.');
      const tb = st.terugblik[w] = st.terugblik[w] || {};
      tb[o.door] = { cijfer: c, trots: String(o.data.trots || '').slice(0, 200), dwars: String(o.data.dwars || '').slice(0, 200), op: o.tijd };
    },
    'terugblik.onthul'(st, o) {
      const tb = st.terugblik[o.data.week];
      if (!tb || !tb.hidde || !tb.tessie) fout('Jullie moeten allebei eerst een cijfer geven.');
      tb.onthuld = o.tijd;
    },
    'terugblik.wis'(st, o) {   // de tekst wordt na het onthullen gewist; het cijfer blijft (app-ontwerp §3.6)
      const tb = st.terugblik[o.data.week];
      if (tb) for (const p of ['hidde', 'tessie']) if (tb[p]) { tb[p].trots = ''; tb[p].dwars = ''; }
    },
  };

  wortel.PQOpdrachten = { VOER, ander, naam, fout };
})(typeof window !== 'undefined' ? window : globalThis);
