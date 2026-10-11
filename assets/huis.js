// Ons huis: huizencatalogus, kamertypes, meubels, plaatsingen, pets en voorbeeldtaken voor app/huis.html.
// Met de hand bewerkbaar. Schema en uitleg: docs/huis.md. Alle maten in artpixels (artpx), tenzij er "bronpx" staat.
// Kleuren: een paletnaam uit manifest.json ("eik"), een tint uit de kleurrampen van kleding.js
// ("eik.3": stop 0 = donkerst, 2 = de paletkleur zelf, 4 = lichtst) of een hexwaarde.
window.PQ_HUIS = {
  versie: 2,

  // Schermpx per artpx. "auto" kiest de grootste hele schaal die past (1-3).
  // Smaller dan smal_onder schermpx: minstens minimum_smal, en het huis scrollt binnen zijn eigen venster.
  schaal: { standaard: 'auto', opties: [1, 2, 3], smal_onder: 700, minimum_smal: 2 },

  // Echte maten. IJkpunt: Hidde is 190 cm; zijn figuur is ~84 artpx hoog, dus 1 artpx ≈ 2,26 cm.
  // Pets worden op de gemiddelde maat van hun soort getekend (niet op de pixelschaal van het blad).
  //   maat: welke kant van de figuur de maat bepaalt ('hoogte' of 'breedte'), cm: die maat in het echt.
  ijk: { figuur: 'hidde', cm: 190 },
  echte_maten: {
    konijntje:   { maat: 'hoogte',  cm: 30, uitleg: 'huiskonijn, zittend met oren omhoog' },
    hondje:      { maat: 'hoogte',  cm: 80, uitleg: 'golden retriever, zittend (kop)' },
    katje:       { maat: 'hoogte',  cm: 33, uitleg: 'huiskat, zittend tot de oorpunten' },
    parkietje:   { maat: 'breedte', cm: 18, uitleg: 'grasparkiet, kop tot staartpunt' },
    kikkertje:   { maat: 'breedte', cm: 8,  uitleg: 'boomkikker, zittend' },
    cavia:       { maat: 'breedte', cm: 25, uitleg: 'cavia, neus tot achterkant' },
    schildpadje: { maat: 'breedte', cm: 25, uitleg: 'landschildpad, kop tot schild' },
    salamander:  { maat: 'breedte', cm: 18, uitleg: 'vuursalamander, kop tot staart' },
    kameleon:    { maat: 'breedte', cm: 30, uitleg: 'Jemenkameleon met opgekrulde staart' },
    haaitje:     { maat: 'breedte', cm: 30, uitleg: 'uitzondering: aquariumformaat, geen echte haai' },
    draakje:     { maat: 'hoogte',  cm: 50, uitleg: 'fantasie: jong draakje, kniehoogte' },
    ottertje:    { maat: 'hoogte',  cm: 55, uitleg: 'Europese otter, rechtop zittend' },
    egeltje:     { maat: 'breedte', cm: 25, uitleg: 'egel, neus tot achterkant' },
    varkentje:   { maat: 'hoogte',  cm: 50, uitleg: 'minivarken (hangbuik), zittend; een gewoon varken is ~2x zo groot' },
  },
  raster: 8,                      // meubels en bewoners klikken vast op 8 artpx binnen een kamer
  cel: 16,                        // een kamer van n cellen is n x 16 artpx breed, inclusief zijn linkermuur
  maten: {
    muur: 8, vloerplaat: 8,       // doorgesneden muren en vloeren
    kamerhoogte: 128,             // binnenhoogte van een verdieping (Hidde is ~85 artpx)
    vloer: 8, plint: 3,           // vloerband onderin de kamer en plint daarboven
    vloerlijn: 4,                 // voetanker: 4 artpx boven de onderkant van de kamer
    raam_y: 20, raam_h: 36,       // standaard raam: 20 artpx onder het plafond, 36 hoog
    marge: 24, lucht: 16, grond: 40,   // grond: diepte onder het maaiveld (een niveau kan dit verhogen, bv. voor het zwembad)
  },

  // Dagdelen op de klok van het apparaat. Lucht, ramen, lampen en een lichte tint over het huis.
  dagdelen: [
    { id: 'nacht',   naam: 'Nacht',   van: 22, tot: 6,  lucht: 'nacht',      raam: 'titel.3',    sterren: true,  lampen: true,  tint: 'titel',    sterkte: 0.22 },
    { id: 'ochtend', naam: 'Ochtend', van: 6,  tot: 9,  lucht: 'abrikoos.4', raam: 'abrikoos.3', sterren: false, lampen: false, tint: 'abrikoos', sterkte: 0.06 },
    { id: 'dag',     naam: 'Dag',     van: 9,  tot: 18, lucht: 'petrol.4',   raam: 'petrol.3',   sterren: false, lampen: false, tint: null,       sterkte: 0 },
    { id: 'avond',   naam: 'Avond',   van: 18, tot: 22, lucht: 'lavendel.3', raam: 'koraal.3',   sterren: false, lampen: true,  tint: 'lavendel', sterkte: 0.1 },
  ],

  // Kamertypes: standaardstijl per type. Een kamer in een huis kan muur/vloer/plint overschrijven.
  //   muur.patroon: 'strepen' | 'stippen' | 'tegels' | 'planken' | 'blokken'; muur.tot = patroonhoogte vanaf de vloer.
  //   buiten: geen muren of plafond (tuin, balkon). trap: tekent een trap; geen meubels.
  //   romp?: eigen kleur voor de doorgesneden muren van dit type. dak?: eigen dak boven dit type (serre: glas).
  //   dakvloer?: een buitenkamer die op het dak eronder ligt. schuin?: { knie } schuine kap (zolder).
  //   Premium-materialen (huis-teken.js): muur.patroon 'stuc' (dither), 'behang' (fijne streep), 'lambrisering'
  //   (lambrisering tot muur.tot), 'tegels' / 'metro' (tegelwerk met voegen), 'lamellen' (houten latten), 'natuursteen'.
  //   vloer.patroon: 'visgraat', 'planken', 'tegels', 'gras', 'terras', 'klinkers', 'vlonder'.
  //   modern?: wat er vanaf de gevelrenovatie (stijl 'modern') anders is. accent?: { x, b, patroon, kleur } een
  //   accentwand (bv. lamellen achter de bank). lampen: 'hang' | 'spots' | 'kroon' | null (plafondverlichting).
  kamertypes: {
    woonkeuken: { naam: 'Woonkeuken', lampen: 'hang',
      muur: { kleur: 'papier.3', patroon: 'behang', patroonkleur: 'papier.2' },
      vloer: { kleur: 'eik.3', naad: 'eik.1', licht: 'eik.4', patroon: 'planken' }, plint: 'creme.3' },
    keuken: { naam: 'Leefkeuken', lampen: null,
      muur: { kleur: 'creme.3', patroon: 'stuc', patroonkleur: 'creme.2' },
      vloer: { kleur: 'abrikoos.1', naad: 'koraal.0', licht: 'abrikoos.2', patroon: 'tegels' }, plint: 'creme.2',
      modern: { muur: { kleur: 'creme.3', patroon: 'stuc', patroonkleur: 'creme.2' },
        vloer: { kleur: 'creme.1', naad: 'creme.0', licht: 'creme.2', patroon: 'tegels' }, plint: 'creme.1' } },
    woonkamer: { naam: 'Woonkamer', lampen: 'kroon',
      muur: { kleur: 'papier.3', patroon: 'behang', patroonkleur: 'papier.2' },
      vloer: { kleur: 'eik.3', naad: 'eik.1', licht: 'eik.4', patroon: 'visgraat' }, plint: 'creme.3',
      modern: { lampen: 'spots', muur: { kleur: 'creme.3', patroon: 'stuc', patroonkleur: 'creme.2' },
        accent: { x: 148, b: 104, patroon: 'lamellen', kleur: 'eik.3' } } },
    slaaphoek: { naam: 'Slaaphoek', lampen: 'hang',
      muur: { kleur: 'lavendel.4', patroon: 'lambrisering', patroonkleur: 'lavendel.3', tot: 40 },
      vloer: { kleur: 'eik.3', naad: 'eik.1', licht: 'eik.4', patroon: 'planken' }, plint: 'creme.3' },
    slaapkamer: { naam: 'Slaapkamer', lampen: 'hang',
      muur: { kleur: 'lavendel.4', patroon: 'lambrisering', patroonkleur: 'lavendel.3', tot: 40 },
      vloer: { kleur: 'eik.3', naad: 'eik.1', licht: 'eik.4', patroon: 'planken' }, plint: 'creme.3',
      modern: { lampen: 'spots', muur: { kleur: 'lavendel.4', patroon: 'stuc', patroonkleur: 'lavendel.3' } } },
    logeerkamer: { naam: 'Logeerkamer', lampen: 'hang',
      muur: { kleur: 'abrikoos.4', patroon: 'stuc', patroonkleur: 'papier.2' },
      vloer: { kleur: 'eik.3', naad: 'eik.1', licht: 'eik.4', patroon: 'planken' }, plint: 'creme.3' },
    master: { naam: 'Mastersuite', lampen: 'spots',
      muur: { kleur: 'papier.3', patroon: 'stuc', patroonkleur: 'papier.2' },
      vloer: { kleur: 'eik.3', naad: 'eik.1', licht: 'eik.4', patroon: 'visgraat' }, plint: 'creme.2',
      accent: { x: 24, b: 120, patroon: 'lamellen', kleur: 'hazelnoot.3' } },
    badkamer: { naam: 'Badkamer', lampen: 'spots',
      muur: { kleur: 'petrol.4', patroon: 'metro', patroonkleur: 'petrol.3', tot: 72 },
      vloer: { kleur: 'creme.2', naad: 'creme.0', licht: 'creme.3', patroon: 'tegels' }, plint: 'creme.1',
      modern: { muur: { kleur: 'creme.2', patroon: 'natuursteen', patroonkleur: 'creme.1' },
        vloer: { kleur: 'nacht.3', naad: 'nacht.1', licht: 'nacht.4', patroon: 'tegels' }, plint: 'nacht.3' } },
    ensuite: { naam: 'Badkamer en-suite', lampen: 'spots',
      muur: { kleur: 'creme.2', patroon: 'natuursteen', patroonkleur: 'creme.1' },
      vloer: { kleur: 'nacht.3', naad: 'nacht.1', licht: 'nacht.4', patroon: 'tegels' }, plint: 'nacht.3' },
    werkkamer: { naam: 'Werkkamer', lampen: 'hang',
      muur: { kleur: 'blad.3', patroon: 'lambrisering', patroonkleur: 'blad.2', tot: 44 },
      vloer: { kleur: 'eik.3', naad: 'eik.1', licht: 'eik.4', patroon: 'planken' }, plint: 'creme.3',
      modern: { lampen: 'spots' } },
    // Nieuw in het villapad: buitenkamers. terras: overkapping met lamellen; zwembad: tuin met zwembad
    // (blok = stuk van de vloer waar geen meubel mag staan); carport: plat dakje, auto en laadpaal.
    terras: { naam: 'Overdekt terras', buiten: true, overkapping: true,
      vloer: { kleur: 'creme.1', naad: 'creme.0', licht: 'creme.2', patroon: 'terras' } },
    zwembad: { naam: 'Tuin met zwembad', buiten: true, zwembad: { x: 8, b: 152 },
      vloer: { kleur: 'creme.1', naad: 'creme.0', licht: 'creme.2', patroon: 'terras' } },
    carport: { naam: 'Carport', buiten: true, carport: true,
      vloer: { kleur: 'nacht.3', naad: 'nacht.2', licht: 'nacht.4', patroon: 'klinkers' } },
    uitkijk: { naam: 'Uitkijk', muur: { kleur: 'goud.4', patroon: 'stippen', patroonkleur: 'abrikoos.4' },
      vloer: { kleur: 'eik', naad: 'koffie', licht: 'eik.3' }, plint: 'koffie' },
    // Trap: zwevende eiken treden met een glazen balustrade.
    trap: { naam: 'Trap', trap: true, lampen: 'hang', muur: { kleur: 'creme.3', patroon: 'stuc', patroonkleur: 'creme.2' },
      vloer: { kleur: 'eik.3', naad: 'eik.1', licht: 'eik.4', patroon: 'planken' }, plint: 'creme.3',
      modern: { lampen: 'spots', muur: { kleur: 'eik.3', patroon: 'lamellen', patroonkleur: 'eik.2' } } },
    // Tuin: gazon met terrastegels bij het huis, borders achterin en een boompje.
    tuin: { naam: 'Tuin', buiten: true, vloer: { kleur: 'blad', naad: 'blad.1', licht: 'blad.3', patroon: 'gras' } },
    // Serre: glazen kamer. Lichte muren, grote ramen (per kamer), lichte stijlen (romp) en een glazen dak.
    serre: { naam: 'Serre', romp: 'creme.3', dak: { vorm: 'glas', kleur: 'creme.3', rij: 'creme.1' },
      muur: { kleur: 'creme.4', patroon: null },
      vloer: { kleur: 'abrikoos.3', naad: 'koraal.1', licht: 'abrikoos.4' }, plint: 'creme.2' },
    // Balkon / dakterras: buiten, tegelvloer en een hekje van ~100 cm (44 artpx). dakvloer: ligt op het dak
    // van de kamer eronder, dus daar komt geen dakrand.
    balkon: { naam: 'Balkon', buiten: true, dakvloer: true, glas: true,
      vloer: { kleur: 'hazelnoot.3', naad: 'hazelnoot.1', licht: 'hazelnoot.4', naden: true, patroon: 'vlonder' } },
    // Zolder: onder de schuine kap. knie = hoogte van de knieschotten (48 artpx ≈ 110 cm); daarboven loopt het dak
    // schuin naar binnen. Een meubel dat tegen de schuine kant zou stoten, past daar niet.
    zolder: { naam: 'Zolder', schuin: { knie: 48 },
      muur: { kleur: 'hazelnoot.4', patroon: 'planken', patroonkleur: 'hazelnoot.3' },
      vloer: { kleur: 'eik', naad: 'koffie', licht: 'eik.3' }, plint: 'koffie' },
  },

  // Eén huis dat steeds verder verbouwd wordt (fase 3: elke verbouwing koop je uit de gedeelde huispot; zie docs/huis.md).
  // Elk niveau is de VOLLEDIGE indeling na die verbouwing. Een niveau bevat alles van het vorige plus iets nieuws;
  // er verdwijnt nooit een kamer. Kamer-ids zijn stabiel over alle niveaus: meubels blijven op kamer-id staan,
  // ook als de kamer breder wordt of van type verandert (slaaphoek -> slaapkamer).
  //   prijs: munten uit de huispot voor díe verbouwing (0,5 munt per inzet, max. 300 per week).
  //   voorwaarde: null of { soort: 'mijlpaal', mijlpaal, aantal, tekst } - pas te koop na die samen-mijlpaal.
  //   stijl: 'klassiek' | 'modern' (gevel, kozijnen, dakrand, tuin). romp: kleur van de doorgesneden muren en vloeren.
  //   dak: { vorm: plat|zadel|kanteel|blad, kleur, rij, stap? (zadel: artpx opzij per 8 omhoog), overstek? (plat),
  //   aanbouw?: { ... } voor dakstukken waar een hogere verdieping naast staat }. grond?: diepte van de grond (zwembad).
  //   erf: { links, rechts } artpx grond naast het huis. decor: wat er buiten staat (brievenbus, bloemen, boom, buxus,
  //   boompje, heg, lantaarn, siergras, olijfboom, tuinlampjes, oprit, buitenlampen; oud: struiken, vijver, vlag).
  //   omgeving: null (de oude 'flat' | 'rij' | 'bos' werken nog, ongebruikt).
  //   kamers: { id, type, breedte (cellen), verdieping (0 = begane grond), ramen: [{ x, b, h? }] (artpx vanaf de
  //   binnenkant van de linkermuur), start? (cel binnen de verdieping), naam?, muur?, dak?, dakkapel?, plaatsing? }.
  //   Kamers op dezelfde verdieping staan van links naar rechts in lijstvolgorde. inspring: { verdieping: cellen }.
  // Het villapad. Niveau 1-6: stijl 'klassiek' (baksteen, houten kozijnen met roedes, pannendak). Niveau 7 is het
  // omslagmoment: stijl 'modern' (wit stucwerk, houten lamellen, zwarte stalen kozijnen, glazen puien, plat dak met
  // overstek). Kamer-ids blijven over alle niveaus: woon, slaap, bad, tuin, keuken, trap0/trap1, werk, balkon, master,
  // ensuite, terras, carport. ramen: { x, b, h?, y? } (y = afstand onder het plafond, standaard raam_y).
  // pui: 'links' | 'rechts' maakt die doorgesneden muur een glazen pui (schuifpui naar tuin of balkon).
  niveaus: [
    {
      niveau: 1, naam: 'Starthuisje', prijs: 0, voorwaarde: null, stijl: 'klassiek',
      omschrijving: 'Klein maar verzorgd: een woonkeuken met visgraat en een knusse slaaphoek, onder een pannendak.',
      romp: 'koraal.1', dak: { vorm: 'zadel', kleur: 'bordeaux', rij: 'bordeaux.1', stap: 8 }, omgeving: null,
      erf: { links: 40, rechts: 72 }, decor: ['brievenbus', 'bloemen', 'boom', 'lantaarn'],
      kamers: [
        { id: 'woon', type: 'woonkeuken', breedte: 18, verdieping: 0, ramen: [{ x: 104, b: 44, h: 48 }] },
        { id: 'slaap', type: 'slaaphoek', breedte: 13, verdieping: 0, ramen: [{ x: 112, b: 40, h: 44 }] },
      ],
    },
    {
      niveau: 2, naam: 'Badkamer', prijs: 400, voorwaarde: null, stijl: 'klassiek',
      omschrijving: 'Een eigen badkamer met metrotegels, een bad op pootjes en een wastafel met spiegel.',
      romp: 'koraal.1', dak: { vorm: 'zadel', kleur: 'bordeaux', rij: 'bordeaux.1', stap: 8 }, omgeving: null,
      erf: { links: 40, rechts: 72 }, decor: ['brievenbus', 'bloemen', 'boom', 'lantaarn'],
      kamers: [
        { id: 'woon', type: 'woonkeuken', breedte: 18, verdieping: 0, ramen: [{ x: 104, b: 44, h: 48 }] },
        { id: 'slaap', type: 'slaaphoek', breedte: 13, verdieping: 0, ramen: [{ x: 112, b: 40, h: 44 }] },
        { id: 'bad', type: 'badkamer', breedte: 9, verdieping: 0, ramen: [{ x: 22, b: 24, h: 24 }] },
      ],
    },
    {
      niveau: 3, naam: 'Echte slaapkamer', prijs: 600, voorwaarde: null, stijl: 'klassiek',
      omschrijving: 'De slaaphoek wordt een slaapkamer: breder, met lambrisering, een groter raam en een kledingkast.',
      romp: 'koraal.1', dak: { vorm: 'zadel', kleur: 'bordeaux', rij: 'bordeaux.1', stap: 8 }, omgeving: null,
      erf: { links: 40, rechts: 72 }, decor: ['brievenbus', 'bloemen', 'boom', 'lantaarn', 'buxus'],
      kamers: [
        { id: 'woon', type: 'woonkeuken', breedte: 18, verdieping: 0, ramen: [{ x: 104, b: 44, h: 48 }] },
        { id: 'slaap', type: 'slaapkamer', breedte: 16, verdieping: 0, ramen: [{ x: 112, b: 48, h: 48 }] },
        { id: 'bad', type: 'badkamer', breedte: 9, verdieping: 0, ramen: [{ x: 22, b: 24, h: 24 }] },
      ],
    },
    {
      niveau: 4, naam: 'Tuin', prijs: 700, voorwaarde: null, stijl: 'klassiek',
      omschrijving: 'Een aangelegde tuin: terrastegels, borders, een boompje en een bank. Het hondje kan naar buiten.',
      romp: 'koraal.1', dak: { vorm: 'zadel', kleur: 'bordeaux', rij: 'bordeaux.1', stap: 8 }, omgeving: null,
      erf: { links: 40, rechts: 72 }, decor: ['brievenbus', 'bloemen', 'boom', 'lantaarn', 'buxus', 'boompje', 'heg'],
      kamers: [
        { id: 'tuin', type: 'tuin', breedte: 14, verdieping: 0 },
        { id: 'woon', type: 'woonkeuken', breedte: 18, verdieping: 0, ramen: [{ x: 104, b: 44, h: 48 }] },
        { id: 'slaap', type: 'slaapkamer', breedte: 16, verdieping: 0, ramen: [{ x: 112, b: 48, h: 48 }] },
        { id: 'bad', type: 'badkamer', breedte: 9, verdieping: 0, ramen: [{ x: 22, b: 24, h: 24 }] },
      ],
    },
    {
      niveau: 5, naam: 'Leefkeuken met kookeiland', prijs: 900, voorwaarde: null, stijl: 'klassiek',
      omschrijving: 'Een leefkeuken met kookeiland, krukken en hanglampen, en een eettafel. De woonkeuken wordt woonkamer.',
      romp: 'koraal.1', dak: { vorm: 'zadel', kleur: 'bordeaux', rij: 'bordeaux.1', stap: 8 }, omgeving: null,
      erf: { links: 40, rechts: 72 }, decor: ['brievenbus', 'bloemen', 'boom', 'lantaarn', 'buxus', 'boompje', 'heg'],
      kamers: [
        { id: 'tuin', type: 'tuin', breedte: 14, verdieping: 0 },
        { id: 'woon', type: 'woonkamer', breedte: 18, verdieping: 0, ramen: [{ x: 8, b: 56, h: 52 }] },
        { id: 'keuken', type: 'keuken', breedte: 16, verdieping: 0, ramen: [{ x: 172, b: 48, h: 48 }] },
        { id: 'slaap', type: 'slaapkamer', breedte: 16, verdieping: 0, ramen: [{ x: 112, b: 48, h: 48 }] },
        { id: 'bad', type: 'badkamer', breedte: 9, verdieping: 0, ramen: [{ x: 22, b: 24, h: 24 }] },
      ],
    },
    {
      niveau: 6, naam: 'Eerste verdieping', prijs: 1500, voorwaarde: null, stijl: 'klassiek',
      omschrijving: 'Een zwevende eiken trap met glazen balustrade naar een werkkamer boven, onder een nieuw pannendak.',
      romp: 'koraal.1', dak: { vorm: 'zadel', kleur: 'bordeaux', rij: 'bordeaux.1', stap: 8, aanbouw: { vorm: 'plat', kleur: 'nacht.2', rij: 'creme.3' } },
      omgeving: null, erf: { links: 40, rechts: 72 }, decor: ['brievenbus', 'bloemen', 'boom', 'lantaarn', 'buxus', 'boompje', 'heg'],
      inspring: { 1: 48 },
      kamers: [
        { id: 'tuin', type: 'tuin', breedte: 14, verdieping: 0 },
        { id: 'woon', type: 'woonkamer', breedte: 18, verdieping: 0, ramen: [{ x: 8, b: 56, h: 52 }] },
        { id: 'keuken', type: 'keuken', breedte: 16, verdieping: 0, ramen: [{ x: 172, b: 48, h: 48 }] },
        { id: 'trap0', type: 'trap', breedte: 6, verdieping: 0 },
        { id: 'slaap', type: 'slaapkamer', breedte: 16, verdieping: 0, ramen: [{ x: 112, b: 48, h: 48 }] },
        { id: 'bad', type: 'badkamer', breedte: 9, verdieping: 0, ramen: [{ x: 22, b: 24, h: 24 }] },
        { id: 'trap1', type: 'trap', breedte: 6, verdieping: 1 },
        { id: 'werk', type: 'werkkamer', breedte: 16, verdieping: 1, ramen: [{ x: 176, b: 48, h: 48 }] },
      ],
    },
    {
      niveau: 7, naam: 'Gevelrenovatie', prijs: 1800, voorwaarde: null, stijl: 'modern',
      omschrijving: 'Het omslagmoment: wit stucwerk, houten lamellen, zwarte stalen kozijnen, glazen puien en een plat dak met overstek.',
      romp: 'creme.3', dak: { vorm: 'plat', kleur: 'creme.3', rij: 'nacht.1', overstek: 16, aanbouw: { vorm: 'plat', kleur: 'creme.3', rij: 'nacht.1', overstek: 8 } },
      omgeving: null, erf: { links: 40, rechts: 72 }, decor: ['brievenbus', 'boom', 'lantaarn', 'buxus', 'siergras', 'boompje', 'tuinlampjes', 'heg'],
      inspring: { 1: 48 },
      kamers: [
        { id: 'tuin', type: 'tuin', breedte: 14, verdieping: 0 },
        { id: 'woon', type: 'woonkamer', breedte: 18, verdieping: 0, pui: 'links', ramen: [{ x: 4, b: 92, y: 12, h: 104 }] },
        { id: 'keuken', type: 'keuken', breedte: 16, verdieping: 0, ramen: [{ x: 148, b: 92, y: 12, h: 104 }] },
        { id: 'trap0', type: 'trap', breedte: 6, verdieping: 0 },
        { id: 'slaap', type: 'slaapkamer', breedte: 16, verdieping: 0, ramen: [{ x: 108, b: 56, y: 16, h: 72 }] },
        { id: 'bad', type: 'badkamer', breedte: 9, verdieping: 0, ramen: [{ x: 12, b: 56, h: 18 }] },
        { id: 'trap1', type: 'trap', breedte: 6, verdieping: 1 },
        { id: 'werk', type: 'werkkamer', breedte: 16, verdieping: 1, ramen: [{ x: 168, b: 72, y: 12, h: 104 }] },
      ],
    },
    {
      niveau: 8, naam: 'Mastersuite boven', prijs: 1600, voorwaarde: null, stijl: 'modern',
      omschrijving: 'Boven een mastersuite met inloopkast, een badkamer en-suite met inloopdouche en dubbele wastafel, en een balkon met glazen balustrade. Beneden wordt de oude slaapkamer een logeerkamer.',
      romp: 'creme.3', dak: { vorm: 'plat', kleur: 'creme.3', rij: 'nacht.1', overstek: 16, aanbouw: { vorm: 'plat', kleur: 'creme.3', rij: 'nacht.1', overstek: 8 } },
      omgeving: null, erf: { links: 40, rechts: 72 }, decor: ['brievenbus', 'boom', 'lantaarn', 'buxus', 'siergras', 'boompje', 'tuinlampjes', 'heg'],
      inspring: { 1: 14 },
      kamers: [
        { id: 'tuin', type: 'tuin', breedte: 14, verdieping: 0 },
        { id: 'woon', type: 'woonkamer', breedte: 18, verdieping: 0, pui: 'links', ramen: [{ x: 4, b: 92, y: 12, h: 104 }] },
        { id: 'keuken', type: 'keuken', breedte: 16, verdieping: 0, ramen: [{ x: 148, b: 92, y: 12, h: 104 }] },
        { id: 'trap0', type: 'trap', breedte: 6, verdieping: 0 },
        { id: 'slaap', type: 'logeerkamer', breedte: 16, verdieping: 0, ramen: [{ x: 108, b: 56, y: 16, h: 72 }] },
        { id: 'bad', type: 'badkamer', breedte: 9, verdieping: 0, ramen: [{ x: 12, b: 56, h: 18 }] },
        { id: 'balkon', type: 'balkon', breedte: 9, verdieping: 1 },
        { id: 'master', type: 'master', breedte: 16, verdieping: 1, pui: 'links', ramen: [{ x: 126, b: 26, y: 12, h: 104 }] },
        { id: 'ensuite', type: 'ensuite', breedte: 9, verdieping: 1, ramen: [{ x: 66, b: 64, y: 8, h: 14 }] },
        { id: 'trap1', type: 'trap', breedte: 6, verdieping: 1 },
        { id: 'werk', type: 'werkkamer', breedte: 16, verdieping: 1, ramen: [{ x: 168, b: 72, y: 12, h: 104 }] },
      ],
    },
    {
      niveau: 9, naam: 'Overdekt terras', prijs: 1400, voorwaarde: null, stijl: 'modern',
      omschrijving: 'Een terras onder een lamellenoverkapping met loungebank, buitenkeuken, lichtsnoer en tuinverlichting.',
      romp: 'creme.3', dak: { vorm: 'plat', kleur: 'creme.3', rij: 'nacht.1', overstek: 16, aanbouw: { vorm: 'plat', kleur: 'creme.3', rij: 'nacht.1', overstek: 8 } },
      omgeving: null, erf: { links: 40, rechts: 72 }, decor: ['brievenbus', 'boom', 'lantaarn', 'buxus', 'siergras', 'boompje', 'tuinlampjes', 'heg'],
      inspring: { 1: 26 },
      kamers: [
        { id: 'tuin', type: 'tuin', breedte: 14, verdieping: 0 },
        { id: 'terras', type: 'terras', breedte: 12, verdieping: 0 },
        { id: 'woon', type: 'woonkamer', breedte: 18, verdieping: 0, pui: 'links', ramen: [{ x: 4, b: 92, y: 12, h: 104 }] },
        { id: 'keuken', type: 'keuken', breedte: 16, verdieping: 0, ramen: [{ x: 148, b: 92, y: 12, h: 104 }] },
        { id: 'trap0', type: 'trap', breedte: 6, verdieping: 0 },
        { id: 'slaap', type: 'logeerkamer', breedte: 16, verdieping: 0, ramen: [{ x: 108, b: 56, y: 16, h: 72 }] },
        { id: 'bad', type: 'badkamer', breedte: 9, verdieping: 0, ramen: [{ x: 12, b: 56, h: 18 }] },
        { id: 'balkon', type: 'balkon', breedte: 9, verdieping: 1 },
        { id: 'master', type: 'master', breedte: 16, verdieping: 1, pui: 'links', ramen: [{ x: 126, b: 26, y: 12, h: 104 }] },
        { id: 'ensuite', type: 'ensuite', breedte: 9, verdieping: 1, ramen: [{ x: 66, b: 64, y: 8, h: 14 }] },
        { id: 'trap1', type: 'trap', breedte: 6, verdieping: 1 },
        { id: 'werk', type: 'werkkamer', breedte: 16, verdieping: 1, ramen: [{ x: 168, b: 72, y: 12, h: 104 }] },
      ],
    },
    {
      niveau: 10, naam: 'Villa', prijs: 3000, stijl: 'modern',
      voorwaarde: { soort: 'mijlpaal', mijlpaal: 'gehaalde_weken', aantal: 26, tekst: 'na 26 gehaalde weken (een half jaar samen)' },
      omschrijving: 'Het complete villagevoel: een zwembad met ligbedden en parasol, een carport met oprit en laadpaal, een olijfboom, siergrassen en buitenverlichting.',
      romp: 'creme.3', dak: { vorm: 'plat', kleur: 'creme.3', rij: 'nacht.1', overstek: 16, aanbouw: { vorm: 'plat', kleur: 'creme.3', rij: 'nacht.1', overstek: 8 } },
      omgeving: null, erf: { links: 40, rechts: 120 }, grond: 72,
      decor: ['brievenbus', 'boom', 'buxus', 'siergras', 'olijfboom', 'tuinlampjes', 'heg', 'oprit', 'buitenlampen'],
      inspring: { 1: 38 },
      kamers: [
        { id: 'tuin', type: 'zwembad', breedte: 26, verdieping: 0 },
        { id: 'terras', type: 'terras', breedte: 12, verdieping: 0 },
        { id: 'woon', type: 'woonkamer', breedte: 18, verdieping: 0, pui: 'links', ramen: [{ x: 4, b: 92, y: 12, h: 104 }] },
        { id: 'keuken', type: 'keuken', breedte: 16, verdieping: 0, ramen: [{ x: 148, b: 92, y: 12, h: 104 }] },
        { id: 'trap0', type: 'trap', breedte: 6, verdieping: 0 },
        { id: 'slaap', type: 'logeerkamer', breedte: 16, verdieping: 0, ramen: [{ x: 108, b: 56, y: 16, h: 72 }] },
        { id: 'bad', type: 'badkamer', breedte: 9, verdieping: 0, ramen: [{ x: 12, b: 56, h: 18 }] },
        { id: 'carport', type: 'carport', breedte: 14, verdieping: 0 },
        { id: 'balkon', type: 'balkon', breedte: 9, verdieping: 1 },
        { id: 'master', type: 'master', breedte: 16, verdieping: 1, pui: 'links', ramen: [{ x: 126, b: 26, y: 12, h: 104 }] },
        { id: 'ensuite', type: 'ensuite', breedte: 9, verdieping: 1, ramen: [{ x: 66, b: 64, y: 8, h: 14 }] },
        { id: 'trap1', type: 'trap', breedte: 6, verdieping: 1 },
        { id: 'werk', type: 'werkkamer', breedte: 16, verdieping: 1, ramen: [{ x: 168, b: 72, y: 12, h: 104 }] },
      ],
    },
  ],

  // Startwaarde; wat jullie doen staat in localStorage "pq-huis-staat" (versie 3: { niveau, inrichting, doos, posities }).
  // Verbouwen kost munten; kopen komt in de winkel (fase 3). "Bekijk" toont het huis op een ander niveau als voorbeeld.
  start: { niveau: 1 },

  // Idee voor later (docs/huis.md): een tweede huis of vakantiehuis. Wordt nu nergens gebruikt; het oude schema
  // (id, tier, omgeving 'bos', dak 'blad' en 'kanteel') werkt nog in bouw() en tekenDecor().
  tweede_huizen: [
    {
      id: 'boomhut', naam: 'Boomhut', tier: 4, prijs: 4500,
      voorwaarde: { soort: 'mijlpaal', mijlpaal: 'gehaalde_weken', aantal: 26, tekst: 'na 26 gehaalde weken (een half jaar samen)' },
      omschrijving: 'Hoog in een eik, met een uitkijk en een touwladder. Kleiner dan het lijkt.',
      romp: 'eik', dak: { vorm: 'blad', kleur: 'blad', rij: 'mos' }, omgeving: 'bos',
      inspring: { 1: 2, 2: 4 },
      kamers: [
        { type: 'tuin', breedte: 26, verdieping: 0, naam: 'Bos' },
        { type: 'woonkeuken', breedte: 15, verdieping: 1, ramen: [{ x: 128, b: 32 }] },
        { type: 'badkamer', breedte: 6, verdieping: 1, ramen: [{ x: 56, b: 16, h: 16 }] },
        { type: 'slaaphoek', breedte: 12, verdieping: 2, ramen: [{ x: 24, b: 32 }] },
        { type: 'uitkijk', breedte: 5, verdieping: 2, ramen: [{ x: 16, b: 40, h: 48 }] },
      ],
    },
    {
      id: 'kasteeltje', naam: 'Kasteeltje', tier: 5, prijs: 7500,
      voorwaarde: { soort: 'mijlpaal', mijlpaal: 'gehaalde_weken', aantal: 52, tekst: 'na 52 gehaalde weken (een jaar samen)' },
      omschrijving: 'Voor ver weg: een grote zaal, twee torens en een binnentuin.',
      romp: 'nacht.3', dak: { vorm: 'kanteel', kleur: 'nacht.3', rij: 'nacht.4' }, omgeving: null,
      kamers: [
        { type: 'keuken', breedte: 10, verdieping: 0, ramen: [{ x: 96, b: 24, h: 40 }] },
        { type: 'woonkamer', breedte: 20, verdieping: 0, naam: 'Grote zaal', ramen: [{ x: 64, b: 24, h: 48 }, { x: 200, b: 24, h: 48 }],
          muur: { kleur: 'creme.2', patroon: 'blokken', patroonkleur: 'creme.1' } },
        { type: 'trap', breedte: 3, verdieping: 0, ramen: [] },
        { type: 'tuin', breedte: 10, verdieping: 0, naam: 'Binnentuin' },
        { type: 'slaapkamer', breedte: 14, verdieping: 1, ramen: [{ x: 144, b: 24, h: 40 }] },
        { type: 'badkamer', breedte: 8, verdieping: 1, ramen: [{ x: 84, b: 16, h: 24 }] },
        { type: 'werkkamer', breedte: 8, verdieping: 1, naam: 'Bibliotheek', ramen: [{ x: 48, b: 16, h: 40 }] },
        { type: 'trap', breedte: 3, verdieping: 1, ramen: [] },
        { type: 'uitkijk', breedte: 6, verdieping: 2, start: 0, id: 'toren-links', naam: 'Toren', ramen: [{ x: 36, b: 16, h: 32 }],
          muur: { kleur: 'creme.2', patroon: 'blokken', patroonkleur: 'creme.1' } },
        { type: 'uitkijk', breedte: 6, verdieping: 2, start: 27, id: 'toren-rechts', naam: 'Toren', ramen: [{ x: 36, b: 16, h: 32 }],
          muur: { kleur: 'creme.2', patroon: 'blokken', patroonkleur: 'creme.1' } },
      ],
    },
  ],

  // Catalogus van meubelsoorten.
  //   op: 'vloer' (staat op de vloerlijn) | 'muur' (hangt, vrije hoogte) | 'vrij' (op de vloer of op iets anders)
  //   hoort: kamertypes in volgorde van voorkeur; bij een verhuizing gaat een meubel naar de eerste kamer waar het past.
  //   prioriteit: hoger = eerder een plek bij een verhuizing (pet-huisjes eerst).
  //   sprite: null = placeholder-vorm. Een echte sprite: { bestand (vanaf assets/), maat: [w, h] bronpx,
  //   bronpx_per_artpixel, anker: [x, y] bronpx }. Dan worden de delen genegeerd; er verandert geen code.
  //   maat: [b, h] nominale grootte (botsen, slepen); delen mogen erbuiten vallen (hanglampen, vloerkleed, afzuigkap).
  //   delen: { x, y, b, h, k, r? (afgeronde hoek 1-3), vorm? ('ovaal' | 'kap' | 'boog'), t? (textuur: hout, houtv,
  //   stof, marmer, riet, blad, water, grind, tegel, metaal, glas, spiegel), vlak? (geen arcering), rand? (lijn binnenin),
  //   a? (doorzichtig), laag?: 'voor', licht?: 'kap' }. Elk deel krijgt vanzelf drie tinten (licht boven, basis,
  //   schaduw onder en rechts) en het silhouet een donkere outline (koffie.0). Kleuren: palet en rampen.
  //   voor: true = staat vóór de achterwand-meubels (kookeiland, salontafel): iets lager getekend en erover.
  //   licht: [{ x, y, r }] lichtpunten (lampjes): 's avonds een warme lichtpoel.
  //   plekken: waar een pet in of op het meubel woont: glas = knipvak, lijn = [min, max] y van het voetanker, bereik = [min, max] x.
  // Echte maat: 1 artpx ≈ 2,26 cm.
  meubels: {
    // Aquarium: bak 100 x 50 cm op een notenhouten meubel van 50 cm (samen ~120 cm). Glasvak voor het haaitje.
    aquarium: {
      naam: 'Aquarium', op: 'vloer', hoort: ['woonkamer', 'woonkeuken'], prioriteit: 9, placeholder: true, sprite: null, maat: [44, 53],
      delen: [
        { x: 0, y: 31, b: 44, h: 22, k: 'koffie.3', t: 'hout', r: 1 },
        { x: 2, y: 34, b: 19, h: 15, k: 'koffie.3', rand: 'koffie.1' }, { x: 23, y: 34, b: 19, h: 15, k: 'koffie.3', rand: 'koffie.1' },
        { x: 18, y: 40, b: 1, h: 4, k: 'goud.3', vlak: true }, { x: 25, y: 40, b: 1, h: 4, k: 'goud.3', vlak: true },
        { x: 2, y: 51, b: 3, h: 2, k: 'koffie.1', vlak: true }, { x: 39, y: 51, b: 3, h: 2, k: 'koffie.1', vlak: true },
        { x: 1, y: 10, b: 42, h: 21, k: 'petrol.3', t: 'water' },
        { x: 1, y: 27, b: 42, h: 4, k: 'abrikoos.3', t: 'grind' },
        { x: 4, y: 15, b: 3, h: 13, k: 'blad.2', t: 'blad' }, { x: 7, y: 19, b: 3, h: 9, k: 'mos.3', t: 'blad' },
        { x: 36, y: 17, b: 4, h: 11, k: 'blad.3', t: 'blad' }, { x: 29, y: 24, b: 7, h: 4, k: 'nacht.3', r: 1 },
        { x: 0, y: 7, b: 44, h: 3, k: 'nacht.1', vlak: true },
        { x: 0, y: 9, b: 44, h: 1, k: 'titel.1', laag: 'voor', vlak: true }, { x: 0, y: 30, b: 44, h: 1, k: 'titel.1', laag: 'voor', vlak: true },
        { x: 0, y: 9, b: 1, h: 22, k: 'titel.1', laag: 'voor', vlak: true }, { x: 43, y: 9, b: 1, h: 22, k: 'titel.1', laag: 'voor', vlak: true },
        { x: 3, y: 12, b: 1, h: 6, k: 'creme.4', laag: 'voor', a: 0.6, vlak: true }, { x: 5, y: 12, b: 1, h: 3, k: 'creme.4', laag: 'voor', a: 0.6, vlak: true },
        { x: 32, y: 13, b: 1, h: 1, k: 'creme.4', laag: 'voor', vlak: true }, { x: 33, y: 16, b: 1, h: 1, k: 'creme.4', laag: 'voor', vlak: true },
      ],
      licht: [{ x: 22, y: 12, r: 18 }],
      plekken: { water: { glas: [1, 10, 42, 21], lijn: [20, 27], bereik: [9, 35] } },
    },
    // Terrarium: 60 x 120 cm (Jemenkameleon), zwarte stalen lijst, kurken achterwand, op een lage voet.
    terrarium: {
      naam: 'Terrarium', op: 'vloer', hoort: ['slaapkamer', 'slaaphoek', 'logeerkamer', 'werkkamer', 'woonkamer', 'woonkeuken'], prioriteit: 9,
      placeholder: true, sprite: null, maat: [28, 57],
      delen: [
        { x: 0, y: 53, b: 28, h: 4, k: 'eik.2', t: 'hout' },
        { x: 1, y: 2, b: 26, h: 51, k: 'eik.2', t: 'riet' },
        { x: 3, y: 6, b: 6, h: 20, k: 'blad.2', t: 'blad', r: 2 }, { x: 19, y: 30, b: 7, h: 18, k: 'blad.3', t: 'blad', r: 2 },
        { x: 1, y: 46, b: 26, h: 7, k: 'mos.2', t: 'grind' },
        { x: 16, y: 26, b: 2, h: 22, k: 'koffie.3', t: 'houtv' },
        { x: 2, y: 26, b: 16, h: 2, k: 'koffie.3', t: 'hout' },
        { x: 0, y: 0, b: 28, h: 2, k: 'nacht.1', laag: 'voor', vlak: true },
        { x: 0, y: 0, b: 1, h: 53, k: 'titel.1', laag: 'voor', vlak: true }, { x: 27, y: 0, b: 1, h: 53, k: 'titel.1', laag: 'voor', vlak: true },
        { x: 13, y: 2, b: 1, h: 51, k: 'titel.1', laag: 'voor', a: 0.5, vlak: true },
        { x: 3, y: 4, b: 1, h: 8, k: 'creme.4', laag: 'voor', a: 0.55, vlak: true }, { x: 5, y: 4, b: 1, h: 4, k: 'creme.4', laag: 'voor', a: 0.55, vlak: true },
      ],
      licht: [{ x: 14, y: 4, r: 16 }],
      plekken: {
        tak: { glas: [1, 2, 26, 51], lijn: [26, 26], bereik: [9, 9] },
        bodem: { glas: [1, 2, 26, 51], lijn: [48, 48], bereik: [6, 18] },
      },
    },
    // Vogelstandaard: 120 cm hoog, messing stang, stok van 30 cm, voerbakje.
    stokje: {
      naam: 'Vogelstokje', op: 'vloer', hoort: ['woonkamer', 'woonkeuken', 'werkkamer'], prioriteit: 8,
      placeholder: true, sprite: null, maat: [14, 53],
      delen: [
        { x: 6, y: 4, b: 2, h: 46, k: 'goud.2', t: 'metaal', vlak: true },
        { x: 1, y: 50, b: 12, h: 3, k: 'koffie.3', r: 1 },
        { x: 9, y: 24, b: 5, h: 3, k: 'creme.3', r: 1 }, { x: 10, y: 23, b: 3, h: 1, k: 'goud.3', vlak: true },
        { x: 0, y: 3, b: 14, h: 2, k: 'eik.3', t: 'hout' },
      ],
      plekken: { stok: { glas: null, lijn: [3, 3], bereik: [7, 7] } },
    },
    // Tweepersoonsbed: 217 cm lang inclusief gestoffeerd hoofdbord van 100 cm; matras op 55 cm.
    bed: {
      naam: 'Bed', op: 'vloer', hoort: ['master', 'slaapkamer', 'slaaphoek'], prioriteit: 7, placeholder: true, sprite: null, maat: [96, 44],
      delen: [
        { x: 15, y: 40, b: 3, h: 4, k: 'eik.1', vlak: true }, { x: 89, y: 40, b: 3, h: 4, k: 'eik.1', vlak: true },
        { x: 11, y: 31, b: 85, h: 10, k: 'eik.3', t: 'hout', r: 1 },
        { x: 0, y: 6, b: 15, h: 38, k: 'eik.3', t: 'houtv', r: 2 },
        { x: 2, y: 9, b: 11, h: 22, k: 'petrol.3', t: 'stof', r: 2 },
        { x: 5, y: 11, b: 1, h: 18, k: 'petrol.2', vlak: true }, { x: 9, y: 11, b: 1, h: 18, k: 'petrol.2', vlak: true },
        { x: 13, y: 24, b: 82, h: 8, k: 'creme.3', r: 1 },
        { x: 30, y: 18, b: 65, h: 14, k: 'creme.4', t: 'stof', r: 2 },
        { x: 31, y: 22, b: 63, h: 1, k: 'creme.2', vlak: true },
        { x: 70, y: 17, b: 25, h: 16, k: 'abrikoos.3', t: 'stof', r: 1 }, { x: 70, y: 29, b: 25, h: 1, k: 'abrikoos.2', vlak: true },
        { x: 13, y: 13, b: 17, h: 12, k: 'creme.4', r: 2, t: 'stof' }, { x: 19, y: 12, b: 13, h: 11, k: 'lavendel.3', r: 2, t: 'stof' },
      ],
    },
    // Nachtkastje: 45 x 50 cm, met een keramisch lampje van 40 cm.
    nachtkastje: {
      naam: 'Nachtkastje', op: 'vloer', hoort: ['master', 'slaapkamer', 'logeerkamer'], prioriteit: 3, placeholder: true, sprite: null, maat: [20, 22],
      delen: [
        { x: 1, y: 19, b: 2, h: 3, k: 'eik.1', vlak: true }, { x: 17, y: 19, b: 2, h: 3, k: 'eik.1', vlak: true },
        { x: 0, y: 2, b: 20, h: 18, k: 'eik.3', t: 'hout', r: 1 },
        { x: 2, y: 5, b: 16, h: 6, k: 'eik.3', rand: 'eik.1' }, { x: 9, y: 7, b: 2, h: 1, k: 'goud.3', vlak: true },
        { x: 3, y: -2, b: 6, h: 2, k: 'bordeaux.2', vlak: true },
        { x: 11, y: -9, b: 6, h: 9, k: 'creme.2', vorm: 'ovaal' },
        { x: 9, y: -18, b: 10, h: 9, k: 'papier.3', vorm: 'kap', licht: 'kap' },
      ],
      licht: [{ x: 14, y: -12, r: 20 }],
    },
    // Kledingkast: 100 x 200 cm, twee eiken deuren met paneel, messing knoppen, kroonlijst.
    kast: {
      naam: 'Kledingkast', op: 'vloer', hoort: ['slaapkamer', 'slaaphoek', 'logeerkamer', 'master'], prioriteit: 4, placeholder: true, sprite: null, maat: [44, 88],
      delen: [
        { x: 2, y: 84, b: 3, h: 4, k: 'eik.1', vlak: true }, { x: 39, y: 84, b: 3, h: 4, k: 'eik.1', vlak: true },
        { x: 1, y: 3, b: 42, h: 82, k: 'eik.3', t: 'houtv' },
        { x: 0, y: 0, b: 44, h: 4, k: 'eik.3', t: 'hout' },
        { x: 4, y: 7, b: 17, h: 74, k: 'eik.3', rand: 'eik.2', t: 'houtv' }, { x: 23, y: 7, b: 17, h: 74, k: 'eik.3', rand: 'eik.2', t: 'houtv' },
        { x: 18, y: 40, b: 2, h: 3, k: 'goud.3', vlak: true }, { x: 24, y: 40, b: 2, h: 3, k: 'goud.3', vlak: true },
        { x: 6, y: -6, b: 12, h: 6, k: 'creme.3', r: 1 }, { x: 26, y: -9, b: 8, h: 9, k: 'koraal.3', t: 'riet', r: 1 },
      ],
    },
    // Inloopkast: open eiken kast van 180 x 220 cm met hangende kleding, planken, schoenen en een ledstrip.
    inloopkast: {
      naam: 'Inloopkast', op: 'vloer', hoort: ['master'], prioriteit: 4, placeholder: true, sprite: null, maat: [80, 96],
      delen: [
        { x: 0, y: 0, b: 80, h: 96, k: 'eik.3', t: 'houtv' },
        { x: 3, y: 4, b: 48, h: 88, k: 'eik.1', vlak: true }, { x: 54, y: 4, b: 23, h: 88, k: 'eik.1', vlak: true },
        { x: 3, y: 4, b: 48, h: 1, k: 'goud.4', vlak: true, licht: 'kap' },
        { x: 3, y: 10, b: 48, h: 1, k: 'nacht.3', vlak: true },
        { x: 5, y: 11, b: 5, h: 30, k: 'creme.4', t: 'stof' }, { x: 10, y: 11, b: 5, h: 34, k: 'petrol.2', t: 'stof' },
        { x: 15, y: 11, b: 5, h: 28, k: 'bordeaux.2', t: 'stof' }, { x: 20, y: 11, b: 5, h: 36, k: 'nacht.3', t: 'stof' },
        { x: 25, y: 11, b: 5, h: 26, k: 'abrikoos.3', t: 'stof' }, { x: 30, y: 11, b: 5, h: 32, k: 'creme.2', t: 'stof' },
        { x: 35, y: 11, b: 5, h: 30, k: 'lavendel.3', t: 'stof' }, { x: 40, y: 11, b: 6, h: 38, k: 'koffie.3', t: 'stof' },
        { x: 3, y: 56, b: 48, h: 2, k: 'eik.3', vlak: true }, { x: 3, y: 74, b: 48, h: 2, k: 'eik.3', vlak: true },
        { x: 6, y: 48, b: 14, h: 8, k: 'creme.3', t: 'stof' }, { x: 22, y: 50, b: 12, h: 6, k: 'petrol.3', t: 'stof' }, { x: 36, y: 49, b: 12, h: 7, k: 'nacht.4', t: 'stof' },
        { x: 6, y: 68, b: 10, h: 6, k: 'koffie.3', r: 1 }, { x: 18, y: 69, b: 10, h: 5, k: 'creme.4', r: 1 }, { x: 31, y: 66, b: 14, h: 8, k: 'eik.2', r: 1, t: 'riet' },
        { x: 6, y: 86, b: 9, h: 5, k: 'koraal.2', r: 1 }, { x: 17, y: 86, b: 9, h: 5, k: 'nacht.2', r: 1 }, { x: 30, y: 85, b: 10, h: 6, k: 'creme.3', r: 1 },
        { x: 54, y: 30, b: 23, h: 2, k: 'eik.3', vlak: true }, { x: 54, y: 58, b: 23, h: 2, k: 'eik.3', vlak: true },
        { x: 56, y: 22, b: 9, h: 8, k: 'creme.2', r: 1 }, { x: 66, y: 24, b: 9, h: 6, k: 'bordeaux.3', r: 1 },
        { x: 56, y: 50, b: 18, h: 8, k: 'petrol.3', t: 'stof' }, { x: 57, y: 76, b: 6, h: 16, k: 'koffie.3', r: 1 }, { x: 65, y: 80, b: 9, h: 12, k: 'eik.2', t: 'riet', r: 1 },
      ],
      licht: [{ x: 26, y: 8, r: 22 }],
    },
    wasmand: {
      naam: 'Wasmand', op: 'vloer', hoort: ['slaapkamer', 'slaaphoek', 'master', 'badkamer', 'ensuite'], prioriteit: 4, placeholder: true, sprite: null, maat: [24, 20],
      delen: [
        { x: 4, y: -3, b: 8, h: 5, k: 'petrol.3', r: 1 }, { x: 11, y: -2, b: 8, h: 4, k: 'creme.4', r: 1 },
        { x: 1, y: 2, b: 22, h: 18, k: 'hazelnoot.3', t: 'riet', r: 1 },
        { x: 0, y: 1, b: 24, h: 3, k: 'hazelnoot.3', r: 1 }, { x: 9, y: 8, b: 6, h: 2, k: 'hazelnoot.1', vlak: true },
      ],
    },
    // Designbank: 200 x 78 cm, boucléstof op zwarte pootjes, met sierkussens en een plaid.
    bank: {
      naam: 'Bank', op: 'vloer', hoort: ['woonkamer', 'woonkeuken'], prioriteit: 5, placeholder: true, sprite: null, maat: [88, 34],
      delen: [
        { x: 6, y: 31, b: 3, h: 3, k: 'nacht.1', vlak: true }, { x: 79, y: 31, b: 3, h: 3, k: 'nacht.1', vlak: true },
        { x: 0, y: 21, b: 88, h: 11, k: 'creme.2', t: 'stof', r: 2 },
        { x: 10, y: 3, b: 35, h: 17, k: 'creme.3', t: 'stof', r: 3 }, { x: 44, y: 3, b: 35, h: 17, k: 'creme.3', t: 'stof', r: 3 },
        { x: 10, y: 17, b: 35, h: 7, k: 'creme.3', t: 'stof', r: 2 }, { x: 44, y: 17, b: 35, h: 7, k: 'creme.3', t: 'stof', r: 2 },
        { x: 0, y: 11, b: 11, h: 21, k: 'creme.2', t: 'stof', r: 3 }, { x: 77, y: 11, b: 11, h: 21, k: 'creme.2', t: 'stof', r: 3 },
        { x: 13, y: 8, b: 12, h: 11, k: 'petrol.3', t: 'stof', r: 2 }, { x: 23, y: 10, b: 10, h: 9, k: 'goud.3', t: 'stof', r: 2 },
        { x: 63, y: 8, b: 12, h: 11, k: 'koraal.3', t: 'stof', r: 2 },
        { x: 52, y: 15, b: 9, h: 15, k: 'abrikoos.3', t: 'stof' }, { x: 52, y: 26, b: 9, h: 1, k: 'abrikoos.2', vlak: true },
      ],
    },
    // Salontafel: travertijn, 110 x 38 cm, op twee zuiltjes, met boeken en een vaasje; vloerkleed van 170 cm eronder.
    salontafel: {
      naam: 'Salontafel', op: 'vrij', voor: true, hoort: ['woonkamer', 'woonkeuken'], prioriteit: 2, placeholder: true, sprite: null, maat: [48, 16],
      delen: [
        { x: -14, y: 15, b: 76, h: 4, k: 'creme.2', t: 'stof', vlak: true },
        { x: -12, y: 16, b: 72, h: 1, k: 'koraal.3', vlak: true }, { x: -12, y: 18, b: 72, h: 1, k: 'petrol.3', vlak: true },
        { x: 6, y: 5, b: 12, h: 11, k: 'creme.1', t: 'stof', r: 1 }, { x: 30, y: 5, b: 12, h: 11, k: 'creme.1', t: 'stof', r: 1 },
        { x: 0, y: 1, b: 48, h: 5, k: 'creme.2', t: 'marmer', r: 1 },
        { x: 6, y: -3, b: 12, h: 2, k: 'bordeaux.2', vlak: true }, { x: 7, y: -5, b: 10, h: 2, k: 'petrol.3', vlak: true },
        { x: 34, y: -7, b: 5, h: 8, k: 'creme.4', vorm: 'ovaal' }, { x: 36, y: -13, b: 1, h: 6, k: 'mos.2', vlak: true }, { x: 34, y: -12, b: 2, h: 2, k: 'abrikoos.3', vlak: true },
      ],
    },
    // Vloerlamp: 155 cm, messing stang op een marmeren voet, linnen kap.
    lamp: {
      naam: 'Vloerlamp', op: 'vloer', hoort: ['woonkamer', 'woonkeuken', 'slaapkamer', 'werkkamer', 'logeerkamer', 'master'], prioriteit: 2,
      placeholder: true, sprite: null, maat: [20, 68],
      delen: [
        { x: 9, y: 14, b: 2, h: 52, k: 'goud.2', t: 'metaal', vlak: true },
        { x: 4, y: 65, b: 12, h: 3, k: 'creme.2', t: 'marmer', r: 1 },
        { x: 0, y: 0, b: 20, h: 15, k: 'papier.3', vorm: 'kap', t: 'stof', licht: 'kap' },
      ],
      licht: [{ x: 10, y: 14, r: 34 }],
    },
    // Zwevende eiken wandplank van 90 cm met een vaasje.
    plank: {
      naam: 'Wandplank', op: 'muur', hoort: ['woonkamer', 'woonkeuken', 'keuken', 'werkkamer'], prioriteit: 1,
      placeholder: true, sprite: null, maat: [40, 8],
      delen: [
        { x: 0, y: 4, b: 40, h: 4, k: 'eik.3', t: 'hout' },
        { x: 33, y: -3, b: 5, h: 7, k: 'creme.4', vorm: 'ovaal' }, { x: 35, y: -8, b: 1, h: 5, k: 'mos.2', vlak: true },
      ],
    },
    // Wandkunst: abstract doek van 100 x 72 cm in een smalle eiken lijst.
    kunst: {
      naam: 'Wandkunst', op: 'muur', hoort: ['woonkamer', 'woonkeuken', 'keuken', 'werkkamer', 'master', 'slaapkamer', 'logeerkamer'], prioriteit: 1,
      placeholder: true, sprite: null, maat: [44, 32],
      delen: [
        { x: 0, y: 0, b: 44, h: 32, k: 'eik.3', vlak: true },
        { x: 2, y: 2, b: 40, h: 28, k: 'creme.4', vlak: true },
        { x: 5, y: 5, b: 34, h: 22, k: 'papier.3', vlak: true },
        { x: 5, y: 15, b: 18, h: 12, k: 'koraal.3', vorm: 'boog' }, { x: 20, y: 9, b: 14, h: 18, k: 'abrikoos.3', vorm: 'boog' },
        { x: 26, y: 18, b: 13, h: 9, k: 'petrol.3' }, { x: 9, y: 7, b: 6, h: 6, k: 'goud.3', vorm: 'ovaal' },
      ],
    },
    // Kamerplant: ficus van 125 cm met een volle kruin in een betonnen pot van 40 cm.
    kamerplant: {
      naam: 'Kamerplant', op: 'vloer', hoort: ['woonkamer', 'woonkeuken', 'werkkamer', 'logeerkamer', 'master', 'keuken', 'terras'], prioriteit: 1,
      placeholder: true, sprite: null, maat: [26, 56],
      delen: [
        { x: 12, y: 18, b: 2, h: 24, k: 'koffie.3', vlak: true }, { x: 9, y: 22, b: 3, h: 1, k: 'koffie.3', vlak: true }, { x: 14, y: 26, b: 3, h: 1, k: 'koffie.3', vlak: true },
        { x: 1, y: 12, b: 11, h: 11, k: 'blad.2', t: 'blad', vorm: 'ovaal' }, { x: 13, y: 10, b: 12, h: 12, k: 'blad.2', t: 'blad', vorm: 'ovaal' },
        { x: 6, y: 1, b: 12, h: 12, k: 'blad.3', t: 'blad', vorm: 'ovaal' }, { x: 4, y: 19, b: 9, h: 8, k: 'mos.2', t: 'blad', vorm: 'ovaal' },
        { x: 15, y: 20, b: 9, h: 8, k: 'blad.2', t: 'blad', vorm: 'ovaal' }, { x: 9, y: 9, b: 9, h: 9, k: 'blad.3', t: 'blad', vorm: 'ovaal' },
        { x: 3, y: 6, b: 6, h: 6, k: 'blad.3', vorm: 'ovaal' }, { x: 17, y: 5, b: 6, h: 6, k: 'mos.3', vorm: 'ovaal' },
        { x: 6, y: 40, b: 14, h: 16, k: 'nacht.3', t: 'stuc', r: 2 }, { x: 5, y: 39, b: 16, h: 3, k: 'nacht.3', r: 1 },
      ],
    },
    // Keukenwand: 217 x 90 cm, kasten met messing grepen, marmeren blad, kraan, oven; daarboven tegeltjes,
    // een open eiken plank met potjes en een afzuigkap met schouw tot het plafond.
    keukenblok: {
      naam: 'Keukenblok', op: 'vloer', hoort: ['keuken', 'woonkeuken'], prioriteit: 7, placeholder: true, sprite: null, maat: [96, 40],
      delen: [
        { x: 0, y: -30, b: 96, h: 32, k: 'creme.3', t: 'tegel', vlak: true },
        { x: 50, y: -46, b: 46, h: 3, k: 'eik.3', t: 'hout' },
        { x: 53, y: -54, b: 6, h: 8, k: 'creme.4', a: 0.85, r: 1 }, { x: 54, y: -51, b: 4, h: 4, k: 'abrikoos.3', vlak: true },
        { x: 61, y: -55, b: 6, h: 9, k: 'creme.4', a: 0.85, r: 1 }, { x: 62, y: -51, b: 4, h: 5, k: 'mos.3', vlak: true },
        { x: 69, y: -53, b: 7, h: 7, k: 'creme.4', a: 0.85, r: 1 }, { x: 70, y: -50, b: 5, h: 4, k: 'koffie.3', vlak: true },
        { x: 80, y: -52, b: 12, h: 6, k: 'petrol.3', r: 2 }, { x: 81, y: -56, b: 10, h: 4, k: 'creme.4', r: 1 },
        { x: 16, y: -94, b: 14, h: 46, k: 'creme.3', t: 'stuc' },
        { x: 6, y: -50, b: 34, h: 9, k: 'creme.3', vorm: 'kap' }, { x: 6, y: -42, b: 34, h: 2, k: 'nacht.2', vlak: true },
        { x: 0, y: 37, b: 96, h: 3, k: 'nacht.1', vlak: true },
        { x: 0, y: 6, b: 96, h: 32, k: 'petrol.2', t: 'houtv' },
        { x: 2, y: 9, b: 22, h: 8, k: 'petrol.2', rand: 'petrol.1' },
        { x: 2, y: 18, b: 22, h: 17, k: 'nacht.1', r: 1 }, { x: 5, y: 21, b: 16, h: 9, k: 'titel.3', vlak: true }, { x: 4, y: 19, b: 18, h: 1, k: 'goud.3', vlak: true },
        { x: 26, y: 9, b: 22, h: 26, k: 'petrol.2', rand: 'petrol.1' }, { x: 50, y: 9, b: 22, h: 26, k: 'petrol.2', rand: 'petrol.1' },
        { x: 74, y: 9, b: 20, h: 26, k: 'petrol.2', rand: 'petrol.1' },
        { x: 11, y: 12, b: 4, h: 1, k: 'goud.3', vlak: true }, { x: 44, y: 18, b: 2, h: 5, k: 'goud.3', vlak: true },
        { x: 52, y: 18, b: 2, h: 5, k: 'goud.3', vlak: true }, { x: 76, y: 18, b: 2, h: 5, k: 'goud.3', vlak: true },
        { x: -1, y: 2, b: 98, h: 5, k: 'creme.3', t: 'marmer' },
        { x: 78, y: -9, b: 2, h: 11, k: 'goud.2', t: 'metaal', vlak: true }, { x: 72, y: -9, b: 8, h: 2, k: 'goud.2', vlak: true },
        { x: 8, y: -2, b: 12, h: 4, k: 'nacht.1', r: 1 }, { x: 24, y: -4, b: 8, h: 6, k: 'koffie.2', r: 1 }, { x: 86, y: -3, b: 8, h: 5, k: 'eik.3', t: 'hout', r: 1 },
      ],
      licht: [{ x: 23, y: -40, r: 18 }],
    },
    // Kookeiland: 200 x 90 cm, eiken lamellenfront, marmeren blad, twee krukken (zit 65 cm) en twee messing
    // hanglampen 75 cm boven het blad, aan een snoer tot het plafond.
    kookeiland: {
      naam: 'Kookeiland', op: 'vrij', voor: true, hoort: ['keuken'], prioriteit: 6, placeholder: true, sprite: null, maat: [88, 40],
      delen: [
        { x: 24, y: -87, b: 1, h: 45, k: 'nacht.1', vlak: true }, { x: 62, y: -87, b: 1, h: 45, k: 'nacht.1', vlak: true },
        { x: 18, y: -44, b: 13, h: 9, k: 'goud.2', vorm: 'kap', t: 'metaal', licht: 'kap' },
        { x: 56, y: -44, b: 13, h: 9, k: 'goud.2', vorm: 'kap', t: 'metaal', licht: 'kap' },
        { x: 3, y: 4, b: 82, h: 33, k: 'eik.3', t: 'lamel' },
        { x: 3, y: 37, b: 82, h: 3, k: 'nacht.1', vlak: true },
        { x: 0, y: 0, b: 88, h: 5, k: 'creme.3', t: 'marmer' },
        { x: 30, y: -7, b: 10, h: 7, k: 'creme.4', vorm: 'ovaal' }, { x: 31, y: -8, b: 3, h: 3, k: 'koraal.2', vorm: 'ovaal' }, { x: 35, y: -8, b: 3, h: 3, k: 'goud.3', vorm: 'ovaal' },
        { x: 64, y: -10, b: 4, h: 10, k: 'creme.4', a: 0.8, r: 1 }, { x: 65, y: -6, b: 2, h: 5, k: 'bordeaux.2', vlak: true },
        { x: 10, y: 14, b: 16, h: 4, k: 'koffie.3', t: 'stof', r: 1 }, { x: 12, y: 18, b: 1, h: 22, k: 'nacht.1', vlak: true }, { x: 23, y: 18, b: 1, h: 22, k: 'nacht.1', vlak: true },
        { x: 12, y: 30, b: 12, h: 1, k: 'nacht.1', vlak: true },
        { x: 56, y: 14, b: 16, h: 4, k: 'koffie.3', t: 'stof', r: 1 }, { x: 58, y: 18, b: 1, h: 22, k: 'nacht.1', vlak: true }, { x: 69, y: 18, b: 1, h: 22, k: 'nacht.1', vlak: true },
        { x: 58, y: 30, b: 12, h: 1, k: 'nacht.1', vlak: true },
      ],
      licht: [{ x: 24, y: -36, r: 26 }, { x: 62, y: -36, r: 26 }],
    },
    // Eettafel: eiken blad van 180 cm op 75 cm hoogte, met twee stoelen (zitting 45 cm, rug 85 cm),
    // een vaas met takken en een hanglamp erboven.
    tafel: {
      naam: 'Eettafel', op: 'vloer', hoort: ['keuken', 'woonkeuken', 'woonkamer'], prioriteit: 4, placeholder: true, sprite: null, maat: [104, 38],
      delen: [
        { x: 52, y: -86, b: 1, h: 52, k: 'nacht.1', vlak: true },
        { x: 42, y: -36, b: 22, h: 8, k: 'creme.3', vorm: 'kap', licht: 'kap' },
        { x: 20, y: 9, b: 3, h: 29, k: 'eik.2', t: 'houtv', vlak: true }, { x: 81, y: 9, b: 3, h: 29, k: 'eik.2', t: 'houtv', vlak: true },
        { x: 16, y: 5, b: 72, h: 4, k: 'eik.3', t: 'hout' },
        { x: 46, y: -8, b: 8, h: 13, k: 'creme.4', vorm: 'ovaal' }, { x: 44, y: -20, b: 1, h: 12, k: 'mos.1', vlak: true },
        { x: 50, y: -24, b: 1, h: 16, k: 'mos.1', vlak: true }, { x: 41, y: -22, b: 4, h: 3, k: 'blad.3', vlak: true }, { x: 51, y: -25, b: 4, h: 3, k: 'blad.2', vlak: true },
        { x: 66, y: 1, b: 12, h: 4, k: 'creme.4', vorm: 'ovaal' }, { x: 68, y: 0, b: 3, h: 3, k: 'koraal.2', vorm: 'ovaal' }, { x: 71, y: -1, b: 3, h: 3, k: 'goud.2', vorm: 'ovaal' },
        { x: 1, y: 0, b: 3, h: 38, k: 'koffie.3', t: 'houtv' }, { x: 1, y: 17, b: 16, h: 4, k: 'creme.2', t: 'stof', r: 1 },
        { x: 14, y: 21, b: 2, h: 17, k: 'koffie.3', vlak: true }, { x: 2, y: 4, b: 2, h: 10, k: 'koffie.2', t: 'riet', vlak: true },
        { x: 100, y: 0, b: 3, h: 38, k: 'koffie.3', t: 'houtv' }, { x: 87, y: 17, b: 16, h: 4, k: 'creme.2', t: 'stof', r: 1 },
        { x: 88, y: 21, b: 2, h: 17, k: 'koffie.3', vlak: true },
      ],
      licht: [{ x: 53, y: -28, r: 30 }],
    },
    mand: {
      naam: 'Petmand', op: 'vloer', hoort: ['woonkamer', 'woonkeuken', 'keuken'], prioriteit: 3, placeholder: true, sprite: null, maat: [32, 12],
      delen: [
        { x: 0, y: 3, b: 32, h: 9, k: 'hazelnoot.3', t: 'riet', r: 2 },
        { x: 3, y: 1, b: 26, h: 4, k: 'creme.3', t: 'stof', r: 2 }, { x: 20, y: 0, b: 7, h: 3, k: 'koraal.3', t: 'stof', r: 1 },
      ],
    },
    // Vrijstaand bad: 170 x 67 cm, mat zwart buiten, wit binnen, op messing pootjes; staande kraan; handdoek.
    bad: {
      naam: 'Bad', op: 'vloer', hoort: ['badkamer'], prioriteit: 6, placeholder: true, sprite: null, maat: [76, 30],
      delen: [
        { x: 7, y: 25, b: 4, h: 5, k: 'goud.2', r: 1 }, { x: 64, y: 25, b: 4, h: 5, k: 'goud.2', r: 1 },
        { x: 0, y: 4, b: 74, h: 23, k: 'nacht.2', vorm: 'ovaal' },
        { x: 1, y: 3, b: 72, h: 4, k: 'creme.4', r: 2 },
        { x: 9, y: 4, b: 9, h: 15, k: 'koraal.3', t: 'stof' }, { x: 9, y: 16, b: 9, h: 1, k: 'koraal.2', vlak: true },
        { x: 74, y: -6, b: 2, h: 36, k: 'goud.2', t: 'metaal', vlak: true }, { x: 66, y: -6, b: 9, h: 2, k: 'goud.2', vlak: true },
        { x: 30, y: 0, b: 14, h: 3, k: 'eik.3', t: 'hout' }, { x: 33, y: -3, b: 3, h: 3, k: 'creme.4', vlak: true }, { x: 38, y: -4, b: 3, h: 4, k: 'blad.3', vlak: true },
      ],
    },
    // Wastafelmeubel: 70 cm breed, 88 cm hoog, eiken kastje, keramische kom, messing kraan, ronde spiegel erboven.
    wastafel: {
      naam: 'Wastafel', op: 'vloer', hoort: ['badkamer', 'ensuite'], prioriteit: 5, placeholder: true, sprite: null, maat: [32, 40],
      delen: [
        { x: 3, y: -50, b: 26, h: 32, k: 'goud.2', vorm: 'ovaal' }, { x: 5, y: -48, b: 22, h: 28, k: 'petrol.4', vorm: 'ovaal', t: 'spiegel' },
        { x: 2, y: 37, b: 2, h: 3, k: 'eik.1', vlak: true }, { x: 28, y: 37, b: 2, h: 3, k: 'eik.1', vlak: true },
        { x: 0, y: 11, b: 32, h: 27, k: 'eik.3', t: 'houtv' }, { x: 2, y: 14, b: 28, h: 21, k: 'eik.3', rand: 'eik.2' },
        { x: 15, y: 22, b: 2, h: 4, k: 'goud.3', vlak: true },
        { x: 0, y: 8, b: 32, h: 4, k: 'creme.3', t: 'marmer' },
        { x: 7, y: 3, b: 18, h: 6, k: 'creme.4', vorm: 'ovaal' },
        { x: 21, y: -4, b: 2, h: 8, k: 'goud.2', vlak: true }, { x: 17, y: -4, b: 5, h: 2, k: 'goud.2', vlak: true },
        { x: 2, y: 3, b: 3, h: 5, k: 'blad.3', r: 1 },
      ],
    },
    // Inloopdouche: 120 x 210 cm, glazen wand in een zwart stalen profiel, regendouche, nis met flesjes.
    douche: {
      naam: 'Inloopdouche', op: 'vloer', hoort: ['ensuite', 'badkamer'], prioriteit: 5, placeholder: true, sprite: null, maat: [54, 96],
      delen: [
        { x: 0, y: 92, b: 54, h: 4, k: 'nacht.3', t: 'tegel', vlak: true }, { x: 10, y: 94, b: 30, h: 1, k: 'nacht.1', vlak: true },
        { x: 26, y: -24, b: 2, h: 14, k: 'nacht.1', vlak: true }, { x: 18, y: -10, b: 18, h: 3, k: 'nacht.1', r: 1 },
        { x: 20, y: -7, b: 1, h: 1, k: 'creme.4', vlak: true }, { x: 24, y: -7, b: 1, h: 1, k: 'creme.4', vlak: true }, { x: 29, y: -7, b: 1, h: 1, k: 'creme.4', vlak: true },
        { x: 40, y: 40, b: 2, h: 14, k: 'nacht.1', vlak: true }, { x: 38, y: 46, b: 8, h: 3, k: 'nacht.1', r: 1 },
        { x: 6, y: 30, b: 22, h: 12, k: 'creme.1', vlak: true },
        { x: 8, y: 33, b: 4, h: 9, k: 'creme.4', r: 1 }, { x: 13, y: 34, b: 4, h: 8, k: 'petrol.3', r: 1 }, { x: 18, y: 35, b: 4, h: 7, k: 'abrikoos.3', r: 1 },
        { x: 52, y: -2, b: 2, h: 94, k: 'titel.2', laag: 'voor', vlak: true }, { x: 2, y: -2, b: 52, h: 2, k: 'titel.2', laag: 'voor', vlak: true },
        { x: 2, y: 0, b: 50, h: 92, k: 'petrol.4', t: 'glas', laag: 'voor', a: 0.22, vlak: true },
      ],
    },
    // Dubbele wastafel: zwevend eiken meubel van 140 cm, natuurstenen blad, twee kommen en zwarte kranen,
    // brede spiegel met ledverlichting.
    dubbelewastafel: {
      naam: 'Dubbele wastafel', op: 'vloer', hoort: ['ensuite', 'badkamer'], prioriteit: 5, placeholder: true, sprite: null, maat: [64, 40],
      delen: [
        { x: 2, y: -52, b: 60, h: 34, k: 'titel.2', r: 1 }, { x: 4, y: -50, b: 56, h: 30, k: 'petrol.4', t: 'spiegel', vlak: true },
        { x: 2, y: -53, b: 60, h: 1, k: 'goud.4', vlak: true, licht: 'kap' },
        { x: 0, y: 12, b: 64, h: 16, k: 'eik.3', t: 'lamel' }, { x: 0, y: 8, b: 64, h: 5, k: 'creme.2', t: 'marmer' },
        { x: 8, y: 3, b: 16, h: 6, k: 'creme.4', vorm: 'ovaal' }, { x: 40, y: 3, b: 16, h: 6, k: 'creme.4', vorm: 'ovaal' },
        { x: 19, y: -5, b: 2, h: 9, k: 'nacht.1', vlak: true }, { x: 15, y: -5, b: 5, h: 2, k: 'nacht.1', vlak: true },
        { x: 51, y: -5, b: 2, h: 9, k: 'nacht.1', vlak: true }, { x: 47, y: -5, b: 5, h: 2, k: 'nacht.1', vlak: true },
        { x: 28, y: 1, b: 8, h: 7, k: 'blad.3', t: 'blad', vorm: 'ovaal' }, { x: 29, y: 5, b: 6, h: 4, k: 'creme.1', r: 1 },
        { x: 0, y: 30, b: 10, h: 2, k: 'nacht.1', vlak: true }, { x: 2, y: 28, b: 6, h: 9, k: 'creme.4', t: 'stof' },
      ],
      licht: [{ x: 32, y: -36, r: 26 }],
    },
    // Bureau: eiken blad van 125 cm op 76 cm, zwart stalen onderstel, scherm, bureaulamp en een stoel ervoor.
    bureau: {
      naam: 'Bureau', op: 'vloer', hoort: ['werkkamer', 'woonkamer'], prioriteit: 3, placeholder: true, sprite: null, maat: [56, 34],
      delen: [
        { x: 2, y: 4, b: 2, h: 30, k: 'nacht.1', vlak: true }, { x: 52, y: 4, b: 2, h: 30, k: 'nacht.1', vlak: true },
        { x: 0, y: 1, b: 56, h: 4, k: 'eik.3', t: 'hout' },
        { x: 18, y: -17, b: 22, h: 14, k: 'titel.2', r: 1 }, { x: 20, y: -15, b: 18, h: 10, k: 'petrol.2', t: 'spiegel', vlak: true },
        { x: 28, y: -3, b: 2, h: 4, k: 'titel.2', vlak: true }, { x: 24, y: 0, b: 10, h: 1, k: 'titel.2', vlak: true },
        { x: 46, y: -14, b: 1, h: 14, k: 'nacht.1', vlak: true }, { x: 44, y: -16, b: 7, h: 4, k: 'nacht.1', vorm: 'kap', licht: 'kap' },
        { x: 4, y: -3, b: 9, h: 3, k: 'bordeaux.2', vlak: true }, { x: 5, y: -5, b: 7, h: 2, k: 'creme.3', vlak: true },
        { x: 20, y: 10, b: 3, h: 18, k: 'nacht.2', r: 1 }, { x: 18, y: 18, b: 18, h: 4, k: 'nacht.2', t: 'stof', r: 1 },
        { x: 26, y: 22, b: 2, h: 9, k: 'nacht.1', vlak: true }, { x: 20, y: 31, b: 14, h: 2, k: 'nacht.1', vlak: true },
      ],
      licht: [{ x: 47, y: -11, r: 20 }],
    },
    // Boekenkast: 90 x 180 cm, eiken, gevuld met boeken, een vaasje en een plantje.
    boekenkast: {
      naam: 'Boekenkast', op: 'vloer', hoort: ['werkkamer', 'woonkamer', 'logeerkamer'], prioriteit: 3, placeholder: true, sprite: null, maat: [40, 80],
      delen: [
        { x: 0, y: 0, b: 40, h: 80, k: 'eik.3', t: 'houtv' },
        { x: 3, y: 3, b: 34, h: 74, k: 'eik.1', vlak: true },
        { x: 3, y: 26, b: 34, h: 3, k: 'eik.3', t: 'hout' }, { x: 3, y: 51, b: 34, h: 3, k: 'eik.3', t: 'hout' },
        { x: 4, y: 12, b: 3, h: 14, k: 'bordeaux.2' }, { x: 7, y: 14, b: 3, h: 12, k: 'petrol.3' }, { x: 10, y: 11, b: 3, h: 15, k: 'goud.3' },
        { x: 13, y: 13, b: 2, h: 13, k: 'creme.3' }, { x: 15, y: 15, b: 3, h: 11, k: 'blad.3' }, { x: 28, y: 18, b: 6, h: 8, k: 'creme.4', vorm: 'ovaal' },
        { x: 4, y: 38, b: 3, h: 13, k: 'lavendel.2' }, { x: 7, y: 36, b: 3, h: 15, k: 'koffie.3' }, { x: 10, y: 39, b: 3, h: 12, k: 'koraal.3' },
        { x: 18, y: 45, b: 16, h: 3, k: 'petrol.2', vlak: true }, { x: 19, y: 42, b: 14, h: 3, k: 'abrikoos.3', vlak: true },
        { x: 5, y: 64, b: 12, h: 13, k: 'eik.2', t: 'riet', r: 1 }, { x: 20, y: 62, b: 3, h: 15, k: 'nacht.3' }, { x: 23, y: 63, b: 3, h: 14, k: 'bordeaux.3' },
        { x: 26, y: 61, b: 3, h: 16, k: 'creme.3' }, { x: 30, y: 64, b: 3, h: 13, k: 'petrol.3' },
        { x: 4, y: -9, b: 8, h: 9, k: 'blad.3', t: 'blad', vorm: 'ovaal' }, { x: 5, y: -3, b: 6, h: 3, k: 'creme.3', r: 1 },
      ],
    },
    // Oorfauteuil: 80 x 105 cm, cognacleer met een voetenbankje.
    leesstoel: {
      naam: 'Leesstoel', op: 'vloer', hoort: ['werkkamer', 'woonkamer', 'logeerkamer'], prioriteit: 2, placeholder: true, sprite: null, maat: [35, 46],
      delen: [
        { x: 5, y: 40, b: 2, h: 6, k: 'koffie.2', vlak: true }, { x: 28, y: 40, b: 2, h: 6, k: 'koffie.2', vlak: true },
        { x: 3, y: 0, b: 29, h: 32, k: 'eik.2', t: 'stof', vorm: 'boog' },
        { x: 0, y: 18, b: 8, h: 21, k: 'eik.2', t: 'stof', r: 2 }, { x: 27, y: 18, b: 8, h: 21, k: 'eik.2', t: 'stof', r: 2 },
        { x: 6, y: 26, b: 23, h: 8, k: 'eik.3', t: 'stof', r: 2 }, { x: 3, y: 33, b: 29, h: 8, k: 'eik.2', r: 1 },
        { x: 11, y: 12, b: 13, h: 11, k: 'creme.3', t: 'stof', r: 2 },
      ],
    },
    // Logeerbed: daybed van 200 x 55 cm met een eiken frame, kussens en een plaid.
    logeerbed: {
      naam: 'Logeerbed', op: 'vloer', hoort: ['logeerkamer', 'werkkamer', 'zolder'], prioriteit: 3, placeholder: true, sprite: null, maat: [88, 24],
      delen: [
        { x: 3, y: 20, b: 3, h: 4, k: 'eik.1', vlak: true }, { x: 82, y: 20, b: 3, h: 4, k: 'eik.1', vlak: true },
        { x: 0, y: 2, b: 5, h: 19, k: 'eik.3', t: 'houtv', r: 1 }, { x: 83, y: 2, b: 5, h: 19, k: 'eik.3', t: 'houtv', r: 1 },
        { x: 2, y: 13, b: 84, h: 8, k: 'eik.3', t: 'hout' },
        { x: 5, y: 8, b: 78, h: 6, k: 'creme.3', t: 'stof', r: 1 },
        { x: 7, y: 1, b: 15, h: 9, k: 'blad.3', t: 'stof', r: 2 }, { x: 20, y: 3, b: 13, h: 8, k: 'creme.4', t: 'stof', r: 2 },
        { x: 56, y: 6, b: 24, h: 9, k: 'abrikoos.3', t: 'stof' },
      ],
    },
    // Teakhouten tuinbank: 125 x 80 cm, met een zitkussen.
    tuinbank: {
      naam: 'Tuinbank', op: 'vloer', hoort: ['tuin', 'zwembad', 'terras'], prioriteit: 2, placeholder: true, sprite: null, maat: [56, 34],
      delen: [
        { x: 2, y: 2, b: 4, h: 32, k: 'eik.3', t: 'houtv' }, { x: 50, y: 2, b: 4, h: 32, k: 'eik.3', t: 'houtv' },
        { x: 4, y: 4, b: 48, h: 3, k: 'eik.3', t: 'hout' }, { x: 4, y: 9, b: 48, h: 3, k: 'eik.3', t: 'hout' },
        { x: 0, y: 18, b: 56, h: 4, k: 'eik.3', t: 'hout' }, { x: 2, y: 14, b: 52, h: 5, k: 'creme.3', t: 'stof', r: 1 },
        { x: 0, y: 12, b: 7, h: 3, k: 'eik.3', vlak: true }, { x: 49, y: 12, b: 7, h: 3, k: 'eik.3', vlak: true },
        { x: 8, y: 7, b: 10, h: 8, k: 'blad.3', t: 'stof', r: 2 },
      ],
    },
    // Plantenbak: cortenstaal, 70 x 45 cm, met lavendel en grassen.
    bloembak: {
      naam: 'Plantenbak', op: 'vloer', hoort: ['tuin', 'zwembad', 'balkon', 'terras'], prioriteit: 1, placeholder: true, sprite: null, maat: [32, 22],
      delen: [
        { x: 3, y: -2, b: 1, h: 10, k: 'mos.3', vlak: true }, { x: 8, y: -4, b: 1, h: 12, k: 'mos.2', vlak: true }, { x: 26, y: -3, b: 1, h: 11, k: 'mos.3', vlak: true },
        { x: 2, y: -3, b: 3, h: 3, k: 'lavendel.2', r: 1 }, { x: 7, y: -6, b: 3, h: 4, k: 'lavendel.3', r: 1 }, { x: 25, y: -5, b: 3, h: 4, k: 'lavendel.2', r: 1 },
        { x: 1, y: 2, b: 30, h: 8, k: 'blad.2', t: 'blad', r: 2 }, { x: 12, y: -1, b: 10, h: 6, k: 'koraal.3', t: 'blad', r: 2 },
        { x: 0, y: 8, b: 32, h: 14, k: 'koraal.1', t: 'metaal' }, { x: 0, y: 8, b: 32, h: 2, k: 'koraal.1', vlak: true },
      ],
    },
    // Tuinstoel: 55 x 85 cm, zwart stalen frame met touwvlechtwerk en een kussen (zit 45 cm).
    tuinstoel: {
      naam: 'Tuinstoel', op: 'vloer', hoort: ['balkon', 'terras', 'tuin', 'zwembad'], prioriteit: 2, placeholder: true, sprite: null, maat: [24, 38],
      delen: [
        { x: 2, y: 0, b: 3, h: 38, k: 'nacht.1', vlak: true }, { x: 21, y: 18, b: 2, h: 20, k: 'nacht.1', vlak: true },
        { x: 4, y: 1, b: 3, h: 18, k: 'creme.2', t: 'riet' },
        { x: 2, y: 17, b: 21, h: 3, k: 'nacht.1', vlak: true }, { x: 5, y: 14, b: 18, h: 4, k: 'creme.3', t: 'stof', r: 1 },
      ],
    },
    // Bistrotafeltje: marmeren blad Ø 60 cm, 72 cm hoog, met twee kopjes.
    balkontafel: {
      naam: 'Bistrotafeltje', op: 'vloer', hoort: ['balkon', 'terras', 'tuin', 'zwembad'], prioriteit: 2, placeholder: true, sprite: null, maat: [26, 32],
      delen: [
        { x: 5, y: -3, b: 4, h: 3, k: 'creme.4', r: 1 }, { x: 16, y: -3, b: 4, h: 3, k: 'creme.4', r: 1 },
        { x: 0, y: 0, b: 26, h: 3, k: 'creme.3', t: 'marmer' },
        { x: 12, y: 3, b: 2, h: 26, k: 'nacht.1', vlak: true }, { x: 6, y: 29, b: 14, h: 3, k: 'nacht.1', r: 1 },
      ],
    },
    // Buitenkeuken: 200 x 90 cm, betonnen blad, eiken deurtjes, een zwarte barbecue met deksel, kruiden.
    buitenkeuken: {
      naam: 'Buitenkeuken', op: 'vloer', hoort: ['terras'], prioriteit: 3, placeholder: true, sprite: null, maat: [88, 40],
      delen: [
        { x: 0, y: 5, b: 88, h: 35, k: 'nacht.3', t: 'stuc' },
        { x: 3, y: 9, b: 20, h: 26, k: 'eik.3', t: 'lamel' }, { x: 25, y: 9, b: 20, h: 26, k: 'eik.3', t: 'lamel' },
        { x: 64, y: 9, b: 21, h: 26, k: 'eik.3', t: 'lamel' },
        { x: 47, y: 9, b: 15, h: 26, k: 'nacht.1', r: 1 }, { x: 49, y: 13, b: 11, h: 4, k: 'nacht.2', vlak: true },
        { x: -1, y: 2, b: 90, h: 4, k: 'nacht.4', t: 'marmer' },
        { x: 46, y: -12, b: 18, h: 14, k: 'nacht.1', vorm: 'boog', t: 'metaal' }, { x: 53, y: -14, b: 4, h: 2, k: 'nacht.2', vlak: true },
        { x: 6, y: -6, b: 6, h: 8, k: 'koraal.1', r: 1 }, { x: 5, y: -12, b: 8, h: 7, k: 'blad.3', t: 'blad', vorm: 'ovaal' },
        { x: 15, y: -5, b: 6, h: 7, k: 'koraal.1', r: 1 }, { x: 14, y: -10, b: 8, h: 6, k: 'mos.3', t: 'blad', vorm: 'ovaal' },
        { x: 72, y: -8, b: 10, h: 10, k: 'eik.3', t: 'hout', r: 1 },
      ],
    },
    // Loungebank: 210 x 68 cm, teak frame met touw, dikke kussens en sierkussens.
    loungebank: {
      naam: 'Loungebank', op: 'vloer', hoort: ['terras', 'zwembad'], prioriteit: 3, placeholder: true, sprite: null, maat: [92, 30],
      delen: [
        { x: 0, y: 18, b: 92, h: 12, k: 'eik.3', t: 'hout', r: 1 },
        { x: 0, y: 6, b: 8, h: 23, k: 'eik.3', t: 'riet', r: 1 }, { x: 84, y: 6, b: 8, h: 23, k: 'eik.3', t: 'riet', r: 1 },
        { x: 8, y: 2, b: 38, h: 15, k: 'creme.3', t: 'stof', r: 3 }, { x: 46, y: 2, b: 38, h: 15, k: 'creme.3', t: 'stof', r: 3 },
        { x: 8, y: 14, b: 76, h: 7, k: 'creme.4', t: 'stof', r: 2 },
        { x: 11, y: 6, b: 12, h: 10, k: 'blad.3', t: 'stof', r: 2 }, { x: 68, y: 6, b: 12, h: 10, k: 'goud.3', t: 'stof', r: 2 },
        { x: 58, y: 8, b: 10, h: 8, k: 'creme.2', t: 'riet', r: 2 },
      ],
    },
    // Ligbed: 172 cm, teak, met verstelbare rugleuning, kussen en een gestreepte handdoek.
    ligbed: {
      naam: 'Ligbed', op: 'vloer', hoort: ['zwembad', 'terras'], prioriteit: 2, placeholder: true, sprite: null, maat: [76, 26],
      delen: [
        { x: 4, y: 18, b: 3, h: 8, k: 'eik.2', vlak: true }, { x: 69, y: 18, b: 3, h: 8, k: 'eik.2', vlak: true },
        { x: 2, y: 15, b: 72, h: 4, k: 'eik.3', t: 'hout' },
        { x: 3, y: 0, b: 5, h: 6, k: 'creme.4', t: 'stof', vlak: true }, { x: 5, y: 3, b: 5, h: 6, k: 'creme.4', t: 'stof', vlak: true },
        { x: 8, y: 6, b: 5, h: 6, k: 'creme.4', t: 'stof', vlak: true }, { x: 11, y: 8, b: 6, h: 6, k: 'creme.4', t: 'stof', vlak: true },
        { x: 15, y: 10, b: 59, h: 5, k: 'creme.4', t: 'stof', r: 1 }, { x: 15, y: 14, b: 59, h: 1, k: 'creme.2', vlak: true },
        { x: 2, y: 2, b: 2, h: 14, k: 'eik.3', vlak: true }, { x: 5, y: 8, b: 3, h: 2, k: 'eik.2', vlak: true },
        { x: 40, y: 9, b: 20, h: 4, k: 'petrol.3', t: 'stof' }, { x: 44, y: 9, b: 2, h: 4, k: 'creme.4', vlak: true }, { x: 52, y: 9, b: 2, h: 4, k: 'creme.4', vlak: true },
      ],
    },
    // Parasol: doek Ø 250 cm, eiken stok van 230 cm, betonnen voet.
    parasol: {
      naam: 'Parasol', op: 'vrij', hoort: ['zwembad', 'tuin', 'terras'], prioriteit: 1, placeholder: true, sprite: null, maat: [16, 100],
      delen: [
        { x: 7, y: 6, b: 2, h: 90, k: 'eik.3', t: 'houtv', vlak: true },
        { x: 2, y: 96, b: 12, h: 4, k: 'nacht.3', r: 1 },
        { x: -40, y: 6, b: 96, h: 8, k: 'creme.3', t: 'stof', vorm: 'kap' }, { x: -42, y: 13, b: 100, h: 3, k: 'creme.2', vlak: true },
        { x: -42, y: 15, b: 100, h: 1, k: 'abrikoos.3', vlak: true },
        { x: 6, y: 2, b: 4, h: 5, k: 'eik.2', r: 1 },
      ],
    },
    // Uit het oude pad (zolder, serre, uitkijk); nu ongebruikt maar nog geldig voor de tweede huizen.
    kijker: {
      naam: 'Sterrenkijker', op: 'vloer', hoort: ['uitkijk', 'balkon', 'werkkamer'], prioriteit: 1, placeholder: true, sprite: null, maat: [28, 44],
      delen: [
        { x: 2, y: 4, b: 22, h: 6, k: 'goud', rand: 'titel' }, { x: 22, y: 2, b: 6, h: 10, k: 'goud.1', rand: 'titel' },
        { x: 12, y: 10, b: 3, h: 30, k: 'nacht' },
        { x: 4, y: 40, b: 20, h: 4, k: 'nacht' },
      ],
    },
    palm: {
      naam: 'Palm', op: 'vloer', hoort: ['serre', 'woonkamer'], prioriteit: 2, placeholder: true, sprite: null, maat: [31, 66],
      delen: [
        { x: 14, y: 6, b: 3, h: 42, k: 'mos.1' },
        { x: 2, y: 8, b: 12, h: 4, k: 'blad' }, { x: 17, y: 4, b: 13, h: 4, k: 'blad' },
        { x: 0, y: 14, b: 8, h: 3, k: 'mos' }, { x: 23, y: 12, b: 8, h: 3, k: 'mos' },
        { x: 10, y: 0, b: 10, h: 6, k: 'blad.3' },
        { x: 5, y: 21, b: 9, h: 3, k: 'blad' }, { x: 17, y: 20, b: 10, h: 3, k: 'blad' },
        { x: 7, y: 30, b: 7, h: 2, k: 'mos' }, { x: 17, y: 32, b: 7, h: 2, k: 'mos' },
        { x: 6, y: 48, b: 19, h: 18, k: 'koraal.1', rand: 'titel' }, { x: 6, y: 48, b: 19, h: 3, k: 'koraal', rand: 'titel' },
      ],
    },
    serrestoel: {
      naam: 'Rieten stoel', op: 'vloer', hoort: ['serre', 'woonkamer', 'balkon'], prioriteit: 2, placeholder: true, sprite: null, maat: [33, 40],
      delen: [
        { x: 4, y: 0, b: 25, h: 6, k: 'hazelnoot.3', rand: 'koffie' },
        { x: 0, y: 4, b: 33, h: 30, k: 'hazelnoot.3', rand: 'koffie' },
        { x: 2, y: 10, b: 29, h: 1, k: 'hazelnoot' }, { x: 2, y: 28, b: 29, h: 1, k: 'hazelnoot' },
        { x: 4, y: 17, b: 25, h: 7, k: 'petrol.4', rand: 'titel' },
        { x: 3, y: 34, b: 3, h: 6, k: 'koffie' }, { x: 27, y: 34, b: 3, h: 6, k: 'koffie' },
      ],
    },
    opbergkist: {
      naam: 'Opbergkist', op: 'vloer', hoort: ['zolder', 'slaapkamer', 'werkkamer'], prioriteit: 2, placeholder: true, sprite: null, maat: [44, 22],
      delen: [
        { x: 0, y: 2, b: 44, h: 20, k: 'eik', rand: 'titel' },
        { x: 0, y: 0, b: 44, h: 4, k: 'eik.1', rand: 'titel' },
        { x: 8, y: 4, b: 2, h: 18, k: 'nacht.3' }, { x: 34, y: 4, b: 2, h: 18, k: 'nacht.3' },
        { x: 20, y: 5, b: 4, h: 4, k: 'goud' },
      ],
    },

    // Bestaande items (uitgesneden uit het characterblad, 4,1 bronpx per artpx). Geen placeholder.
    // bronpx_per_artpixel is per item bijgesteld naar een echte maat (1 artpx ≈ 2,26 cm): gieter ~45 cm,
    // bezem ~130 cm langs de schuine steel, rugzak ~45 cm, klembord ~32 cm; plant, ster, hart en munt blijven op 4,1.
    plant:    { naam: 'Plant', op: 'vrij', hoort: ['keuken', 'woonkeuken', 'werkkamer', 'serre'], prioriteit: 2, placeholder: false, sprite: { bestand: 'items/bron/plant.png', maat: [89, 98], bronpx_per_artpixel: 4.1, anker: [44, 98] } },
    gieter:   { naam: 'Gieter', op: 'vrij', hoort: ['woonkamer', 'woonkeuken', 'keuken', 'serre', 'tuin'], prioriteit: 1, placeholder: false, sprite: { bestand: 'items/bron/gieter.png', maat: [124, 83], bronpx_per_artpixel: 6.2, anker: [62, 83] } },
    bezem:    { naam: 'Bezem', op: 'vloer', hoort: ['keuken', 'woonkeuken', 'trap'], prioriteit: 1, placeholder: false, sprite: { bestand: 'items/bron/bezem.png', maat: [82, 102], bronpx_per_artpixel: 2.27, anker: [41, 102] } },
    rugzak:   { naam: 'Rugzak', op: 'vloer', hoort: ['slaapkamer', 'slaaphoek', 'logeerkamer', 'woonkamer'], prioriteit: 1, placeholder: false, sprite: { bestand: 'items/bron/rugzak.png', maat: [100, 102], bronpx_per_artpixel: 5.1, anker: [50, 102] } },
    klembord: { naam: 'Klembord', op: 'muur', hoort: ['keuken', 'woonkeuken', 'werkkamer'], prioriteit: 1, placeholder: false, sprite: { bestand: 'items/bron/klembord.png', maat: [67, 85], bronpx_per_artpixel: 6.0, anker: [33, 85] } },
    ster:     { naam: 'Ster', op: 'muur', hoort: ['slaaphoek', 'slaapkamer', 'master', 'woonkamer', 'uitkijk'], prioriteit: 1, placeholder: false, sprite: { bestand: 'items/bron/ster.png', maat: [83, 83], bronpx_per_artpixel: 4.1, anker: [41, 83] } },
    hart:     { naam: 'Hart', op: 'muur', hoort: ['slaaphoek', 'slaapkamer', 'master', 'woonkamer'], prioriteit: 1, placeholder: false, sprite: { bestand: 'items/bron/hart.png', maat: [72, 67], bronpx_per_artpixel: 4.1, anker: [36, 67] } },
    munt:     { naam: 'Munt (huispot)', op: 'muur', hoort: ['woonkamer', 'woonkeuken', 'werkkamer'], prioriteit: 1, placeholder: false, sprite: { bestand: 'items/bron/munt.png', maat: [79, 83], bronpx_per_artpixel: 4.1, anker: [39, 83] } },
  },

  // Plaatsingen per kamertype. x = linkerrand vanaf de binnenkant van de linkermuur; y = hoogte van de onderkant
  // boven de vloerlijn (vloer-meubels: 0). Een kamer in een niveau kan dit overschrijven met `plaatsing`. Gebruik:
  //   1. De startinrichting: de kamers van niveau 1 krijgen de plaatsing van hun type.
  //   2. Bij een verbouwing: een nieuwe kamer (of een kamer met een ander type) krijgt de meubels uit zijn plaatsing
  //      die jullie nog niet hebben en die passen. Bij "Bekijk" staan die lichter, als voorbeeld.
  // Een id komt maar één keer voor in het huis (keukenblok-1 staat in de woonkeuken óf in de keuken).
  plaatsingen: {
    woonkeuken: [
      { id: 'keukenblok-1', soort: 'keukenblok', x: 0, y: 0 },
      { id: 'plant-1', soort: 'plant', x: 40, y: 40 },
      { id: 'klembord-1', soort: 'klembord', x: 4, y: 52 },
      { id: 'aquarium-1', soort: 'aquarium', x: 104, y: 0 },
      { id: 'munt-1', soort: 'munt', x: 152, y: 96 },
      { id: 'bank-1', soort: 'bank', x: 156, y: 0 },
      { id: 'kunst-1', soort: 'kunst', x: 176, y: 56 },
      { id: 'plank-1', soort: 'plank', x: 232, y: 64 },
      { id: 'gieter-1', soort: 'gieter', x: 240, y: 72 },
      { id: 'stokje-1', soort: 'stokje', x: 256, y: 0 },
    ],
    slaaphoek: [
      { id: 'bed-1', soort: 'bed', x: 0, y: 0 },
      { id: 'wasmand-1', soort: 'wasmand', x: 100, y: 0 },
      { id: 'terrarium-1', soort: 'terrarium', x: 132, y: 0 },
      { id: 'ster-1', soort: 'ster', x: 22, y: 80 },
      { id: 'hart-1', soort: 'hart', x: 60, y: 64 },
    ],
    keuken: [
      { id: 'keukenblok-1', soort: 'keukenblok', x: 0, y: 0 },
      { id: 'kookeiland-1', soort: 'kookeiland', x: 40, y: 0 },
      { id: 'plant-1', soort: 'plant', x: 40, y: 40 },
      { id: 'klembord-1', soort: 'klembord', x: 4, y: 52 },
      { id: 'tafel-1', soort: 'tafel', x: 136, y: 0 },
    ],
    woonkamer: [
      { id: 'kamerplant-1', soort: 'kamerplant', x: 4, y: 0 },
      { id: 'mand-1', soort: 'mand', x: 36, y: 0 },
      { id: 'lamp-1', soort: 'lamp', x: 76, y: 0 },
      { id: 'aquarium-1', soort: 'aquarium', x: 104, y: 0 },
      { id: 'munt-1', soort: 'munt', x: 152, y: 96 },
      { id: 'bank-1', soort: 'bank', x: 156, y: 0 },
      { id: 'salontafel-1', soort: 'salontafel', x: 176, y: 0 },
      { id: 'kunst-1', soort: 'kunst', x: 176, y: 56 },
      { id: 'plank-1', soort: 'plank', x: 232, y: 64 },
      { id: 'gieter-1', soort: 'gieter', x: 240, y: 72 },
      { id: 'stokje-1', soort: 'stokje', x: 256, y: 0 },
    ],
    slaapkamer: [
      { id: 'bed-1', soort: 'bed', x: 0, y: 0 },
      { id: 'wasmand-1', soort: 'wasmand', x: 100, y: 0 },
      { id: 'terrarium-1', soort: 'terrarium', x: 132, y: 0 },
      { id: 'rugzak-1', soort: 'rugzak', x: 168, y: 0 },
      { id: 'kast-1', soort: 'kast', x: 196, y: 0 },
      { id: 'ster-1', soort: 'ster', x: 22, y: 80 },
      { id: 'hart-1', soort: 'hart', x: 60, y: 64 },
    ],
    logeerkamer: [
      { id: 'logeerbed-1', soort: 'logeerbed', x: 0, y: 0 },
      { id: 'kamerplant-3', soort: 'kamerplant', x: 96, y: 0 },
      { id: 'terrarium-1', soort: 'terrarium', x: 136, y: 0 },
      { id: 'kast-1', soort: 'kast', x: 196, y: 0 },
      { id: 'kunst-3', soort: 'kunst', x: 24, y: 52 },
    ],
    master: [
      { id: 'nachtkastje-1', soort: 'nachtkastje', x: 0, y: 0 },
      { id: 'bed-1', soort: 'bed', x: 24, y: 0 },
      { id: 'wasmand-1', soort: 'wasmand', x: 128, y: 0 },
      { id: 'inloopkast-1', soort: 'inloopkast', x: 160, y: 0 },
      { id: 'hart-1', soort: 'hart', x: 64, y: 66 },
      { id: 'ster-1', soort: 'ster', x: 192, y: 100 },
    ],
    badkamer: [
      { id: 'bad-1', soort: 'bad', x: 0, y: 0 },
      { id: 'wastafel-1', soort: 'wastafel', x: 96, y: 0 },
    ],
    ensuite: [
      { id: 'douche-1', soort: 'douche', x: 0, y: 0 },
      { id: 'dubbelewastafel-1', soort: 'dubbelewastafel', x: 68, y: 0 },
    ],
    werkkamer: [
      { id: 'bureau-1', soort: 'bureau', x: 8, y: 0 },
      { id: 'kunst-2', soort: 'kunst', x: 12, y: 64 },
      { id: 'boekenkast-1', soort: 'boekenkast', x: 72, y: 0 },
      { id: 'leesstoel-1', soort: 'leesstoel', x: 120, y: 0 },
      { id: 'lamp-2', soort: 'lamp', x: 160, y: 0 },
      { id: 'kamerplant-2', soort: 'kamerplant', x: 200, y: 0 },
    ],
    tuin: [
      { id: 'tuinbank-1', soort: 'tuinbank', x: 112, y: 0 },
      { id: 'bloembak-1', soort: 'bloembak', x: 180, y: 0 },
    ],
    // Tuin met zwembad: het bad ligt op x 8-160 (kamertype zwembad), daar komt geen meubel.
    zwembad: [
      { id: 'ligbed-1', soort: 'ligbed', x: 168, y: 0 },
      { id: 'parasol-1', soort: 'parasol', x: 240, y: 0 },
      { id: 'ligbed-2', soort: 'ligbed', x: 248, y: 0 },
      { id: 'tuinbank-1', soort: 'tuinbank', x: 360, y: 0 },
      { id: 'bloembak-1', soort: 'bloembak', x: 412, y: 0 },
    ],
    terras: [
      { id: 'buitenkeuken-1', soort: 'buitenkeuken', x: 0, y: 0 },
      { id: 'loungebank-1', soort: 'loungebank', x: 96, y: 0 },
    ],
    balkon: [
      { id: 'tuinstoel-1', soort: 'tuinstoel', x: 8, y: 0 },
      { id: 'balkontafel-1', soort: 'balkontafel', x: 36, y: 0 },
      { id: 'tuinstoel-2', soort: 'tuinstoel', x: 66, y: 0 },
      { id: 'bloembak-3', soort: 'bloembak', x: 108, y: 0 },
    ],
    uitkijk: [
      { id: 'kijker-1', soort: 'kijker', x: 8, y: 0 },
      { id: 'bloembak-2', soort: 'bloembak', x: 40, y: 0 },
    ],
    serre: [
      { id: 'palm-1', soort: 'palm', x: 0, y: 0 },
      { id: 'serrestoel-1', soort: 'serrestoel', x: 40, y: 0 },
    ],
    zolder: [
      { id: 'logeerbed-2', soort: 'logeerbed', x: 24, y: 0 },
      { id: 'opbergkist-1', soort: 'opbergkist', x: 144, y: 0 },
    ],
    trap: [
      { id: 'bezem-1', soort: 'bezem', x: 48, y: 0 },
      { id: 'kunst-4', soort: 'kunst', x: 4, y: 72 },
    ],
    carport: [],
  },

  // Characters op de vloer. kamers: kamertypes in volgorde van voorkeur; x = voetanker vanaf de linkermuur.
  // outfit: 'kledingkast' (wat in de kledingkast is gekozen), 'origineel' of een catalogus-id uit kleding.js.
  bewoners: [
    { id: 'hidde', kamers: ['woonkamer', 'woonkeuken'], x: 152, outfit: 'kledingkast' },
    { id: 'tessie', kamers: ['woonkamer', 'woonkeuken'], x: 216, outfit: 'kledingkast' },
  ],

  // Pets. Met kamers + x lopen ze vrij rond; met plek = [meubel-id, plek-naam] wonen ze in of op een meubel.
  // kijkrichting: waar de sprite op het blad naartoe kijkt ('links', 'rechts', 'voor'), nodig voor het spiegelen.
  // Staat het pet-huisje in de verhuisdoos, dan is het pet "op logeerpartij" en staat het niet in beeld.
  pets: [
    { id: 'draakje', kamers: ['woonkamer', 'woonkeuken'], x: 140, gedrag: 'lopen', kijkrichting: 'rechts', bijnaam: null },
    { id: 'hondje', kamers: ['tuin', 'terras', 'keuken', 'woonkeuken'], x: 40, gedrag: 'lopen', kijkrichting: 'voor', bijnaam: null },
    { id: 'katje', kamers: ['slaapkamer', 'slaaphoek', 'master'], x: 40, gedrag: 'lopen', kijkrichting: 'voor', bijnaam: null },
    { id: 'haaitje', plek: ['aquarium-1', 'water'], gedrag: 'zwemmen', kijkrichting: 'links', bijnaam: null },
    { id: 'kameleon', plek: ['terrarium-1', 'tak'], gedrag: 'zitten', kijkrichting: 'rechts', bijnaam: null },
    { id: 'salamander', plek: ['terrarium-1', 'bodem'], gedrag: 'kruipen', kijkrichting: 'links', bijnaam: null },
    { id: 'parkietje', plek: ['stokje-1', 'stok'], gedrag: 'zitten', kijkrichting: 'links', bijnaam: null },
  ],

  // Behoefte-klok (puntensysteem §7): klok = dagen sinds laatst / interval. Geen alarmen, geen rommel, geen boos pet.
  klokstanden: [
    { id: 'fris', tot: 0.7, tekst: 'Fris', signaal: null },
    { id: 'dorstig', tot: 1.0, tekst: 'Bijna weer aan de beurt', signaal: 'glinster' },
    { id: 'hangend', tot: null, tekst: 'Klaar voor een beurt', signaal: 'vraag' },
  ],

  // Voorbeeldtaken. bij: meubel-id waar het signaal boven hangt; signaal_x: plek op de breedte van dat meubel (0-1, standaard 0,5). start_dagen_geleden geldt zolang er nog niets is afgevinkt.
  taken: [
    { id: 'afwas', titel: 'Afwas en vaatwasser', bij: 'keukenblok-1', signaal_x: 0.25, interval_dagen: 1, start_dagen_geleden: 0.8, minuten: 10, zwaarte: 1, soort_werk: 'doen' },
    { id: 'planten', titel: 'Planten water geven', bij: 'plant-1', interval_dagen: 3, start_dagen_geleden: 3.4, minuten: 5, zwaarte: 0, soort_werk: 'doen' },
    { id: 'was', titel: 'Was draaien en ophangen', bij: 'wasmand-1', interval_dagen: 4, start_dagen_geleden: 3.2, minuten: 25, zwaarte: 0, soort_werk: 'doen' },
    { id: 'stofzuigen', titel: 'Stofzuigen', bij: 'bank-1', interval_dagen: 7, start_dagen_geleden: 2, minuten: 30, zwaarte: 1, soort_werk: 'doen' },
    { id: 'aquarium', titel: 'Aquarium verversen', bij: 'aquarium-1', signaal_x: 0.85, interval_dagen: 14, start_dagen_geleden: 13, minuten: 20, zwaarte: 1, soort_werk: 'doen' },
  ],
};
