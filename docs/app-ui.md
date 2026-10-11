# Pixel Quest – app-UI

11 okt 2026, branch `app-ui`. De losse prototypepagina's zijn één app geworden: `app/index.html`, telefoon-eerst (402×874), met onderin een tabbalk **Vandaag · Quests · Huis · Kast · Meer**. Geen bundler: gewone scripts, werkt via `file://`, op de VPS en in Capacitor. Spelregels volgens [puntensysteem.md](puntensysteem.md) v2; schermen volgens [app-ontwerp.md](app-ontwerp.md) v2.

## Openen, bouwen, testen

- **Openen:** dubbelklik `app/index.html`. Met `?test` zie je rechtsboven de JS-foutenteller; `#huis`, `#kast` enz. opent dat tabblad.
- **Bouwen:** `bash tools/bouw_web.sh` zet de app in `dist/` (`dist/index.html` = de app). De workflow `.github/workflows/ios.yml` roept dit ongewijzigd aan.
- **Testen:** `node tools/test_regels.js` (spelregels, zonder browser) en `PQ_PUPPETEER=<pad>/node_modules/puppeteer-core node tools/test_app.js [--dist]` (de app in Edge; zie *Testscript*).

## Schermen

| Scherm | Wat er werkt |
|---|---|
| **Wie ben jij?** | Bij de eerste start kies je Hidde of Tessie. Het apparaat onthoudt het; wisselen kan onder Meer. |
| **Vandaag** | Bovenaan het huis als levende scène (compact, Z = 1, lopers en pets bewegen; alleen vraagtekens als signaal). Tik = naar Huis. Daaronder *Samen deze week* (X / Y, balk met 80%-streep, streak, huispot), dan *Gevraagd aan jou*, *Jouw quests*, *Samen* en *Op het prikbord* (met "Ik pak het"). Afvinken met de gieter: feestje op de knop, de pot en het pet springen, en 10 s "Ongedaan maken". Onderaan het pet (of ei) met de groeibalk en een recent bedankje. |
| **Quests** | Filters Mijn, Open, Samen, Alles (met aantallen). Groepen *Nu*, *Deze week*, *Later* (ingeklapt) en *Gedaan deze week* (bedanken met ♥). Tik op een taak: details met afvinken, claimen/overnemen, loslaten, "Kun jij, Tessie?", bewerken, verwijderen, laatst gedaan (bedanken, ongedaan). "+ Taak": bottom sheet met sjablonen, Wie (prikbord, ik, samen, vraag de ander), herhalen (~elke n dagen), wanneer (deadline of tijdslot), minuten, zwaarte, soort werk, plek in huis en privé. De inzet rekent live mee. |
| **Huis** | De scène op volledig scherm met zoomen en pannen (zie *Zoom*), knoppen +, − en "alles in beeld". *Verbouwen*: alle 10 niveaus met miniatuur, prijs en voorwaarde; *Bekijk* toont een niveau als voorbeeld, de volgende koop je als voorstel. *Bewerken*: meubels en jullie twee slepen (een lege plek pant), verhuisdoos, indeling herstellen. ☼: weer, seizoen, plaats, altijd dag, feestdagen, weerkleding, placeholders markeren. Signalen hangen boven het meubel of de kamer van de **echte** taken; tik = taakdetails met *Gedaan*. |
| **Kast** | De kledingkast compact: preview van Hidde of Tessie, de look per slot, slottabs, itemtegels, kleuren, stel-outfits, eigen outfits, de pixel-editor en weergave. Kopen: "Kopen: N munten" maakt een voorstel uit de huispot; de ander keurt goed. |
| **Meer** | Profiel (wisselen), open voorstellen, de collectie (14 pets: uitgekomen of ei met voortgang; tik = naam geven of laten meelopen), de weekterugblik (week in woorden, privé cijfer 1–5 met trots/dwars, samen onthullen, gespreksvraag bij ≥ 2 verschil, tekst daarna gewist), instellingen (weekdoel, ziek/afwezig, rustweek, plaats en licht, voorbeeldtaken verwijderen), *Over en sync*, debug (assetcontrole, losse pagina's, testweken) en een reset. |

Alles zonder `alert`, `confirm` of `prompt`: bevestigen gaat via een eigen sheet (`PQUI.vraag`). Foutmeldingen staan in gewone taal onderin (met een sheet open bovenin). Toegankelijkheid: tikvlakken ≥ 44 px, labels op icoonknoppen en sprites, focusval en Escape in sheets, pijltjes in de tabbalk, `prefers-reduced-motion` zet springen, feestjes, glijden en overgangen uit. "Haptisch" gevoel is een korte indruk-animatie (`.tik`); `navigator.vibrate` werkt niet op iOS.

## Bestandskaart

| Bestand | Rol |
|---|---|
| `app/index.html` | De app: views, tabbalk, de markup van de kast, alle scripts in volgorde |
| `app/app.css`, `app/app-schermen.css` | Basis (tabbalk, knoppen, taakrij, sheets, melding) en per scherm |
| `app/store-regels.js`, `store-week.js` | Pure spelregels (`PQRegels`): inzet, week, klok, claims, norm, streak, pot, pet, eieren |
| `app/store-opdrachten.js`, `store-winkel.js` | Opdrachten (`PQOpdrachten.VOER[soort]`): taken, terugblik, weekdoel, afwezigheid, voorstellen, huis, kast, pets |
| `app/store-start.js` | Startstaat met 17 voorbeeldtaken; neemt een eerder huis/kast van de prototypes over |
| `app/store.js` | `PQStore`: log, opbouwen, opslaan, migreren, apparaatinstellingen |
| `app/ui.js` | `PQUI`: elementen, sprites, ei, melding, sheet, vraag, feestje |
| `app/app.js` | Schil: "Wie ben jij?", tabbalk, schermcyclus (maak/toon/verberg/ververs), badges |
| `app/app-taken.js`, `app-taken-sheet.js` | Selectie, taakrij, afronden + ongedaan, detail- en bewerk-sheet |
| `app/app-voorstel.js` | Kopen als voorstel, goedkeuren (ook "namens de ander op dit apparaat") |
| `app/scherm-*.js` | Vandaag, Quests, Huis, Kast, Meer |
| `app/huis.js`, `app/huis-zoom.js` | Het huis als component (`PQHuis.mount`) en zoomen/pannen (`PQZoom`) |
| `app/kledingkast.js` | Ongewijzigde kast-logica, met in de app looks en bezit uit de store |
| `app/assets.html` (+ `preview.js`), `huis.html` (+ `huis-los.js`), `kledingkast.html`, `huis-filmstrip.html` | Debugpagina's, bereikbaar onder Meer |
| `tools/test_app.js` | Scenariotest (Edge, puppeteer-core) |

## De store en het opdrachtenlog

Alles wat gedeeld is, verandert alleen via een **opdracht** `{ id (uuid), soort, data, door, tijd, v }`. `PQStore.doe(soort, data)` probeert de opdracht eerst op een kopie; lukt dat, dan komt hij in het log, wordt de staat bewaard en horen de schermen het. Lukt het niet, dan krijg je `{ ok: false, fout }` in gewone taal ("Er zit nog te weinig in de huispot (nodig: 400)."). De staat wordt altijd **opgebouwd** door het log na te spelen op de basis (`PQStart.basis`); er is geen los saldo, de pot en het weekdoel worden uit de afrondingen afgeleid.

- **Idempotent:** dezelfde `id` twee keer = één keer uitgevoerd (`PQStore.ontvang(ops)` slaat geziene id's over). De opdrachten gebruiken geen `Date.now()` of toeval, alleen `opdracht.tijd`, dus een server kan hetzelfde log later precies zo naspelen.
- **Ongedaan maken** is een eigen opdracht (`taak.ongedaan`) die de afronding markeert; de oorspronkelijke opdracht blijft staan (tegenregel, app-ontwerp §5.5).
- **Opslag:** `localStorage['pq-app'] = { versie: 1, basis, log }` (altijd in try/catch; lukt opslaan niet, dan zegt de app dat). `MIGRATIES[n]` zet een oudere versie om; een kapot bestand wordt bewaard als `pq-app-kapot` en de app begint schoon.
- **Per apparaat** (niet in het log): `pq-apparaat` = wie je bent, het laatste tabblad, het questfilter, de huiszoom.
- **Kleding en huis** staan in de store. Voor `figuur.js` (`lookVoor`) spiegelt de store de looks en het bezit naar de oude sleutels `pq-kk-look`/`pq-kk-bezit`. Een eerder ingericht huis (`pq-huis-staat`) en de oude kast worden bij de eerste start overgenomen.
- **Sync:** er is nog geen server. Meer zegt eerlijk: "Nog niet gesynchroniseerd met Tessie; dat komt met de server." Voorstellen goedkeuren kan daarom ook met "Tessie keurt goed (op dit apparaat)", die de opdracht met `door: tessie` boekt.

| Opdracht | Wat |
|---|---|
| `taak.nieuw`, `taak.bewerk`, `taak.verwijder`, `voorbeelden.weg` | taken (titel, minuten, zwaarte 0–2, eigenaar null/hidde/tessie/samen, interval, deadline, tijdslot, plek, soort werk, privé) |
| `taak.claim`, `taak.los`, `taak.verzoek`, `taak.verzoek.ja`, `taak.verzoek.nee` | prikbord, claimen (tot eind volgende dag of de deadline), overnemen, "Kun jij?" |
| `taak.klaar`, `taak.ongedaan`, `bedank` | afronden, tegenregel, hartje zonder punten |
| `weekdoel`, `afwezig.nieuw`, `afwezig.weg`, `rustweek` | norm (gaat de week erna in), ziek/weg/vakantie, rustweek vooraf |
| `terugblik`, `terugblik.onthul`, `terugblik.wis` | privé cijfer 1–5, samen onthullen, tekst wissen |
| `voorstel.nieuw`, `voorstel.akkoord`, `voorstel.nee`, `voorstel.intrekken` | kopen uit de huispot (verbouwing of kleding) met akkoord van de ander |
| `huis.inrichting`, `kleding.look`, `pet.actief`, `pet.naam` | inrichting na slepen, look per persoon, meeloper en naam |

## Spelregels in code (`store-regels.js`, `store-week.js`)

- **Inzet** = minuten × (1 + 0,3 · zwaarte), afgerond; privé = 0. Samen-taak: het hele getal telt voor de week (ieder de helft, alleen voor de woorden).
- **Week** begint maandag 04:00 (lokale tijd). **Norm** = het weekdoel van die week, min per afwezige dag diens aandeel (50/50 → 600/7/2 ≈ 43), samen weg = 0 voor die dag; een aangekondigde rustweek = 0 (bevroren). Golden test A (693 van 600, Hidde 316, Tessie 377) en B (norm 514) kloppen met node.
- **Gehaald** bij ≥ 80%. **Streak** telt gehaalde weken; een gesloten, niet-gehaalde week gebruikt automatisch de rustweek van die kalendermaand, anders breekt de streak. Het record blijft.
- **Huispot:** per week 0,5 × min(inzet, norm), samen minus de goedgekeurde aankopen.
- **Pet:** XP = samen-inzet sinds het pet meeloopt. Draakje: ei tot de eerste gehaalde week, dan draakje (0), jonge draak (1.500), draak (5.000). Andere pets: baby/jong/volwassen op dezelfde grenzen. Nooit dood, geen straf.
- **Eieren** (§9-tabel): komen uit op samen-mijlpalen (gehaalde weken, bedankjes, taken op tijd, 20× planten, 8× boodschappen, enz.). De soort klus komt uit de titel (`categorieVan`) of een eigen `categorie`.
- **Behoefte-klok:** klok = dagen sinds laatst / interval; fris < 0,7, dorstig < 1, hangend daarboven. Het plant-item uit het blad toont de stand (met tekst), het huis een glinster of vraagteken.

## Zoom (Huis)

`huis-zoom.js` houdt `eff` (schermpx per artpx) en `tx, ty` bij en zet één CSS-transform op de laag met het diorama. Twee vingers knijpen (punt tussen de vingers blijft staan), één vinger pant, dubbeltik zoomt naar 3× of terug naar alles in beeld, Ctrl + scrollwiel of knijpen op een trackpad zoomt op desktop, gewoon scrollen pant. Na een veeg glijdt het beeld uit (traagheid); over de rand is het elastisch en daarna veert het terug.

**Scherpte:** tijdens het gebaar schaalt de transform de laag (alles met `image-rendering: pixelated`). Na het gebaar klikt de zoom vast op een **hele stap** (1×–4×) en tekent het huis zichzelf op die schaal opnieuw (`herteken(Z)`), zodat de transform weer precies 1 is en elke artpixel een heel aantal schermpixels. Onder 1× ("alles in beeld" op de telefoon) is de zoom vrij en schakelt de laag naar zacht verkleinen. Kleiner dan het venster: horizontaal in het midden, de grondlijn op 70% van de hoogte. De stand (zoom en midden) wordt per apparaat bewaard.

**Conflicten:** in de bewerkmodus begint een sleep op een meubel of bewoner een verplaatsing (pointer capture) en pant alleen een lege plek. Een veeg of knijp houdt de klik erna tegen, zodat je niet per ongeluk een signaal opent of een pet aait. Het compacte huis op Vandaag reageert niet op gebaren (de pagina scrolt gewoon).

**Batterij:** er draait maar één huis tegelijk (`PQHuis.mount(...).hervat()` pauzeert het vorige). Verlaat je het tabblad, dan stoppen de loopanimaties, de pet-timers en de weerdeeltjes.

## Testscript

`tools/test_app.js` draait in Edge (headless) via puppeteer-core, eerst als telefoon (402×874, touch) en dan als desktop (1400×900), met een leeg profiel. Laatste run: **46 goed, 0 fout**, zowel `app/` als het gebouwde `dist/` via `file://`. Schermafbeeldingen staan in `test-uitvoer/app/` en `test-uitvoer/dist/` (niet in git).

Getest: eerste start en "Wie ben jij?"; taak maken in de sheet; afronden (feestje, weekdoel +inzet, pot stijgt, melding); ongedaan maken (alles terug); claimen op het prikbord; Huis: knijpen uit en in met twee touchpoints (CDP), vastklikken op een hele stap, pannen met één vinger, "alles in beeld", knop +, zoom bewaard; bewerken (meubel slepen boekt `huis.inrichting` en pant niet, een lege plek pant wel); verbouwing 2 kopen met voorstel en akkoord (−400); kleding (petje) kopen met akkoord; herladen (log, huis, kast, claim, taak, tabblad bewaard); elk tabblad zonder JS-fouten en zonder horizontale scroll; desktop Ctrl + scrollwiel; `prefers-reduced-motion`. Met node (`node tools/test_regels.js`, 12 goed): golden A en B, huispot, pet, ongedaan maken, naspelen uit het log, dubbele opdracht, voorstel met akkoord van de ander.

Niet getest: een echte iPhone (Safari/WKWebView: knijpen, safe-areas, `:has()`), Android, VoiceOver, twee telefoons tegelijk (er is geen server), offline/online, de terugblik-flow en ziek/rustweek via de UI (wel de rekenregels), de pixel-editor en eigen outfits in de nieuwe kast-layout, alle 10 niveaus op het scherm.

## Nog niet gebouwd

- **Server en sync:** geen `/api/opdracht`, outbox, live (SSE), koppelcode of inloggen. Het log is er klaar voor.
- **Meldingen** (Web Push of lokaal), **agenda/ICS** (feeds, import, vrije tijd, *Plan voor ons*), **Uurwerk/Jarvis**.
- Fase 3 deels: geen verdeelvoorstel, herhaalbare mijlpalen/vouchers, verrassingsdrops, verrassingstaken, ruilen 1-op-1, nest van 3 eieren (alle eieren lopen tegelijk), cadeau inpakken, extra kastvakken.
- Onboarding van Tessie (koppelcode, toestemming, eerste quest met de ~15 sjablonen samen waarderen) en de "voorlopig"-tint van sjabloonwaarden.
- "Vast" herhalen (dinsdagavond afval): nu alleen behoefte ("~elke n dagen").

## Open punten en keuzes

1. **Zwaarte 0–2 of 0–3?** De opdracht noemde 0–3, puntensysteem §3 zegt {0, 1, 2}. Gebouwd volgens het puntensysteem (licht, gewoon, zwaar).
2. **Het ei.** Volgens §9 is het draakje een ei tot de eerste gehaalde week; tot dan lopen er geen pets door het huis. Er is geen ei-art: het ei is een kleine CSS-vorm. Willen jullie het draakje meteen?
3. **Toewijzen** is "Kun jij?" (een verzoek dat de ander aanneemt of teruglegt), zoals §6. Direct toewijzen bestaat niet.
4. **Weekdoel wijzigen** gaat de week erna in (app-ontwerp §2.8); het akkoord van allebei is er nog niet.
5. **Pinch op iOS:** `user-scalable=no` en `gesturestart` houden de paginazoom tegen; op een echte iPhone nog proberen.
