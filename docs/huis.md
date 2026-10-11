# Ons huis

Prototype, 11 okt 2026 (villapad en premium tekenwerk: zelfde dag). Open `app/huis.html` (dubbelklik, werkt via file://). Bouwt op [puntensysteem.md](puntensysteem.md) v2 (weekdoel samen, pets zonder straf, gedeelde huispot in fase 3, geen scorebord) en [app-ontwerp.md](app-ontwerp.md).

## Concept

Een **poppenhuis-doorsnede in vooraanzicht**, zoals Tiny Tower. Er is geen isometrie. Muren en vloeren zijn doorgesneden, je kijkt de kamers in. Hidde, Tessie en de pets zijn van voren getekend en staan met hun voetanker op de vloerlijn, op dezelfde schaal als op de bladen (schermpx = artpx × zoom; bronassets op zoom ÷ `bronpx_per_artpixel`).

**Eén huis dat groeit, tot een villa.** Er zijn geen losse huizen om naar te verhuizen. Jullie beginnen in een klein maar verzorgd Starthuisje (woonkeuken en slaaphoek onder een pannendak) en verbouwen het in 10 niveaus tot een moderne villa met zwembad: elk niveau bevat alles van het vorige plus iets nieuws, en er verdwijnt nooit een kamer. Een verbouwing koop je later in de winkel uit de gedeelde huispot (fase 3). Nu kun je bij **Verbouwen** elk niveau bekijken: je ziet het huis na die verbouwing, met jullie eigen spullen erin.

Wat de pagina doet:

- **Bewoners en pets.** Hidde en Tessie dragen de kledingkast-outfit, het origineel of een catalogusoutfit (via `figuur.js`). Hidde, Tessie en de pets bewegen met procedurele loopcycli uit hun eigen pixels (zie *Beweging* hieronder). In de bewerkmodus en bij `prefers-reduced-motion` staat alles stil. Tik op een pet voor een hartje en de naam.
- **Pet-plekjes.** Het haaitje woont in het aquarium (geknipt binnen het glas, de voorkant van het glas ligt erover). De kameleon zit op de tak in het terrarium en de salamander op de bodem. De parkiet zit op het stokje. Staat een pet-huisje in de verhuisdoos, dan is dat pet "op logeerpartij". Het wordt dan niet getoond, er is geen straf.
- **Taaksignalen zonder schuld.** De behoefte-klok (puntensysteem §7) toont boven het meubel een glinster (bijna aan de beurt) of een vraagteken (klaar voor een beurt). Er komt geen rommel, geen rood en geen boos pet. Tik toont de taak. *Gedaan* geeft een feestje van sterretjes, en binnen 10 seconden kun je het ongedaan maken.
- **Bewerkmodus.** Meubels en bewoners sleep je met pointer events (muis, pen en vinger), ook naar een andere kamer. Ze klikken vast op 8 artpx. Een vloermeubel zoekt het dichtste vrije vak. Past het niet, dan blijft het staan en verschijnt er een melding. Een vrij meubel (plant, gieter) zakt naar de vloer als er niets onder staat. Met Tab en de pijltjes kan het ook. Eén meubel kan naar de verhuisdoos en weer terug. Alles staat in localStorage (`pq-huis-staat`, `pq-huis-taken`, `pq-huis-instellingen`), en elke aanroep zit in try/catch.
- **Licht, weer, seizoen en feestdagen.** De lucht, het uitzicht, de lampen, het erf en het event-decor volgen de omgevingsstatus: de echte zonnestand op jullie plaats, het weer (Open-Meteo), het seizoen en Sinterklaas/Kerst. Zie [omgeving.md](omgeving.md). Lichte tint (multiply, 0–22%). Overdag vallen er lichtbanen door de ramen. 's Avonds en 's nachts legt een aparte lichtlaag (`#licht`, boven de tint) warme lichtpoelen onder de lampen, kegels onder de spots en een gloed bij de glazen puien. Met *Altijd dag* in de balk staat het altijd op middag.
- **Zoom.** *Auto* kiest de grootste hele schaal die past. Onder 700 px schermbreedte is dat minstens 2×, en dan scrollt het huis binnen zijn eigen venster. De pagina scrollt nooit horizontaal. Op een breed scherm wordt de scene breder getekend, zodat het huis in het midden staat.

Testadres: `huis.html?test&schoon&uur=22&niveau=8&bewerk&weergave=verbouwen&zoom=2&outfit=zeebries&markeer&taak=afwas`. `?test&poster` haalt de maximale paginabreedte weg, zodat een schermafbeelding de hele scene toont. `?test` toont rechtsboven het aantal JS-fouten (`app/testindicator.js`, ook op `index.html` en `kledingkast.html`). `?schoon` negeert de opslag. `?niveau=N` toont niveau N als voorbeeld. `?test&verbouw=N` zet het huis echt op niveau N; in test-modus staat daarvoor ook een knop bij elke verbouwing.

## Bestanden

| Bestand | Wat |
|---|---|
| `assets/huis.js` | Data (`window.PQ_HUIS`, schema v2), met de hand bewerkbaar |
| `app/huis-model.js` | Pure rekenregels: geometrie, daken, plaatsen (ook onder een schuine kap), verbouwen, klok en dagdeel. Testbaar met node |
| `app/huis-pixel.js` | Pixelhulpjes (`PQ_PIX`): rect, tinten uit de ramp, dither, Bayer-overgang, ovaal/kap/boog, glas en de silhouet-outline; materialen (`PQ_PIX.mat`): stuc, baksteen, lamellen, tegels, natuursteen, marmer en vloeren |
| `app/huis-buiten.js` | Buiten (`PQ_HUISBUITEN`): lucht, heuvels en bomenrij, grond in doorsnede, erf (bomen, buxus, siergras, olijfboom, heg, lampen, oprit) en de buitenkamers (tuin, zwembad, overdekt terras, carport met auto, balkon) |
| `app/huis-teken.js` | Kamers (muren, ramen met uitzicht, gordijnen, lampen, details, AO, lichtbanen), doorgesneden gevel, daken, zwevende trap, schaduw, lichtlaag, placeholder-meubels (drie tinten, textuur, outline, cache) en mini-preview |
| `app/huis.js` + `huis.css` + `huis.html` | Pagina, bewerkmodus, taken, verbouwen |
| `app/testindicator.js` | Badge met JS-fouten bij `?test` |
| `assets/beweging.js` | Data (`PQ_BEWEGING`): welke stukken van de sprites bewegen (poten, staart, kop, vleugel, oog), staplengte, til, deining, snelheid |
| `app/huis-anim.js` | Frames (`PQ_HUISANIM`): procedurele loopcycli en kleine bewegingen uit de bestaande pixels, gecachet op offscreen-canvassen |
| `app/huis-anim-gedrag.js` | Gedrag (`PQ_HUISGEDRAG`) op `requestAnimationFrame`: lopen, stilstaan, praten, wandelen, zwemmen |
| `app/huis-bomen.js` | Kers en eik met seizoensgedrag |
| `app/huis-filmstrip.html` | Filmstrip van alle frames, om ze kritisch te bekijken (`?test`, `?zoom=6`, `?alleen=hidde,hondje`) |
| `app/omgeving*.js` | Licht, weer, seizoenen en feestdagen; zie [omgeving.md](omgeving.md) |

## Dataschema (`assets/huis.js`)

Maten zijn in artpx. Kleuren zijn een paletnaam (`eik`), een ramptint (`eik.3`: 0 = donkerst, 2 = paletkleur, 4 = lichtst) of hex.

- `cel: 16`: een kamer van *n* cellen is n × 16 artpx breed, inclusief zijn linkermuur (8). Daardoor zijn verdiepingen met hetzelfde aantal cellen precies even breed. De binnenhoogte is 128, en een verdieping inclusief vloerplaat is 136.
- `kamertypes`: de stijl per type (`muur.patroon` strepen/stippen/tegels/planken/blokken, `vloer`, `plint`). Daarnaast `buiten` (tuin, balkon), `trap`, en voor de nieuwe types:
  - `serre`: lichte muren, grote ramen (per kamer), `romp: 'creme.3'` (lichte stijlen) en `dak: { vorm: 'glas' }` (een lage kas van ruiten).
  - `balkon`: buiten, tegelvloer (`vloer.naden`), een stalen hekje van 100 cm (44 artpx). `dakvloer: true`: ligt op het dak van de kamer eronder, dus daar komt geen dakrand.
  - `zolder`: `schuin: { knie: 48 }`. Knieschotten van ~110 cm, daarboven loopt de kap schuin naar binnen (8 artpx opzij per 8 omhoog). Een meubel dat tegen de schuine kant zou stoten, schuift naar binnen of past niet (`onderKap()` in het model).
- `niveaus[]`: het upgradepad van het ene huis. `{ niveau, naam (van de verbouwing), prijs, voorwaarde, omschrijving, romp, dak: { vorm: plat|zadel|kanteel|blad, kleur, rij, aanbouw? }, omgeving: null, erf: { links, rechts }, decor: [], inspring: { verdieping: cellen }, kamers[] }`.
  - Elk niveau is de **volledige** indeling na die verbouwing. Er verdwijnt nooit een kamer.
  - Kamer: `{ id, type, breedte (cellen), verdieping, ramen: [{ x, b, h? }], start?, naam?, muur?, dak?, dakkapel?, plaatsing? }`. Het **id is stabiel** over alle niveaus (`woon` is woonkeuken en daarna woonkamer; `slaap` is slaaphoek en daarna slaapkamer).
  - Kamers op één verdieping staan van links naar rechts.
  - Een dak komt automatisch op elk stuk binnenrij waar geen binnenkamer of dakterras bovenop staat. Per stuk: het eigen dak van de kamer (serre: glas, uitkijk: spits), `dak.aanbouw` als er ergens een hogere verdieping is (platte aanbouw naast het zadeldak), anders het hoofddak. Het hoofddak boven een zolder wordt een schuine kap; `dakkapel: 'links'` zet daar een stuk rechtop met een raam.
  - Nieuw in het villapad: `stijl: 'klassiek' | 'modern'` per niveau (gevel, kozijnen, dakrand, tuin); `dak.stap` (zadeldak: artpx opzij per 8 omhoog), `dak.overstek` (plat dak met overstek), `grond` (diepte onder het maaiveld, 72 bij het zwembad; standaard 40). Kamer: `pui: 'links'` (de doorgesneden muur wordt een glazen schuifpui) en raam `y` (afstand onder het plafond, voor puien tot de vloer).
  - Kamertype: `modern: { muur, vloer, plint, lampen, accent }` geldt vanaf stijl modern; `lampen: 'hang' | 'kroon' | 'spots'`; `accent: { x, b, patroon, kleur }` (lamellenwand); `muur.patroon` stuc/behang/lambrisering/tegels/metro/lamellen/natuursteen; `vloer.patroon` visgraat/planken/tegels/gras/terras/klinkers/vlonder. Buitentypes: `terras` (`overkapping`), `zwembad` (`zwembad: { x, b }`: daar plaatst het model geen vloermeubel), `carport`, `balkon` (`glas`).
  - Meubel: `voor: true` (kookeiland, salontafel) staat 3 artpx lager en vóór de rest (z-index 3); `licht: [{ x, y, r }]` geeft 's avonds een lichtpoel; delen hebben `r`, `vorm` (ovaal/kap/boog), `t` (textuur), `vlak`, `a` en `licht: 'kap'`.
  - `decor`: wat er buiten staat en meegroeit (nieuw: `buxus`, `boompje`, `siergras`, `olijfboom`, `tuinlampjes`, `oprit`, `buitenlampen`; oud: `brievenbus`, `bloemen`, `boom`, `struiken`, `heg`, `lantaarn` (brandt 's avonds), `vijver` (in de tuin), `vlag` (op de torenspits)). `erf` is de grond naast het huis daarvoor.
  - De oude omgevingen `flat`, `rij` en `bos` werken nog in de code, maar geen niveau gebruikt ze.
- `start: { niveau: 1 }`: de startwaarde. De echte staat is `{ versie: 3, niveau, inrichting[], doos[], posities }`. Een opgeslagen staat van versie 2 (losse huizen) wordt omgezet: de studio wordt niveau 1; wie in een ander huis stond, begint opnieuw.
- `meubels{}`: `{ naam, op: vloer|muur|vrij, hoort: [kamertypes], prioriteit, placeholder, sprite, maat, delen[], plekken? }`.
  - `sprite: null` betekent een placeholder van rechthoeken (`delen`, met `laag: 'voor'` voor glas en `licht: kap|gloed`).
  - Een echte sprite is `{ bestand, maat [bronpx], bronpx_per_artpixel, anker [bronpx] }`. Dan worden `delen` genegeerd en verandert er geen code (zo werken de 8 items nu al).
  - `plekken`: `{ glas: [x, y, b, h] | null, lijn: [ymin, ymax], bereik: [xmin, xmax] }`, de plek waar een pet in of op het meubel woont.
- `plaatsingen{kamertype}`: `[{ id, soort, x, y }]`, met x vanaf de binnenkant van de linkermuur en y = hoogte van de onderkant boven de vloerlijn. Een kamer kan dit overschrijven met `plaatsing` (de torenkamer). Een id komt maar één keer voor in het huis.
- `bewoners[]`, `pets[]`: `{ kamers: [types], x }` of `plek: [meubel-id, plek]`, met `kijkrichting` voor het spiegelen.
- `klokstanden[]`, `taken[]`: `{ bij: meubel-id, signaal_x, interval_dagen, minuten, zwaarte, … }`.

**Verbouwen** (`verbouw()` in het model):

1. Een meubel blijft in zijn kamer (zelfde kamer-id) op zijn x, als die kamer nog bestaat en het type gelijk bleef of het meubel bij het nieuwe type hoort. Het bed blijft dus staan als de slaaphoek een slaapkamer wordt.
2. Anders zoekt het een kamer uit zijn `hoort`-lijst, op de oude x of het dichtste vrije vak. Bij niveau 5 gaan zo het keukenblok, de plant en het klembord naar de leefkeuken; bij niveau 8 gaan het bed, de wasmand, de ster en het hart mee naar de mastersuite (de oude slaapkamer wordt logeerkamer; kast, terrarium en rugzak blijven daar).
   Is de doelkamer nieuw of van type veranderd en staat het meubel in de plaatsing van die kamer, dan is díe plek de wens (het bed komt naast het nachtkastje, niet op zijn oude x). Wat al in de doos zat, krijgt hier opnieuw een kans. Past het nergens, dan gaat het in de doos.
3. Een nieuwe kamer (of een kamer met een ander type) krijgt de meubels uit zijn plaatsing die jullie nog niet hebben en die passen. Bij *Bekijk* staan die lichter, als voorbeeld.

De startinrichting is dezelfde regel vanaf een leeg huis. Gemeten (node, villapad 11 okt 2026; elke stap 1→2→…→10 en in één sprong 1→10): **de doos blijft bij elke stap leeg** en ook bij de sprong. Bed, kast en terrarium komen nooit in de doos (bed in de mastersuite, kast en terrarium in de logeerkamer); aquarium, terrarium en stokje houden overal hun plek, dus geen pet gaat op logeerpartij (het hondje verhuist bij niveau 10 van de tuin naar het overdekte terras, zodat het niet in het zwembad loopt). Alleen terug naar een lager niveau (alleen in test-modus) vult de doos: van 10 naar 1 gaan er 29 meubels in.

## Verbouwingen (voorstelprijzen)

Uitgangspunt is de huispot van puntensysteem §10: 0,5 munt per inzet, tot de weeknorm. Bij een norm van 600 komt er dus **hooguit 300 munten per week** in. Een week "volle pot" staat gelijk aan een gehaalde week samen. De prijs is wat díe verbouwing kost.

| # | Verbouwing | Wat er bijkomt | Prijs | Weken volle pot | Voorwaarde |
|---|---|---|---|---|---|
| 1 | Starthuisje | woonkeuken (18 cellen ≈ 6,5 m) met keukenwand, aquarium en bank; slaaphoek met lambrisering; pannendak met dakkapel en schoorsteen; boom, lantaarn, bloemen | 0 | – | – |
| 2 | Badkamer | badkamer met metrotegels, bad op pootjes, wastafel met ronde spiegel | 400 | 1,5 | – |
| 3 | Echte slaapkamer | slaaphoek wordt slaapkamer (2 m breder, groter raam), kledingkast, rugzak; buxus | 600 | 2 | – |
| 4 | Tuin | aangelegde tuin: gazon, terrastegels, beukenhaag met borders, krentenboompje, tuinbank, plantenbak | 700 | 2,5 | – |
| 5 | Leefkeuken met kookeiland | leefkeuken met kookeiland (krukken, hanglampen) en eettafel; woonkeuken wordt woonkamer (salontafel met kleed, vloerlamp, ficus, petmand) | 900 | 3 | – |
| 6 | Eerste verdieping | zwevende eiken trap met glazen balustrade, werkkamer boven (bureau, boekenkast, leesstoel); pannendak boven, plat aanbouwdak | 1.500 | 5 | – |
| 7 | Gevelrenovatie | **omslagmoment**: wit stucwerk, houten lamellen boven, zwarte stalen kozijnen, glazen puien en schuifpui naar de tuin, plat dak met overstek, zonnepanelen en sedum; lamellenwanden binnen, spots; strakke taxushaag, siergras, tuinlampjes | 1.800 | 6 | – |
| 8 | Mastersuite boven | mastersuite (bed met hoofdbord, nachtkastje, inloopkast), badkamer en-suite (inloopdouche, dubbele wastafel), balkon met glazen balustrade; oude slaapkamer wordt logeerkamer (daybed) | 1.600 | 5,5 | – |
| 9 | Overdekt terras | lamellenoverkapping met eiken scherm, loungebank, buitenkeuken met barbecue, lichtsnoer | 1.400 | 4,5 | – |
| 10 | Villa | zwembad (doorsnede: rand, waterlijn, mozaïek, trapje, lamp), ligbedden en parasol, olijfboom, carport met auto en laadpaal, oprit met klinkers en bolders | 3.000 | 10 | 26 gehaalde weken |

Samen 11.900 munten, ~40 weken volle pot (bij 300 per week). Voor niveau 10 is dat ~30 weken sparen, dus de mijlpaal van 26 gehaalde weken ligt in de praktijk al achter jullie.

**Stijlfases.** Niveau 1–6 is *klassiek*: doorgesneden muren in baksteen, een houten balklaag met balkkoppen, witte houten kozijnen met roedes en een vensterbank, radiatoren onder de ramen, stoffen gordijnen aan een messing roede, hanglampen of een kroonluchter, een pannendak met witte windveren, nokvorsten, zinken goot, dakkapel en schoorsteen. Niveau 7–10 is *modern*: wit stucwerk met een houten lamellenschil op de verdieping, betonnen vloeren, zwarte stalen kozijnen en puien tot de vloer, vitrage aan een plafondrail, inbouwspots, een plat dak met witte boeiboord, zwarte daktrim, eiken lamellen-onderkant, zonnepanelen en sedum. Onder alle muren ligt een natuurstenen plint.

**Materialen** (alles in code, `huis-pixel.js`): stucwerk met spaarzame dither-clusters, baksteen in verspringend verband met voegen, lamellen met licht/basis/schaduw per lat, metrotegels en natuursteenplaten met voegen en aders, visgraatparket en brede eiken planken, terracotta- en natuursteentegels, marmeren bladen met aders, klinkers, vlonder, gras met sprieten. Licht en diepte: schaduw onder en naast meubels (gedithered), ambient occlusion onder het plafond en in de hoeken, lichtbanen overdag, glas met diagonale reflectiestrepen, ramen met uitzicht op de heuvels, 's avonds lichtpoelen in getrapte ringen.

- **Een paar weken samen-inzet per stap.** Elke verbouwing kost 1,5 tot 10 weken volle pot. De pot betaalt ook outfits, ongeveer één outfit plus een accessoire per week. Wie de helft spaart, doet dus ongeveer twee keer zo lang over een verbouwing. Het hele huis is een doel voor een jaar.
- **Past in v2.** Een verbouwing is een gedeelde aankoop uit de ene pot. Het maakt niemands werk zichtbaarder dan dat van de ander, want er is geen persoonlijk saldo en geen scorebord. Voorstel: kopen vraagt een akkoord van allebei (zoals ruilen). De verbouwing komt in de feed.
- **Inflatierem.** Verbouwingen zijn de grootste put in de winkel. De prijzen zijn vast en munten kun je niet terugkrijgen. Er is geen afbreken: een verbouwing blijft.
- **Op volgorde.** Je koopt altijd de volgende verbouwing (label *volgende*); de rest staat op *later*.
- **Mijlpaal-voorwaarde.** Die telt het **totaal** aantal gehaalde weken, niet de streak. Een breuk of een rustweek blokkeert niets; een rustweek telt alleen niet mee. Zo blijft het een samen-ritueel zonder straf (puntensysteem §10, samen-mijlpalen).

## Idee voor later: een tweede huis

Woonboot, boomhut en kasteeltje vallen uit het pad. Ze passen als **tweede huis of vakantiehuis**: een apart huis naast het eigen huis, bijvoorbeeld als beloning voor 26 of 52 gehaalde weken, waar jullie een weekend "op vakantie" gaan.

- **Boomhut**: drie lagen in een eik (woonkeuken, badkamer, slaaphoek, uitkijk), bladerdak, stam, touwladder, bos. De code (`omgeving: 'bos'`, `dak: 'blad'`) staat er nog.
- **Kasteeltje**: grote zaal, bibliotheek, binnentuin, twee torens met kantelen (`dak: 'kanteel'`, staat er nog).
- **Woonboot**: niet gebouwd. Idee: omgeving `water` (water met golfjes in plaats van gras, romp onder het huis), een dek als buitenkamer met planken en een reling, boogdak, lichtsnoer 's avonds.
- De boomhut en het kasteeltje staan nog als `tweede_huizen` in `assets/huis.js` (ongebruikt). Een tweede huis heeft dan zijn eigen inrichting en verbouwt niet mee.

## Wat is placeholder

- **Alle meubels behalve de 8 items** (plant, gieter, bezem, rugzak, klembord, ster, hart, munt; uitgesneden uit het characterblad). De meubels zijn nu verzorgde placeholders: delen in drie tinten (licht boven, basis, schaduw onder en rechts), een textuur (hout, stof, riet, marmer, blad, water, metaal, spiegel, lamellen), afgeronde hoeken en een donkere silhouet-outline (titel/nacht). Ze staan op echte maat; de cm staan als commentaar bij elk meubel. In de bewerkmodus en met *Markeer placeholders* staan ze gestippeld met het label "placeholder".
- **Het hele decor wordt in code getekend** (`huis-pixel.js`, `huis-buiten.js`, `huis-teken.js`) met harde pixels in het palet. Het lijkt niet op een goedgekeurde figuur. Het mag blijven; tiles kunnen later stukken vervangen.
- Hidde, Tessie, de pets en de items zijn exacte bronassets. **Er is niets overgetekend.** De auto, de bomen en de planten zijn generiek en lijken niet op een pet of bewoner.

## Benodigde assets (Codex-assetblad)

Formaat: native artpx, van voren (meubels in zijaanzicht, zoals nu), anker middenonder, op echte maat (1 artpx ≈ 2,26 cm; Hidde ~84 artpx). Stijl zoals de bladen: getrapte donkere outline, arcering in pixelclusters, warme kleuren uit het palet. Sprites vervangen de placeholder zonder codewijziging (`sprite: { bestand, maat, bronpx_per_artpixel, anker }`). Glas (aquarium, terrarium, douche) als aparte voorlaag. Lampen in twee standen (uit/aan).

**Blad 1: wonen en keuken**

| Meubel | Maat b×h artpx | Echt | Let op |
|---|---|---|---|
| Aquarium | 44×53 | 100×50 bak op 50 cm meubel | glasvak 42×21 voor het haaitje; voorlaag |
| Terrarium | 28×57 | 60×120 | tak op 26 onder de bovenrand, bodem op 48; voorlaag |
| Vogelstokje | 14×53 | 120 cm | stok bovenin |
| Designbank | 88×34 | 200×78 bouclé | sierkussens, plaid |
| Salontafel + kleed | 48×16 (kleed 76) | 110×38 travertijn | `voor`: staat vóór de bank |
| Vloerlamp | 20×68 | 155 cm | kap aan/uit |
| Wandplank, wandkunst | 40×8, 44×32 | 90 cm, 100×72 | |
| Kamerplant (ficus) | 26×56 | 125 cm | |
| Petmand | 32×12 | | |
| Keukenwand | 96×40 (+94 omhoog) | 217×90 | met tegels, open plank, afzuigkap met schouw tot plafond |
| Kookeiland | 88×40 (+87 omhoog) | 200×90 | 2 krukken, 2 messing hanglampen aan/uit; `voor` |
| Eettafel met stoelen | 104×38 (+86 omhoog) | 180×75 | hanglamp aan/uit |

**Blad 2: slapen en baden**

| Meubel | Maat | Echt | Let op |
|---|---|---|---|
| Tweepersoonsbed | 96×44 | 217 cm, hoofdbord 100 | |
| Nachtkastje met lampje | 20×22 (+18) | 45×50 | lampje aan/uit |
| Kledingkast | 44×88 | 100×200 | |
| Inloopkast | 80×96 | 180×220 | hangende kleding, ledstrip |
| Wasmand, logeerbed (daybed) | 24×20, 88×24 | | |
| Vrijstaand bad | 76×30 | 170×67 | messing pootjes, staande kraan |
| Wastafel met spiegel | 32×40 (+50) | 70×88 | |
| Inloopdouche | 54×96 | 120×210 | glaswand als voorlaag |
| Dubbele wastafel | 64×40 (+53) | 140×88 | spiegel met led |

**Blad 3: werken en buiten**

| Meubel | Maat | Echt |
|---|---|---|
| Bureau met stoel, boekenkast, leesstoel | 56×34, 40×80, 35×46 | 125×76, 90×180, 80×105 |
| Tuinbank, plantenbak | 56×34, 32×22 | 125×80, 70×45 |
| Tuinstoel, bistrotafeltje | 24×38, 26×32 | 55×85, Ø60×72 |
| Buitenkeuken, loungebank | 88×40, 92×30 | 200×90, 210×68 |
| Ligbed, parasol | 76×26, 16×100 (doek 100 breed) | 172 cm, Ø250 |

**Blad 4: decor-tiles** (optioneel; de code-versie werkt al): muurtegels per materiaal (16×16: stuc, behang, lambrisering, metro, natuursteen, lamellen), vloerband (24×8: visgraat, planken, tegels, terras, klinkers, vlonder), raamkozijn klassiek en modern (9-slice), pannendak (trede 8×8 met windveer) en dakkapel (40×38), plat dak met overstek (9-slice), zwevende trede (6×3) en glazen balustrade, carport-dak, auto (186×52), laadpaal (9×40), zwembad-mozaïek (3×3), olijfboom (~60×100), buxusbol (14), siergras (30), taxushaag, krentenboompje (~40×110), bolder en tuinlampje.

**Animatie (later, getekend).** De loopcycli zijn nu procedureel (zie *Beweging*). Echte getekende frames voegen toe: zijaanzicht-loopframes voor hondje, katje en draakje (nu trippelen ze van voren of half opzij), armzwaai en draaiframes (een kwartslag) voor Hidde en Tessie, een buigende knie en een afrollende voet, een haaienstaart die van opzij zwaait, een kameleon die stap voor stap over de tak loopt. Later eventueel glinsterend water (2 frames) en een korte bouwanimatie bij een verbouwing (steigers, stofwolkje).

## Beweging (procedureel, uit de bestaande pixels)

Spelregel: nieuwe frames houden **dezelfde gezichten, silhouetten, kleuren en lichaamsverhoudingen**; een nieuwe AI-generatie telt niet als exacte kopie. Daarom tekent `huis-anim.js` niets nieuw. Een frame is het goedgekeurde sprite (bij Hidde en Tessie het samengestelde figuur met alle kledinglagen uit `tekenLook`) waarin stukken over **hele artpx** verschoven zijn, rij voor rij of kolom voor kolom. Het pixelraster van het blad blijft staan.

- **Hidde en Tessie.** Heup, kruis en enkel komen uit de zonekaart (`broek`, `schoenen`). De beenscheiding wordt per rij gevolgd van de enkels omhoog (het midden van de strook zonder stof), zodat ook schuin staande benen netjes splitsen. Onder een draaipunt vlak boven het kruis staan de benen schuin (de voet het meest); de schoen blijft heel en tilt als één stuk 1–2 artpx op. Het lichaam deint 1 artpx omhoog in de passeerfase. Het been aan de kant tegenover de kijkrichting staat vooraan. Handen in de zakken: geen armzwaai. Rust: een ademhaling van 1 artpx, ongeveer elke 4 seconden.
- **Geen voetglijden.** Het frame hangt af van de *afgelegde afstand*, niet van de tijd: per artpx vooruit één frame, en in elk frame schuift de standvoet precies 1 artpx terug. Die voet staat dus stil ten opzichte van de vloer, en optrekken en afremmen (easing) vertragen vanzelf ook de pas. Een cyclus is daardoor 2 × de staplengte: **12 frames** bij een pas van 6 artpx. De opdracht noemde 6–8; met 8 frames zou de pas maar 4 artpx zijn, of zou de voet 2 artpx per frame glijden. Ze stoppen in de passeerhouding.
- **Viervoeters** (hondje, katje, draakje): vier pootstukken uit de onderste rijen in een diagonale gang (linksvoor met rechtsachter), 2 artpx deining; de staart (hondje, katje) of vleugel (draakje) zwaait mee met de cyclus. Rust: ademen en af en toe kwispelen; snuffelen = de kop zakt, alleen de nekrijen vallen samen (het gezicht blijft heel). Hondje en katje zijn van voren getekend en worden nooit gespiegeld; zij hebben een cyclus per looprichting.
- **Haaitje**: kolommen in een sinusgolf, sterker naar de staartpunt; vloeiend sturen met easing, bij een richtingwissel een korte draai (horizontaal samendrukken en omklappen). **Salamander**: lichaamsgolf en heel traag kruipen. **Kameleon**: stil, af en toe kijkt de pupil opzij of knikt de kop. **Parkiet**: kopje dippen, vleugelfladder, huppeltje; 's nachts stil onder de doek.
- **Gedrag.** Hidde en Tessie lopen af en toe naar een vrije plek op hun verdieping of naar een meubel van een taak, staan daar een tijdje, lopen niet door elkaar heen (ze stoppen 34 artpx ervoor) en niet over het zwembad, blijven niet voor hoge of dichte meubels staan (kast, boekenkast, douche, aquarium, terrarium, stokje) en praten even als ze bij elkaar stoppen (ballonnetje, soms een hartje). Bij een richtingwissel eerst omdraaien met een korte pauze. Hun plek blijft bewaard als de scène opnieuw getekend wordt.
- **Techniek.** Eén `requestAnimationFrame`-lus, pauze bij `document.hidden`. Frames één keer per sprite (per look, per schaal) op offscreen-canvassen; een canvas wordt alleen hertekend als het frame verandert. Posities op hele schermpixels. Sterk verkleinde pets (echte maat) krijgen frames op 2 × hun schermmaat, zacht verkleind, zoals de `zacht`-regel. Testadressen: `?loopnu` (meteen lopen), `?tempo=4` (sneller), `?stil` (geen beweging).
- **Beperkingen.** Benen van voren gezien kunnen niet echt buigen: de stap is een schuine verschuiving met een knik waar een rij wegvalt. Hondje en katje zitten op het blad, dus hun "lopen" is een getrippel van de pootjes onder een zittend lijf. Bij echte maat zijn katje, kameleon, salamander, parkiet en haaitje maar 25–30 schermpx groot; 1 artpx is dan minder dan een schermpixel, dus hun bewegingen zijn klein en zacht. De staart van het hondje laat bij de grootste uitslag soms een los puntje zien.

## Optie: Hidde op stage tijdens een Uurwerk-timer

Idee: loopt Hidde's Uurwerk-timer op een stageproject, dan is Hidde niet thuis. Op de deur hangt dan een bordje "Hidde is op stage tot 18:00" en Tessie ziet alleen haar eigen figuur.

- **Standaard uit.** Hidde zet het zelf aan, in gewone taal, met een expliciete *ja* (zoals bij de onboarding, app-ontwerp §3.0). Het toont alleen *aanwezig of op stage* en een eindtijd: geen projectnamen, geen uren, geen screenshots.
- **Fase 1 heeft Uurwerk niet nodig.** De status kan uit de werktijden in de instellingen komen ("stage ma–vr 09–18", app-ontwerp §2.1).
- **Live timer pas met fase 4.** Uurwerk duwt dan alleen `{ actief, tot, label: 'stage' }` naar een smal Pixel Quest-endpoint, met een PQ-koppeltoken met één scope. **Pixel Quest krijgt nooit het device-token van Uurwerk** (dat heeft geen scope en geeft toegang tot alle uren en screenshots; app-ontwerp §4.4). Komt er 15 minuten geen update, dan geldt "thuis".
- Niet gebouwd in dit prototype.

## Open punten

0. **Beweging.** Hidde en Tessie lopen door de doorgesneden muren (er zijn geen deuren) en wisselen niet van verdieping (de trap wordt niet gebruikt). "Naar een meubel van een taak" is een willekeurige taak, niet de taak die aan de beurt is.

1. **Prijzen en pad.** Zijn de prijzen goed (samen 11.900, ~40 weken volle pot; de villa alleen al 10 weken)? Moeten verbouwingen en outfits uit dezelfde pot komen, of krijgt het huis een eigen spaarpotje? Telt geld dat voor een verbouwing gespaard wordt mee als "besteed" in de pot-meting (70–100%)? Anders voegt de inflatierem ten onrechte items toe.
2. **Kopen met z'n tweeën.** Is een akkoord van allebei verplicht? En wie bepaalt waar de nieuwe meubels komen?
3. **Gedeelde staat.** De inrichting en het niveau staan nu per apparaat in localStorage. In de echte app horen die op de server (een tabel `huis_inrichting`), met live sync.
4. **Breedte.** De villa is 2088 artpx breed (4176 schermpx op 2×); het huis scrolt dan in zijn venster, ook op een breed scherm. Overweeg Tiny Tower-scrollen per verdieping, een zoom per kamer of een "overzicht" op 1×.
5. **Pets.** Het prototype toont 7 pets; in fase 3 alleen de uitgekomen pets. "Op logeerpartij" komt in het pad niet meer voor, alleen bij een handmatige verbouwing naar een lager niveau (test).
6. **Oude opslag.** Een opgeslagen staat van het vorige pad (zolder, serre, toren) laadt nog: meubels in een kamer die niet meer bestaat gaan in de doos. Na *Indeling herstellen* klopt alles weer.
7. **Deuren.** Kamers hebben geen deuropeningen; bewoners en pets lopen door de doorgesneden muren. Een deuropening per tussenmuur maakt het geloofwaardiger.
8. **Taak ↔ meubel.** Welke sjablonen krijgen een meubel? Taken zonder meubel (administratie) kunnen bij het klembord.
9. **Toetsenbord.** Met de pijltjes kan een meubel nog niet naar een andere kamer.
10. **Figuurvarianten** (hoodie en avonturier) zijn in het huis nog niet te kiezen; alleen recolor-outfits.
11. **Test.** Headless Edge maakt de viewport ná de virtuele tijd breder (1376 → 1400). Op schermafbeeldingen staat daardoor een smalle rand naast de scene. In een echte browser tekent een ResizeObserver de scene dan opnieuw.

## Getest

- Villapad (11 okt 2026): headless Edge met `?test&poster` voor niveau 1, 4, 7 en 10, overdag (12 uur), 's avonds (20 uur) en 's nachts (23 uur), plus niveau 2 en 6; uitsneden op 2× bekeken in vier verbeterrondes (muurruis, luchtbanden, dakhoogte en pannen, dakkapellen, zwembad, haag, ligbed, hoofdbord, ficus, lichtsterkte, lichtkegels, een tegelvoeg die buiten de muur liep). Verder: 500 px op niveau 10, Verbouwen op 1400 px en op 500 px (niveau 4), `?niveau=8&uur=22` (voorbeeld) en `?verbouw=10&bewerk&markeer`. Overal 0 JS-fouten en geen horizontale scroll van de pagina.
- Met node: `verbouw()` stap voor stap 1→10 en in één sprong 1→10: de doos blijft overal leeg, geen pet op logeerpartij; bed, kast en terrarium altijd geplaatst.
- Beweging (11 okt 2026): filmstrip (`huis-filmstrip.html?test`, 4× en 6×) in drie verbeterrondes bekeken: (1) een lichte naad in de broek bij de deining (afronding van romp en benen gelijkgetrokken) en een verkeerde beenscheiding (Hidde's benen staan schuin; nu per rij gevolgd), (2) losse pixelkolommen naast de buitenste poten (pootvakken tot de rand van het sprite) en een te grote staartuitslag (hondje 3 → 2), (3) stoppen in de passeerhouding in plaats van midden in een pas, en meer afstand tussen Hidde en Tessie (24 → 34 artpx). Met CDP in echte tijd gemeten dat posities en frames doorlopen: 0 JS-fouten op 1400 en 500 px, niveau 5 en 10, 's nachts (kat in de mand, parkiet stil onder de doek), aaien, bewerkmodus en reduced motion (alles stil, de oude statische route).
- Eerder (versie met losse huizen): CDP-tests voor slepen (muis en touch), pijltjes, verhuisdoos, taak afronden en ongedaan maken, pet aaien, herladen en reduced motion. Die zijn na het villapad niet opnieuw gedraaid.
