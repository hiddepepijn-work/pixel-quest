# Pixel Quest – controle van het ontwerp

Kritische controle, 10 okt 2026, van [puntensysteem.md](puntensysteem.md) en [app-ontwerp.md](app-ontwerp.md), getoetst aan [onderzoek-taken-apps.md](onderzoek-taken-apps.md), [uurwerk-koppeling-verkenning.md](uurwerk-koppeling-verkenning.md) en de Uurwerk-code (`C:\Users\hidde\Documents\Uurwerk`, branch `vps-bron`, HEAD `a0b2b11`). In Uurwerk heb ik alleen code gelezen. Ik heb geen databases, `.env`-bestanden, tokens of servers aangeraakt. Uurwerk-paden zijn relatief aan `Uurwerk\packages\`.

## Oordeel

1. De richting klopt. Het ontwerp kiest voor samen in plaats van tegen elkaar, voor cosmetische beloningen, voor pets zonder straf en voor een server die de baas is. Ook de keuze om Pixel Quest nooit een Uurwerk-device-token te geven is goed.
2. Voor twee mensen is het te veel. Er zijn ongeveer 45 begrippen, waarvan vier valuta en vijf soorten bonus en uitzondering. De MVP kan met de helft toe.
3. Er zit toch een zacht scorebord in: persoonlijke munten uit eigen inzet, een gestapelde balk, een opraapbonus voor wat de ander liet liggen en een signaal dat "Tessie droeg meer" zegt.
4. Over Uurwerk kloppen de meeste feiten. Drie conclusies over de koppeling zijn wel fout: wat er naar iCloud gaat, wat er naar Jarvis/Gemini gaat en hoe Jarvis met hele-dag-items omgaat. Een geïmporteerd event levert **geen** valse uren op, maar wel ruis.
5. De drie rekenvoorbeelden kloppen rekenkundig. Eén conclusie in voorbeeld B klopt niet, en een paar regels spreken elkaar tegen tussen of binnen de twee documenten.

## Fouten

### F1. Steekproef Uurwerk-claims (14 nagelopen)

| # | Claim (bron) | Uitkomst | Bewijs |
|---|---|---|---|
| 1 | `connectIcs` bestaat en voegt een ICS-abonnement toe (app-ontwerp:141) | ✓. Het draait **alleen op de server**: een gekoppeld apparaat stuurt de aanroep door. Het abonnement moet dus via de server-route, en dat gebeurt vanzelf. | `backend/src/calendar/index.ts:39-74`, `backend/src/server-only.ts:1-7`, `main/src/index.ts:341-342` |
| 2 | Pollt elke 20 min (app-ontwerp:141, verkenning:102) | ✓. De scheduler tikt elke 60 s en synct zodra `calendarSyncEveryMin` (standaard 20, minimaal 5) is verstreken. | `server/app/index.ts:198-205`, `core/src/db/repositories/settings.ts:58-63` |
| 3 | Parser: `TZID` wordt als lokale wandtijd gelezen, `…Z` als UTC (app-ontwerp:124) | ✓ | `backend/src/calendar/ics-parse.ts:19-24`, `:139-142` |
| 4 | Parser: `VALUE=DATE` wordt hele dag | ✓. Het wordt lokale middernacht van het serverproces, dus het hangt af van `TZ`. | `ics-parse.ts:125-131` |
| 5 | Parser: RRULE letterlijk, niet uitgerold (app-ontwerp:132) | ✓. Het IcsProvider geeft de master terug. | `ics-parse.ts:243-245`, `ics.ts:76-92` |
| 6 | Parser kent "EXDATE-annulering" (**verkenning:90**) | **✗ Fout.** Er wordt nergens EXDATE gelezen (grep in `backend/src` en `core/src`: 0 treffers). Alleen `RECURRENCE-ID` en `STATUS:CANCELLED` worden gelezen. Gevolg voor app-ontwerp:132: wie `ics-parse.ts` overneemt, moet EXDATE zelf toevoegen. Anders tellen geschrapte stagedagen als bezet. | `ics-parse.ts:212-273` |
| 7 | `GET /ical/<token>.ics` | ✓. Het token is `icalToken` (≥ 24 tekens, vergeleken in constante tijd). Inhoud: alleen events met `origin='uurwerk'` plus geaccepteerde planblokken, van −7 tot +60 d. | `server/src/server.js:216-221`, `server/app/index.ts:370-383`, `backend/src/calendar/push.ts:162-166`, `:223-236` |
| 8 | Een device-token heeft geen scope | ✓ | `server/src/devices.js:1-12` |
| 9 | `POST /api/rpc/{domein}/{methode}` | ✓. `NOT_OVER_RPC` bevat ook `capture.buildTimelapse` en `reports.openFile`; dat mist in verkenning:125, maar het is onschuldig. | `server/app/index.ts:85-96`, `:328-345` |
| 10 | De sync-schemaversie is `MAX(id)` uit `_migrations`, anders 409 | ✓. De huidige versie is 21. | `core/src/sync/engine.ts:58-60`, `server/app/index.ts:292-296`, `core/src/db/migrations/index.ts:189-193` |
| 11 | `calendar_events.task_id` | ✓ | `core/src/db/migrations/020-jarvis-data.ts:23` |
| 12 | `jarvis-tools.ts` staat in `core/src/services/` (niet in `server/app/jarvis/tools.ts`) | ✓. `server/app/jarvis/` heeft alleen `tools.test.ts`. | `ls server/app/jarvis` |
| 13 | Poort 8790 en de tijdzone van de VPS zijn "niet gevonden" (verkenning:181, :185) | **✗ Wel te vinden.** In de unit staat `UURWERK_PORT=8790` en `TZ=Europe/Amsterdam`, en Caddy proxyt naar 127.0.0.1:8790. | `server/deploy/uurwerk-server.service:19`, `:24`, `server/deploy/Caddyfile.uurwerk` |
| 14 | Wat een geïmporteerd ICS-event doet met planner en uren | Zie F2. | `backend/src/calendar/sync.ts:114-144` |

### F2. Geeft K1 Hidde valse agenda-uren? Nee. Wel vier bijwerkingen

Een geïmporteerd event krijgt `registrationMode: 'none'` en `countsAsWorked: false` (`sync.ts:140-143`). Alles wat "uren" heet, leest alleen `time_segments` (`core/src/services/calendar/reconcile.ts:1-16`). Een segment ontstaat alleen als het event `registrationMode ≠ 'none'` heeft (`reconcile.ts:33`). De conclusie in app-ontwerp:141 ("agenda-uren worden geen stage-uren") klopt dus. Wat het ontwerp mist:

- **(a) Een classificatie-popup per PQ-taak met tijd.** Elk nieuw getimed event dat onder de drempel 80 scoort, krijgt status `suggested` en komt in de wachtrij `unclassified()` (`sync.ts:114-117`, `:136`; `core/src/db/repositories/calendar.ts:369-381`; `settings.ts:58-59`). Een `classification_rules`-regel op de agendanaam, zoals app-ontwerp:141 voorstelt, haalt dat niet weg. Een regel levert hooguit 40 punten op en telt alleen mee als hij een leeg veld vult. Een standaardgebied per agenda levert 55 op (`core/src/services/calendar/classify.ts:56-77`, `:146-170`). Pas met standaard plus regel en minstens 3 bevestigingen komt een event boven 80. Hidde krijgt dus de eerste weken een popup per vaatwasser-slot. In die popup staat "uren registreren" standaard uit (`renderer/src/features/calendar/EventClassifier.tsx:92`). Valse uren ontstaan alleen als hij daar zelf een modus kiest.
- **(b) De planner wijkt wél uit.** `includeInPlanning = !allDay && !calendar.ignoreForPlanning`, met `ignore_for_planning` standaard 0 (`sync.ts:139`, `013-calendar.ts` kolom `ignore_for_planning DEFAULT 0`). Het punt in app-ontwerp:145 en :360 is daarmee beantwoord: er hoeft niets aan te staan.
- **(c) Een deadline (hele dag) maakt in Jarvis de hele dag vol.** `freeStretches` geeft `[]` terug zodra er op die dag één hele-dag-event staat (`core/src/services/jarvis-tools.ts:572-576`). Dat wordt gebruikt door `schedule_task` (`:622`). Elke PQ-deadline in Hiddes feed zorgt er dus voor dat Jarvis die dag niets meer inplant. Het ontwerp zet deadlines juist als hele-dag-item in de feed (app-ontwerp:118, :124).
- **(d) Afgeronde taken verdwijnen uit Uurwerk.** Ze vallen uit de feed, en `markMissingAsDeleted` doet een soft-delete op alles van dat account binnen −30/+120 d (`backend/src/calendar/index.ts:301-310`, `sync.ts:173-195`). Dat is onschuldig, behalve als Hidde zo'n event ooit als uren heeft geclassificeerd: dan verdwijnt dat afgeleide segment mee.

### F3. Overige feitelijke fouten in het ontwerp

| Waar | Wat er staat | Wat klopt | Bewijs |
|---|---|---|---|
| app-ontwerp:145 | Met K1 komen PQ-taken "ook in zijn iCloud of Outlook als Uurwerk ze doorzet" | Uurwerk zet geïmporteerde events nooit door: zowel de push naar iCloud als `/ical` nemen alleen `origin === 'uurwerk'`. Hidde moet zijn iPhone-agenda dus zelf op de PQ-feed abonneren. | `push.ts:165` |
| app-ontwerp:145 en :167 | "Tessie's data komen nooit in Uurwerk terecht" en "alleen in K2 gaan titels naar Jarvis' model" | Al bij **K1** komen samen-taken (titel, tijd, eventueel een DESCRIPTION met Tessie's naam) in Uurwerk's database. Die synct naar laptop en telefoon. Jarvis leest agenda-events in meerdere tools, en die gaan naar Gemini. Tessie's instemming is dus vanaf fase 2 nodig, niet pas in fase 4. | `jarvis-tools.ts:433`, `:463`, `:572`, `:1082`, `:1107`, `:1217` |
| app-ontwerp:142 | Nieuwe tools in `jarvis-tools.ts` "roepen de PQ-API aan" | `jarvis-tools.ts` is puur: de tools werken alleen via `TimeTrackerAPI`, zonder `fetch` en zonder secrets (`:1-16`, imports `:14-16`). Een PQ-client moet je vanuit `server/app/jarvis/` injecteren, of je maakt er een nieuw API-domein voor. Dat is meer werk dan "tools + secret + brief". | `jarvis-tools.ts:1-16` |
| app-ontwerp:306 | `deploy.sh`: "rsync → herstart" | Sinds 26 sep 2026 worden grotere overdrachten van thuis naar de VPS onderweg verbroken (scp, piped scripts). Uurwerk deployt daarom via een GitHub-release die de VPS zelf ophaalt. | `server/deploy/deploy.sh:5-9`, `:15-22` |
| app-ontwerp:205 | `node:sqlite` "vermijdt het MSVC-probleem" | Uurwerk heeft dat al opgelost met `node-sqlite3-wasm`, en dat draait bewezen op deze VPS. Uurwerk vraagt `node >=20` en heeft een build-stap (`npm run build:server`). Nergens blijkt dat Node 24 op de VPS staat. | `core/src/db/connection.ts:4`, `server/package.json:7-8`, `:21-23`, `deploy.sh:15` |
| app-ontwerp:264 met :205 | Paden `@gedeeld/*` in tsconfig, en de server draait met Node's type-stripping zonder build | Node's type-stripping negeert `tsconfig`-`paths` en wil expliciete `.ts`-extensies in imports. `@gedeeld/...` faalt dan bij het starten. Gebruik `package.json` `"imports": {"#gedeeld/*": …}` of een bundel-stap zoals Uurwerk. | Node-docs type-stripping. Te verifiëren met een rooktest in fase 0. |
| app-ontwerp:256 vs :266 | Puppeteer-core overnemen, terwijl de kaart Playwright noemt | Kies één van de twee. | – |
| app-ontwerp:230 | `grootboek` UNIQUE(soort, reden, ref_id, persoon_id) met `persoon_id NULL = samen` | In SQLite zijn NULL's in een UNIQUE-index allemaal verschillend. Dubbele samen-boekingen (XP, sterren) worden dan **niet** tegengehouden. Daarnaast botst "ongedaan maken, daarna opnieuw afronden" met de oude rij. Gebruik `persoon_id = 'samen'` (of een COALESCE-expressie-index) en neem de opdracht-id op in de sleutel in plaats van de taak-id. | SQLite-semantiek |
| app-ontwerp:161 | Privé-taken "leveren alleen eigen munten op, tellen niet mee voor inzet" | Munten komen uit inzet (puntensysteem:105). Zonder inzet zijn er dus geen munten, en de regel is niet gedefinieerd. Krijgen ze toch munten, dan is dat een lek: onzichtbare nep-taken waarvan de ander niets ziet. Dat ondermijnt de rem "de ander ziet ze in de feed" (puntensysteem:215). | – |
| app-ontwerp:197 | "Om 00:05 schrijft hij domeinen … af" | Domeinkaarten worden per week bijgeschreven, na "liep" in de terugblik (puntensysteem:53, :91). | – |
| app-ontwerp:108 | Wie de terugblik overslaat, krijgt de week dicht "met alle bonussen" | Een kaart levert alleen op als iemand "liep" tikt (puntensysteem:53). Zonder terugblik valt de kaartinzet weg, en daardoor soms ook de teambonus. Wegblijven kost dan wél iets. | – |
| app-ontwerp:337 | Fase 1 is klaar met de golden tests A/B/C | Voor B zijn afwezigheid en opraapbonus nodig, en die staan in fase 2 (:338). Voor A is de weekstreak nodig, maar de rustdagen staan ook in fase 2. B kan in fase 1 dus niet groen worden. | – |
| app-ontwerp:328 vs :339 | `Verdelen.tsx` in fase 2 | Het verdeelvoorstel en de draft staan in fase 3. | – |
| app-ontwerp:152 | "ochtendoverzicht … om 18:15" | Dat is een avondoverzicht. Noem het "dagoverzicht". | – |
| puntensysteem:35 vs :18 | "Halve stappen" (0,5) | De formule kent alleen {0, 1, 2}. | – |
| puntensysteem:63 vs :246 | Signaal: "voortschrijdend 4-weeksgemiddelde, drie weken achter elkaar" | Bijlage: "3 van de laatste 4 weken". Dat zijn twee verschillende regels. | – |
| puntensysteem:74 vs :69 | Opraapbonus voor "een geclaimde taak die meer dan 48 uur over tijd is" | Een claim vervalt bij de deadline of aan het eind van de volgende dag. Een geclaimde taak kan dus nooit 48 uur over tijd zijn. Omgekeerd kan iemand zijn eigen claim laten verlopen en de taak daarna vanaf het prikbord mét bonus oppakken. | – |
| puntensysteem:74 vs :104 | De opraapbonus geldt "voor munten en XP" | XP is 1 per wm uitvoerinzet. Een bonus erbovenop breekt die definitie. | – |
| puntensysteem:93 | Bij ziekte zakt de dagnorm "met diens helft" | Dat klopt alleen bij 50/50. Bij een afspraak naar draagkracht (:63) moet het "diens aandeel" zijn. | – |
| puntensysteem:106 | "max 5 per dag + weekquest" | De weekquest wordt nergens gedefinieerd. | – |
| puntensysteem:202 | "Zonder ziekte-correctie had het er uitgezien als 'Tessie deed minder'" | Zonder correctie is de afwijking 50 − 41,8 = 8,2 procentpunt, ruim onder de drempel van 15, en het gaat om één week (er zijn er 3 nodig). Ook zonder correctie was er dus geen signaal gekomen. Het voorbeeld bewijst de regel niet. | Eigen berekening |
| onderzoek:128 vs puntensysteem:65 | Onderzoek: "bonuspunt voor dank je wel". Ontwerp: een bedankje levert geen munten op. | Dit is een bewuste afwijking, en een betere, maar zet die keuze in het onderzoek of het ontwerp. | – |

## Risico's

| # | Risico | Ernst | Fix |
|---|---|---|---|
| R1 | **Een verborgen scorebord via persoonlijke munten.** Munten zijn 0,5 per eigen wm. De kledingkast van de één wordt zo een zichtbare optelsom van "wie deed meer". Dat staat haaks op de les "punten als zichtbaarheid, niet als competitie" (onderzoek:10, :136). | hoog | Maak munten **samen** (één huishoudpot), of verdeel ze gelijk uit het samen-totaal. Dan vallen ook de aftopping en de opraapbonus weg. |
| R2 | **De opraapbonus beloont de misser van de ander.** Het is het spiegelbeeld van de Habitica-schade die het onderzoek wil vermijden (onderzoek:13, :137). Het lokt ook "makkelijke punten" en wachten uit (Labor of Love, onderzoek:51). De regel is bovendien niet sluitend (F3). | hoog | Schrappen. Een hangende plant op het prikbord is signaal genoeg. Wil je toch iets, geef dan een gedeeld hartje of XP voor het pet. |
| R3 | **K1-bijwerkingen in Uurwerk:** classificatie-popups per PQ-taak, Jarvis die dagen met een PQ-deadline als vol ziet, en samen-taken van Tessie die via Jarvis naar Gemini gaan (F2, F3). | hoog | Geef de feed een variant voor Uurwerk (`…/agenda/<token>.ics?voor=uurwerk`): **zonder** hele-dag-deadlines en zonder `DESCRIPTION` met namen. Zet in Uurwerk een standaardgebied "personal" op de PQ-agenda en kies bij de eerste popups "onthouden". Vraag Tessie al in fase 2 om toestemming voor Gemini. De structurele fix in Uurwerk zelf (`freeStretches` moet hele-dag-events negeren die `includeInPlanning=false` hebben) is een losse Uurwerk-taak, buiten Pixel Quest. |
| R4 | **De streak is in feite dagelijks.** "5 dagen met ≥3★" is een dagelijkse drempel in weekverpakking. De herstelweek (6/7) is strenger dan een gewone week. Het onderzoek zegt: wekelijks, met vergeving (onderzoek:14, :77). | midden | Een week telt als je ≥ 80% van de weeknorm haalt. Neem één rustweek per maand. Herstellen gaat met een gewone gehaalde week. |
| R5 | **De gestapelde balk is een 60/40 zonder getal.** Ook het afspraak-signaal noemt een naam ("Tessie droeg meer"). | midden | Laat in de week alleen woorden en iconen zien, en de balk pas na een tik, net als de getallen. Formuleer het signaal neutraal: "De verdeling liep de laatste weken anders dan jullie afspraak. Klopt dat voor jullie?" |
| R6 | **De Sterrenpot koppelt een echte beloning aan het afronden van taken** (completion-contingent, d=−0,36, onderzoek:56). Daarnaast is onduidelijk of mijlpalen eenmalig zijn: na ~18 weken is er niets meer te halen. | midden | Houd het gezamenlijk, zoals nu. Maak mijlpalen herhaalbaar (een date night per 3 gehaalde weken) en kondig ze niet als "prijs" aan, maar als een ritueel. |
| R7 | **Een iOS-PWA heeft gescheiden opslag.** Een PWA op het beginscherm heeft andere cookies en IndexedDB dan Safari. Een uitnodigingslink die in Safari opent, logt de geïnstalleerde app dus niet in. `SameSite=Strict` met links vanuit Agenda of push opent Safari, en daar is niemand ingelogd. In Safari (niet geïnstalleerd) wist ITP de opslag na 7 dagen zonder interactie, en daarmee ook de outbox. | hoog | Laat eerst installeren en daarna in de app een **koppelcode** van 6 tekens invoeren (via de CLI) in plaats van een link. Gebruik `SameSite=Lax`. Roep `navigator.storage.persist()` aan. Toon een teller "n niet verzonden". Laat de app weigeren om buiten de standalone-modus te werken (of geef dan een waarschuwing). |
| R8 | **Passkeys hangen aan het domein (RP ID).** Wie het domein later wijzigt, maakt alle passkeys ongeldig. Push werkt alleen na installatie (iOS ≥ 16.4) en alleen zichtbare meldingen zijn toegestaan; een stille push laat Safari het abonnement intrekken. | midden | Beslis vóór fase 2 over het adres (keuze 2). Stuur nooit een push zonder melding. Test passkey en push op beide echte telefoons (staat al in app-ontwerp:361). |
| R9 | **`node:sqlite` en Node-versie op de VPS onbekend** (niet ingelogd, te verifiëren). Als de VPS Node 20 heeft, ontbreken `node:sqlite` en type-stripping. Een systeembrede upgrade van Node raakt ook Uurwerk. | midden | Hidde checkt `node -v` op de VPS. Geef de unit een eigen Node-binary (`/opt/node24/bin/node`) of gebruik `node-sqlite3-wasm` zoals Uurwerk; die draait daar al aantoonbaar. Draai in fase 0 een rooktest op staging met de echte runtime. |
| R10 | **SSE achter Caddy.** Uurwerk's Caddy-blok gebruikt `encode zstd gzip`, en compressie kan SSE bufferen. Uurwerk's `/api/events` werkt in de praktijk, maar dat is niet gemeten voor PQ. Een herlaad van Caddy verbreekt alle streams. | laag | Neem het Uurwerk-patroon over (keep-alive elke 25 s, `server/app/index.ts:357`). Zet in het PQ-blok `encode` uit voor `text/event-stream` of test de latentie in de e2e-test "< 2 s" via de echte Caddy op staging. De client herverbindt met `Last-Event-ID`. |
| R11 | **Late offline-opdrachten.** Een afronding die offline gebeurde en pas na de weeksluiting (ma 04:00) binnenkomt, verandert een gesloten week. `gedaan_op` komt van de klok van de cliënt. | midden | Boek een late opdracht in de lopende week en noteer de oorspronkelijke datum. Begrens `gedaan_op` tot hooguit 48 uur terug. Herreken een gesloten week niet. |
| R12 | **Versieverschil tussen app en server.** Een PWA in cache stuurt na een deploy opdrachten in de oude vorm uit de outbox. | midden | Geef elke opdracht een `contract_versie`. De server weigert een te oude versie met een nette fout en de app herlaadt. Gebruik een SW-update-flow ("nieuwe versie, tik om te laden"). |
| R13 | **Deploy via rsync faalt** (F3). | midden | Neem de route van Uurwerk: een GitHub-release + `install.sh`, met bundel. |
| R14 | **ICS-import zonder eigen filter.** Pixel Quest leest agenda's die mogelijk zijn eigen feed weerspiegelen. RRULE-uitrol met `+7×86 400 000 ms` schuift rond 25 okt een uur op. | laag | Filter op `pq-taak-*@pixelquest`, net als `isOwnUid` (`backend/src/calendar/index.ts:31`). Rol uit in wandtijd Europe/Amsterdam en zet een DST-test in de RRULE-suite. |
| R15 | **Art-werk.** Elk groeistadium van 14 pets heeft art nodig (~56 sprites). LEESMIJ noemt alleen "Groei van ei naar draak". | midden | De MVP heeft één pet met groei nodig. De rest volgt per seizoen. |

### Gaten (ontbreekt in het ontwerp)

- **Onboarding van Tessie.** Er is alleen een CLI-uitnodiging. Wat ontbreekt: een eerste-keer-flow (character kiezen, uitleg in 3 schermen), de "eerste quest" om 15 sjablonen samen te waarderen (puntensysteem:222, maar dit staat in geen enkele fase), het toestemmingsmoment (Hidde kan alles lezen, K1/K2, Gemini) en wat er gebeurt als zij Android heeft.
- **Back-up.** Een nachtelijke `.backup` staat erin (app-ontwerp:207), maar er staat geen bestand voor in de kaart, er is nooit een **hersteltest** en er is geen kopie buiten de VPS die niet via de haperende thuisverbinding loopt. Bewijsfoto's vallen buiten de back-up. Fix: in fase 0 een `server/bin/backup.ts` met `restore --naar staging` en een test die de staging-database herstelt.
- **Breuk of vertrek.** Er staat niets over wat er gebeurt met gedeelde pets, de Sterrenpot of de terugblik-antwoorden als één van jullie stopt. "Exporteren als JSON" (app-ontwerp:89) zegt niet *wiens* data. Voorstel: export per persoon, door hetzelfde zichtbaarheidsfilter als `/api/stand`. "Account verwijderen" wist iemands privé-taken, voorkeuren en terugblik-antwoorden, en Hidde belooft dat ook op de VPS. Gedeelde dingen worden gearchiveerd.
- **Gevoelige antwoorden.** "Wat zat je dwars?" staat leesbaar op een server die Hidde beheert. Voorstel: wis de tekst na het onthullen, of zet hem in de kluis van v2 en bewaar alleen het cijfer 1–5.
- **Toegankelijkheid.** Pixelfonts zijn klein. Er is geen `prefers-reduced-motion` voor springende characters, geen VoiceOver-labels bij sprites en geen minimale tikmaat (44 px) of dynamische lettergrootte. `navigator.vibrate` werkt niet op iOS. De plantstanden hebben al iconen naast kleur; dat is goed, houd dat vast.
- **Soort werk ontbreekt in het datamodel.** Het weekbeeld splitst in "uitvoeren / plannen / bijhouden" (puntensysteem:59), maar `sjablonen` en `taken` hebben daar geen veld voor (app-ontwerp:221, :223). Voeg `soort_werk` toe.
- **Herstel van een verloren passkey of telefoon** via de CLI staat er niet in. Monitoring of een melding als de server plat ligt ook niet.

## Schrappen/vereenvoudigen voor de MVP

Toets met één zin per begrip:

| Begrip | Lukt één zin? | Voorstel |
|---|---|---|
| Inzet | ✓ "Hoeveel gewogen minuten een klus kost." | houden; één knop "zwaarte" 0–2 in plaats van vervelend + zwaar |
| XP | ✓, maar het is gewoon inzet samen | **samenvoegen**: het pet groeit op de inzet samen, zonder eigen naam of grootboeksoort |
| Munten | ✗ (½ per wm + teambonus in 2 treden, aftopping boven 1,5× normdeel, opraapbonus) | **schrappen in fase 1–2**: er is toch nog geen winkel (fase 3). Daarna één gedeelde pot. |
| Sterren | ✗ (4 drempels + "allebei", afwezigheid, bevroren dagen, noemer ⌈5/7⌉) | **schrappen**; vervangen door de weekbalk "Samen 420 van 600" |
| Domeinkaart | ~ | **samenvoegen met taak**: een vaste wekelijkse taak met eigenaar en `soort_werk = plannen` ("Weekmenu + lijst", 30 wm, zondag). Dan vallen de tabellen `domeinen` en `domein_weken` en het "liep"-probleem weg. |
| Grootboek | ✓ (intern) | houden, met de fix van F3 |
| Weeknorm | ✓ | houden; het enige doel |

**MVP (fase 1), wat overblijft:** sjablonen met minuten × zwaarte, het prikbord met claimen en verzoek, de behoefte-klok (plant), afronden en ongedaan maken, een week-doel samen, een week-streak (≥ 80% van de norm, 1 rustweek per maand), één meelopend pet dat op samen-inzet groeit, een bedankje-hartje, live updates en de outbox.

**Naar later of weg:** de opraapbonus (weg), dagsterren (weg), rustdagen sparen en de herstelweek (weg), het afspraak-signaal (fase 3, dat heeft toch ≥ 4 weken data nodig), privé- en verrassingstaken (fase 3; privé-taken zonder beloning), bewijsfoto's (weg), de draft-modus (weg), de verrassingsdrop (fase 3), 14 eieren met losse voorwaarden (fase 3: begin met 3), en de Sterrenpot (fase 3, gebaseerd op gehaalde weken in plaats van sterren).

Daarmee kan golden test A in fase 1 echt groen worden en verhuist B naar fase 2.

## Rekenvoorbeelden

| Onderdeel | Klopt? | Toelichting |
|---|---|---|
| Sjabloontabel (puntensysteem:23-33) | **ja** | Alle negen nagerekend; afronden half naar boven (12,5→13; 6,25→6). |
| A: totalen 365 / 392 / 757 | **ja** | Per regel opgeteld, inclusief 3×13 en 4×13 per afgeronde taak. |
| A: munten 283 / 296 | **ja** | 182,5→183 en 196, plus 100. Aftopping (450) niet bereikt. "Ruim een derde uit teambonus": 200/579 = 34,5%. |
| A: sterren 27, streak telt | **ja** | Dagnorm 86 (drempels 21,5/43/64,5/86) geeft 5,3,5,3,1,5,5. Dat klopt, mits op ma, wo, do, za en zo allebei iets deden; dat staat er niet expliciet bij. |
| A: XP 687 | **ja** | Uitvoerinzet 345 + 342. Komt overeen met de dagsom 95+70+120+60+35+210+97. |
| B: norm 514, wo 5★ | **ja** | 600 − 2×43; 45 ≥ 43 en ★5 automatisch. |
| B: 498/514 = 97%, halve teambonus | **ja** | 96,9%. |
| B: munten 204 / 154 | **ja** | 145 + 30% × 28,5 (= 8,55 → 9) + 50; 104 + 50. |
| B: 41,6% verwacht, 41,8% gedragen | **ja** | 214/514 en 208/498. |
| B: "zonder correctie had het eruitgezien als Tessie deed minder" | **nee** | Een afwijking van 8,2 pp in 1 week blijft onder de drempel (15 pp, 3 weken). Zie F3. |
| C: 350 / 350 | **ja**, met een kanttekening | De cadeau-plantaak (30) is volgens puntensysteem:53 een *gewone taak*, dus uitvoerinzet. Telt die voor sterren en XP of als "plannen"? Daar is geen veld voor (zie Gaten). |
| C: inflatie-check 288 | **ja** | 450×0,5 + 250×0,25 = 287,5 → 288. Merk wel op: nep-inzet blijft meetellen voor het samen-totaal en dus voor de teambonus van allebei. De rem is zwakker dan de tekst suggereert. |
| Groei pets (puntensysteem:123) en Sterrenpot-weken (:162-167) | **ja** | 1500/700 ≈ 2, 3500/700 = 5; 40, 80, 200 en 500 sterren bij 27★/week geeft 1,5 / 3 / 7,4 / 18,5. |
| Consistentie tussen de documenten | **nee** | De mockup (app-ontwerp:27-36) klopt met de tabel. Maar zie F3: privé-munten, domeinen om 00:05, auto-sluiting "met alle bonussen" en golden B in fase 1. |

## Open vragen voor Hidde en Tessie

1. Willen jullie munten **samen** (één pot) of per persoon? Per persoon betekent dat de kledingkast laat zien wie meer deed.
2. Moet de opraapbonus eruit? Ik adviseer: ja.
3. Is een **week**doel (≥ 80% van de norm) genoeg, of willen jullie echt dagsterren?
4. Is Tessie het ermee eens dat samen-taken al vanaf fase 2 in Hiddes Uurwerk staan en via Jarvis bij Gemini terechtkomen? Of moet de Uurwerk-feed alleen Hiddes eigen taken bevatten?
5. Mag Hiddes PQ-feed voor Uurwerk zonder deadlines (hele-dag-items) zijn, zodat Jarvis geen dagen als vol ziet?
6. Welk adres wordt het, en definitief? Passkeys hangen eraan vast.
7. Welke telefoon en iOS-versie heeft Tessie, en is "eerst op beginscherm, dan een koppelcode" acceptabel?
8. Wat gebeurt er met gedeelde pets, de pot en de antwoorden als één van jullie stopt? Spreek dat nu af, nu het nog makkelijk is.
9. Mogen de antwoorden op "Wat zat je dwars?" na het onthullen gewist worden, met alleen het cijfer bewaard?
10. Zijn de mijlpalen van de Sterrenpot eenmalig of herhaalbaar?
11. Welke Node draait er op de VPS (Hidde, `node -v`)? Bij Node 20 kiezen we `node-sqlite3-wasm` en een bundel-stap.
