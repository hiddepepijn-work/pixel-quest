# Pixel Quest – QA van de app-UI

11 okt 2026, branch `app-ui`, onafhankelijke test vóór de eerste uitrol op de twee iPhones (SideStore, Capacitor-webview). Getest als gebruiker op telefoonformaat in Edge (puppeteer-core, headless) op **390×844** en **430×932**, `isMobile`/`hasTouch`, deviceScaleFactor 3. De gebouwde `dist/` is getest via een lokale http-server (zoals `capacitor://localhost`) en als rooktest via `file://`. Spelregels zijn nagerekend tegen [puntensysteem.md](puntensysteem.md).

**Oordeel: klaar voor uitrol: ja**, op voorwaarde dat de eerste installatie op één iPhone eerst de korte checklijst onder *Niet testbaar* doorloopt (safe-areas na de `contentInset`-wijziging, knijpen, toetsenbord). Er staan geen bekende blokkerende fouten meer open; wat openstaat zijn ontwerpkeuzes en verbeteringen.

## Gevonden problemen

Ernst: **blokkerend** = een flow of scherm werkt niet, **hoog** = verkeerde uitkomst of duidelijk kapot op een gewone iPhone, **middel** = storend, **laag** = klein of cosmetisch.

| # | Probleem | Ernst | Gerepareerd | Commit |
|---|---|---|---|---|
| 1 | **Sheet groter dan het scherm.** Bij "Nieuwe taak" met *Meer: tijd, zwaarte, plek* open (en bij elke lange sheet) viel de voet met **Op het bord / Opslaan** onder het scherm: de taak kon niet worden opgeslagen. `max-height: 100%` werkte niet in een auto-rij van het grid. | blokkerend | ja | f1c9a09 |
| 2 | **Wit scherm bij beschadigde opslag.** Rommel in `pq-app` (basis geen object, `null` in het log, `taken` als getal, huis als tekst) liet de app bij het opstarten vastlopen (`Cannot create property 'taken' on number`). Zonder localStorage (privévenster) werd "Wie ben jij?" niet onthouden en deed geen enkele knop iets. | blokkerend | ja | 9339395 |
| 3 | **Meer te breed op 390 px** (iPhone 12–15): de twee datumvelden van *Ziek of afwezig* rekten elke kaart 22 px op; de rechterkant van alle kaarten en knoppen viel weg. Op 402 px (de oude testmaat) was het niet te zien. | hoog | ja | 93ee010 |
| 4 | **Rustweek aankondigen breekt de streak achteraf.** Had een gemiste week de rustweek van de maand al automatisch gebruikt, dan kon je er tóch nog een aankondigen; dat haalde de automatische rustweek weg en verlaagde streak **en record** met terugwerkende kracht (gemeten: streak 2 → 1, record 2 → 1). Strijdig met §8 (één per maand, record blijft). | hoog | ja | 6281a5c |
| 5 | **Startweek kost de rustweek.** Wie de app op zondag installeert, haalt die halve week nooit; de app zette dan de rustweek van de maand in, zodat de eerste echte gemiste week die maand de streak brak. Nu een *aanloopweek*: niet gehaald kost niets. (Het puntensysteem zegt hier niets over; gekozen in de geest van §1.5 "geen straf".) | middel | ja | 9ee07d9 |
| 6 | **Taaksignaal over een gezicht.** De ?-bubbel hing 3 artpx boven het meubel; bij de bank en het keukenblok viel hij over het gezicht van Hidde of Tessie. Hij hangt nu altijd boven de kruin van de grootste bewoner (compact én op Huis, elke zoomstap; gemeten op 12 + 32 momenten terwijl ze lopen). | middel | ja | bd13a09 |
| 7 | **Elke taak had de gieter als icoon.** Nu per soort taak uit de bestaande items (bezem, klembord, rugzak, gieter, hart, plant, ster; munt alleen handmatig), en zelf te kiezen in het formulier (*Icoon*, standaard "Vanzelf"). Niets nieuw getekend. | middel | ja | ca31d04 |
| 8 | **Lettertypen via Google Fonts.** Zonder internet vielen alle koppen terug op Courier New, en elke start vroeg de fonts op bij Google. Pixelify Sans en Nunito (OFL) staan nu lokaal in `assets/fonts/`. | middel | ja | 9568304 |
| 9 | **`contentInset: automatic`** in `mobile/capacitor.config.json` naast een full-bleed app met `viewport-fit=cover` en eigen `env(safe-area-inset-*)`: risico op een dubbele rand of een verschuifbare pagina. Nu `never`. Nog te bevestigen op een iPhone. | middel | ja | e6b9515 |
| 10 | **Inhoud onder de statusbalk.** Bij scrollen liep de lijst onder de klok en batterij door. Een vaste crème strook ter hoogte van de safe-area houdt die vrij. | middel | ja | 93ee010 |
| 11 | **Plakkende hover op iOS.** `.knop:hover` (uit `huis.css`) bleef na een tik geel staan. Nu alleen bij `@media (hover: hover)`. | middel | ja | 8439aaf |
| 12 | **Invoervelden onder 16 px** (breedte- en lengtegraad in de omgevingsbediening): iOS zoomt dan in bij focus. Nu 16 px. Alle andere velden waren al ≥ 16 px. | laag | ja | 8439aaf |
| 13 | **Exporteer (JSON)** gebruikte `<a download>` met een blob; dat doet niets (of navigeert weg) in WKWebView. In de app toont hij nu de tekst met *Kopieer*. | middel | ja | e397f15 |
| 14 | **Melding over de kop van een sheet.** Met een sheet open staat de melding bovenin, over de titel en de sluitknop (bv. de zoomuitleg bij de eerste keer Verbouwen). Een tik op de melding haalt hem nu weg. | laag | ja | e397f15 |
| 15 | **Terugblik op maandag leeg.** Zondagavond begonnen, maandag verder: de terugblik opende op de nieuwe week. Nu opent hij op vorige week tot die onthuld is. | laag | ja | e397f15 |
| 16 | **Huis niet op hele pixels in rust** (bv. `ty = -264,54 px`); op een 3×-scherm kan WebKit de laag dan uitsmeren. Nu afgerond op 1/devicePixelRatio na elk gebaar. | laag | ja | 51402bf |
| 17 | **Voorbeeldbalk van een verbouwing over de knoppen** van de bovenbalk als die op 390 px over twee regels loopt. | laag | ja | 93ee010 |
| 18 | Kleine stille knoppen (*Verwijder taak*, *Tessie vult in*) hadden een losse donkere schaduwstreep. | laag | ja | ca31d04 |
| 19 | Lang drukken op een icoon of knop gaf tekstselectie of het iOS-menu "Bewaar afbeelding". | laag | ja | 91041c1 |
| 20 | **Kast: kopen met te weinig munten** toonde een actieve knop "Kopen: 30 munten" en pas na de tik een fout. Nu vooraf "Nog N sparen" (uit), net als bij Verbouwen. | laag | ja | 91041c1 |

Spelregels die wél kloppen met het puntensysteem (nagerekend): inzet = minuten × (1 + 0,3·zwaarte) met de sjabloonwaarden uit §3 (badkamer 72, vaatwasser 13, fietsband 52); golden A (693 van 600, Hidde 316, Tessie 377) en B (norm 514, drempel 411, 416 = gehaald); 80%-drempel; samen-taak telt één keer volledig; privé telt niet; claim tot het eind van de volgende dag of de deadline; streak, automatische rustweek en record; huispot 0,5 × min(inzet, norm) per week, aankoop pas na akkoord van de ander en nooit onder nul; draakje komt uit na de eerste gehaalde week, konijntje na 2; XP van een nieuw pet telt vanaf het moment dat het meeloopt; bedankje levert niets op; tekst van de terugblik gewist na onthullen, cijfers blijven.

## Testmatrix

Laatste volledige run na alle fixes: **182 controles goed, 0 fout** in `tools/qa` (13 scripts op 390 en 430 px), `node tools/test_regels.js` alles goed (17, waarvan 5 nieuw), en `tools/test_app.js` 46 goed op zowel `app/` als `dist/`.

Alle scenario's draaien op de gebouwde `dist/` via http, tenzij anders vermeld. **✓** = getest en goed (na de fixes), **–** = niet van toepassing.

| Scenario | 390×844 | 430×932 | file:// | Hoe |
|---|---|---|---|---|
| Eerste start, "Wie ben jij?" | ✓ | ✓ | ✓ | flows1 |
| Profiel wisselen (avatar → Meer → Wissel) | ✓ | ✓ | – | flows1 |
| Taak maken (lange titel, *Meer* open), bewerken, verwijderen | ✓ | ✓ | – | flows1 |
| Claimen, "Kun jij, Tessie?", Tessie zegt ja en rondt af, badge, bedanken | ✓ | ✓ | – | flows1 |
| Afronden met feestje, "Ongedaan maken" (totaal terug, taak terug) | ✓ | ✓ | – | flows1 |
| Terugkerende taak: weg na afronden, dorstig na 2,2 d, hangend na 3,5 d (klok verzet) | ✓ | – | – | flows2 |
| Weekwissel: gehaald → streak 1; gemiste week → automatische rustweek; ziek 2 dagen → norm 514; tweede gemiste week → streak 0, record 2; rustweek vooraf | ✓ | – | – | flows2 |
| Zondagterugblik 20:00: cijfer + tekst, de ander vult in, onthullen, gespreksvraag bij verschil 3, tekst gewist | ✓ | – | – | flows2 |
| Terugblik maandag na zondag beginnen | ✓ | – | – | klein |
| Verbouwen: lege pot (knop uit, melding in gewone taal), voorstel, akkoord door Tessie, −400 | ✓ | – | – | flows3 |
| Kleding: te weinig munten (melding), voorstel, akkoord in de Kast | ✓ | – | – | flows3 |
| Collectie, ei-sheet, pet een naam geven, laten meelopen, zichtbaar op Vandaag | ✓ | – | – | flows3 |
| Reset (welkom, leeg log) | ✓ | – | – | flows3 |
| Knijpen op Vandaag: geen paginazoom (`visualViewport.scale` = 1) | ✓ | ✓ | – | gebaren |
| Huis: knijpen (CDP-touch, twee vingers) → vastklikken op hele stap, pannen, dubbeltik → 3×, +/−, alles in beeld | ✓ | ✓ | – | gebaren |
| Scherpte na zoomen: `scale(1)`, hele schermpixels, pixelated/crisp-edges | ✓ | ✓ | – | gebaren |
| Bewerkmodus: meubel slepen boekt `huis.inrichting` en pant niet | ✓ | ✓ | – | gebaren |
| Signalen nooit over een gezicht (compact + Huis bij 4 zoomstanden) | ✓ | ✓ | – | signalen |
| Viewport-meta (`viewport-fit=cover`, `user-scalable=no`), overscroll none/contain, `touch-action` | ✓ | ✓ | – | gebaren |
| Safe-areas nagebootst (59 px boven, 34 px onder): koppen onder de notch, tabbalk en sheet-voet boven de home-indicator | ✓ | ✓ | – | tour |
| Geen horizontale scroll per scherm | ✓ | ✓ | – | tour, breed |
| Tekstvelden ≥ 16 px, geen `:hover` buiten `(hover: hover)` | ✓ | – | – | robuust |
| Rommel in `pq-app`, `pq-apparaat`, `pq-kk-*`, `pq-huis-staat` (13 varianten) | ✓ | – | – | robuust |
| Geen localStorage (gooit) en vol geheugen (QuotaExceeded) | ✓ | – | – | robuust |
| Offline: Google onbereikbaar, lokale fonts geladen | ✓ | – | – | perf |
| Performance met CPU 4× trager; huis buiten beeld stil | ✓ | – | – | perf |
| Export in de app (Capacitor nagebootst), melding wegtikken | ✓ | – | – | klein |
| 0 JS-fouten en 0 onafgevangen promise-rejections op elk scherm en elke sheet | ✓ | ✓ | ✓ | alle |
| Bestaande tests: `node tools/test_regels.js` (+5 nieuwe), `tools/test_app.js` op `app/` en `--dist` | ✓ | – | ✓ | node, Edge |

### Performance (Edge headless, CPU 4× trager)

| Meting | Uitkomst |
|---|---|
| Vandaag met het compacte huis (lopers, pets, weer) | frametijd p50 4 ms, p95 4 ms, max 17 ms; geen lange taken |
| Huis volledig scherm | p50 4 ms, p95 4 ms, max 16 ms; geen lange taken |
| Inzoomen met de knop (hertekenen op de nieuwe schaal) | één lange taak van ~120 ms bij 4× trager (≈ 30 ms op een echte telefoon): een kort haperinkje na het vastklikken |
| Quests en Meer (huis buiten beeld) | 0 animatieframes van het huis, 0 timers in 3 s: het huis pauzeert echt |

Headless Edge synchroniseert niet met een scherm, dus de frametijd zegt vooral dat het werk per frame klein is; de echte vloeiendheid moet op de iPhone worden gezien. Het huis stopt ook bij `document.hidden` (app op de achtergrond).

## Niet testbaar (alleen op een echte iPhone)

Een echte iPhone met iOS 17/18 en SideStore was niet beschikbaar. Wat daarom nog op het eerste toestel moet worden bekeken, in deze volgorde (± 10 minuten):

1. **Safe-areas na `contentInset: never`** (fix 9): staat de kop onder het eiland, de tabbalk boven de home-indicator, en scrolt de pagina als geheel niet mee (geen rubberband van de hele app)? Is de crème statusbalk-strook goed (fix 10)? Mocht er een dubbele rand zijn: terug naar `automatic` is één regel.
2. **Knijpen en pannen op Huis** met echte vingers in WKWebView: zoomt alleen het huis, niet de pagina; vastklikken zonder flits; dubbeltik; scherp na het zoomen.
3. **Toetsenbord**: taak maken met het toetsenbord open (blijft *Op het bord* zichtbaar, schuift de sheet mee), geen inzoomen bij focus.
4. **Datum- en tijdkiezers** (deadline, tijdslot, ziek van/tot) met de iOS-wielen.
5. **Lang drukken** op een taakicoon (geen "Bewaar afbeelding"), het gevoel van de knoppen, VoiceOver kort.
6. **Opslag**: app sluiten en weer openen, en na een SideStore-verversing (elke 7 dagen) is alles er nog. Export → Kopieer werkt.
7. **Twee telefoons tegelijk**: kan niet, er is geen server; elk toestel heeft zijn eigen log. Goedkeuren "namens de ander" is daarom een testknop.

Ook niet getest: Android, Safari op de Mac, echte netwerkstoringen (alleen "Google onbereikbaar"), de batterij over een hele dag, en de debugpagina's (`assets.html`, `huis.html`, `kledingkast.html`, `huis-filmstrip.html`) op de telefoon. Let op: vanuit Meer → debug navigeer je in de app weg zonder terugknop van iOS; `huis-filmstrip.html` heeft geen link terug (app opnieuw starten helpt).

## Open punten (niet gerepareerd: ontwerp of keuze)

1. **"NIEUW GETEKEND"-labels** staan in de Kast op bijna elk item. Dat is een label voor de bouwer, niet voor jullie; weghalen of vervangen door "nieuw" alleen voor echt nieuwe items.
2. **Verbouw-voorbeeld** toont de nieuwe kamer niet vanzelf in beeld (je ziet de woonkamer) en *Kopen* staat aan bij een lege pot. Bij Bekijk naar de nieuwe kamer pannen.
3. **Prikbordkaarten zijn hoog**: "Ik pak het" staat op een eigen regel onder de labels. Een compactere rij (knop rechts naast de inzet) zou de lijst rustiger maken.
4. **Rustweek-week levert geen munten op**: bij norm 0 is 0,5 × min(inzet, 0) = 0, ook als jullie die week wel iets doen. Puntensysteem §10 zegt "tot maximaal de weeknorm"; bedoeld of niet?
5. **Import ontbreekt**: Exporteer is er, terugzetten niet. Bij een nieuwe telefoon of verlies van de app-opslag is er dus nog geen herstel (komt met de server).
6. **Debugpagina's in de app**: overweeg ze te verbergen in de iPhone-build of overal een terugknop te geven.
7. **Zoomuitleg bij de eerste keer Huis** verschijnt na 600 ms, ook als je meteen Verbouwen opent; dan staat hij bovenin over de sheet (nu wel weg te tikken).
8. **"Tessie keurt goed (op dit apparaat)"** en "Tessie vult in (op dit apparaat)" zijn testknoppen zolang er geen server is; met twee echte telefoons moeten ze weg, anders kan de een namens de ander goedkeuren of het privé-cijfer invullen.

## Schermafbeeldingen

`test-uitvoer/qa/` (niet in git): `v390-*` en `v430-*` zijn de rondgang langs elk scherm en elke sheet met nagebootste notch en home-indicator (rode zones); `a*`/`b*` de flows, `c*` de klok-scenario's, `d*` winkel en collectie, `g*` gebaren, `s*` signalen, `r-*` zonder opslag, `o*` offline, `k*` export.

## Opnieuw draaien

```
npm i puppeteer-core@23 --prefix <map buiten de repo>
PQ_PUPPETEER=<map>/node_modules/puppeteer-core bash tools/qa/alles.sh
```

`tools/qa/` bevat de scripts van deze ronde (hulp, flows1–3, gebaren, signalen, robuust, perf, klein, tour, breed). De klok wordt verzet via `localStorage['qa-klok']` (offset in ms, alleen in de test). `tools/test_app.js` en `node tools/test_regels.js` blijven de snelle controle.
