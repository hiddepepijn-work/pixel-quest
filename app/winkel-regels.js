// Spelregels van de winkel (docs/winkel.md). Puur, zoals store-regels.js: geen DOM, geen opslag, geen Date.now() of
// Math.random(). Alles krijgt de staat en een tijdstip mee, zodat de server later dezelfde uitkomst rekent.
// Leest PQ_KAST (kleding: items, sets, prijzen, kleuren, status), PQ_HUIS + PQ_HUISMODEL (meubels, kamers, niveaus),
// PQ_WINKELDATA (startkast, kortingen, zeldzame kleuren, stel-sets, decor) en PQRegels. Werkt in de browser en in node.
(function (wortel) {
  'use strict';
  const W = () => wortel.PQ_WINKELDATA, K = () => wortel.PQ_KAST, H = () => wortel.PQ_HUIS, HM = () => wortel.PQ_HUISMODEL;
  const R = () => wortel.PQRegels;
  const FIDS = ['hidde', 'tessie'];
  const vijf = n => Math.round(n / 5) * 5;

  // ---------- deterministisch toeval: zaad uit tekst ----------
  function hash(s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function rng(zaad) {
    let a = hash(String(zaad));
    return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  function geschud(lijst, zaad) {
    const a = lijst.slice(), r = rng(zaad);
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }

  // ---------- kleding ----------
  const items = () => (K() && K().items) || [];
  const item = id => items().find(i => i.id === id) || null;
  const klaar = () => items().filter(i => i.status === 'klaar');
  const voor = (it, fid) => !!it && (it.lichaam || []).includes(fid);
  const bezitVan = (st, fid) => ((st && st.kleding && st.kleding.bezit) || {})[fid] || {};
  const heeftItem = (st, fid, id) => (bezitVan(st, fid)[id] || []).length > 0;
  const heeftKleur = (st, fid, id, kleur) => (bezitVan(st, fid)[id] || []).includes(kleur);
  const isZeldzaam = kleur => !!(W() && W().zeldzaam[kleur]);
  const kleurNaam = kleur => (isZeldzaam(kleur) ? W().zeldzaam[kleur].naam : kleur === 'origineel' ? 'origineel' : kleur);

  // De startkast van één persoon: de items met `startkast: true` in PQ_KAST (shirt, broek, schoenen, pyjama en
  // Tessies kettinkje), anders per slot de eerste id uit winkel-data. Alleen wat getekend is en voor dit lichaam bestaat.
  const alleStartIds = () => {
    const vlag = items().filter(i => i.startkast).map(i => i.id);
    return vlag.length ? vlag : Object.values((W() && W().startkast) || {}).flat();
  };
  function startkast(fid) {
    const uit = [], ids = alleStartIds();
    for (const id of ids) {
      const it = item(id);
      if (it && it.status === 'klaar' && voor(it, fid) && !uit.some(x => x.slot === it.slot)) uit.push(it);
    }
    return uit;
  }
  // Prijs van een kledingstuk in een kleur: de basiskleur kost de itemprijs; heb je het item al (in een andere
  // kleur), dan kost een extra kleur de helft (afgerond op 5, minstens 10).
  function kledingPrijs(st, fid, it, kleur) {
    if (heeftItem(st, fid, it.id) && kleur !== it.kleuren[0]) return Math.max(10, vijf(it.prijs * W().korting.kleur));
    return it.prijs;
  }

  // ---------- weken: uitgelicht en de gewone slots wisselen elke maandag (04:00) ----------
  const weekIndex = w => Math.round((R().uitSleutel(w).getTime() - new Date(2024, 0, 1).getTime()) / (7 * 864e5));
  // Gewone slots: de extra kleuren (niet de basiskleur) van alle getekende items, in een vaste geschudde volgorde;
  // elke week de volgende 8. Zo komt elke kleur vanzelf terug in de winkel.
  function rotatie(w) {
    const paren = [];
    for (const it of klaar()) for (const k of it.kleuren.slice(1)) paren.push({ item: it.id, kleur: k });
    const lijst = geschud(paren.sort((a, b) => (a.item + a.kleur < b.item + b.kleur ? -1 : 1)), 'pq-rotatie');
    const n = Math.min(W().rotatie.kleurSlots, lijst.length), start = (weekIndex(w) * n) % Math.max(1, lijst.length);
    return Array.from({ length: n }, (_, i) => lijst[(start + i) % lijst.length]);
  }
  const kleurTeKoop = (it, kleur, w) => kleur === it.kleuren[0] || rotatie(w).some(p => p.item === it.id && p.kleur === kleur);

  // ---------- sets ----------
  const sets = () => (K() && K().sets) || [];
  const isStartSet = s => s.items.every(id => alleStartIds().includes(id));
  // De delen van een set voor één lichaam: wat getekend is en wat nog op art wacht.
  function setDelen(s, fid) {
    const alle = s.items.map(item).filter(it => voor(it, fid));
    const getekend = alle.filter(it => it.status === 'klaar');
    return { alle, getekend, wacht: alle.length - getekend.length, compleet: alle.length >= 2 && getekend.length === alle.length };
  }
  // Setprijs = som min 20%, naar rato: wat je al hebt, telt niet mee (0,8 × de som van wat je nog mist).
  function setInfo(st, fid, s) {
    const d = setDelen(s, fid), korting = W().korting.set;
    const mist = d.getekend.filter(it => !heeftItem(st, fid, it.id));
    const som = d.getekend.reduce((t, it) => t + it.prijs, 0), somMist = mist.reduce((t, it) => t + it.prijs, 0);
    return Object.assign(d, { set: s, start: isStartSet(s), mist, som, somMist, vol: Math.round(som * (1 - korting)),
      prijs: Math.round(somMist * (1 - korting)), inBezit: d.getekend.length - mist.length,
      teKoop: d.compleet && mist.length > 0 && !isStartSet(s) });
  }
  const verkoopbareSets = () => sets().filter(s => !isStartSet(s) && FIDS.some(f => setDelen(s, f).compleet));

  // Uitgelicht: elke week een set en 3 losse items, deterministisch op het weeknummer.
  function uitgelicht(w, fid) {
    const vs = verkoopbareSets(), i = weekIndex(w);
    const set = vs.length ? vs[((i % vs.length) + vs.length) % vs.length] : null;
    const pool = geschud(klaar().filter(it => !alleStartIds().includes(it.id) && !(set && set.items.includes(it.id)) && (!fid || voor(it, fid))), 'uitgelicht:' + w + (fid || ''));
    const gekozen = [], slots = new Set();
    for (const it of pool) { if (gekozen.length >= W().rotatie.uitgelichtItems) break; if (!slots.has(it.slot)) { gekozen.push(it); slots.add(it.slot); } }
    return { week: w, nummer: R().weekNummer(w), set, items: gekozen, kleuren: rotatie(w) };
  }

  // ---------- meubels en decor ----------
  function meubels() {
    const uit = [], HU = H();
    if (!HU) return uit;
    for (const [soort, prijs] of Object.entries(W().meubelprijs)) if (HU.meubels[soort]) uit.push({ soort, prijs, decor: false });
    for (const [soort, d] of Object.entries(W().decor)) if (HU.meubels[soort]) uit.push({ soort, prijs: d.prijs, decor: true });
    return uit.map(m => Object.assign(m, { def: HU.meubels[m.soort], naam: HU.meubels[m.soort].naam }));
  }
  const meubel = soort => meubels().find(m => m.soort === soort) || null;
  const kamerCache = new Map();
  function kamersVan(n) {
    if (!kamerCache.has(n)) kamerCache.set(n, HM().bouw(HM().niveauVan(n)).kamers.map(k => ({ type: k.type, naam: k.naam })));
    return kamerCache.get(n);
  }
  // Kan dit meubel op dit verbouwniveau ergens staan? null = ja; anders { kamer, niveau } van de eerste verbouwing
  // die een passende kamer geeft (bv. de tuin op niveau 4), of { niveau: null } als dat in geen enkel niveau kan.
  function meubelVraagt(soort, niveau) {
    const hoort = (H().meubels[soort] || {}).hoort || [];
    if (kamersVan(niveau).some(k => hoort.includes(k.type))) return null;
    for (const n of H().niveaus.map(x => x.niveau).filter(x => x > niveau).sort((a, b) => a - b)) {
      const k = kamersVan(n).find(x => hoort.includes(x.type));
      if (k) return { kamer: String(k.naam || k.type).toLowerCase(), niveau: n };
    }
    return { niveau: null };
  }
  // Is er nu een vrije plek in een passende kamer (zoals 'Zet neer' uit de verhuisdoos)? Het starthuisje is vol:
  // een vloermeubel past dan pas na wat ruimte maken of een verbouwing. Kopen mag wel (hij wacht in de doos).
  const geoCache = new Map();
  function meubelPlek(st, soort) {
    const hoort = (H().meubels[soort] || {}).hoort || [], n = st.huis.niveau;
    if (!geoCache.has(n)) geoCache.set(n, HM().bouw(HM().niveauVan(n)));
    const geo = geoCache.get(n);
    return geo.kamers.some(k => hoort.includes(k.type) && !!HM().plaats(k, soort, (k.b - HM().maat(soort).b) / 2, 56, st.huis.inrichting));
  }
  const meubelAantal = (st, soort) => [...st.huis.inrichting, ...st.huis.doos].filter(i => i.soort === soort).length;
  function nieuwMeubelId(st, soort) {
    const pre = soort + '-w', n = [...st.huis.inrichting, ...st.huis.doos].filter(i => String(i.id).startsWith(pre)).map(i => +String(i.id).slice(pre.length) || 0);
    return pre + (Math.max(0, ...n) + 1);
  }

  wortel.PQWinkel = Object.assign(wortel.PQWinkel || {}, {
    FIDS, hash, rng, geschud, items, item, klaar, voor, bezitVan, heeftItem, heeftKleur, isZeldzaam, kleurNaam, startkast,
    kledingPrijs, weekIndex, rotatie, kleurTeKoop, sets, isStartSet, setDelen, setInfo, verkoopbareSets, uitgelicht,
    meubels, meubel, meubelVraagt, meubelPlek, meubelAantal, nieuwMeubelId,
  });
})(typeof window !== 'undefined' ? window : globalThis);
