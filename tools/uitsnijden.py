"""Snijdt de goedgekeurde figuren uit de Pixel Quest-bronbladen.

Per figuur twee resultaten:
  1. bronuitsnede  - originele bronpixels, achtergrond/schaduw/rasterlijnen transparant.
  2. native sprite - teruggebracht naar het eigen pixelraster van die figuur
                     (één kleur per artpixel), voor schaalbare game-assets.

De bronbladen hebben geen uniform raster: elke figuur heeft een eigen celgrootte
(4,2-5,4 bronpixels per artpixel, per as verschillend). Daarom zoekt dit script
per figuur de celgrenzen met dynamisch programmeren op het gradiëntprofiel.

Gebruik:  python tools/uitsnijden.py
"""
import json
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage as ndi

ROOT = Path(__file__).resolve().parents[1]
BRON = ROOT / 'bron'
UIT = ROOT / 'assets'

PETBLAD = 'pixel-quest-pets-collectie.png'
CHARBLAD = 'pixel-quest-uitwerking.png'
EXTRABLAD = 'pixel-quest-extra-pets.png'

# Figuurschaal per blad: het extra blad is grover getekend (~6,3 bronpx per
# artpixel) en de dieren zijn in artpixels ~1,5x zo groot als op het petblad.
# Met 1,5 krijgen ze dezelfde figuurgrootte als de andere pets; met 1,0 houden
# ze dezelfde pixelgrootte (en worden ze 1,5x groter).
FIGUURSCHAAL = {EXTRABLAD: 1.5}

# (id, naam, blad, vak x0, y0, x1, y1) - vak = zoekgebied zonder label.
FIGUREN = [
    ('hidde', 'Hidde', 'character', CHARBLAD, (60, 158, 255, 556)),
    ('tessie', 'Tessie', 'character', CHARBLAD, (250, 170, 450, 556)),
    ('konijntje', 'Konijntje', 'pet', PETBLAD, (18, 110, 382, 368)),
    ('hondje', 'Hondje', 'pet', PETBLAD, (390, 110, 765, 368)),
    ('katje', 'Katje', 'pet', PETBLAD, (772, 110, 1147, 368)),
    ('parkietje', 'Parkietje', 'pet', PETBLAD, (1153, 110, 1520, 368)),
    ('kikkertje', 'Kikkertje', 'pet', PETBLAD, (18, 418, 382, 642)),
    ('cavia', 'Cavia', 'pet', PETBLAD, (390, 418, 765, 642)),
    ('schildpadje', 'Schildpadje', 'pet', PETBLAD, (772, 418, 1147, 642)),
    ('salamander', 'Salamander', 'pet', PETBLAD, (1153, 418, 1520, 642)),
    ('kameleon', 'Kameleon', 'pet', PETBLAD, (18, 694, 382, 942)),
    ('haaitje', 'Haaitje', 'pet', PETBLAD, (390, 694, 765, 942)),
    ('draakje', 'Draakje', 'pet', PETBLAD, (772, 694, 1147, 942)),
    ('ottertje', 'Ottertje', 'pet', EXTRABLAD, (22, 160, 652, 688)),
    ('egeltje', 'Egeltje', 'pet', EXTRABLAD, (660, 160, 1302, 688)),
    ('varkentje', 'Varkentje', 'pet', EXTRABLAD, (1308, 160, 1938, 688)),
]

ACHTERGROND = np.array([252, 248, 236], float)
DONKER = 165          # luminantie onder deze waarde = outline/barrière
MIN_DEEL = 0.02       # losse delen kleiner dan 2% van het hoofddeel vervallen
RANDZONE = 3          # bronpixels vanaf de buitenkant waarin crème-halo wordt weggehaald

# Ingesloten achtergrond die wél weg moet (zaadpunt in bladcoördinaten).
# Sneakers, konijnstaart, buiken en ooglichtjes hebben exact de achtergrondkleur
# en blijven dus bewust staan; alleen deze aangewezen vlakken worden transparant.
GATEN = {
    'hidde': [(128, 352)],                                   # tussen arm en lijf
    'tessie': [(384, 215), (405, 241), (415, 280),
               (422, 308),                                   # zakjes tussen krullen
               (360, 369),                                   # tussen arm en lijf
               (327, 482)],                                  # tussen de benen
    'parkietje': [(1316, 332)],                              # tussen de pootjes
    'kameleon': [(234, 863)],                                # tussen staart en poot
}


def luminantie(a):
    return a[..., 0] * 0.299 + a[..., 1] * 0.587 + a[..., 2] * 0.114


def masker(a, gaten=(), oorsprong=(0, 0)):
    """Figuurmasker: alles wat de donkere outline insluit, plus de outline zelf."""
    barriere = luminantie(a) < DONKER
    # Kleine gaatjes in de outline dichten, anders lekt de vulling naar binnen.
    barriere_dicht = ndi.binary_dilation(barriere, iterations=1)
    vrij = ~barriere_dicht
    lab, _ = ndi.label(vrij)
    rand = np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))
    buiten = np.isin(lab, rand[rand > 0])
    figuur = ~buiten
    afstand = np.linalg.norm(a - ACHTERGROND, axis=2)
    # Zakjes achtergrond die via een smalle opening (tussen krullen, vingers)
    # met de buitenkant verbonden zijn: zonder dichting opnieuw vullen.
    # Alleen kleine lekken; een groot lek zou een outline-gat in een wit vlak zijn.
    lab, _ = ndi.label(~barriere)
    rand = np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))
    lek = np.isin(lab, rand[rand > 0]) & figuur
    lek &= ndi.binary_erosion(figuur, iterations=1)   # buitenring koppelt anders alles
    lab, n = ndi.label(lek)
    if n:
        groottes = ndi.sum(lek, lab, range(1, n + 1))
        klein = [i + 1 for i, g in enumerate(groottes) if g < 150]
        figuur &= ~np.isin(lab, klein)
        groot = [int(g) for g in groottes if g >= 150]
        if groot:
            print('  let op: groot lek behouden', groot, 'oorsprong', oorsprong)
    # Aangewezen ingesloten achtergrond weg.
    achtergrondkleur = figuur & (afstand < 16)
    lab, _ = ndi.label(achtergrondkleur)
    for gx, gy in gaten:
        x, y = gx - oorsprong[0], gy - oorsprong[1]
        buurt = lab[max(0, y - 3):y + 4, max(0, x - 3):x + 4]
        buurt = buurt[buurt > 0]
        if len(buurt) == 0:
            raise ValueError(f'gat-zaadpunt {(gx, gy)} ligt niet in achtergrondkleur')
        figuur &= lab != np.bincount(buurt).argmax()
    # Crème-halo langs alle randen weg, ook rond verwijderde gaten en zakjes
    # (outline is ~4 bronpx dik, dus echte witte delen zoals sneakers liggen
    # dieper dan RANDZONE).
    zone = figuur & ~ndi.binary_erosion(figuur, iterations=RANDZONE, border_value=1)
    figuur &= ~(zone & (afstand < 30) & ~barriere)
    # Alleen hoofddeel + noemenswaardige delen houden (bubbels, buren, sterretjes weg).
    lab, n = ndi.label(figuur)
    if n == 0:
        return figuur
    groottes = ndi.sum(figuur, lab, range(1, n + 1))
    houd = [i + 1 for i, g in enumerate(groottes) if g >= MIN_DEEL * groottes.max()]
    return np.isin(lab, houd)


def beste_fase(profiel, p):
    """Fase waarbij rasterlijnen gemiddeld op de sterkste kleurovergangen vallen."""
    best = (-1.0, 0.0)
    for fase in np.arange(0, p, 0.1):
        idx = np.round(np.arange(fase, len(profiel), p)).astype(int)
        idx = idx[idx < len(profiel)]
        best = max(best, (profiel[idx].mean(), fase))
    return best


PERIODES = np.arange(4.0, 7.2, 0.02)


def profielen(a):
    # Kleurovergang tussen pixel i-1 en i wordt toegekend aan positie i.
    px = np.concatenate([[0], np.abs(np.diff(a, axis=1)).sum(2).sum(0)])
    py = np.concatenate([[0], np.abs(np.diff(a, axis=0)).sum(2).sum(1)])
    return px / px.mean(), py / py.mean()


def raster_score(a):
    """Rasterscore per kandidaat-periode (x en y samen)."""
    px, py = profielen(a)
    return np.array([beste_fase(px, p)[0] + beste_fase(py, p)[0] for p in PERIODES])


def raster(a, p):
    """Vierkant, uniform raster: één periode voor x én y, zodat de verhoudingen
    exact gelijk blijven (alleen uniforme schaal). Periode is per bronblad gekozen,
    zodat figuren van hetzelfde blad onderling even groot blijven; alleen de fase
    wordt per figuur gezocht."""
    px, py = profielen(a)
    fx, fy = beste_fase(px, p)[1], beste_fase(py, p)[1]

    def lijnen(fase, n):
        g = np.round(np.arange(fase - p, n + p, p)).astype(int)
        return np.unique(np.clip(g, 0, n))
    return lijnen(fx, a.shape[1]), lijnen(fy, a.shape[0])


def native(a, m, p):
    """Eén kleur per artpixel: mediaan van de cel-kern; alpha = meerderheid masker."""
    gx, gy_ = raster(a, p)
    h, w = len(gy_) - 1, len(gx) - 1
    out = np.zeros((h, w, 4), np.uint8)
    for r in range(h):
        y0, y1 = gy_[r], gy_[r + 1]
        for c in range(w):
            x0, x1 = gx[c], gx[c + 1]
            cel_m = m[y0:y1, x0:x1]
            if cel_m.mean() < 0.5:
                continue
            ky0, ky1 = (y0 + 1, y1 - 1) if y1 - y0 > 3 else (y0, y1)
            kx0, kx1 = (x0 + 1, x1 - 1) if x1 - x0 > 3 else (x0, x1)
            kern = a[ky0:ky1, kx0:kx1][m[ky0:ky1, kx0:kx1]]
            if len(kern) == 0:
                kern = a[y0:y1, x0:x1][cel_m]
            out[r, c, :3] = np.median(kern, axis=0)
            out[r, c, 3] = 255
    return out, gx, gy_


def rgba_bron(a, m):
    out = np.zeros(a.shape[:2] + (4,), np.uint8)
    out[..., :3] = a.astype(np.uint8)
    out[..., 3] = m * 255
    return out


def bijsnijden(rgba):
    ys, xs = np.nonzero(rgba[..., 3])
    return rgba[ys.min():ys.max() + 1, xs.min():xs.max() + 1], (xs.min(), ys.min())


def op_canvas(rgba, cw, ch, voet_y):
    """Plaatst figuur horizontaal gecentreerd, onderkant (voeten) op voet_y."""
    h, w = rgba.shape[:2]
    if w > cw or h > voet_y:
        raise ValueError(f'figuur {w}x{h} past niet in canvas {cw}x{ch} (voet {voet_y})')
    doek = np.zeros((ch, cw, 4), np.uint8)
    x0 = (cw - w) // 2
    y0 = voet_y - h
    doek[y0:y0 + h, x0:x0 + w] = rgba
    return doek


# Canvas per categorie, in artpixels (native) - ruimte voor armen omhoog, sprongetjes, wiebelen.
CANVAS = {
    'character': {'w': 64, 'h': 112, 'voet_y': 108},
    'pet': {'w': 80, 'h': 72, 'voet_y': 68},
}
REF_MARGE = 6
# Gemeten uit de paletvakken van beide bladen (mediaan per vak).
PALET = {
    'nacht': '#2b364f', 'creme': '#fcf8ec', 'papier': '#fef2dc',
    'eik': '#915b43', 'hazelnoot': '#a16242', 'koffie': '#543228',
    'bordeaux': '#8b2e38', 'koraal': '#f16446', 'abrikoos': '#fea463',
    'goud': '#febb42', 'lavendel': '#b27fc8', 'petrol': '#3f808c',
    'blad': '#557f5a', 'mos': '#6d8348', 'titel': '#0b1238',
}


def main():
    bladen = {f: np.asarray(Image.open(BRON / f).convert('RGB')).astype(float)
              for f in {f[3] for f in FIGUREN}}
    for sub in ('native', 'bron', 'native-4x', 'referentie'):
        (UIT / sub).mkdir(parents=True, exist_ok=True)
    manifest = {
        'versie': 1, 'huisstijl': 'Pixel Quest',
        'uitleg': {
            'bron': 'Exacte bronpixels uit het goedgekeurde blad; alleen achtergrond, '
                    'schaduw en rasterlijnen verwijderd. Primaire statische asset.',
            'native': 'Reconstructie op één kleur per artpixel (uniform vierkant raster per '
                      'blad). Verhoudingen behouden, maar fijne gezichtsdetails kunnen '
                      'afwijken: de bladen hebben geen exact pixelraster.',
            'anker': 'Middenonder van de voeten/het lichaam, in canvas-pixels [x, y].',
            'schaal': 'Weergave: schermpx = artpx / bronpx_per_artpixel. Het bron-canvas is '
                      'per blad het native canvas x bronpx_per_artpixel, dus in artpixels '
                      'is elk canvas binnen een categorie gelijk.',
        },
        'palet': PALET,
        'categorieen': {}, 'assets': [],
    }
    for cat, c in CANVAS.items():
        manifest['categorieen'][cat] = {
            'native': {'breedte': c['w'], 'hoogte': c['h'], 'anker': [c['w'] // 2, c['voet_y']]},
        }
    # Pas 1: maskers en uitsnedes; rasterscores per blad optellen.
    figuren, scores = [], {}
    for fid, naam, cat, blad, (x0, y0, x1, y1) in FIGUREN:
        a = bladen[blad][y0:y1, x0:x1]
        m = masker(a, GATEN.get(fid, ()), (x0, y0))
        ys, xs = np.nonzero(m)
        sa = a[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
        sm = m[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
        scores[blad] = scores.get(blad, 0) + raster_score(sa)
        figuren.append((fid, naam, cat, blad, x0, y0, a, m, sa, sm))
    periode = {blad: float(PERIODES[int(np.argmax(s))]) for blad, s in scores.items()}
    print('periode per blad:', periode)
    # Effectieve artpixelmaat: gemeten raster x figuurschaal van het blad.
    eff = {blad: p * FIGUURSCHAAL.get(blad, 1.0) for blad, p in periode.items()}

    # Pas 2: wegschrijven.
    for fid, naam, cat, blad, x0, y0, a, m, sa, sm in figuren:
        # bronuitsnede
        bron_rgba, (bx, by) = bijsnijden(rgba_bron(a, m))
        c = CANVAS[cat]
        pe = eff[blad]
        bw, bh, bv = round(c['w'] * pe), round(c['h'] * pe), round(c['voet_y'] * pe)
        bron_doek = op_canvas(bron_rgba, bw, bh, bv)
        Image.fromarray(bron_doek).save(UIT / 'bron' / f'{fid}.png')
        # referentie: ongewijzigde bladuitsnede met marge (incl. achtergrond/schaduw)
        rx0, ry0 = x0 + bx, y0 + by
        h, w = bron_rgba.shape[:2]
        ref = bladen[blad][max(0, ry0 - REF_MARGE):ry0 + h + REF_MARGE,
                           max(0, rx0 - REF_MARGE):rx0 + w + REF_MARGE]
        Image.fromarray(ref.astype(np.uint8)).save(UIT / 'referentie' / f'{fid}.png')
        # native sprite
        nat, gx, gy = native(sa, sm, pe)
        nat, _ = bijsnijden(nat)
        nat_doek = op_canvas(nat, c['w'], c['h'], c['voet_y'])
        Image.fromarray(nat_doek).save(UIT / 'native' / f'{fid}.png')
        Image.fromarray(nat_doek).resize((c['w'] * 4, c['h'] * 4), Image.NEAREST).save(
            UIT / 'native-4x' / f'{fid}.png')
        cel = float(np.diff(gx[1:-1]).mean())
        print(f'{fid:12s} bron {bron_rgba.shape[1]}x{bron_rgba.shape[0]}  native '
              f'{nat.shape[1]}x{nat.shape[0]}  cel {cel:.2f}  verhouding bron '
              f'{bron_rgba.shape[1] / bron_rgba.shape[0]:.3f} native {nat.shape[1] / nat.shape[0]:.3f}')
        manifest['assets'].append({
            'id': fid, 'naam': naam, 'categorie': cat,
            'bestanden': {
                'native': f'native/{fid}.png',
                'native_4x': f'native-4x/{fid}.png',
                'bron': f'bron/{fid}.png',
                'referentie': f'referentie/{fid}.png',
            },
            'afmetingen': {
                'native': [c['w'], c['h']],
                'native_4x': [c['w'] * 4, c['h'] * 4],
                'bron': [bw, bh],
            },
            'anker': {
                'native': [c['w'] // 2, c['voet_y']],
                'native_4x': [c['w'] * 2, c['voet_y'] * 4],
                'bron': [bw // 2, bv],
            },
            'figuur': {
                'native': [int(nat.shape[1]), int(nat.shape[0])],
                'bron': [int(bron_rgba.shape[1]), int(bron_rgba.shape[0])],
            },
            'referentie': {
                'blad': blad,
                'vak': [int(x0 + bx), int(y0 + by), int(bron_rgba.shape[1]), int(bron_rgba.shape[0])],
            },
            'bronpx_per_artpixel': round(pe, 3),
            'raster_gemeten': round(periode[blad], 2),
            'figuurschaal': FIGUURSCHAAL.get(blad, 1.0),
            'herkomst': 'uitgesneden',
        })
    tekst = json.dumps(manifest, indent=2, ensure_ascii=False)
    (UIT / 'manifest.json').write_text(tekst, 'utf-8')
    # Zelfde manifest als script, zodat de preview ook via file:// werkt.
    (UIT / 'manifest.js').write_text(f'window.PQ_MANIFEST = {tekst};\n', 'utf-8')


if __name__ == '__main__':
    main()
