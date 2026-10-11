# Uurwerk: verkenning voor koppeling met de taken-app

Alleen-lezen onderzoek van `C:\Users\hidde\Documents\Uurwerk` op 10 okt 2026. Alle paden
hieronder zijn relatief aan `Uurwerk\packages\` tenzij anders vermeld. Alles is in de code
nagelopen; de voorkennis uit de opdracht klopt, met de nuances onder "Controle".

## 0. Controle van de aannames

| Aanname | Uitkomst |
|---|---|
| Electron + wasm-sqlite, één API-seam | Klopt. API-contract `core/src/contract/api.ts`, kanaallijst `core/src/contract/channels.ts:1-` (zelfde lijst bouwt main, preload en server-RPC). |
| iPhone-app Capacitor + sql.js | Klopt in grote lijnen: `mobile/` met `@capacitor/preferences`, `mobile/src/sync.ts:1-40`. sql.js zelf niet nagelopen. |
| VPS-server `packages/server`, :8790, branch `vps-bron` | Server bestaat (`server/src/server.js`, `server/app/index.ts`). Poort 8790 en "live" staan niet in code die ik las (zie Onzeker). Branch klopt (sectie 5). |
| Offline-first rij-sync | Klopt: trigger-changelog + rij-upsert, `core/src/sync/schema.ts`, `core/src/sync/engine.ts`. |
| Rollen admin/begeleider/docent | Klopt, maar het zijn rollen voor **webgebruikers** (cookie-login), niet voor API-clients: `server/src/users.js:34` (`ROLES = admin, supervisor, teacher`). |
| Logisch event + provider-links, reis als kind-event, agenda-uren != timer-uren | Klopt, letterlijk in de migratie-uitleg `core/src/db/migrations/013-calendar.ts:1-35`. |
| Jarvis (docs/jarvis.md) | Klopt. Tools in `core/src/services/jarvis-tools.ts`, niet in `server/app/jarvis/tools.ts` zoals de doc zegt (dat bestand bestaat niet, alleen `tools.test.ts`). |

## 1. Datamodel

Database: SQLite, schema via migraties 001-021 (`core/src/db/migrations/`). Geen aparte
"geld"-tabellen in de gewone sync (zie 2).

### Id's, tijd, recurrence (algemeen)
- **Id**: `TEXT PRIMARY KEY`, nieuwe id's via `crypto.randomUUID()` (`core/src/db/connection.ts:166`). Vaste id's voor seed-rijen, bv. `work-type-travel` (`013-calendar.ts` einde, `010-work-types.ts`).
- **Tijdstempels**: epoch-milliseconden als INTEGER (`starts_at`, `started_at`, `created_at`, ...).
- **Datums zonder tijd** (taken): `TEXT` ISO `YYYY-MM-DD` (`due_date`, `earliest_start_date`, `must_do_date`).
- **Tijdzone**: er is geen tijdzone-kolom. Alles is UTC-epoch of lokale datum-string. Bij ICS-import wordt `TZID` gelezen als **lokale wandtijd van de machine** (`backend/src/calendar/ics-parse.ts:15-24`, kopcommentaar). Dagindeling gebeurt met de lokale tijdzone van het proces (`backend/src/calendar/push.ts:226-231`). De server draait dus op de tijdzone van de VPS; niet geverifieerd welke dat is.
- **Recurrence**: alleen voor kalender-events, ruwe `RRULE` als tekst in `calendar_events.recurrence_rule`, plus `recurrence_master_id`, `original_starts_at`, `cancelled` voor afwijkende/geannuleerde instanties (`013-calendar.ts:85-130`). "Read in this version and expanded for display". Taken hebben **geen** recurrence. Wekelijkse vaste dingen staan apart in `recurring_commitments` (`012-commitments.ts:23`).

### Tabellen
| Onderwerp | Tabel | Definitie | Type |
|---|---|---|---|
| Projecten | `projects` (id, name, color, shareable, archived, + `area_id` 003, + organisatie 009) | `core/src/db/migrations/index.ts:62`, `003-planner.ts:36`, `009-organizations.ts:38` | `core/src/contract/types.ts:115` |
| Taken | `tasks` (id, project_id, area_id, work_type_id, title, priority high/medium/low, status open/in_progress/blocked/done/archived, estimate_min, due_date, earliest_start_date, must_do_date, postponed_count, blocked_reason, notes, focus_mode, sort_order, created_at, completed_at) | oorspronkelijk `index.ts:71`; herbouwd in `006-task-status.ts:20`; kolommen uit 003, 010, 018, 019 | `types.ts:144` (`Task`), `types.ts:184` (`NewTask`) |
| Taak-afhankelijkheden | `task_dependencies` | `003-planner.ts:53` | |
| Gebieden (areas) | `areas` incl. `counts_as_stage_hours`, deelrechten begeleider/docent | `003-planner.ts:25` | |
| Organisaties | `organizations` | `009-organizations.ts:27` | |
| Work types | `work_types` (id, slug UNIQUE, name, sort_order, archived); seed: research, development, analysis, fieldwork, documentation, meeting, coursework, travel | `010-work-types.ts:24` en seed in `run()`; travel in `013-calendar.ts` | `types.ts:99` |
| Agenda-events | `calendar_events` | `013-calendar.ts:85` | `types.ts:992` (`CalendarEvent`), `types.ts:1039` (`NewCalendarEvent`) |
| Provider-links | `calendar_event_links` (event_id, account_id, external_id, etag, sync_status; UNIQUE(account_id, external_id)) | `013-calendar.ts:161` | `types.ts:1076` |
| Accounts / agenda's | `calendar_accounts` (provider outlook/icloud/ics), `calendars` | `013-calendar.ts:38`, `:65` | |
| Classificatieregels | `classification_rules` | `013-calendar.ts:181` | |
| Timer-runs | `tracking_runs` | `003-planner.ts:156` | |
| Timer-segmenten | `time_segments` (tracking_run_id, task_id, area_id, plan_block_id, started_at, ended_at, counts_as_stage_hours, completion_reason, + attributie 015, + `legacy_session_id` 005) | `003-planner.ts:166`, `015-attribution.ts:29` | `types.ts:588` |
| Plan | `plans`, `plan_blocks` (met `created_by='jarvis'` uit 020) | `003-planner.ts:112`, `:129` | |
| Vaste afspraken (oud) | `fixed_events` | `003-planner.ts:94` | |
| Ideeen | `ideas` | `021-ideas.ts:12` | |
| Jarvis | `rules`, `jarvis_day_log` | `020-jarvis-data.ts:26`, `:37` | |

### Relaties die voor de koppeling tellen
- `calendar_events.task_id` verwijst naar `tasks(id)` (`020-jarvis-data.ts:23`, type `types.ts` veld `taskId`). Er bestaat dus al een link event naar taak; alleen gebruikt door Jarvis (`created_by = 'jarvis'`).
- `calendar_events.reconciled_segment_id` koppelt een event aan een timer-segment zonder uren op te tellen (`013-calendar.ts:140-145`). Registratie-velden: `registration_mode none/calendar/confirm`, `counts_as_worked`, `confirmed_min`.
- Reis: `event_kind='travel'`, `parent_event_id`, `travel_direction outbound/return`, `travel_detached` (`013-calendar.ts:90-100`).
- Een nieuwe taak uit de taken-app past op `NewTask` (`types.ts:184`): `title` verplicht, rest optioneel. Er is geen veld voor "extern id" of "bron" op `tasks`.

## 2. API-seam en sync

### De seam
- Contract: `TimeTrackerAPI` in `core/src/contract/api.ts`. Taken: `tasks.list/get/create/update/complete/remove` (`api.ts:307-314`). Kalender: `calendar.eventsInRange`, `createEvent` (`api.ts:517`), `move`, `deleteEvent`, `classify`, `syncNow`, `connectIcs`, `connectIcloud`, `pushPlan` enz. (`channels.ts:91`). Timer: `tracking.*` (`channels.ts:~58`). Projecten: `projects.*`, work types: `workTypes.list/create/archive`.
- De kanaallijst `core/src/contract/channels.ts` is de enige bron: Electron-main, preload, en de server-RPC lezen allemaal dezelfde lijst (`server/app/index.ts:328-345`).
- Renderer-kant: `renderer/src/api/client.ts`.

### Sync-protocol (`core/src/sync/`)
- **Rijversie**: er is geen versiekolom per rij. Elke tabel krijgt AFTER INSERT/UPDATE/DELETE-triggers die een regel in `_changes(seq, tbl, pk, op, at, origin)` schrijven (`core/src/sync/schema.ts:128-165`). `at` = epoch-ms van de wijziging (`schema.ts:48`). Triggers worden bij elke open opnieuw gegenereerd uit het live schema (nieuwe kolommen/tabellen syncen automatisch).
- **Wat reist**: de rij zoals hij nu is, niet het verschil (`engine.ts` `withRows`, `readRow`). Per rij de laatste log-regel (`latestPerRow`).
- **Ronde** (`engine.ts:1-16` kopcommentaar): device pusht `pendingChanges` (`engine.ts:133`), server past toe met `receive` (`engine.ts:182`), device ackt, device pullt `feed` (`engine.ts:171`) en past toe met `applyChanges` (`engine.ts:227`).
- **Conflictregel**: per rij wint de laatste wijziging op `at` van het device; is de log van de server nieuwer, dan is de push "stale" en krijgt het device de serverversie bij de pull (`engine.ts:189-193`). Geen veld-voor-veld merge. Geen server-klok: `at` komt van de client.
- **Op het device**: rijen die tijdens de ronde opnieuw lokaal zijn gewijzigd worden overgeslagen bij apply (`engine.ts` `applyChanges`).
- **Toepassen**: `INSERT ... ON CONFLICT DO UPDATE` (nooit REPLACE, om cascades te vermijden), ouders eerst, een savepoint per rij; een kapotte rij wordt gerapporteerd en overgeslagen (`engine.ts:~290-340`).
- **Schemaversie moet gelijk zijn** (`MAX(id)` in `_migrations`); anders 409 (`server/app/index.ts:292-296`). Een tweede app die als sync-peer wil meedoen moet dus exact dezelfde migraties draaien.
- **Device-lokaal, niet gesynct**: settings als hotkeys, `serverUrl`, focus-lijsten, wake word (`schema.ts:24-46`). Geld gebruikt een eigen versleutelde kluis (`server/app/geld-vault.ts`, `/api/geld/vault`).
- **Onderhoud**: `compact` verwijdert oude log-regels (`engine.ts:~210`), server doet dat elke 6 uur (`server/app/index.ts:~226`).
- **Eerste koppeling**: laptop uploadt hele DB (`PUT /api/sync/snapshot`, `index.ts:268`); andere devices downloaden (`GET .../snapshot`, `index.ts:304`, via `VACUUM INTO`).
- **Live**: SSE `GET /api/events` (`index.ts:347`) meldt `data:invalidated`; clients pullen dan (`core/src/sync/live.ts`). Een sync-push die rijen toepast, stuurt `data:invalidated {domain:'tasks'}` (`index.ts:297-299`).

### Auth en tokens (apparaten)
- Device-token `uw_` + 32 random bytes hex, getoond bij aanmaken, op de server alleen als SHA-256 in `devices.json` (mode 0600) (`server/src/devices.js:43-52`, `:68-80`). Aanmaken/intrekken via CLI `server/bin/uurwerk-devices.js`.
- Elke `/api/*`-aanroep: bearer-token, throttling per IP met oplopende wachttijd (`server/src/server.js:60` `Throttle`, `:184-214`). 401 zonder detail.
- Een device-token geeft toegang tot **alles** onder `/api` (kopcommentaar `devices.js:1-12`). Er is geen scope of rol per token.
- CORS: alleen `capacitor://localhost` en `ionic://localhost` (`server.js:~190`). Een browser-origin van een webapp wordt niet toegelaten (de token blijft wel het slot; server-naar-server of native heeft geen CORS nodig).
- Laptop slaat token op via `host().secrets` (`backend/src/sync-client.ts:~363`), telefoon in Capacitor Preferences (`mobile/src/sync.ts:38`).

## 3. Agenda-providers

Provider-interface: `backend/src/calendar/provider.ts:52` (`CalendarProvider` met `capabilities {read, write, incrementalSync}`; id is `'outlook' | 'icloud' | 'ics'`).

| Koppeling | Stand | Waar |
|---|---|---|
| **ICS-abonnement lezen** (https/webcal URL) | Gebouwd, alleen lezen, geen incrementele sync | `backend/src/calendar/ics.ts:28-30`, `index.ts:39` `connectIcs`; parser `ics-parse.ts` (events, RRULE verbatim, RECURRENCE-ID, EXDATE-annulering, geen VTODO) |
| **ICS-feed publiceren** | Gebouwd: `GET /ical/<token>.ics` | `server/src/server.js:218-225`, `server/app/index.ts:372-382`, `writeFeed` `ics-write.ts:137`, `feedEvents` `push.ts:223` |
| **iCloud CalDAV** (lezen + schrijven in eigen "Uurwerk"-agenda) | Gebouwd | `caldav.ts`, `dav-xml.ts`, `index.ts:87` `connectIcloud`, `index.ts:144` `ensureUurwerkCalendar`, `push.ts` |
| **Outlook / Graph** | Alleen in de type-lijst en schema (`provider IN ('outlook','icloud','ics')`, `013-calendar.ts:43`). Geen `outlook.ts`-provider gevonden in `backend/src/calendar/`. | |
| **Google Calendar** | Niet aanwezig | |

Details:
- **Provider-links** staan in `calendar_event_links` met `external_id` (iCal UID), `etag`, `sync_status` en UNIQUE(account_id, external_id) tegen echo-lussen (`013-calendar.ts:161-178`).
- **ICS-URL staat niet in de database**: in de secrets-kluis onder een sleutel per account (`index.ts:~60-66` "The URL never touches the database"). De DB heeft `calendar_accounts` met `auth_method='url'`.
- **Importeren**: `backend/src/calendar/sync.ts:34` `importEvents` (upsert op UID, `origin='ics'`, `markMissingAsDeleted` `:173`). Geimporteerde events worden nooit teruggeschreven.
- **Eigen UID's**: `uurwerk-event-<eventId>[-<hash>]@uurwerk.app` (`push.ts` `eventUid`), herkenning `isOwnUid` (`index.ts:31`). Een taken-app die UID's op een andere manier kiest botst dus niet met die van Uurwerk.
- **Wat de uitgaande feed bevat**: Uurwerk's eigen afspraken, reis-blokken, dag-items en geaccepteerde plan-blokken, van -7 tot +60 dagen (`push.ts:223-236`, `server/app/index.ts:381`). **Taken met alleen een deadline zitten er niet in** en er is geen VTODO-uitvoer.
- **Instelbaar**: `calendarAutoSync` (default aan) en `calendarSyncEveryMin` (default 20, minimaal 5) (`core/src/db/repositories/settings.ts:60-63`, scheduler `server/app/index.ts:~197-206`). Push naar iCloud elke 2 minuten als er een iCloud-account is (`index.ts:~210-225`).
- De feed-token is het geheim `icalToken` (minimaal 24 tekens, constant-time vergeleken), te zetten met `uurwerk-secrets set icalToken` (`server/bin/uurwerk-secrets.js:20`, `server/app/index.ts:375-380`).

## 4. Serverroutes en veilig praten met een tweede app

### Endpoint-lijst
Router 1, `server/src/server.js` (HTTP, geen dependencies):
| Route | Auth | Doel |
|---|---|---|
| `/api/*` | device-token (bearer) | doorgeven aan `app.handle` (`server.js:184-214`) |
| `GET/HEAD /ical/<token>.ics` | token in pad | agenda-feed (`:218`) |
| `PUT/DELETE /publish/<naam>` | `UURWERK_PUBLISH_TOKEN` (bearer, `authorised` `:148`) | dagen/foto's die de desktop publiceert (`:227`, README) |
| `/geld/*` | geen (statische terugkeerpagina's bank) | `server/src/geld-pages.js` |
| `/inloggen`, `/uitloggen`, `/`, `/dag/*`, `/bestand/*`, `/style.css` | cookie-sessie, rol supervisor/teacher | webweergave voor begeleider en docent (`server.js:238-330`) |
| `/beheer/*` | cookie, rol admin, CSRF-token | accountbeheer, intrekken van dagen (`:260`, `:372-410`) |

Router 2, `server/app/index.ts` (alleen met device-token, `handle` vanaf `:236`):
| Route | Regel | Doel |
|---|---|---|
| `GET /api/sync/status` | 244 | geinitialiseerd? schemaversie, devicenaam |
| `POST /api/sync` | 286 | push/pull rijen |
| `GET/PUT /api/sync/snapshot` | 304 / 268 | hele DB |
| `PUT /api/files/{uuid}.{jpg,png,webm}` | 321 | screenshot-bytes |
| `POST /api/rpc/{domein}/{methode}` | 328 | **elke** `TimeTrackerAPI`-methode uit `CHANNELS`, behalve `money`, `sprint`, `window`, `startup`, `sync`, `capture.markNow` (`NOT_OVER_RPC` `:85`). Body = argumentenlijst, of een enkel JSON-object als enkel argument (bedoeld voor iPhone Opdrachten, `:335-337`). |
| `GET /api/events` | 347 | SSE `data:invalidated`, `tracking:segmentChanged` |
| `GET/POST /api/geld/vault` | 252 / 257 | versleutelde Geld-records |
| WebSocket upgrade | `server.js` `server.on('upgrade')` -> `jarvis/voice.ts` | Jarvis-spraaklijn, eenmalig ticket |

### Auth-model samengevat
Drie gescheiden sloten: (1) device-token voor de API, (2) cookie-login met rol voor de leesweergave, (3) een los publish-token en een los ical-token. Geen OAuth. Rollen admin/supervisor/teacher gelden alleen voor het web; een API-client kan er geen krijgen.

### Kan de taken-app met een eigen sleutel praten?
**Ja, technisch zonder codewijziging**: `node server/bin/uurwerk-devices.js add taken-app` geeft een eigen `uw_...`-token (naam: kleine letters/cijfers/streepjes, `devices.js:43`). Intrekken is `remove taken-app`. Daarmee kan de taken-app `POST /api/rpc/tasks/create` enz. aanroepen.

**Maar** een device-token is niet te beperken: hij opent ook alle uren, screenshots, de snapshot-download en alle RPC's (`devices.js:1-12`). Een lek in de taken-app = volledige toegang tot Uurwerk-data van Hidde, inclusief de begeleider-zichtbare screenshots. Voor een app die Tessie ook gebruikt is dat een groot risico. Er is geen rol, scope, of read-only-modus per token.

## 5. Branches

Commando's alleen lezen op `C:\Users\hidde\Documents\Uurwerk`:
- `git branch -a`: `main`, `* vps-bron`, `remotes/origin/main`, `remotes/origin/vps-bron`.
- Huidige branch: **`vps-bron`**, HEAD `a0b2b11` (6 okt 2026, "Date and time pickers in dialogs work on the laptop again"), gelijk aan `origin/vps-bron`.
- `main` = `origin/main` = `75fb134`. `vps-bron` is **102 commits voor** op main, main heeft er 0 extra. De actuele code is dus `vps-bron`; `main` loopt ver achter.
- Laatste 15 (nieuwste eerst): a0b2b11 date/time pickers; 00349c3 "5 sec" sprint + inplannen vanuit weekweergave; 7a99c9f sync voor afsluiten + eiland toont afspraken; 0f4559e Geld-module; 3af07e2 iOS-build Jarvis intent; d716fe5 cue-geluiden + herinneringen; 113af42 hele-dag-items stapelen; 0e54f25 Live Activity; 5753c9b hele-dag-items nooit classificeren; 8de8417 Jarvis sluit gesprek; 6f8481c focus op laptop; e048408 Jarvis K1-K6; 8bdb637 afgevinkte taak heropenen; 2e14fbb timer-state volgt sync.
- Werkboom bij mijn check: geen uitvoer van `git status --short` (schoon). Niets gewijzigd.

## 6. Advies: koppelvormen

Randvoorwaarden uit de code: Uurwerk heeft geen VTODO en geen taak-ICS, wel (a) een ICS-**lees**-provider voor events, (b) een ICS-**schrijf**-feed met token, (c) de RPC-deur met een kracht-token, (d) `calendar_events.task_id`, (e) `tasks`-API zonder bron/extern-id-veld.

### Vorm A (aanbevolen eerste stap): taken-app publiceert een ICS-feed met agenda-items, Uurwerk abonneert erop
De taken-app maakt een `https://.../ical/<geheim>.ics` met alleen taken die een tijd hebben (VEVENT met DTSTART/DTEND, stabiele UID zoals `pq-task-<id>@pixelquest`, `X-WR-CALNAME`). In Uurwerk: Instellingen, Agenda, "ICS-link toevoegen" (bestaat al, `calendar.connectIcs`).
- Voordelen: nul codewijziging in Uurwerk; werkt direct op laptop en telefoon; geen extra geheimen met brede rechten; rolt terug als je de abonnementslink weghaalt; Uurwerk classificeert importen zelf met regels (`classification_rules`) en laat uren opt-in (`registration_mode='none'` standaard), dus agenda-uren worden niet per ongeluk timer-uren.
- Nadelen: eenrichting (taken-app naar Uurwerk); geen "afgevinkt"-terugkoppeling; polling elke 20 min (default, `settings.ts:63`); TZID wordt als lokale tijd gelezen, dus in de feed beter UTC (`...Z`) gebruiken (`ics-parse.ts:15-24`); taken zonder tijdstip vallen weg of worden hele-dag-item.
- Wat in Uurwerk moet veranderen: niets verplicht. Optioneel: in `classification_rules` een regel op calendar-naam zetten zodat items automatisch bij gebied/project komen (`013-calendar.ts:181`), en eventueel `ignore_for_planning` uit voor de Pixel Quest-agenda zodat de planner er rekening mee houdt.

### Vorm B: Uurwerk-server krijgt een eigen `/api/taken`-endpoint (of een nieuwe lichte rol) voor de taken-app
Twee uitvoeringen:
1. **Snel, zonder code**: taken-app gebruikt een eigen device-token en `POST /api/rpc/tasks/create|update|complete`, `/api/rpc/calendar/createEvent`. Kan vandaag. Risico: onbeperkte rechten (sectie 4).
2. **Netjes**: in `server/app/index.ts` naast `handle` (regel ~236) een tweede deur toevoegen: `/api/ext/...` met een tweede soort token (bv. `uwx_`, apart bestand `clients.json` naar model van `devices.js`) met **scope-lijst** (alleen `tasks.*`, `calendar.createEvent|move|deleteEvent`, read `calendar.eventsInRange`). Server vertaalt naar `implementation.tasks.*` zoals `index.ts:339`.
- Voordelen: tweerichtingsverkeer (taak afvinken in Uurwerk komt in de taken-app); Uurwerk's classificatie en planner werken direct; Jarvis ziet de taken meteen (zelfde tabellen); wijzigingen sync'en vanzelf naar laptop en telefoon via triggers (origin NULL, `engine.ts` `feed`).
- Nadelen: Uurwerk-code moet aangepast worden en op de VPS uitgerold (branch `vps-bron`); eigen tokenbeheer nodig; `tasks` heeft geen `external_id`/`source`-kolom, dus een mapping taken-app-id naar Uurwerk-id moet ergens staan (nieuwe migratie 022 of tabel `external_links`; dat verandert de schemaversie en dwingt alle devices tot update, `index.ts:292`); Tessie's taken kunnen in Hiddes Uurwerk belanden tenzij je filtert (Uurwerk is single-user, geen eigenaarsveld).
- Wat in Uurwerk moet veranderen: (a) tokenbestand + verificatie + scope-check in `server/src/` en `server/app/index.ts`; (b) CLI uitbreiden in `server/bin/`; (c) migratie voor extern id op `tasks` en `calendar_events`; (d) afbakening: alleen taken met een bepaald project/gebied tonen aan de taken-app.

### Vorm C: Jarvis vraagt taken uit (en maakt ze aan) via zijn tools
Jarvis heeft al `create_task`, `update_task`, `schedule_task`, `list_tasks`, `create_appointment` (`core/src/services/jarvis-tools.ts:173-300`), draait op de server en gebruikt de gewone API. Een nieuwe tool, bv. `list_pixelquest_tasks`, zou de taken-app lezen (of via een kleine API van de taken-app) en Hidde voorstellen wat in te plannen.
- Voordelen: past bij de bestaande bevestigingsregel (Jarvis vraagt voor schrijfacties, `docs/jarvis.md:124-135`); geen tokens van de taken-app in Uurwerk's database nodig, wel een secret (zoals `geminiKey`); Hidde houdt de regie.
- Nadelen: werkt alleen in een gesprek, niet als stille sync; kost LLM-tokens; hangt af van Jarvis-modelkeuze en spraak; niet geschikt voor Tessie's taken in realtime.
- Wat in Uurwerk moet veranderen: nieuwe tool in `jarvis-tools.ts`, secret in `server/bin/uurwerk-secrets.js:20` (`KNOWN`) en `backend/src/host.ts:37`, aanpassing van de brief `docs/jarvis.md`.

### Gedeelde sync-tabel (niet aanbevolen)
Sync werkt alleen tussen exact gelijke schemaversies en synct **alle** tabellen (`schema.ts` `syncedTables`); er is geen deelselectie. De taken-app zou de Uurwerk-schema's moeten kopieren en meedraaien in elke migratie. Veel te strak gekoppeld, en een device-token geeft de taken-app alle data.

### Samenvattend advies
1. Begin met **A (ICS-feed, Uurwerk abonneert)**: kost niets in Uurwerk en dekt "taken met tijd in mijn agenda".
2. Voeg later **B2 (smalle API met eigen scope-token)** toe als je afvinken of deadline-taken tweerichting wilt. Gebruik niet het gewone device-token voor de taken-app als Tessie erop meeloopt.
3. **C (Jarvis)** is een bonus voor de planning, niet de basis.

## Onzeker / niet gevonden

- Poort **8790** en "live": niet in de code die ik las (config staat in `server/src/config.js` en `server/deploy/`; niet geopend). Alleen uit het geheugen bevestigd, niet uit de repo.
- **Outlook/Graph-provider**: schema en type noemen 'outlook', maar ik vond geen `outlook.ts` in `backend/src/calendar/`. Mogelijk (nog) niet gebouwd. Niet nagezocht in `renderer/` of tests.
- **Google Calendar**: nergens in de code gevonden (alleen een zoekopdracht op bestandsnamen en de provider-types).
- **VTODO / taken in ICS**: geen ondersteuning gevonden, in noch uit (zoekopdracht `VTODO` in `backend/src` en `core/src`: 0 treffers).
- **Tijdzone van de VPS**: niet gecontroleerd. Dagindeling in `feedEvents` gebruikt de procesklok; ICS met TZID wordt als lokale tijd gelezen. Voor Europe/Amsterdam-gebruik uitzoeken wat `TZ` is in `server/deploy/uurwerk-server.service`.
- **sql.js op de iPhone**: wel Capacitor gezien, sql.js zelf niet geverifieerd (zie `mobile/src/database.ts`, niet geopend).
- **Of RPC-aanroepen de live-SSE `data:invalidated` triggeren**: de RPC-route (`index.ts:328-345`) stuurt zelf geen event; wijzigingen komen wel in `_changes` (triggers) en worden bij de volgende pull/ronde (30 s, `mobile/src/sync.ts` `ROUND_EVERY_MS`) opgepikt. Niet getest.
- **Inplannen van ICS-geimporteerde events in Uurwerk's planner** (`include_in_planning`, `ignore_for_planning`) en hoe `classification_rules` precies matchen: alleen de schema-commentaren gelezen, de logica in `core/src/services/calendar/classify.ts` niet.
- **Bepaalde regelnummers** zijn bij benadering (`~`) waar ik een blok las zonder het exacte nummer te grepen; kritieke verwijzingen (`index.ts:286/292/328`, `server.js:184/218`, `devices.js:43/68`, `engine.ts:171/182/191`, `013-calendar.ts:85/161`) zijn met grep bevestigd.
- Er is geen onderzoek gedaan naar `.env`, `devices.json`, `secrets.json`, `users.json` of de database zelf (bewust, privacy).
