# Hidde & Tessie – Pixel Quest-assets

Taken-app voor ons tweeën: Pixel Quest.

## De app

Dubbelklik `app/index.html`: dat is de app, één pagina met onderin **Vandaag · Quests · Huis · Kast · Meer**. Er is geen server nodig; alles blijft (nog) op het apparaat. Bouwen voor de VPS en de iPhone: `bash tools/bouw_web.sh` (naar `dist/`). Schermen, store, zoom en het testscript: [docs/app-ui.md](docs/app-ui.md).

## Assetcontrole

De oude assetcontrole staat in `app/assets.html` (in de app onder Meer → debug). Er is geen server nodig.

- **Controle**: elke asset staat naast de ongewijzigde uitsnede uit het blad, op dezelfde schaal. Je kunt wisselen tussen bron en native, de achtergrond kiezen en het canvas met het anker tonen.
- **In de app**: een voorbeeldscherm met quests, de twee characters, een huisdier en de collectie.

## Bronnen

`bron/` bevat de goedgekeurde bladen. Ze zijn hier ongewijzigd naartoe gekopieerd.

- `pixel-quest-uitwerking.png` is het characterblad. Daaruit komen Hidde en Tessie, de grote basisavatars.
- `pixel-quest-pets-collectie.png` is het petblad en geldt als definitieve bron voor de eerste 11 pets.
- `pixel-quest-extra-pets.png` is het aanvulblad met ottertje, egeltje en varkentje.

## Assets (`assets/`)

| Map | Wat | Canvas character / pet | Anker character / pet |
|---|---|---|---|
| `bron/` | Exacte bronpixels. Achtergrond, grondschaduw, rasterlijnen, labels, bubbels en plasje zijn verwijderd. **Dit is de primaire statische asset.** | native canvas × raster van het blad: 291×508 / 374×337 (petblad) en 751×676 (extra blad) | zie manifest |
| `native/` | Reconstructie met één kleur per artpixel | 64×112 / 80×72 | (32, 108) / (40, 68) |
| `native-4x/` | `native/` vier keer vergroot (nearest neighbour) | 256×448 / 320×288 | (128, 432) / (160, 272) |
| `referentie/` | Ongewijzigde uitsnede uit het blad, voor de vergelijking | – | – |

Het anker ligt middenonder de voeten of het lichaam. Elke figuur staat horizontaal gecentreerd en met de onderkant op het anker, zodat animaties niet verspringen. Boven de figuren is ruimte gelaten voor armen omhoog en sprongetjes.

`manifest.json` geeft per asset het bestand, de canvasmaat, het anker, de figuurmaat, het referentievak in het blad en het aantal bronpixels per artpixel. `manifest.js` bevat hetzelfde manifest voor de preview.

**Overgetekend: niets.** Alle 16 assets (2 characters en 14 pets) zijn uitgesneden uit de bladen. Er is niets met de hand of met AI opnieuw getekend.

## Waarom zowel bron als native

De bladen zien eruit als pixelart, maar ze liggen niet op een exact pixelraster. Eén artpixel is 4,2 tot 5,4 bronpixels groot, en dat verschilt per figuur en per as. Daarom:

- **bron** is pixel voor pixel gelijk aan het ontwerp. Schaal deze assets uniform met `image-rendering: pixelated`.
- **native** gebruikt één vierkant raster per blad: 4,54 px voor het characterblad en 4,68 px voor het petblad. De verhoudingen blijven daardoor gelijk, met hooguit 2% afwijking door afronding. Kleine gezichtsdetails, zoals ooglichtjes, smeren wel uit. Native is daarom een **startpunt voor animatieframes**. Gezichten moeten daar nog handmatig worden opgeschoond tegen de referentie.

In de app gebruik je de bronassets op een vaste schaal: schermpx = artpx ÷ `bronpx_per_artpixel`. Dan zijn pets en characters onderling even groot als op de bladen.

### Extra blad: figuurschaal 1,5

Het aanvulblad is grover getekend: 6,26 bronpx per artpixel. In artpixels zijn de dieren daar ongeveer 1,5 keer zo groot als op het petblad. Daarom staat `FIGUURSCHAAL = {EXTRABLAD: 1.5}`. Ottertje, egeltje en varkentje worden dan even groot als de andere pets, en hun native-versie heeft dezelfde korrel. De bronbestanden blijven exact; alleen de weergaveschaal verandert.

Wil je dat elk blad zijn eigen pixelgrootte houdt? Zet de figuurschaal dan op 1.0. De drie nieuwe pets worden dan 1,5 keer groter. Je kunt het verschil bekijken met de schakelaar onder Collectie in de preview.

## Opnieuw genereren

```
C:\Users\hidde\miniconda3\envs\segment-reviewer\python.exe tools\uitsnijden.py
```

In `GATEN` (in `tools/uitsnijden.py`) staan de ingesloten achtergrondvlakken die bewust transparant worden gemaakt, zoals tussen de benen, tussen arm en lijf, en tussen de pootjes. Sneakers, het konijnenstaartje, de buiken en de ooglichtjes hebben exact de achtergrondkleur. Die blijven daarom alleen staan omdat ze door de outline worden ingesloten.

## Kleding en outfits

`app/kledingkast.html` bevat kledingzones, kleurvarianten, een outfitcatalogus, accessoires en een pixel-editor. De hoodie- en avonturiersfiguren en de items zijn uitgesneden. Draai na `uitsnijden.py` ook `tools\kleding.py` en `tools\kast.py`. De kast is modulair: losse items per slot (hoofd, boven, jas, onder, heel lichaam, schoenen, accessoire) als lagen op het figuur. Wat nog op nieuwe kunst wacht, staat in `docs/kleding-art-brief.md`. Aanpak, kwaliteit en wat nieuw getekend is staan in `docs/kleding.md`.

## Ons huis

In de app staat het huis onder *Huis* (los: `app/huis.html`). Het toont jullie huis als poppenhuis-doorsnede, met bewoners, pets, taaksignalen en een bewerkmodus. Onder *Verbouwen* staan de 10 verbouwingen van jullie ene huis, van starthuisje tot torentje (kopen kan pas in fase 3). Data staat in `assets/huis.js`, uitleg in `docs/huis.md`. De meubels zijn placeholders; de figuren en items zijn exact uitgesneden. Met `?test` achter een paginanaam zie je rechtsboven het aantal JS-fouten.

## Nog niet gedaan

- Animaties (idle, blij, bezig, slapen, vieren) als spritesheets
- Het hoodiepaar mist na het splitsen twee stukjes outline (zie `docs/kleding.md`); er is niets bijgetekend.
- Groei van ei naar draak
