// Omgeving: licht (zonnestand), weer, seizoen, sneeuwlaag en events in één status (PQ_OMGEVING).
// Pure rekenregels, geen DOM: te testen met node:
//   node -e "global.window={};require('./app/omgeving.js');console.log(window.PQ_OMGEVING.bereken({datum:new Date()}))"
// De browserkant (Open-Meteo ophalen, cache, instellingen) staat onderaan en raakt alleen fetch en localStorage aan,
// altijd in try/catch. Alle tekenlagen lezen alleen uit de status van bereken(). Uitleg: docs/omgeving.md.
window.PQ_OMGEVING = (function () {
  'use strict';
  const RAD = Math.PI / 180, DAG = 864e5;

  // ---------- zonnestand (NOAA-formules, nauwkeurig tot ~1 minuut tussen de poolcirkels) ----------
  // Geeft declinatie (graden) en tijdsvereffening (minuten) voor een moment.
  function zonData(ms) {
    const T = (ms / DAG + 2440587.5 - 2451545) / 36525;
    const L0 = ((280.46646 + T * (36000.76983 + T * 0.0003032)) % 360 + 360) % 360;
    const M = 357.52911 + T * (35999.05029 - 0.0001537 * T);
    const e = 0.016708634 - T * (0.000042037 + 0.0000001267 * T);
    const C = Math.sin(M * RAD) * (1.914602 - T * (0.004817 + 0.000014 * T)) +
      Math.sin(2 * M * RAD) * (0.019993 - 0.000101 * T) + Math.sin(3 * M * RAD) * 0.000289;
    const om = 125.04 - 1934.136 * T;
    const lambda = L0 + C - 0.00569 - 0.00478 * Math.sin(om * RAD);
    const eps0 = 23 + (26 + (21.448 - T * (46.815 + T * (0.00059 - T * 0.001813))) / 60) / 60;
    const eps = eps0 + 0.00256 * Math.cos(om * RAD);
    const decl = Math.asin(Math.sin(eps * RAD) * Math.sin(lambda * RAD)) / RAD;
    const y = Math.tan(eps * RAD / 2) ** 2;
    const eqt = 4 / RAD * (y * Math.sin(2 * L0 * RAD) - 2 * e * Math.sin(M * RAD) +
      4 * e * y * Math.sin(M * RAD) * Math.cos(2 * L0 * RAD) - 0.5 * y * y * Math.sin(4 * L0 * RAD) -
      1.25 * e * e * Math.sin(2 * M * RAD));
    return { decl, eqt };
  }
  // Zonhoogte in graden (geometrisch, zonder breking) op moment ms.
  function zonhoogte(ms, lat, lon) {
    const { decl, eqt } = zonData(ms);
    const d = new Date(ms), minuten = d.getUTCHours() * 60 + d.getUTCMinutes() + d.getUTCSeconds() / 60;
    const ha = ((minuten + eqt + 4 * lon) / 4 - 180) * RAD;
    const cosz = Math.sin(lat * RAD) * Math.sin(decl * RAD) + Math.cos(lat * RAD) * Math.cos(decl * RAD) * Math.cos(ha);
    return 90 - Math.acos(Math.max(-1, Math.min(1, cosz))) / RAD;
  }
  // Zonnestand: hoogte (graden) en azimut (graden vanaf het noorden, met de klok mee: 90 = oost, 180 = zuid).
  function zonStand(ms, lat, lon) {
    const { decl, eqt } = zonData(ms);
    const d = new Date(ms), minuten = d.getUTCHours() * 60 + d.getUTCMinutes() + d.getUTCSeconds() / 60;
    const ha = ((minuten + eqt + 4 * lon) / 4 - 180) * RAD;
    const az = Math.atan2(Math.sin(ha), Math.cos(ha) * Math.sin(lat * RAD) - Math.tan(decl * RAD) * Math.cos(lat * RAD)) / RAD + 180;
    return { hoogte: zonhoogte(ms, lat, lon), azimut: (az + 360) % 360 };
  }
  // Maanstand en schijngestalte (vereenvoudigde formules zoals in SunCalc, nauwkeurig tot ~1 graad): hoogte, azimut
  // (vanaf het noorden), verlicht deel (0-1) en fase (0 nieuw, 0,25 eerste kwartier, 0,5 vol, 0,75 laatste kwartier).
  function maanStand(ms, lat, lon) {
    const dg = (ms - 946728000000) / DAG, e = 23.4397 * RAD, phi = lat * RAD, lw = -lon * RAD;
    const eq = (l, b) => ({ ra: Math.atan2(Math.sin(l) * Math.cos(e) - Math.tan(b) * Math.sin(e), Math.cos(l)),
      dec: Math.asin(Math.sin(b) * Math.cos(e) + Math.cos(b) * Math.sin(e) * Math.sin(l)) });
    const L = RAD * (218.316 + 13.176396 * dg), Mm = RAD * (134.963 + 13.064993 * dg), Fm = RAD * (93.272 + 13.22935 * dg);
    const m = eq(L + RAD * 6.289 * Math.sin(Mm), RAD * 5.128 * Math.sin(Fm)), mAfst = 385001 - 20905 * Math.cos(Mm);
    const H = RAD * (280.16 + 360.9856235 * dg) - lw - m.ra;
    const hoogte = Math.asin(Math.sin(phi) * Math.sin(m.dec) + Math.cos(phi) * Math.cos(m.dec) * Math.cos(H)) / RAD;
    const az = Math.atan2(Math.sin(H), Math.cos(H) * Math.sin(phi) - Math.tan(m.dec) * Math.cos(phi)) / RAD + 180;
    const Ms = RAD * (357.5291 + 0.98560028 * dg);
    const C = RAD * (1.9148 * Math.sin(Ms) + 0.02 * Math.sin(2 * Ms) + 0.0003 * Math.sin(3 * Ms));
    const s = eq(Ms + C + RAD * 102.9372 + Math.PI, 0), zAfst = 149598000;
    const hk = Math.acos(Math.sin(s.dec) * Math.sin(m.dec) + Math.cos(s.dec) * Math.cos(m.dec) * Math.cos(s.ra - m.ra));
    const inc = Math.atan2(zAfst * Math.sin(hk), mAfst - zAfst * Math.cos(hk));
    const hoek = Math.atan2(Math.cos(s.dec) * Math.sin(s.ra - m.ra), Math.sin(s.dec) * Math.cos(m.dec) - Math.cos(s.dec) * Math.sin(m.dec) * Math.cos(s.ra - m.ra));
    return { hoogte, azimut: (az + 360) % 360, verlicht: (1 + Math.cos(inc)) / 2, fase: 0.5 + 0.5 * inc * (hoek < 0 ? -1 : 1) / Math.PI };
  }
  // Zonsopkomst, middag en ondergang (ms, UTC) op de kalenderdag van `ms` in UTC. hoek: -0.833 = zonsopkomst
  // (bovenrand met breking), -6 = burgerlijke schemering. Twee rondes: de tweede rekent met de zon op dat moment.
  function zonTijden(ms, lat, lon, hoek = -0.833) {
    const d = new Date(ms), dag0 = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
    const een = (gok, teken) => {
      let t = gok;
      for (let i = 0; i < 2; i++) {
        const { decl, eqt } = zonData(t);
        const c = (Math.cos((90 - hoek) * RAD) / (Math.cos(lat * RAD) * Math.cos(decl * RAD))) - Math.tan(lat * RAD) * Math.tan(decl * RAD);
        if (c < -1 || c > 1) return null;          // poolnacht of middernachtzon
        const ha = Math.acos(c) / RAD;
        t = dag0 + (720 - 4 * lon - eqt + teken * 4 * ha) * 6e4;
      }
      return t;
    };
    const { eqt } = zonData(dag0 + 12 * 36e5);
    return { op: een(dag0 + 6 * 36e5, -1), middag: dag0 + (720 - 4 * lon - eqt) * 6e4, onder: een(dag0 + 18 * 36e5, 1) };
  }

  // ---------- lichtfase ----------
  // nacht (< -6°), dageraad (-6° tot opkomst), ochtend (2 uur na opkomst), middag, gouden uur (laatste uur voor
  // ondergang), schemering (ondergang tot -6°). Lokale kalenderdag: we rekenen vanaf de zonsmiddag dichtst bij nu.
  const FASES = ['nacht', 'dageraad', 'ochtend', 'middag', 'gouden_uur', 'schemering'];
  function lichtfase(ms, lat, lon) {
    const h = zonhoogte(ms, lat, lon);
    // kalenderdag zo kiezen dat de zonsmiddag het dichtst bij nu ligt (werkt in elke tijdzone)
    let t = zonTijden(ms, lat, lon);
    for (const dd of [-DAG, DAG]) {
      const o = zonTijden(ms + dd, lat, lon);
      if (Math.abs(o.middag - ms) < Math.abs(t.middag - ms)) t = o;
    }
    const voorMiddag = ms < t.middag;
    let fase;
    if (h < -6) fase = 'nacht';
    else if (h < -0.833) fase = voorMiddag ? 'dageraad' : 'schemering';
    else if (t.op && voorMiddag && ms < t.op + 2 * 36e5) fase = 'ochtend';
    else if (t.onder && !voorMiddag && ms > t.onder - 36e5) fase = 'gouden_uur';
    else fase = 'middag';
    return { fase, zonhoogte: Math.round(h * 10) / 10, op: t.op, onder: t.onder, middag: t.middag, voorMiddag };
  }

  // ---------- weer ----------
  // WMO-weercode (Open-Meteo) naar een weertype. v1 tekent helder, halfbewolkt (als helder met meer wolken),
  // bewolkt, regen en sneeuw; mist, motregen, onweer en hagel vallen terug op het dichtstbijzijnde v1-type.
  function weertype(code) {
    const c = code == null || code === '' ? NaN : +code;
    if (!Number.isFinite(c)) return 'halfbewolkt';
    if (c === 0) return 'helder';
    if (c === 1 || c === 2) return 'halfbewolkt';
    if (c === 3 || c === 45 || c === 48) return 'bewolkt';
    if ((c >= 71 && c <= 77) || c === 85 || c === 86) return 'sneeuw';
    if ((c >= 51 && c <= 67) || (c >= 80 && c <= 82) || c >= 95) return 'regen';
    return 'bewolkt';
  }

  // ---------- seizoen ----------
  // Meteorologische seizoenen: lente 1 maart, zomer 1 juni, herfst 1 september, winter 1 december.
  // v1: één boomstadium per seizoen (op de schaal van acht stadia uit de spec: 2 bloesem, 4 vol, 6 herfstkleur, 8 kaal).
  const SEIZOENEN = { lente: 2, zomer: 4, herfst: 6, winter: 8 };
  function seizoenOp(d) {
    const m = d.getMonth();
    const naam = m >= 2 && m <= 4 ? 'lente' : m >= 5 && m <= 7 ? 'zomer' : m >= 8 && m <= 10 ? 'herfst' : 'winter';
    return { naam, boomstadium: SEIZOENEN[naam] };
  }

  // ---------- events ----------
  // Sinterklaas: van de intocht (eerste zaterdag op of na 12 november; 2018-2025 klopt dat elk jaar) t/m 5 december.
  // Kerst: 1 t/m 26 december. Periodes als lokale datums [van, tot] (tot = laatste dag, inclusief).
  function intocht(jaar) {
    const d = new Date(jaar, 10, 12);
    d.setDate(12 + ((6 - d.getDay() + 7) % 7));
    return d;
  }
  function eventPeriodes(jaar) {
    return {
      sinterklaas: { van: intocht(jaar), tot: new Date(jaar, 11, 5) },
      kerst: { van: new Date(jaar, 11, 1), tot: new Date(jaar, 11, 26) },
    };
  }
  const dagnummer = d => Math.round(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / DAG);
  function eventsOp(d, aan) {
    const uit = [], n = dagnummer(d);
    for (const [id, p] of Object.entries(eventPeriodes(d.getFullYear()))) {
      if (aan && aan[id] === false) continue;
      if (n >= dagnummer(p.van) && n <= dagnummer(p.tot)) uit.push(id);
    }
    return uit;
  }
  // Kerstsfeer: 20 december t/m 6 januari ligt er minimaal een poedertje sneeuw.
  const kerstsfeerOp = d => (d.getMonth() === 11 && d.getDate() >= 20) || (d.getMonth() === 0 && d.getDate() <= 6);

  // ---------- weerrecord ----------
  // Record (uit Open-Meteo of de cache): { tijd (ms, opgehaald), code, temp_c, wind_kmh, sneeuw_cm, sneeuwhoogte_m,
  // regen_verwacht_om, op, onder }. Ouder dan 3 uur of geen record: 'licht bewolkt' (halfbewolkt) volgens de spec.
  const VERLOOPT = 3 * 36e5;
  function weerUit(record, nu, override) {
    if (override && override !== 'echt') {
      const koud = override === 'sneeuw';
      return { type: override, temp_c: koud ? -2 : override === 'regen' ? 9 : 14, wind_kmh: override === 'regen' ? 22 : 8, bron: 'test' };
    }
    if (!record || !Number.isFinite(record.tijd) || nu - record.tijd > VERLOOPT || nu < record.tijd - DAG) {
      return { type: 'halfbewolkt', temp_c: null, wind_kmh: null, bron: record ? 'verlopen' : 'standaard' };
    }
    const w = { type: weertype(record.code), temp_c: record.temp_c, wind_kmh: record.wind_kmh, bron: 'open-meteo' };
    if (record.regen_verwacht_om) w.regen_verwacht_om = record.regen_verwacht_om;
    return w;
  }
  // Sneeuwlaag (v1-light): 0 geen, 1 poedertje, 2 laagje, 3 dik pak. Bij sneeuwweer een laagje (bij zware sneeuwval
  // of een gemeten sneeuwhoogte van 5 cm een dik pak); met de kerstsfeer minimaal een poedertje.
  function sneeuwlaagUit(weer, record, d, inst) {
    let laag = 0;
    if (weer.type === 'sneeuw') laag = 2;
    if (weer.bron === 'open-meteo' && record) {
      const h = record.sneeuwhoogte_m || 0;
      if (h >= 0.05 || (weer.type === 'sneeuw' && record.sneeuw_cm >= 1)) laag = 3;
      else if (h >= 0.02) laag = Math.max(laag, 2);
      else if (h > 0) laag = Math.max(laag, 1);
    }
    if (inst.kerstsfeer !== false && kerstsfeerOp(d)) laag = Math.max(laag, 1);
    return laag;
  }

  // ---------- de omgevingsstatus ----------
  // bereken({ datum, lat, lon, weer (record of null), instellingen }) -> { licht, weer, seizoen, sneeuwlaag, events }.
  // instellingen: { altijdDag, weer: 'echt'|type, seizoen: 'echt'|naam, events: { sinterklaas, kerst }, kerstsfeer }.
  function bereken(o) {
    const d = o.datum instanceof Date ? o.datum : new Date(o.datum || Date.now());
    const lat = Number.isFinite(+o.lat) ? +o.lat : 51.93, lon = Number.isFinite(+o.lon) ? +o.lon : 6.07;
    const inst = o.instellingen || {};
    const zon = lichtfase(d.getTime(), lat, lon), zs = zonStand(d.getTime(), lat, lon);
    const weer = weerUit(o.weer, d.getTime(), inst.weer);
    const fase = inst.altijdDag ? 'middag' : zon.fase;
    const donkerWeer = { bewolkt: 6, regen: 10, sneeuw: 10 }[weer.type];
    const lampen = !inst.altijdDag && (['nacht', 'dageraad', 'schemering'].includes(fase) ||
      (donkerWeer != null && zon.zonhoogte < donkerWeer));
    let seizoen = seizoenOp(d);
    if (inst.seizoen && SEIZOENEN[inst.seizoen]) seizoen = { naam: inst.seizoen, boomstadium: SEIZOENEN[inst.seizoen] };
    // test-weer: een temperatuur die bij het seizoen past
    if (weer.bron === 'test' && weer.type !== 'sneeuw') weer.temp_c = { winter: 4, lente: 13, zomer: 23, herfst: 12 }[seizoen.naam] - (weer.type === 'regen' ? 2 : 0);
    return {
      licht: { fase, zonhoogte: zon.zonhoogte, lampen, op: zon.op && Math.round(zon.op), onder: zon.onder && Math.round(zon.onder),
        // voor het vloeiende verloop: exacte hoogte, ochtend- of avondkant, azimut, en de maan
        hoogte: inst.altijdDag ? 35 : zs.hoogte, ochtend: zon.voorMiddag, azimut: inst.altijdDag ? 180 : zs.azimut, maan: maanStand(d.getTime(), lat, lon) },
      weer, seizoen,
      sneeuwlaag: sneeuwlaagUit(weer, o.weer, d, inst),
      events: eventsOp(d, inst.events),
    };
  }

  // ---------- browserkant: steden, instellingen, weer ophalen en cachen ----------
  // Geen GPS: een stad kiezen (of eigen lat/lon). Standaard Zevenaar.
  const STEDEN = [
    { id: 'zevenaar', naam: 'Zevenaar', lat: 51.93, lon: 6.07 },
    { id: 'arnhem', naam: 'Arnhem', lat: 51.98, lon: 5.91 },
    { id: 'rotterdam', naam: 'Rotterdam', lat: 51.92, lon: 4.48 },
    { id: 'amsterdam', naam: 'Amsterdam', lat: 52.37, lon: 4.9 },
    { id: 'utrecht', naam: 'Utrecht', lat: 52.09, lon: 5.12 },
    { id: 'groningen', naam: 'Groningen', lat: 53.22, lon: 6.57 },
    { id: 'eindhoven', naam: 'Eindhoven', lat: 51.44, lon: 5.48 },
    { id: 'maastricht', naam: 'Maastricht', lat: 50.85, lon: 5.69 },
  ];
  const SLEUTEL = { inst: 'pq-omgeving', weer: 'pq-weer' };
  const STANDAARD = { stad: 'zevenaar', lat: 51.93, lon: 6.07, altijdDag: false, weer: 'echt', seizoen: 'echt',
    events: { sinterklaas: true, kerst: true }, kerstsfeer: true, autoKleding: { hidde: true, tessie: true } };
  function opslag() { try { return window.localStorage || null; } catch (e) { return null; } }
  function leesInstellingen() {
    let v = null;
    try { const s = opslag(); v = s && JSON.parse(s.getItem(SLEUTEL.inst) || 'null'); } catch (e) { v = null; }
    const inst = Object.assign({}, STANDAARD, v && typeof v === 'object' ? v : {});
    inst.events = Object.assign({}, STANDAARD.events, v && v.events);
    inst.autoKleding = Object.assign({}, STANDAARD.autoKleding, v && v.autoKleding);
    return inst;
  }
  function bewaarInstellingen(inst) {
    try { const s = opslag(); if (s) s.setItem(SLEUTEL.inst, JSON.stringify(inst)); return true; } catch (e) { return false; }
  }
  function plekVan(inst) {
    const stad = STEDEN.find(s => s.id === inst.stad);
    if (stad) return { lat: stad.lat, lon: stad.lon, naam: stad.naam };
    const lat = +inst.lat, lon = +inst.lon;
    return Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180
      ? { lat, lon, naam: `${lat.toFixed(2)}, ${lon.toFixed(2)}` } : { lat: 51.93, lon: 6.07, naam: 'Zevenaar' };
  }
  const cacheSleutel = (lat, lon) => `${(+lat).toFixed(2)},${(+lon).toFixed(2)}`;
  function leesWeerCache(lat, lon) {
    try { const s = opslag(), c = s && JSON.parse(s.getItem(SLEUTEL.weer) || '{}'); return (c && c[cacheSleutel(lat, lon)]) || null; }
    catch (e) { return null; }
  }
  function bewaarWeerCache(lat, lon, record) {
    try {
      const s = opslag();
      if (!s) return;
      const c = JSON.parse(s.getItem(SLEUTEL.weer) || '{}') || {};
      c[cacheSleutel(lat, lon)] = record;
      s.setItem(SLEUTEL.weer, JSON.stringify(c));
    } catch (e) { /* geen opslag: dan alleen in het geheugen */ }
  }
  // Open-Meteo, met de velden uit de spec. Later haalt de VPS dit op (elke 20 minuten per locatie) en vraagt de app
  // alleen de eigen server; zie docs/omgeving.md.
  function weerUrl(lat, lon) {
    return 'https://api.open-meteo.com/v1/forecast?latitude=' + (+lat).toFixed(3) + '&longitude=' + (+lon).toFixed(3) +
      '&current=weather_code,temperature_2m,precipitation,snowfall,cloud_cover,wind_speed_10m,is_day' +
      '&hourly=precipitation_probability,precipitation,snowfall,snow_depth,weather_code' +
      '&daily=sunrise,sunset&forecast_days=2&timezone=auto';
  }
  // Antwoord van Open-Meteo -> record. Pure functie (ook te testen met node).
  function leesOpenMeteo(j, nu) {
    const c = j && j.current;
    if (!c || c.weather_code == null) return null;
    const h = j.hourly || {}, tijden = h.time || [], uur = String(c.time || '').slice(0, 13);
    let i = tijden.findIndex(t => String(t).slice(0, 13) === uur);
    if (i < 0) i = 0;
    let regen = null;
    for (let k = i + 1; k <= i + 2 && k < tijden.length; k++) {
      if ((h.precipitation_probability || [])[k] >= 60) { regen = String(tijden[k]).slice(11, 16); break; }
    }
    const daily = j.daily || {};
    return {
      tijd: nu, code: c.weather_code, temp_c: c.temperature_2m, wind_kmh: c.wind_speed_10m,
      sneeuw_cm: c.snowfall || 0, neerslag_mm: c.precipitation || 0, bewolking: c.cloud_cover, is_dag: c.is_day,
      sneeuwhoogte_m: (h.snow_depth || [])[i] || 0, regen_verwacht_om: regen,
      op: (daily.sunrise || [])[0] || null, onder: (daily.sunset || [])[0] || null,
    };
  }
  // Haalt het weer op (als fetch werkt). Lukt het niet, dan blijft de cache staan; bereken() valt na 3 uur terug.
  async function haalWeer(lat, lon) {
    if (typeof fetch !== 'function') return leesWeerCache(lat, lon);
    const oud = leesWeerCache(lat, lon);
    if (oud && Date.now() - oud.tijd < 20 * 6e4) return oud;      // hooguit eens per 20 minuten, net als de server straks
    try {
      const ac = typeof AbortController === 'function' ? new AbortController() : null;
      const t = ac && setTimeout(() => ac.abort(), 8000);
      const r = await fetch(weerUrl(lat, lon), ac ? { signal: ac.signal } : undefined);
      if (t) clearTimeout(t);
      if (!r.ok) return oud;
      const rec = leesOpenMeteo(await r.json(), Date.now());
      if (rec) bewaarWeerCache(lat, lon, rec);
      return rec || oud;
    } catch (e) { return oud; }
  }

  return { zonData, zonhoogte, zonStand, maanStand, zonTijden, lichtfase, FASES, weertype, seizoenOp, intocht, eventPeriodes, eventsOp,
    kerstsfeerOp, weerUit, sneeuwlaagUit, bereken, STEDEN, STANDAARD, leesInstellingen, bewaarInstellingen, plekVan,
    leesWeerCache, bewaarWeerCache, weerUrl, leesOpenMeteo, haalWeer };
})();
