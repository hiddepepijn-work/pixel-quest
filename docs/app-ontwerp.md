# Pixel Quest – app-ontwerp

Versie 2, 10 okt 2026. Deze versie verwerkt [controle-ontwerp.md](controle-ontwerp.md) en gaat over de schermen en flows, agenda en tijd, de architectuur, de bestandskaart en het bouwplan. De spelregels staan in [puntensysteem.md](puntensysteem.md). Marktlessen komen uit [onderzoek-taken-apps.md](onderzoek-taken-apps.md). Feiten over Uurwerk komen uit [uurwerk-koppeling-verkenning.md](uurwerk-koppeling-verkenning.md) en de controle, getoetst aan de code op `vps-bron` `a0b2b11`. **§9 is de enige lijst met open keuzes.**

## 1. Navigatie en principes

De app is gemaakt voor de telefoon (402×874) en gebruikt het palet uit `app/pixelquest.css`. De sprites komen exact uit `assets/bron/` met `image-rendering: pixelated`. Onderin staat een tabbalk; de instellingen open je via je eigen avatar.

```
fase 1:  [ Vandaag ] [ Quests ] [ Week ]
fase 2:  + [ Agenda ]
fase 3:  + [ Pets ] en [ Wij ] (Kledingkast · Winkel · Mijlpalen)
```

Er gelden drie principes uit het onderzoek:

- het hoofdscherm toont wat jullie *samen* doen, nooit een stand;
- de app commandeert niet: standaard geen alarmen en geen rode badges;
- een nieuwe taak landt op het prikbord en niet bij de ander.

**Toegankelijkheid** hoort vanaf fase 1 bij elk scherm:

- het pixelfont alleen voor koppen en lopende tekst in Nunito vanaf 16 px, met `font: -apple-system-body` zodat Dynamische tekst van iOS werkt;
- tikvlakken van minstens 44 px;
- contrast AA op crème;
- `prefers-reduced-motion` zet springen en vieren uit;
- elke sprite heeft een `aria-label` ("Draakje, jonge draak");
- de plantstanden hebben icoon plus tekst;
- elke veeg heeft ook een knop, zodat VoiceOver alles kan;
- geen `navigator.vibrate`, want dat werkt niet op iOS.

## 2. Schermen

### 2.1 Vandaag (fase 1)
**Doel:** in één oogopslag zien wat er moet en hoe jullie week ervoor staat.

```
┌──────────────────────────────────┐
│ [Hidde]     VANDAAG     [Tessie] │
│  stage →18:00          vrij      │
│  Samen deze week  420 / 600  ▓▓▓▓▓▓▓░░ │
├──────────────────────────────────┤
│ JOUW QUESTS                      │
│ [plant] Vaatwasser     13  19:00 │
│ [plant] Afval buiten    7  < 22u │
│ SAMEN                            │
│ [plant] Badkamer       72 za10:15│
│ OP HET PRIKBORD                  │
│ [plant hangend] Stofzuigen 39 [pak]│
├──────────────────────────────────┤
│ [draakje]  ♥ Tessie bedankte je  │
│ streak 4 weken                   │
├──────────────────────────────────┤
│   Vandaag     Quests     Week    │
└──────────────────────────────────┘
```

Je rondt een taak af met de gieter of door naar rechts te vegen. Lang drukken geeft claimen, verzoek, overnemen en loslaten; die zijn ook bereikbaar via knoppen in de taakdetails. De status "stage tot 18:00" komt in fase 1 uit de werktijden in de instellingen en vanaf fase 2 uit de agenda. Wat de ander afrondt, verschijnt live: het character van de ander springt (of knippert kort bij minder beweging). De teller "n niet verzonden" is alleen zichtbaar als de outbox iets vasthoudt.

### 2.2 Quests (fase 1)
Alle taken, met de filters *Mijn*, *Prikbord*, *Samen* en *Alles*. De sortering is behoefte-klok × inzet. Taken voor latere dagen staan ingeklapt onder "Deze week" en "Later". Met `+` maak je een nieuwe taak.

### 2.3 Taak maken (fase 1, bottom sheet)

```
┌──────────────────────────────────┐
│ Wat?  [ Badk|amer           ]    │ ← sjabloon vult minuten, zwaarte, soort werk
│ Wie?      (prikbord) (ik) (samen) (vraag Tessie)
│ Herhalen? (nee) (~elke 7 d) (vast: di)
│ Wanneer?  (geen) (vóór…) (op…) (ergens in…)      ← fase 2
│ ▸ meer: 45 min · zwaarte ●●○ · soort: doen       │
│                      [ Op het bord ]             │
└──────────────────────────────────┘
```

Een nieuw sjabloon heeft een *voorlopige* waarde tot de ander die bevestigt in de terugblik. Zichtbaarheid (privé of verrassing) komt pas in fase 3.

### 2.4 Week en terugblik (fase 1)
Bovenaan staat "Samen 693 van 600 – gehaald" met de streak en het record. Daaronder staat per persoon een zin in woorden en iconen, gegroepeerd op doen, plannen en bijhouden. Getallen verschijnen pas na een tik op *details*, en nooit als percentage. Verder zie je de bedankjes van deze week, de sjablonen die nog op bevestiging wachten en de knop *Start terugblik* (§3.6). Vanaf fase 2 komen afwezigheid en de rustweek erbij, vanaf fase 3 het afspraak-signaal (alleen als het nodig is).

### 2.5 Agenda (fase 2)
Een weekweergave met per dag een kolom voor Hidde en een voor Tessie. Bezette blokken uit de geïmporteerde agenda's zijn grijs, taken met een tijdslot zijn pixelblokken en momenten waarop jullie allebei vrij zijn lichten zacht op. Taken sleep je uit de lade "zonder tijd" naar een vrij moment. *Plan voor ons* doet een **voorstel** voor taken met een venster; daarna bevestig je het.

### 2.6 Pets en collectie (fase 3)
Een raster van 14 vakken met het nest van 3 eieren en hun voortgang. Bij een pet zie je het stadium, je geeft het een naam en kiest of het meeloopt. In fase 1 staat alleen het draakje op Vandaag; tik je erop, dan zie je het stadium.

### 2.7 Wij: kledingkast, winkel en mijlpalen (fase 3)
- **Kledingkast:** je eigen character met de vakken hoofd, lijf, benen, schoenen, accessoire en hand-item, met wat je hebt gegroepeerd per bron. Van hieruit maak je zelf (editor van de andere agent), geef je een cadeau of bewaar je een set.
- **Winkel:** het saldo van de huispot, de items, materialen en kastvakken, plus elke aankoop zichtbaar in de feed.
- **Mijlpalen:** de herhaalbare rituelen ("nog 1 gehaalde week tot date night") en de vouchers met hun plantaak.

### 2.8 Instellingen
| Wat | Fase |
|---|---|
| Profiel: character, kleur, werktijden, stille uren | 1 |
| Samen: weeknorm en verdeling. Een wijziging vraagt het akkoord van allebei en gaat de week erna in. | 1 |
| Apparaten: lijst en intrekken | 1 |
| Afwezigheid | 2 |
| Agenda: import-links, titels bewaren of delen, feeds (link kopiëren of intrekken) | 2 |
| Meldingen | 2 |
| Passkeys | 2 |
| Mijn gegevens: exporteren en account verwijderen (§4.7) | 2 |
| Koppelingen: Uurwerk en Jarvis (alleen Hidde) | 4 |

## 3. Belangrijkste flows

### 3.0 Onboarding van Tessie (fase 1)
1. **Hidde** draait `pq-personen koppelcode tessie`. Dat geeft een code van 6 tekens die 15 minuten geldig is.
2. **Tessie** opent het adres in Safari. Omdat de app niet als beginschermapp draait, ziet ze alleen het scherm *Zet me op je beginscherm*, met drie plaatjes (Deel → Zet op beginscherm → open).
3. **In de geïnstalleerde app** vult ze de koppelcode in. De sessie komt zo in de eigen opslag van de app; die staat los van Safari *(controle R7)*. Daarna vraagt de app `navigator.storage.persist()`.
4. **Eerste keer:** ze kiest haar character en ziet drie uitlegschermen: samen een weekdoel, het prikbord en het draakje.
5. **Toestemming** in gewone taal: "Hidde beheert de server en kan technisch alles lezen", en wat er wel en niet naar Uurwerk en Jarvis gaat (§4.6). Dit is een expliciete *ja*. In fase 2 komt er een nieuw toestemmingsmoment voor de Uurwerk-feed.
6. **Eerste quest samen:** de ~15 sjablonen waarderen (minuten, zwaarte, soort werk) en de vaste plantaken met hun eigenaar kiezen.

Heeft Tessie Android, dan installeert ze via Chrome → *App installeren*; de rest blijft gelijk. Gaat er een telefoon of passkey verloren, dan trekt Hidde het apparaat in met `pq-personen intrekken` en maakt hij een nieuwe koppelcode.

### 3.1 Taak zonder tijd (fase 1)
Tik `+`, typ "Lamp gang vervangen" en tik *Op het bord*. De taak staat op het prikbord met een klok en komt in geen enkele agenda.

### 3.2 Taak met tijd (fase 2)
Bij *Wanneer → op…* stelt de app het eerste vrije moment voor waarop jullie allebei kunnen. De taak verschijnt live bij de ander, in Agenda en bij de volgende ververs-ronde in de feeds (§4.2).

### 3.3 Terugkerend (fase 1)
Bij *Herhalen* kies je *~elke 7 d* (behoefte) of *vast*. Na het afronden maakt de server het volgende exemplaar aan. Een vaste plantaak ("Weekmenu, zondag, eigenaar Tessie") is gewoon een terugkerende taak met soort `plannen`.

### 3.4 Verdelen (fase 1 handmatig, fase 3 voorstel)
In fase 1 regel je het verdelen met het prikbord, claimen en "Kun jij?". In fase 3 komt de knop *Verdeel deze week*: die doet een voorstel op basis van privévoorkeuren, vrije tijd en de afspraak, zonder te zeggen waarom. Jullie schuiven en tikken allebei op akkoord.

### 3.5 Afronden en ongedaan maken (fase 1)
Tik op de gieter. De inzet en de voortgang van de week en het pet bewegen meteen. Tot de server bevestigt, staan ze in een "voorlopig"-tint. De ander krijgt de taak in de feed en kan op het hartje tikken. Binnen 10 seconden kun je de afronding ongedaan maken; daarna kan het nog via de taakdetails. Het grootboek boekt dan een tegenregel (§5.5).

### 3.6 Wekelijkse terugblik samen (fase 1, standaard zondag 20:00, ~5 min)
1. **Privé** beantwoordt ieder op de eigen telefoon "Voelde deze week eerlijk? 1–5", met een optioneel zinnetje "trots op" en "zat me dwars".
2. **Onthullen:** zijn jullie allebei klaar, dan zien jullie elkaars antwoorden. Verschillen de cijfers twee punten of meer, dan volgt één gespreksvraag. De **tekst wordt na het onthullen gewist** en alleen het cijfer blijft bewaard (advies; §9).
3. **Week:** het samen-getal, de beschrijving in woorden, en de voorlopige sjabloonwaarden bevestigen.
4. **Volgende week:** afwezigheid invoeren (fase 2) en plantaken overdragen met een verzoek.

De week sluit maandag om 04:00 hoe dan ook. Wie de terugblik overslaat, verliest niets.

## 4. Agenda en tijd (fase 2, behalve K2)

### 4.1 Tijdtypes

| Type | Voorbeeld | Persoonlijke feed | Uurwerk-feed | Agenda-scherm |
|---|---|---|---|---|
| geen | lamp vervangen | – | – | lade |
| deadline | cadeau vóór vrijdag | hele-dag-item | **–** (zie 4.4) | markering |
| tijdslot | badkamer za 10:15–11:00 | event met duur | event met duur | blok |
| venster | ergens dit weekend | – tot het is ingepland | – | lade met venster |
| behoefte | stofzuigen ~7 d | alleen met tijdslot en klok ≥ 0,7 | idem | lade |

### 4.2 ICS-export: per persoon, in Todoist-stijl, alleen lezen
- **Feeds.** Ieder heeft een **persoonlijke feed** `https://<host>/agenda/<token>.ics` met de eigen taken plus de samen-taken. Optioneel is er een huishoudfeed. Voor Hidde is er een aparte **Uurwerk-feed** (§4.4). Elke feed heeft een eigen token van 32 bytes, op de server alleen als SHA-256 bewaard en apart in te trekken.
- **Inhoud.** De UID is `pq-taak-<id>@pixelquest` en verandert niet bij verplaatsen; `SEQUENCE` loopt op. Tijden staan in **UTC (`…Z`)**, omdat Uurwerk `TZID` als lokale tijd leest. De agenda heet `X-WR-CALNAME: Pixel Quest – Hidde`. Een deadline is `VALUE=DATE`. Er zit geen VTODO in: Google, Apple en Uurwerk tonen of lezen die niet. Afgeronde taken verdwijnen. Een terugkerende taak staat er alleen als eerstvolgend exemplaar in, zonder RRULE. Het bereik loopt van −7 tot +60 dagen.
- **Hiddes iPhone-agenda** abonneert **zelf** op zijn persoonlijke feed (Instellingen → Agenda → Account → Abonnement). Uurwerk zet geïmporteerde events namelijk nooit door naar iCloud of naar de eigen `/ical`-feed; alleen `origin='uurwerk'` gaat mee (`backend/src/calendar/push.ts:165`).
- **Verversen.** In Apple is dat instelbaar (bijvoorbeeld elk kwartier). Google ververst traag, en daar heb je geen invloed op. Uurwerk ververst elke 20 minuten. Wat de app zelf toont (live en via push) blijft de bron.
- **Bouw.** `ics-write.ts` uit Uurwerk overnemen (puur en getest).

### 4.3 ICS-import: vrije tijd vinden
- **Links.** Ieder plakt de eigen geheime agenda-link (iCloud, Google "geheim adres in iCal-indeling" of Outlook gepubliceerd). De server haalt die elke 30 minuten op, met ETag en een maximum van 8 MB. Links staan versleuteld op de server.
- **Opslag.** Standaard worden alleen **bezette blokken** bewaard. Titels alleen als jij dat aanzet, en de ander ziet ze alleen als je ook delen aanzet.
- **Parser.** `ics-parse.ts` uit Uurwerk overnemen en uitbreiden:
  - **EXDATE toevoegen.** Uurwerk leest dat niet, waardoor geschrapte stagedagen anders bezet lijken (controle F1 #6).
  - **RRULE zelf uitrollen.** Dat geldt voor DAILY en WEEKLY, met BYDAY, INTERVAL, UNTIL, COUNT, EXDATE en RECURRENCE-ID, over −1 tot +30 dagen. Het uitrollen gebeurt **in wandtijd Europe/Amsterdam**, niet met +7 × 86 400 000 ms; anders schuift alles op 25 okt een uur op. Een regel die de parser niet kent, wordt gelogd en overgeslagen.
  - **Eigen UID's filteren** (`pq-taak-*@pixelquest`), naar het model van Uurwerk's `isOwnUid`. Zo leest de app zijn eigen feed niet terug.
- **Vrije tijd.** Per persoon gelden de bezette blokken, de stille uren (22–08) en de werktijden (Hidde: stage ma–vr 09–18). Een vrij moment moet minstens de taakduur plus 15 minuten lang zijn; voor een samen-taak moeten jullie allebei vrij zijn. De voorkeur gaat naar moment dat aansluit op andere taken en naar de minst volle dag. Het blijft altijd een **voorstel**.

### 4.4 Uurwerk-koppeling

Er gelden drie harde regels:

- Pixel Quest krijgt **nooit** een Uurwerk-device-token. Zo'n token heeft geen scope en geeft toegang tot alle uren en screenshots.
- Er komt **geen** gedeelde sync-tabel, omdat het schema dan identiek moet zijn en er geen subset mogelijk is.
- De koppeling werkt alleen met Hiddes eigen scope.

| Stap | Fase | Wat | Wijziging in Uurwerk |
|---|---|---|---|
| **K1** | 2 | Uurwerk abonneert via *ICS-link toevoegen* (`calendar.connectIcs`, draait op de server, pollt elke 20 min) op Hiddes **Uurwerk-feed**. | geen code, alleen instellingen |
| **K2** | 4 | Jarvis leest Pixel Quest voor en rondt af. | ja (zie onder) |
| **K3** | 5, optioneel | Gemeten tijd terug naar Pixel Quest voor kalibratie: een smalle `/api/ext` met een `uwx_`-token met scope, plus migratie 022 voor een extern id. Daarna moeten alle Uurwerk-apparaten updaten. | server + migratie |

**Waarom een aparte Uurwerk-feed, zonder deadlines.** Jarvis' `freeStretches` stopt zodra er op een dag één hele-dag-event staat (`core/src/services/jarvis-tools.ts:575`, `if (event.allDay) return []`). `schedule_task` gebruikt die functie. Elke PQ-deadline als hele-dag-item zou Jarvis die hele dag dus als vol laten zien. De Uurwerk-feed bevat daarom **alleen taken met een tijdslot**:

- geen deadlines;
- geen `DESCRIPTION` met namen;
- titels met het voorvoegsel `Huishouden · `.

Hiddes iPhone krijgt de deadlines wel, via de persoonlijke feed. Er zijn twee alternatieven, en ik heb voor beide nee gekozen:

- Een deadline als kort event om 23:30 is een leugen in de agenda.
- `freeStretches` in Uurwerk laten negeren wat `includeInPlanning=false` heeft, is de structurele fix. Die blijft een losse Uurwerk-taak buiten Pixel Quest. Is hij gedaan, dan mogen deadlines alsnog in de Uurwerk-feed.

**Zo voorkom je de classificatiepopup.** Elk nieuw event met een tijd en een score onder 80 komt in Uurwerk's wachtrij. Een regel op de agendanaam alleen helpt niet: zo'n regel levert maximaal 40 op, en alleen als hij een leeg veld vult. Wat wel werkt, volgens de gewichten in `core/src/services/calendar/classify.ts:64-75` en de drempel `calendarAskBelow = 80`:

1. Maak in Uurwerk een project **"Huishouden"** in gebied Privé.
2. Geef de PQ-agenda een **kalender-standaard met alleen het gebied** Privé. Dat levert 55 op. Zet geen standaardproject, want dan telt de projectnaam niet meer mee.
3. De titel bevat de projectnaam "Huishouden", wat 25 oplevert. Samen is dat **80**: het event wordt zonder popup ingedeeld.

Uren blijven ondertussen uit: `registrationMode='none'` en `countsAsWorked=false` (`backend/src/calendar/sync.ts:140-143`). De planner wijkt wél uit voor deze blokken (`includeInPlanning`), en dat is ook de bedoeling. Afgeronde taken verdwijnen bij de volgende poll uit Uurwerk (`markMissingAsDeleted`). Dat kan geen kwaad, zolang Hidde zo'n event niet zelf als uren registreert. *Te verifiëren:* de 80 met een test op een kopie van de Uurwerk-database in fase 2.

**Wat Tessie hiermee deelt.** Staan samen-taken in de Uurwerk-feed, dan komen hun titels en tijden in Uurwerk's database. Die wordt gesynct naar Hiddes laptop en telefoon. Jarvis leest die agenda-events in meerdere tools en stuurt ze naar Gemini. **Tessie's toestemming is dus vanaf fase 2 nodig, niet pas bij K2.** Standaard bevat de Uurwerk-feed daarom alleen *Hiddes eigen* taken; samen-taken komen er pas in na haar ja (§9).

**K2 Jarvis (fase 4).** `jarvis-tools.ts` is puur: de tools praten alleen via `TimeTrackerAPI` en gebruiken geen `fetch` en geen secrets. Een PQ-client moet dus vanuit `server/app/jarvis/` worden **geïnjecteerd**, als extra dependency naast de API. Er komen drie nieuwe tools:

- `pq_vandaag` (lezen);
- `pq_afronden` en `pq_nieuw` (schrijven, via de bestaande bevestigingsflow).

Verder zijn nodig: het geheim `pqToken` in `server/bin/uurwerk-secrets.js` `KNOWN` en `backend/src/host.ts`, en een aanpassing in de brief `docs/jarvis.md`. Het PQ-koppeltoken mag alleen Hiddes eigen en samen-taken lezen en afronden. De iOS-Opdracht van Tessie (`GET /api/kort/vandaag` met een token dat alleen mag lezen) heeft geen LLM nodig.

### 4.5 Meldingen (fase 2)
Meldingen gaan via Web Push, en dat werkt alleen in de app op het beginscherm (iOS 16.4 en hoger). Elke push is een zichtbare melding: stille push trekt Safari's abonnement in.

- **Standaard aan:** ruilverzoeken, de terugblik, en een tijdslot dat over 15 minuten begint.
- **Op verzoek:** een **dagoverzicht** (op werkdagen voor Hidde om 18:15, na de stage), wat de ander afrondde (gebundeld, hooguit één keer per uur) en dorstige taken.
- **Altijd:** stille uren.

### 4.6 Privacy tussen jullie twee

| Ziet de ander | |
|---|---|
| Gedeelde taken, wie deed wat en wanneer | ja |
| Bezet en vrij uit je agenda | ja |
| Titels van je afspraken | alleen als jij bewaren én delen aanzet |
| Getallen per persoon | alleen na een tik op details, nooit als percentage |
| Privé-taken (fase 3) | nee. Ze leveren ook niets op, dus er is geen lek. |
| Verrassingstaken (fase 3) | "Geheime quest" met de inzet, zonder titel |
| Privévoorkeuren (fase 3) | nee. Het voorstel geeft geen redenen. |
| Terugblik | het cijfer en (kort) de tekst, na het onthullen; daarna wordt de tekst gewist |
| Agenda-links | nee. Het zijn geheimen en ze staan versleuteld. |

Wat er buiten Pixel Quest komt:

| Wat | Waarheen | Fase | Toestemming |
|---|---|---|---|
| Hiddes eigen taken met tijdslot | Uurwerk → laptop en telefoon → Jarvis → Gemini | 2 | Hidde |
| Samen-taken met tijdslot (alleen als het aanstaat) | dezelfde route | 2 | **Tessie** |
| Antwoorden van Jarvis | Gemini | 4 | Hidde, en Tessie voor samen-taken |

Tessie's privé-dingen en haar eigen taken komen nooit in Uurwerk. Hidde beheert de VPS en kan technisch alles lezen. Dat staat in de onboarding en is een expliciete *ja*.

### 4.7 Exporteren, verwijderen en uit elkaar gaan (fase 2)
- **Export per persoon.** De app levert JSON plus je eigen zelfgemaakte sprites. De export gebruikt **hetzelfde zichtbaarheidsfilter als `/api/stand`**: je krijgt wat jij mag zien, nooit de privé-dingen van de ander.
- **Account verwijderen.** Dit wist je privé-taken, voorkeuren, terugblikcijfers, apparaten, tokens, agenda-links en bezette blokken. Gedeelde taken blijven bestaan, maar je naam wordt vervangen door "oud-speler". Hidde belooft dat ook back-ups dit na 14 dagen kwijt zijn, omdat ze maar 14 dagen bewaard worden.
- **Gedeelde dingen** (het pet, de pot, de mijlpalen, de historie) gaan naar het archief: alleen lezen, voor wie blijft. Wat jullie hierover afspreken, staat in §9. Spreek het nu af, nu het nog makkelijk is.

## 5. Architectuur

### 5.1 Hoe komt de app op twee telefoons?

| Optie | Installeren bij Tessie | Updates | Meldingen | Offline | Widget/Siri | Kosten |
|---|---|---|---|---|---|---|
| **PWA op Hiddes VPS** | Safari → Zet op beginscherm → koppelcode | direct na deploy | Web Push (geïnstalleerd, iOS ≥ 16.4) | service worker + IndexedDB | geen widget; Siri via een Opdrachten-URL | €0 |
| Capacitor + SideStore | SideStore installeren, elke 7 dagen verversen, max 3 apps | via SideStore-bron | lokaal, sterk | sterk | widget mogelijk | €0 |
| Capacitor + TestFlight | TestFlight-link | TestFlight | push en lokaal | sterk | ja | $99 per jaar |
| Native Swift | – | – | – | – | – | Mac nodig, die is er niet |
| Android (als Tessie die heeft) | PWA via Chrome | direct | Web Push | ja | – | €0 |

**Advies: een PWA op de VPS, gebouwd zodat dezelfde `web/`-bundle later in een Capacitor-schil voor Hidde kan (fase 5).**

- Tessie hoeft niets te sideloaden of te verversen.
- Eén deploy werkt voor allebei, dus er draaien nooit twee versies van de spelregels.
- Een PWA dekt lijsten, sprites, live updates en push.

Er zijn twee nadelen: er is geen widget, en de app moet geïnstalleerd zijn voor push en eigen opslag. Daarom werkt de app op iOS alleen als beginschermapp (§3.0).

### 5.2 Sync, realtime en offline
Uurwerk's rij-sync gebruiken we **niet**:

- een volledige kopie zou Tessie Hiddes privé-dingen geven;
- "later wint per rij" gooit gelijktijdige wijzigingen van twee mensen weg;
- het grootboek moet één keer worden berekend.

**De server is de baas; de app stuurt opdrachten.**

- **Opdrachten.** De app stuurt `POST /api/opdracht {id: uuid, contract_versie, soort, data, gedaan_op}`. De server valideert, voert uit, boekt in het grootboek en schrijft een gebeurtenis, alles in **één transactie**. Dezelfde `id` geeft hetzelfde antwoord (`opdrachten_log`), dus een offline afronding telt precies één keer. Is de `contract_versie` te oud, dan geeft de server een nette fout en laadt de app opnieuw *(R12)*.
- **Lezen.** `GET /api/stand` geeft alles wat *deze persoon* mag zien, met de laatste `seq`. `GET /api/sinds/<seq>` geeft alleen de nieuwe gebeurtenissen.
- **Live.** Server-Sent Events op `/api/live` met `Last-Event-ID`, keep-alive elke 25 seconden (Uurwerk-patroon). Voor `text/event-stream` staat `encode` uit in Caddy *(R10)*. Bij terugkeer uit de achtergrond haalt de app de achterstand in via `/api/sinds`.
- **Offline.** IndexedDB bewaart de laatste stand plus een **outbox**. De app werkt optimistisch met een "voorlopig"-tint. De outbox wordt geleegd bij het openen, bij `online` en na elke geslaagde aanroep. De teller "n niet verzonden" toont wat er nog in staat. Er is geen Background Sync, want iOS kent die niet.
- **Late opdrachten.** `gedaan_op` mag maximaal 48 uur terug liggen. Komt een opdracht na de weeksluiting binnen, dan telt hij in de lopende week met de oorspronkelijke datum erbij. Een gesloten week wordt nooit herrekend *(R11)*.
- **Conflicten.**
  - Een claim gaat naar wie het eerst bij de server is; de ander ziet "Tessie was je net voor".
  - Afronden wint van bewerken en van schrappen.
  - Twee keer afronden geeft één afronding: "jullie dachten hetzelfde".
  - Bij velden wint de laatste wijziging, per veld, met een `versie` en een melding.
- **Klok.** De server draait met `TZ=Europe/Amsterdam`, zoals Uurwerk's unit. Hij maakt herhalingen aan na het afronden, sluit de week op maandag 04:00 en haalt ICS en verstuurt push (fase 2). Elke job heeft een vaste opdracht-id, zoals `job:week:2026-W42`, en is daardoor idempotent. Tijden worden opgeslagen in UTC-epoch-ms.

### 5.3 Inloggen voor twee personen
- **Koppelcode** van 6 tekens via de CLI, ingevuld *in* de geïnstalleerde app (§3.0). Een link in Safari werkt niet, omdat de geïnstalleerde app eigen opslag heeft.
- **Cookie:** HttpOnly, Secure, **SameSite=Lax**, 180 dagen geldig. Lax is nodig, omdat links vanuit een agenda of een melding anders zonder sessie binnenkomen.
- **Passkeys** komen in fase 2. Ze hangen aan het domein, dus het adres moet **vóór fase 2 definitief** zijn. Scrypt-wachtwoord (Uurwerk `users.js`) blijft als terugval.
- **Tokens** hebben elk een eigen scope: *sessie* (app), *feed* (één ICS, alleen lezen) en *koppeling* (Jarvis of iOS-Opdracht, met een expliciete scope-lijst). Overal wordt alleen de SHA-256 bewaard. Daarnaast `Throttle` per IP (overgenomen van Uurwerk) en CSRF op formulieren.
- **Herstel** bij een verloren telefoon of passkey: intrekken via de CLI en een nieuwe koppelcode.

### 5.4 Runtime, opslag, deploy en back-up
- **Runtime.** Dit volgt het patroon dat op deze VPS aantoonbaar werkt: **Node ≥ 20, `node-sqlite3-wasm`** (zoals Uurwerk), en de server als **esbuild-bundel** (`npm run build:server`). Code deelt via `package.json` `"imports": {"#gedeeld/*": "./gedeeld/*"}`; `tsconfig`-paths worden niet gebruikt. *Te verifiëren:* draait er Node 24 met `node:sqlite` op de VPS, dan kan die driver de wasm vervangen. Systeembreed upgraden doen we niet, want dat raakt Uurwerk.
- **Client.** Vite + Preact + TypeScript. Sprites zijn DOM-elementen met `pixelated`. Code en namen zijn in het Nederlands, net als in `preview.js`.
- **Hosting.** Twee systemd-instanties, `pixelquest@staging` (8791) en `pixelquest@prod` (8792), achter de bestaande Caddy. Elke instantie heeft een eigen database in `/var/lib/pixelquest/<instantie>`. Uurwerk zit op 8790, Reisbouwer op 8787. *Te verifiëren:* of 8791/8792 vrij zijn.
- **Deploy.** Grote overdrachten van thuis naar de VPS worden sinds 26 september verbroken, dus **geen rsync**. De route is die van Uurwerk: `deploy.sh` draait de tests, bouwt de bundel, zet die met `gh release upload` als `pq-server-latest` en geeft één korte ssh-opdracht. Daarmee haalt de VPS de release zelf op (`curl … | tar`) en draait `install.sh <instantie>` met een rooktest. Staging gaat altijd eerst.
- **Back-up** (fase 0). `server/bin/backup.ts` maakt elke nacht een `VACUUM INTO` naar `/var/backups/pixelquest/` en bewaart er 14. Elke week gaat er een kopie buiten de VPS, versleuteld met `age`, naar opslag die de VPS zelf bereikt (OVH Object Storage of een privé GitHub-release; §9), dus niet via de haperende thuislijn. **Hersteltest:** `backup.ts herstel --naar staging` wordt in fase 0 getest, en daarna herstelt een maandelijkse job automatisch de nieuwste back-up op staging en draait de rooktest. **Bewaking:** de back-upjob pingt een externe dead-man-switch (bijvoorbeeld healthchecks.io). Blijft die ping uit, of faalt de hersteltest, dan krijgt Hidde een mail.

### 5.5 Datamodel (SQLite; tijd in epoch-ms UTC, ids als uuid-tekst, `'samen'` als persoon voor gedeelde boekingen)

| Tabel | Velden (kern) | Fase |
|---|---|---|
| `personen` | id, naam, character_id, kleur, werktijden_json, stille_uren_json, toestemming_json, verwijderd_op | 1 |
| `apparaten` | id, persoon_id, naam, sessie_hash, laatst_gezien, push_json | 1 |
| `koppelcodes` | code_hash, persoon_id, verloopt_op, gebruikt_op | 1 |
| `instellingen_samen` | sleutel, waarde_json, gaat_in_op_week, akkoord_hidde, akkoord_tessie | 1 |
| `sjablonen` | id, titel, soort_werk (doen/plannen/bijhouden), minuten, zwaarte (0–2), waarde_status (voorlopig/bevestigd), bevestigd_door, herhaling (geen/behoefte/vast), interval_dagen, weekdagen, vaste_eigenaar_id | 1 |
| `taken` | id, sjabloon_id, titel, notitie, soort_werk, minuten, zwaarte, inzet (vast bij aanmaak), status (open/geclaimd/klaar/geschrapt), eigenaar_id (null = prikbord), samen, claim_tot, verzoek_aan, gedaan_door, gedaan_op, versie, gemaakt_door, gemaakt_op | 1 |
| | + tijd_type, start, eind, deadline_datum, venster_van, venster_tot | 2 |
| | + zichtbaarheid (gedeeld/prive/verrassing) | 3 |
| `taak_deelname` | taak_id, persoon_id, aandeel (samen-taken, 0,5) | 1 |
| `bedankjes` | id, van_id, taak_id, op | 1 |
| `grootboek` | id, opdracht_id, persoon_id (NOT NULL: uuid of `'samen'`), soort (inzet; munt vanaf fase 3), bedrag, reden, ref_id, door_id, week, op. **UNIQUE(opdracht_id, soort, persoon_id)** | 1 |
| `opdrachten_log` | id (uuid van de app of `job:…`), persoon_id, contract_versie, soort, gedaan_op, ontvangen_op, antwoord_json | 1 |
| `gebeurtenissen` | seq, soort, payload_json, zichtbaar_voor (`'beide'` of persoon_id), op | 1 |
| `weken` | week, norm, totaal, gehaald, rustweek_gebruikt, bevroren, streak, record, afgesloten_op | 1 |
| `terugblikken` | week, persoon_id, eerlijk (1–5), tekst_trots, tekst_dwars (gewist na onthullen), onthuld_op | 1 |
| `pets` | soort, status (ei/baby/jong/volwassen; draakje: ei/draakje/jonge draak/draak), meeloper, inzet_bij_start, naam, uitgebroed_op, in_nest, voortgang | 1 (draakje), 3 (rest) |
| `afwezigheid` | id, persoon_id (null = samen), van_datum, tot_datum, soort (ziek/weg/vakantie_samen/rustweek) | 2 |
| `ruilen` | id, van_id, naar_id, taak_id, tegen_taak_id, status, verloopt_op | 2 |
| `tokens` | id, persoon_id, soort (feed/koppeling), variant (persoon/huishouden/uurwerk), scope_json, hash, ingetrokken_op | 2 |
| `passkeys` | credential_id, persoon_id, publieke_sleutel, teller | 2 |
| `agenda_bronnen` | id, persoon_id, url_versleuteld, titels_bewaren, titels_delen, etag, laatst_opgehaald, fout | 2 |
| `bezet` | bron_id, uid, start, eind, titel (alleen bij bewaren) | 2 |
| `voorkeuren` (privé) | persoon_id, sjabloon_id, voorkeur (−1/0/1) | 3 |
| `items`, `bezit`, `kastvakken` | item: id, soort, slot, prijs, bron (winkel/zelf/cadeau/drop), maker_id, pixeldata_ref, seizoen | 3 |
| `mijlpalen`, `vouchers` | mijlpaal: id, titel, elke_n_weken, akkoord_beide; voucher: id, mijlpaal_id, plantaak_id, status | 3 |

**Grootboekregels.**

- `persoon_id` is nooit NULL. In SQLite zijn NULL's in een UNIQUE-index allemaal verschillend, waardoor dubbele samen-boekingen niet zouden worden tegengehouden. Daarom staat er `'samen'`.
- De sleutel bevat de **opdracht-id**, niet de taak-id.
- **Ongedaan maken** is een eigen opdracht met een eigen id. Die boekt een tegenregel met hetzelfde bedrag maar negatief, met `reden='ongedaan'` en `ref_id` = de oorspronkelijke opdracht. De taak gaat dan terug naar open.
- **Opnieuw afronden** is weer een nieuwe opdracht-id met nieuwe regels, zonder botsing.
- Jobs krijgen een vaste id, zodat een tweede run niets dubbel boekt.
- Er is nergens een kolom "saldo": alles wordt opgeteld uit het grootboek.

Pet-groei = samen-inzet − `inzet_bij_start`.

### 5.6 Hergebruik van Uurwerk

| Overnemen | Waarvoor |
|---|---|
| `backend/src/calendar/ics-write.ts` (+ test) | feeds |
| `backend/src/calendar/ics-parse.ts` (+ test), **plus EXDATE** | import |
| `isOwnUid`-patroon (`backend/src/calendar/index.ts:31`) | eigen feed filteren |
| SSE `/api/events` met keep-alive | `/api/live` |
| `Throttle` en het hashen van tokens (`server/src/devices.js`) | inloggen en tokens |
| scrypt (`server/src/users.js`) | terugval-wachtwoord |
| `server/deploy/` (deploy.sh via GitHub-release, install.sh, unit met `TZ`, Caddy-blok) | deploy |
| `node-sqlite3-wasm` + esbuild-bundel | runtime |
| **Niet:** rij-sync, device-tokens, gedeelde migraties | §5.2, §4.4 |

Voor de tests kies ik **Playwright** (twee contexten en offline-emulatie zitten erin) en niet het puppeteer-core van Uurwerk.

## 6. Bestand-voor-bestand-kaart, eerste versie (fase 0–1)

```
hidde_tessie_app/
├─ package.json            workspaces web/server/gedeeld; "imports" #gedeeld/*; scripts dev, test, test:e2e, build, deploy:staging, deploy:prod
├─ tsconfig.base.json      strict (geen paths)
├─ vitest.config.ts        unit- en servertests
├─ playwright.config.ts    twee iPhone-contexten 402×874, standalone-emulatie, offline
├─ .gitignore              node_modules, dist, *.db, .env, secrets, backups
├─ .gitattributes          * text=auto eol=lf
├─ LEESMIJ.md              (bestaand) + "App draaien" en "Deploy"
├─ app/, assets/, bron/, tools/   (bestaand, ongewijzigd; web/ leest assets/bron + manifest.json)
│
├─ gedeeld/                pure TS zonder I/O, draait in server én app
│  ├─ contract/model.ts        Taak, Sjabloon, Persoon, Week, Gebeurtenis, Stand
│  ├─ contract/opdrachten.ts   unie van alle opdrachten + CONTRACT_VERSIE (de enige API-seam)
│  ├─ regels/parameters.ts     startwaarden uit de bijlage van puntensysteem (fase 1-deel)
│  ├─ regels/inzet.ts          minuten × (1 + 0,3·zwaarte), afronden, samen-aandeel
│  ├─ regels/week.ts           norm, gehaald ≥ 80%, streak, record, weekbeschrijving per soort werk
│  ├─ regels/klok.ts           behoefte-klok, plantstand, sortering
│  ├─ regels/pet.ts            stadium uit samen-inzet
│  ├─ tijd/zone.ts             dag- en weekgrenzen Europe/Amsterdam (DST 25 okt)
│  └─ regels/*.test.ts         golden tests A en C (puntensysteem §11) + DST
│
├─ server/
│  ├─ src/start.ts             http, routes, statische web/dist, /api/gezond
│  ├─ src/db/verbinding.ts     node-sqlite3-wasm, WAL, transacties
│  ├─ src/db/migraties/001-basis.ts   tabellen fase 1 (§5.5)
│  ├─ src/db/migraties/index.ts       migratierunner
│  ├─ src/opdrachten/index.ts  dispatcher: versie-check → valideren → uitvoeren → grootboek → gebeurtenis (1 transactie, idempotent)
│  ├─ src/opdrachten/taken.ts  maken, bewerken, claimen, loslaten, verzoek, overnemen, afronden, ongedaan, schrappen, bedanken
│  ├─ src/opdrachten/samen.ts  instellingen met dubbel akkoord, sjabloon bevestigen, terugblik
│  ├─ src/grootboek.ts         boeken, tegenboeken, saldo's afleiden
│  ├─ src/stand.ts             zichtbaarheidsfilter per persoon; /api/stand, /api/sinds
│  ├─ src/live.ts              SSE met Last-Event-ID, keep-alive 25 s
│  ├─ src/klok.ts              herhaling aanmaken, weeksluiting ma 04:00 (vaste job-ids)
│  ├─ src/auth/sessies.ts      cookie (Lax), apparaten
│  ├─ src/auth/koppelcode.ts   6 tekens, 15 min, eenmalig
│  ├─ src/auth/throttle.ts     overgenomen van Uurwerk
│  ├─ bin/pq-personen.ts       CLI: koppelcode, apparaten, intrekken
│  ├─ bin/backup.ts            nacht-backup, 14 bewaren, weekelijks extern (age), herstel --naar staging
│  ├─ deploy/deploy.sh         test → build → gh release upload pq-server-latest → korte ssh
│  ├─ deploy/install.sh        op de VPS: release ophalen, instantie installeren, rooktest
│  ├─ deploy/pixelquest@.service   systemd, TZ=Europe/Amsterdam, poort per instantie
│  ├─ deploy/Caddyfile.pixelquest  host → 8791/8792, geen encode voor event-stream
│  └─ test/*.test.ts           dubbele opdracht → 1 boeking; ongedaan + opnieuw; claim-race; samen-boeking uniek; late opdracht; oud contract → nette fout; backup → herstel → zelfde /api/stand
│
├─ web/
│  ├─ index.html, vite.config.ts (alias @assets → ../assets)
│  ├─ public/manifest.webmanifest, public/iconen/   pixel-hart 192/512, maskable
│  ├─ src/main.tsx             standalone-check, router, tabbalk
│  ├─ src/sw.ts                app-shell-cache, update-flow "nieuwe versie, tik om te laden"
│  ├─ src/api/klant.ts         ENIGE plek met fetch: opdracht(), stand(), sinds()
│  ├─ src/api/outbox.ts        IndexedDB-wachtrij, legen bij open/online, teller
│  ├─ src/api/live.ts          EventSource + inhalen
│  ├─ src/opslag/cache.ts      laatste stand, storage.persist()
│  ├─ src/schermen/Installeer.tsx, Koppelen.tsx, Welkom.tsx (character, 3 uitlegschermen, toestemming, eerste quest)
│  ├─ src/schermen/Vandaag.tsx, Quests.tsx, TaakMaken.tsx, Week.tsx, Terugblik.tsx, Instellingen.tsx
│  ├─ src/onderdelen/Sprite.tsx      schaal/anker-logica uit app/preview.js (vulSprite), aria-label
│  ├─ src/onderdelen/TaakRij.tsx, Plant.tsx, Weekbalk.tsx, Tabbalk.tsx, Feed.tsx, Outboxteller.tsx
│  └─ src/stijl/pixelquest.css       basis uit app/pixelquest.css + toegankelijkheid (reduced-motion, 44 px, dynamic type)
│
└─ tests/e2e/
   ├─ twee-telefoons.spec.ts   Hidde rondt af → Tessie ziet het < 2 s (via staging-Caddy); claim-race
   ├─ offline.spec.ts          offline afronden → online → één keer geboekt; teller zakt naar 0
   ├─ onboarding.spec.ts       niet-standalone → installeerscherm; koppelcode → ingelogd
   └─ toegankelijkheid.spec.ts axe-core op elk scherm; reduced-motion
```

**Fase 2** voegt toe:
- `gedeeld/regels/afwezigheid.ts` en `gedeeld/regels/rustweek.ts`, met golden test B;
- `server/src/ics/{schrijf,lees,rrule,feed,import,vrijetijd}.ts`, met EXDATE, het filter op eigen UID's en uitrollen in wandtijd;
- `server/src/push.ts`, `server/src/auth/passkeys.ts`, `server/src/opdrachten/{ruilen,afwezigheid}.ts` en `server/src/export.ts` (export en verwijderen);
- `web/src/schermen/{Agenda,MijnGegevens}.tsx`.

**Fase 3** voegt toe:
- `gedeeld/regels/{pot,signaal,eieren}.ts`, met golden test D;
- `server/src/opdrachten/{winkel,kast,mijlpalen,pets,verdelen}.ts`;
- `web/src/schermen/{Pets,Kast,Winkel,Mijlpalen,Verdelen}.tsx`, plus de editor van de andere agent.

**Fase 4** raakt in Uurwerk `core/src/services/jarvis-tools.ts`, `server/app/jarvis/` (de geïnjecteerde PQ-client), `server/bin/uurwerk-secrets.js`, `backend/src/host.ts` en `docs/jarvis.md`. In Pixel Quest raakt fase 4 `server/src/koppeling.ts` en `/api/kort/*`.

## 7. Bouwplan

Elke fase heeft een **testpoort**. Wat getest wordt, is alleen wat in die fase gebouwd is. Alles gaat eerst naar staging. Prod volgt pas als de tests groen zijn en jullie het op allebei de telefoons hebben geprobeerd.

| Fase | Inhoud | Klaar als | Testpoort |
|---|---|---|---|
| **0 Fundament** | repo en git, server-skelet, migratie 001, koppelcode-auth, PWA-schil met standalone-check, staging en prod via GitHub-release, back-up en hersteltest, `/api/gezond` met dead-man-switch | beide telefoons hebben de app op het beginscherm en zijn gekoppeld; een herstelde back-up draait op staging | unit: tokens en koppelcode; servertest: backup → herstel → dezelfde stand; Playwright `onboarding.spec`; rooktest op de echte VPS-runtime (Node-versie en driver); handmatig op beide telefoons |
| **1 MVP: samen afvinken** | sjablonen + inzet + soort werk, prikbord/claimen/verzoek/overnemen, behoefte- en vaste herhaling, afronden/ongedaan, weekdoel + streak (≥ 80%) + record, draakje groeit, bedankje, week in woorden, terugblik (cijfer, onthullen, tekst wissen, sjablonen bevestigen), onboarding met eerste quest, live, outbox, basis voor toegankelijkheid | jullie gebruiken het een week op staging zonder handmatige reparaties | **golden A en C**; servertests (idempotent, ongedaan + opnieuw, claim-race, samen-uniek, late opdracht, oud contract); e2e twee telefoons, offline en toegankelijkheid; DST-test; **een week proefdraaien op staging** |
| **2 Tijd en agenda** | tijdtypes, persoonlijke en huishoudfeed, **Uurwerk-feed** + K1, import met EXDATE, RRULE en filter op eigen UID's, vrije tijd en *Plan voor ons*, Web Push + stille uren, afwezigheid + rustweek, ruilen 1-op-1, passkeys, export en verwijderen; **Tessie's toestemming voor de Uurwerk-feed** | Hidde ziet zijn PQ-tijdsloten in Uurwerk zonder popup; deadlines alleen in de iPhone-agenda; Tessie in haar agenda-app | **golden B**; ICS-roundtrip (schrijven → Uurwerk-parser); RRULE-tests incl. EXDATE en 25 okt; K1 met een kopie van de Uurwerk-database: score 80, geen popup, `freeStretches` niet geblokkeerd; echte abonnementen in Apple en Google; push en passkey op beide echte telefoons; export-filtertest (geen privé van de ander) |
| **3 Economie en verzamelen** | huispot, winkel, kast + editor, kastvakken, cadeaus, drops, herhaalbare mijlpalen, 13 eieren (nest van 3), privé- en verrassingstaken, afspraak-signaal, verdeelvoorstel | eerste aankoop en eerste ei uitgekomen | **golden D**; simulatie van 12 synthetische weken (70–100% van de munten besteed, ~1 ei per 2–3 weken, nep-inzet boven de norm levert 0 op); signaaltest (3 van 4 weken); screenshots van de sprites per stadium; lektest (privé-taak levert niets op) |
| **4 Uurwerk en Jarvis** | koppeltokens met scope, `/api/kort/vandaag`, K2 (geïnjecteerde PQ-client + 3 tools), iOS-Opdracht voor Tessie | Jarvis leest voor en rondt af na bevestiging | in Uurwerk `npm run test:live` met alleen getypte scenario's (centen) en nieuwe tool-tests op een kopie van de database; scope-test: het koppeltoken kan niets van Tessie lezen |
| **5 Optioneel** | Capacitor-schil voor Hidde (widget), K3, versleutelde kluis voor tekst | alleen als de PWA echt tekortschiet | zoals Uurwerk mobile: bouwen in CI, eerst testen, dan de SideStore-bron |

## 8. Te verifiëren (geen keuze, wel een check)
- **Node-versie op de VPS** (`node -v`): staat er Node 24 met `node:sqlite`? Zo niet, dan blijven we bij `node-sqlite3-wasm`, wat bewezen werkt. Of type-stripping nodig is, maakt niet uit: we bouwen een bundel.
- **Poorten:** zijn 8791 en 8792 vrij?
- **Classificatie:** de som van 80 voor de Uurwerk-feed, te testen op een kopie van de database in fase 2.
- **SSE-latentie** achter Caddy (< 2 s), te meten in de e2e-test via staging.
- **Passkeys en Web Push** in een iOS-beginschermapp, op beide echte telefoons.
- **Het itemmodel** (§5.5) afstemmen op de editor van de andere agent.

## 9. Keuzes voor jullie (één lijst)

**Spelregels**
1. **Verdeling:** 50/50 of naar draagkracht (Hiddes stage van 45 uur)? Dit bepaalt ook hoeveel de norm zakt bij afwezigheid.
2. **Weeknorm:** start op 600 en na twee weken ijken op wat jullie echt doen?
3. **Vaste plantaken:** welke zijn er (weekmenu, sociale agenda, geld, voorraad…) en wie is eigenaar van welke?
4. **Eerste quest:** de waarden van de eerste ~15 sjablonen, samen in één zitting.
5. **Dagsterren:** is een weekdoel (≥ 80%) genoeg, of willen jullie ze toch?
6. **Rustweek:** één per maand, is dat goed?
7. **Starter-pet:** het draakje (ei → draak, past bij de mock), of zelf kiezen? Voor elk groeistadium is art nodig.
8. **Huispot** (fase 3): vrij uit één pot kopen, of krijgt ieder de helft van de inkomsten?
9. **Mijlpalen** (fase 3): welke rituelen, hoe vaak, en blijven persoonlijke gunsten erbuiten (advies: ja)?
10. **Verrassingsdrops** (fase 3): ja of nee?

**Privacy en toestemming**

11. **Uurwerk-feed:** alleen Hiddes eigen taken (standaard), of ook de samen-taken? Dan gaan die via Uurwerk en Jarvis naar Gemini, en daarvoor is **Tessie's ja vanaf fase 2** nodig.
12. **Agenda:** alleen bezet/vrij delen (advies), of ook de titels?
13. **"Zat me dwars":** de tekst wissen na het onthullen en alleen het cijfer bewaren (advies)?
14. **Serverbeheer:** is het oké dat Hidde technisch alles kan lezen, of wil Tessie later een versleutelde kluis?
15. **Als één van jullie stopt:** wat gebeurt er met het gedeelde pet, de pot, de mijlpalen en de historie? Archief voor wie blijft, of alles wissen?
16. **Verrassingstaken in de feed van de ander** (fase 3): als "Geheime quest", of helemaal niet?

**Techniek en gebruik**

17. **Tessie's telefoon:** iPhone of Android, welke iOS-versie, en is "eerst op het beginscherm, dan een koppelcode" goed?
18. **Adres:** dat moet **definitief vóór fase 2** zijn, omdat de passkeys eraan hangen.
19. **Inloggen:** passkey met Face ID (advies) of alleen een wachtwoord?
20. **Back-up buiten de VPS:** OVH Object Storage of een privé GitHub-release?
21. **Meldingen:** wat staat standaard aan, wanneer zijn de stille uren, en wanneer is de terugblik (zondag 20:00?)?
22. **RRULE:** een eigen kleine expander (advies, geen afhankelijkheid) of het npm-pakket `rrule`?
23. **GitHub:** de code public, zoals Hiddes standaard? Zonder persoonsgegevens, maar wel met jullie namen en sprites. Let op: de deploy via een release vraagt bij een private repo een token op de VPS.
