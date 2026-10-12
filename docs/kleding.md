# Kleding en outfits

Open `app/kledingkast.html` (dubbelklik, werkt via file://). Opnieuw genereren:

```
C:\Users\hidde\miniconda3\envs\segment-reviewer\python.exe tools\uitsnijden.py
C:\Users\hidde\miniconda3\envs\segment-reviewer\python.exe tools\kleding.py
C:\Users\hidde\miniconda3\envs\segment-reviewer\python.exe tools\kast.py
C:\Users\hidde\miniconda3\envs\segment-reviewer\python.exe tools\kast_contactvel.py
node tools\test_kast_auto.js
node tools\kast_bron.js            (met PQ_PUPPETEER, zie *Controle en contactvellen*)
```

`kleding.py` leest de uitvoer van `uitsnijden.py` en verandert daar niets aan. `uitsnijden.py` is niet gewijzigd. `kast.py` leest de uitvoer van beide en verandert die ook niet.

## Kast: modulaire kleding per slot

Dit volgt de spec *Kleding, weer, seizoenen en feestdagen* (pagina 1–3 en 10). `tools/kast.py` maakt de catalogus `assets/kast.js` (`window.PQ_KAST`, met ingebedde PNG's) en `assets/kast.json` (leesbaar). Alle itemlagen staan in `assets/kast/`. Wat nog getekend moet worden, staat in `docs/kleding-art-brief.md`.

**Datamodel per item:** `{ id, slot, lichaam, sprites: { hidde, tessie }, kleuren, prijs, set_id, tags, zeldzaamheid }`, zoals in de spec. Extra velden: `herkomst`, `status` (`klaar` of `wacht_op_art`), `maskers`, `knip`, `modus`, `stats`, `bron`, `startkast`, `onder_haar`, `onder_jas`, en voor kleding met een eigen vorm `wis`, `huid` en `over_kleding` (zie *Kleding met een eigen vorm*). Bestaande velden zijn niet hernoemd.

- **Slots:** hoofd, boven, jas, onder, heel_lichaam, schoenen, accessoire.
- **Laagvolgorde:** lichaam, schoenen, onder, (heel lichaam), boven, jas, haar, accessoire, hoofd. Direct boven het lichaam komen eerst de huid-onderlagen (blote benen, buik, enkels). `heel_lichaam` verbergt boven en onder, behalve een item met `over_kleding` (schort): dat komt direct boven de bovenkleding. De laag `haar` bestaat uit het haar van het lichaam plus de outline die eraan grenst. Die laag wordt boven de jas opnieuw getekend, zodat Tessies krullen over de schouders vallen. Een sjaal of tas kan eronder (`onder_haar`), het kettinkje onder de jas (`onder_jas`).
- **Haar onder hoofddeksel:** voorlopig een knipmasker per hoofddeksel (`*_k.png`). Haar en haar-outline van het lichaam vallen daar weg, zodat er geen krul door een muts steekt.
- **Sprites:** PNG op hetzelfde canvas als het lichaam (native 64 × 112, anker 32,108). Op de bronversie wordt elk artpixel een blok via `native_naar_bron`, net als bij de accessoires. Uitgesneden items hebben ook een exacte bronversie.
- **Kleuren via masker:** 0 = vaste kleur. 50/100/150/200/250 = toon o/a/b/c/h op de ramp van de gekozen kleur (modus `toon`, handgetekende items, scherpe paletkleuren). 255 = luminantie-recolor zoals bij de zones (modus `luminantie`, uitgesneden items).
- **Prijzen** volgen de spectabel (hoofd, schoenen en accessoire 20–40; boven en onder 30–60; jas en heel lichaam 50–90). Sets hebben 3–4 items.
- **Startkast** (gratis): T-shirt, broek, sneakers en pyjama. Tessie krijgt ook haar kettinkje, want dat zit al in het goedgekeurde figuur.

**Controle:** `kast.py` rendert twee vaste testlooks (`samenstel`, met dezelfde regels als de JS). De kledingkast tekent ze opnieuw met `tekenLook` en vergelijkt pixel voor pixel. De voettekst meldt nu "hidde OK (max 0), tessie OK (max 0)". `tools/kast_bron.js` doet hetzelfde voor 84 looks (zie *Controle en contactvellen*).

### Items per herkomst

| Herkomst | Items |
|---|---|
| **Uitgesneden** (4), uit de goedgekeurde sprite via de zonemaskers | `tshirt_basis`, `broek_basis`, `sneakers_basis`, `ketting_basis` (alleen het hangertje; de riemgesp blijft in het lichaam) |
| **Nieuw getekend** (34), op het native raster | hoofd: petje, beanie, bucket hat, koptelefoon, kroontje, haarband\*, strik\*, baret\*, haarclip\*; boven: longsleeve, trui, hoodie, overhemd, blouse\*, cardigan\*; jas: spijkerjas, puffer, regenjas, teddyjas\*; onder: jeans, joggingbroek, legging\*, wijde broek\*; heel lichaam: pyjama, onesie, schort, overall\*; schoenen: laarzen, enkellaarsjes\*; accessoire: bril, sjaal, tas, handschoenen, oorbellen\* (\* = alleen Tessie) |
| **Nieuw getekend (incl. huid)** (6): het item tekent ook blote huid in de huidtinten van dat figuur | crop top\* (buik), korte broek (benen), rok\* (benen), jurk\* (benen), sloffen (enkels), ballerina's\* (wreef en enkels) |
| **Wacht op art** | niets meer |

### Kleding met een eigen vorm: wis- en huidlagen

**Probleem.** Het lichaam is het complete goedgekeurde figuur, inclusief de wijde broek en het T-shirt. Een laag kan alleen iets óver het figuur tekenen. Een rok of korte broek wordt dan nooit smaller dan de wijde broek, en een lange mouw nooit slanker dan de korte, wijde T-shirtmouw.

**Oplossing.** Een item kan twee extra lagen hebben (renderfix in `app/figuur.js` `tekenLook`, gelijk in `kast.py` `samenstel`):

- `wis` (`<id>_<h|t>_w.png`): lichaamspixels die wegvallen onder dit item. Dat is de originele kledingzone plus de outline eromheen (twee pixels ver), zonder handen, hoofd, haar en ogen. Uitgesneden items (T-shirt, broek, sneakers) zijn een kopie van het lichaam en vallen daar ook weg. Een jas wist dus ook de korte T-shirtmouw eronder. Het masker gaat één cel verder over lege native cellen. In native verandert dat niets, maar op de bronversie vallen zo ook de oude outlinepixels weg die net over de celgrens liggen.
- `huid` (`<id>_<h|t>_s.png`): blote huid in vaste kleuren, direct boven het lichaam en onder schoenen en kleding. Laarzen komen dus over blote benen, en een lange broek valt over de enkels van sloffen. De tinten komen uit de huidzone van dat figuur (p4, p22, p55 en p90, plus een donkerbruine outline). De benen blijven binnen de omtrek van de originele broek en sluiten aan op de schoenen.
- `over_kleding: true` (schort): het item zit in `heel_lichaam` maar verbergt boven en onder niet. Het wordt direct boven de bovenkleding getekend, onder jas en haar.

Lichte randpixels van het haar (halo tegen de lichte achtergrond van het blad) vallen onder kleding ook weg. Anders ogen ze als witte spikkels op een mouw.

### Hoe het nieuwe werk getekend is

- **Hoofddeksels, bril, sjaal, tas, oorbellen:** met de hand gezet in pixelrijen (`tools/kast_hoofd.py`, `tools/kast_acc.py`), per figuur apart. De baret heeft nu volume (dome met overhang, schuin naar achteren) en een gestikte band. Het oorhangertje is een knopje met een gouden druppel die onder de krul uitkomt.
- **Kleding die de vorm verandert** (`tools/kast_vorm.py` als tekenmotor, met `kast_boven.py`, `kast_onder.py`, `kast_heel.py`, `kast_schoen.py` en `kast_jas.py`): elk stuk is per lichaam opgebouwd uit veelhoeken op het native raster (romp, mouwen, heup, pijpen, voeten). De vormen zijn met de hand gemeten aan de zonekaart. Mouwen eindigen bij de pols (Hidde rij 69, Tessie rij 70); de handen blijven van het origineel. Hidde kijkt naar rechts en Tessie naar links: kraag, capuchon, borstzakje en schoenneuzen zijn per lichaam geplaatst, niet gespiegeld. Elk stuk krijgt licht van linksboven (lichte binnenrand links en boven, schaduw rechts en onder, een glanspixel), een vaste donkere getrapte outline (`#231c22`) en 3–5 tinten van de ramp. Naden, plooien, ribboorden, knopen, zakken, koordjes en kabels zijn met de hand gezet als pixelclusters.
- **Jassen:** opnieuw getekend met een eigen silhouet. Ze zijn langer (spijkerjas tot de heup, puffer tot het bovenbeen, regenjas tot halverwege het bovenbeen in A-lijn), hebben mouwen tot de pols en zijn ruimer dan elk bovenstuk, zodat een hoodie of trui er niet onderuit steekt. De capuchon van de hoodie mag boven de kraag uitkomen. De regenjas gebruikt alleen basis, licht en glans (geen ramp-schaduw, dus geen olijftint bij goud). De teddyjas is zacht pluche: lage ruis in basis en licht, een donkere schaduwkant, pluisjes net buiten de outline en een gladde, lichte kraag.
- **Handschoenen:** de vorm van de goedgekeurde handen uit de zonekaart, met een nieuwe tint en een manchet.

### Per item: herkomst en wat nog zwak is

| Item | Herkomst | Zwak / let op |
|---|---|---|
| longsleeve | nieuw getekend | romp blijft vrij hoekig (volgt de brede T-shirtschouders) |
| trui | nieuw getekend | kabels zijn eenvoudig (twee zigzagbanen) |
| hoodie | nieuw getekend | capuchon bij Hidde is een bult achter de nek; bij Tessie valt hij onder de krullen. Het hangertje van de ketting valt over het hartje |
| overhemd | nieuw getekend | kraag in crème is weinig zichtbaar op crème |
| crop top\* | nieuw getekend (incl. huid) | navel is één pixel |
| blouse\* | nieuw getekend | pofmouwtjes zijn hoekig; kraagje klein |
| cardigan\* | nieuw getekend | mouwen zijn grotendeels bedekt door de krullen en ogen daar druk; in de opening blijft het originele bruine shirt (niet het gekozen T-shirt) |
| spijkerjas | nieuw getekend | breed op de schouders |
| puffer | nieuw getekend | ronde zoom en slankere mouwen, maar bij Hidde nog vrij blokvormig |
| regenjas | nieuw getekend | regenkap in de nek; oogt licht en vlak (bewust zonder donkere schaduw) |
| teddyjas\* | nieuw getekend | textuur oogt op donkere kleuren (hazelnoot, lavendel) wat vlekkerig |
| jeans | nieuw getekend | rechte pijp, wijder dan een echte slim fit (volgt de heupbreedte) |
| joggingbroek | nieuw getekend | sterk |
| korte broek | nieuw getekend (incl. huid) | benen zijn een eigen interpretatie (onder de wijde broek bestaat geen omtrek) |
| rok\* | nieuw getekend (incl. huid) | sterk |
| legging\* | nieuw getekend | heupdeel is breed (Tessies heupen met de handen erop) |
| wijde broek\* | nieuw getekend | lijkt bij crème op een rokbroek |
| pyjama | nieuw getekend | sterk |
| onesie | nieuw getekend | oortjes op de capuchon zijn bij Hidde een klein bultje |
| schort | nieuw getekend | halsbandje bij Hidde is kort |
| jurk\* | nieuw getekend (incl. huid) | sterk |
| overall\* | nieuw getekend | bandjes verdwijnen onder de krullen, zoals bedoeld |
| laarzen | nieuw getekend | onder een lange broek zie je alleen de voet: de laagvolgorde van de spec legt schoenen onder de broek |
| sloffen | nieuw getekend (incl. huid) | onder een lange broek zie je een streepje enkel (bedoeld: lage slof) |
| ballerina's\* | nieuw getekend (incl. huid) | strikje is klein |
| enkellaarsjes\* | nieuw getekend | onder de wijde broek bijna onzichtbaar |
| baret\*, oorbellen\* | nieuw getekend (verbeterd) | oorbel zit aan één kant (het andere oor is verborgen) |

### Sets

Elk item hoort bij hoogstens één set. Een set heeft 3–4 items in verschillende slots, zodat je hem compleet kunt dragen. `kast.py` controleert dat (`controleer_sets`).

| Set | Items |
|---|---|
| Basis | T-shirt, broek, sneakers |
| Winterwandeling | puffer, beanie, sjaal |
| Regendag | regenjas, bucket hat, laarzen |
| Chill zondag | hoodie, joggingbroek, sloffen |
| Kantoor | overhemd, jeans, spijkerjas |
| Zomer (`zomerdag`) | petje, korte broek, crop top\* |
| Parijs\* | baret, blouse, rok, ballerina's |
| Herfstdag\* | teddyjas, wijde broek, enkellaarsjes, oorbellen |
| Studiedag | bril, koptelefoon, longsleeve |

Gewijzigd: handschoenen en tas zaten in een set met een tweede accessoire (sjaal, bril). Je draagt maar één accessoire tegelijk, dus die sets konden nooit compleet zijn. De set "Slaapkamer" (pyjama + onesie, allebei heel lichaam) is om dezelfde reden vervallen.

**Tags** voor de automatische kleding: `nacht` (pyjama, onesie, sloffen), `huis` (hoodie, joggingbroek, pyjama, onesie, schort, sloffen), `warm` (beanie, baret, trui, hoodie, cardigan, puffer, teddyjas, onesie, laarzen, enkellaarsjes, sjaal, handschoenen), `regen` (regenjas, bucket hat, laarzen), `sneeuw` (puffer), `zomer` (petje, crop top, korte broek, rok, jurk), `keuken` (schort), `kantoor` (overhemd), `lente` (spijkerjas). De kleur abrikoos is bij blouse en teddyjas vervangen door blad en mos, omdat hij op huidkleur lijkt.

### Controle en contactvellen

```
python tools\kast.py
python tools\kast_contactvel.py     (per slot, combinaties, en test-uitvoer\kast_looks.json)
set PQ_PUPPETEER=<pad>\node_modules\puppeteer-core
node tools\kast_bron.js             (tekenLook in Edge = samenstel, en de bronversie)
```

- `assets/debug/kast_vel_<slot>.png`: elk item in al zijn kleuren op beide lichamen, native 6×.
- `assets/debug/kast_bron_<slot>.png` en `kast_bron_combi.png`: dezelfde looks via `tekenLook` in de bronversie (zoals in het huis).
- `assets/debug/kast_combi_boven_onder_{hidde,tessie}.png` (elke boven × elke onder), `kast_combi_heel.png` (heel lichaam, schort over een hoodie), `kast_combi_jas_hoofd.png` (jas + hoofd + sjaal, om en om met hoodie, jeans en laarzen).
- `kast_bron.js` vergelijkt 84 looks pixel voor pixel: elk item op beide lichamen plus 13 combinaties. Alle 84 zijn exact gelijk. De vaste controle-look (voettekst van de kledingkast) raakt nu alle laagregels: muts met knip, regenjas met wis over het T-shirt, korte broek en rok met huid, sloffen en ballerina's met enkels, crop top met buik, sjaal onder het haar en ketting onder de jas. Uitkomst: "hidde OK (max 0), tessie OK (max 0)".

### Automatische kleding (nog niet aangesloten)

`app/kast-auto.js` bevat `kiesAutoLook(look, omgevingsstatus, bezit, opties)`, een pure functie. Bij regen kiest hij de regenjas, bij sneeuw of vorst de puffer (tag `sneeuw`, anders `warm`). Onder 5 °C komen er een muts en sjaal bij, boven 25 °C de korte broek. Na `huisTijd` (standaard 21:00) of bij `licht.fase = nacht` gaan pyjama en sloffen aan, en jas en muts uit. Na een keukentaak het schort. De functie gebruikt alleen items die je hebt en die getekend zijn. Per persoon is het uit te zetten via `opties.uit`. `tools/test_kast_auto.js` bevat 12 tests, allemaal geslaagd. Pyjama, sloffen, korte broek en schort zijn nu getekend, dus huis-, weer- en taakkleding werken met de echte catalogus.

**Huis:** het huis tekent nog met `tekenFiguur` en leest de oude staat. De kledingkast houdt die staat bij: de kleuren van shirt, broek, schoenen en ketting gaan als zonekeuze mee, eigen items als accessoire. Hoofddeksels, jassen en de nieuwe accessoires verschijnen in het huis pas als `huis.html` `assets/kast.js` laadt en `huis.js` overstapt op `F.tekenLook(c, id, 'bron', F.lookVoor(id))`. Dat zit in de bestanden van de huis-agent en is bewust niet aangeraakt.

## Aanpak

**Zones.** Elk pixel van de bronasset krijgt één zone: `lijn`, `haar`, `huid`, `shirt`, `broek`, `schoenen`, `accessoire` of `detail` (ogen). Dat gebeurt met kleurtests (HSV en luminantie) binnen handmatig gekozen gebieden (`REGELS` in `kleding.py`). De volgorde van de regels bepaalt de uitkomst. Wat geen regel raakt, krijgt de zone van de dichtstbijzijnde gelabelde pixel. Voor losse correcties is er `CORRECTIES` (punt plus zone, zoals `GATEN`); die is nu leeg. De native-zones komen uit hetzelfde raster als `uitsnijden.py`: per artpixel telt de meerderheid van de bronlabels in de cel. `geometrie()` controleert dat de herberekening exact de bestaande assets oplevert.

**Recolor.** De luminantie van elk zonepixel wordt lineair afgebeeld op een ramp van vijf tinten rond één paletkleur. De mediaan van de zone komt op de basiskleur. Het p10–p90-bereik wordt ongeveer 60 luminantie breed (factor 0,5–2,2). Bij heel lichte of donkere doelkleuren schuift de afbeelding zo dat de arcering niet wegklemt. De ramps zijn alleen mengsels van paletkleuren: schaduw naar nacht/titel, licht naar papier/crème. Crème krijgt schaduw via eik en koffie. Daardoor werken zowel het zwarte T-shirt (spreiding 16–19, contrast ×2,2) als de crème broek (spreiding 128–136, contrast ×0,5). De grote spreiding van de broek komt door de donkere vouwlijnen die in de zone vallen. Outline (`lijn`), ogen, haar en huid worden nooit verkleurd. De JS-versie rekent hetzelfde. De voettekst van de kledingkast vergelijkt beide en meldt nu "max verschil 0".

**Ankers** (native canvas 64×112, met de hand gekozen en gecontroleerd in `assets/debug/ankers_zoom.png`):

| | kruin | voorhoofd | ogen | nek | hand links | hand rechts |
|---|---|---|---|---|---|---|
| Hidde | 33,27 | 34,35 | 35,40 | 31,50 | 18,68 | 41,70 |
| Tessie | 28,33 | 27,39 | 26,47 | 26,57 | 17,70 | 37,70 |

Hidde kijkt naar rechts, Tessie naar links. Accessoires worden getekend voor iemand die naar rechts kijkt en worden voor Tessie automatisch gespiegeld. Op de bronversie wordt een accessoirepixel een blok van ongeveer 4,5 bronpx (`native_naar_bron`, kleinste kwadraten over de rastercellen).

## Zonekwaliteit

- **Hidde: goed.** Het shirt (neutraal donker) scheidt schoon van huid en haar. In de broek naast de handen zijn een paar pixels als huid geteld; bij een donkere broekkleur blijven daar enkele crème stipjes over. Schoenen en broek zijn even crème. De schoenen worden daarom op vorm gescheiden (polygonen): de broekzoom over de neus is een rechte grens.
- **Tessie: redelijk tot goed.** Haar en shirt hebben dezelfde bruintinten. De shirtrand is daarom een handgetekende polygoon. Bij de schouders, waar de krullen over het shirt vallen, is die rand een inschatting. De handen op de heupen staan in vaste vakken. De zone `accessoire` bevat het hangertje én de riemgesp (goud), zodat "zilver" beide verandert. Het dunne kettinkje valt in native grotendeels weg: daar blijft alleen het hangertje (6 artpixels) over.
- Controle: `assets/debug/zones_{bron,native}_{hidde,tessie}.png` (links origineel, rechts zonekleuren).

## Wat is gemaakt

| Wat | Waar | Herkomst |
|---|---|---|
| Zonekaarten (grijswaarde = zone-index × 30) | `assets/zones/{bron,native}/` | afgeleid van bronpixels |
| 9 catalogus-outfits (Bosrijk, Zonsondergang, Nachtwacht, Zeebries, Lavendelveld, Goudhaantje, Rollenruil, Hoodiedag, Koffietijd) | `assets/catalogus/{bron,native}/` | recolor, geen nieuwe pixels |
| Hoodie- en avonturiersfiguren (4) | `assets/outfits/{bron,native,referentie}/` | exact uitgesneden |
| Items: gieter, bezem, klembord, ster, plant, hart, rugzak, munt | `assets/items/{bron,native}/` | exact uitgesneden |
| Data voor de pagina | `assets/kleding.js` (met ingebedde PNG's), `assets/kleding.json` (leesbaar) | gegenereerd |
| Kledingkast | `app/kledingkast.html/.js/.css` | nieuw, omgebouwd naar slots |
| Kast: catalogus (44 items), itemlagen, maskers | `tools/kast.py` (+ `kast_teken/_vorm/_hoofd/_acc/_jas/_boven/_onder/_heel/_schoen.py`), `assets/kast.js`, `assets/kast.json`, `assets/kast/` | zie *Items per herkomst* |
| Lagenrenderer `tekenLook` | `app/figuur.js` | nieuw; `tekenFiguur` werkt ongewijzigd |
| Automatische kleding | `app/kast-auto.js`, `tools/test_kast_auto.js` | nieuw, niet aangesloten |

**Outfits van het blad.** Het avonturierspaar staat los van elkaar en is schoon uitgesneden. Het hoodiepaar is één samenhangend stuk. Het is gesplitst met een watershed op donkerte, met een zaadgebied in elk lijf (`HOODIE_ZADEN`). Daarbij gaat iets verloren. Tessies haar ligt over Hidde's rechtermouw: daar mist een strookje mouw met outline. Links onderaan Tessies mouw mist een stukje outline waar de mouwen elkaar raken. Er is **niets bijgetekend**; zie `assets/debug/outfits_splitsing.png`. Alle vier figuren zijn eigen tekeningen op het blad. Gezicht, haar en houding wijken iets af van de goedgekeurde basisfiguren. Hun raster is fijner: 4,02 bronpx per artpixel tegenover 4,54, gemeten en begrensd op 4,0–5,6. In native zijn ze daardoor 92 (Hidde) en 82 (Tessie) artpx hoog, tegenover 85 en 79 bij de basisfiguren. Gebruik ze dus als losse figuurvarianten, niet als frames van de basisfiguur. De items zijn gemeten op 4,1 bronpx/artpixel en staan op een native canvas van 36×36 met het anker op (18, 34).

**Nieuw getekend in `kleding.py`:** de vier oude voorbeeldaccessoires `petje`, `bril`, `kroontje` en `sjaal` (`ACCESSOIRES`, ook als `assets/accessoires/*.json/.png`). Het huis gebruikt ze nog. In de kledingkast zijn ze vervangen door de nieuwe kastitems (zie hierboven).

## Kledingkast

- Character-keuze, bron/native, achtergrond, ankers tonen, PNG van de preview. Onder de preview staat de huidige look per slot.
- **Kast:** tabs per slot met het aantal items. Elke tegel toont het character met dat item aan (uitsnede rond het slot), de prijs of "in bezit"/"draag je", en een herkomstlabel. Wat op art wacht, is grijs. Tik = aantrekken. Heb je het item niet, dan pas je het (gele balk "Je past ..."), en dat wordt niet bewaard.
- **Detail:** prijs, zeldzaamheid, set, tags, voor welk lichaam, kleurswatches (niet-bezeten kleuren gearceerd, ook die kun je passen), Aantrekken/Uittrekken, een testknop "kleur in bezit zetten" (kopen is fase 3) en "Bewerk als kopie" voor getekende items. Uitgesneden items kun je niet uittrekken: het lichaam draagt ze nog zelf.
- Look per persoon in `localStorage` `pq-kk-look`, bezit in `pq-kk-bezit` (per item de kleuren die je hebt). De oude `pq-kk-staat` (zones + accessoires) wordt bijgehouden voor het huis. Alles in try/catch.
- Catalogus (stel-outfits): de startkast in de kleuren van de outfit, voor allebei. "Mijn outfits" bewaart de hele look van allebei. Oude bewaarde outfits (zones + accessoires) worden bij het aantrekken omgezet.
- Pixel-editor op het native raster (max. 40×48): zoals voorheen, plus een **slot** (hoofd, accessoire, jas-overlay). Het ontwerp verschijnt live in dat slot. Bewaren maakt een eigen item (label "eigen") dat in de kast staat. "Bewerk als kopie" laadt een getekend kastitem van het huidige lichaam in de editor.
- Testen via het adres, bijvoorbeeld `kledingkast.html?test&char=tessie&variant=native&slot=hoofd&kies=baret&bezit=alles&hlook=hoofd:beanie:mos,jas:regenjas:goud&tlook=hoofd:baret:bordeaux&bewerk=puffer`. Items uit `hlook`/`tlook`/`look` gaan als test in bezit. `bezit=start` zet de startkast terug.
- Met `?test` toont de indicator het aantal JS-fouten, de look en de lagencontrole.

Getest met headless Edge op 1400 px en 500 px: 0 JS-fouten, geen horizontale scroll, lagencontrole OK. `huis.html?test` en `index.html?test` geven ook 0 fouten.

## Beperkingen

- **Er is nog geen basislichaam in onderkleding.** Het lichaam is het volledige goedgekeurde figuur; kleding met een eigen vorm wist de originele kledingzone (`wis`) en tekent waar nodig huid (`huid`). Uittrekken laat dus nog steeds het origineel zien. Wat onder de wijde broek of het T-shirt zit (benen, buik), is nieuw getekend binnen de omtrek van het origineel en nog niet door Hidde en Tessie goedgekeurd.
- Bij een open item (cardigan) en naast de borstlap van de overall zie je het originele shirt van het lichaam, in de originele kleur: `heel_lichaam` en `boven` vervangen het gekozen T-shirt.
- Schoenen liggen onder de broek (laagvolgorde van de spec). Laarzen "over de broekpijp" kan dus niet; onder een wijde broek zie je alleen de voet.
- Het knipmasker voor hoofddeksels haalt haar weg maar tekent geen plat haar. Onder de rand loopt het haar door zoals in het origineel. Dat is een benadering van de haarvariant "onder hoofddeksel" uit de spec.
- Op de bronversie zijn getekende items blokjes van 4 of 5 bronpx (het blad heeft geen exact raster). Ze zien er iets grover uit dan de figuur. Uitgesneden items zijn op bron wel exact.
- Kopiëren uit een getekend item in de editor geeft vaste kleuren (geen recolormasker) en is per lichaam: een kopie van Hidde's beanie komt bij Tessie gespiegeld op haar kruin, niet precies passend.
- Op de bronversie zijn accessoirepixels 4 of 5 bronpx breed (het blad heeft geen exact raster). Dat ziet er iets grover uit dan de figuur.
- Zones zijn per pixel bepaald, met handmatige gebieden. Nieuwe of andere basisfiguren hebben eigen `REGELS` nodig.
- Een paar pixels in de overgang van hand naar broek horen bij de verkeerde zone (zie zonekwaliteit).
- De pixel-editor is in headless Edge alleen geladen en weergegeven (item laden, live preview in het slot). Tekenen met muis of vinger, opslaan en de downloads zijn niet automatisch getest. Hetzelfde geldt voor tikken in de kast: getest is de toestand via het adres.

## Volgende stappen

1. Laat Hidde en Tessie de catalogus bekijken en schrap of verander outfits die niet bevallen.
2. Teken de twee ontbrekende outlinestukjes van het hoodiepaar op het native raster bij, alleen als dat goed wordt bevonden, en markeer ze als nieuw getekend.
3. Maak een zonekaart voor de figuurvarianten, zodat ook hoodie en avonturier verkleurd kunnen worden.
4. Koppel outfits en items aan beloningen in de taken-app (de munt en de ster als XP-iconen).
5. Kies per accessoire eventueel een eigen verschuiving per character en neem die op in de JSON (`verschuiving`).
6. Alle items zijn getekend. Een basislichaam in onderkleding (`docs/kleding-art-brief.md`; `snij_itemblad` is nog een stub) is alleen nog nodig als de nieuw getekende benen en buik niet goed genoeg zijn.
7. Laat het huis `tekenLook` gebruiken (`huis.html` laadt `assets/kast.js`; `huis.js` roept `F.tekenLook(c, id, 'bron', F.lookVoor(id))` aan) en sluit `kiesAutoLook` aan op de omgevingsstatus.
8. Laat Hidde en Tessie de nieuw getekende items beoordelen, vooral de blote benen en buik (korte broek, rok, jurk, crop top), de teddyjas en de puffer. Zie de tabel *Per item: herkomst en wat nog zwak is*.
9. `tools/qa/hulp.js` maakt per run een Edge-profiel van ±55 MB in `%TEMP%` en ruimt het niet op. Op 12 oktober stonden er 616 (±34 GB) en was de schijf vol. Laat `hulp.js` het profiel na `browser.close()` verwijderen, zoals `tools/kast_bron.js` nu doet.
