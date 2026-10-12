"""Jassen - NIEUW GETEKEND met een eigen silhouet (kast_vorm.Kleed).

Elke jas is langer dan het shirt (heup tot bovenbeen), ruimer dan de bovenkleding
(kast_boven) en heeft mouwen tot de pols. Het originele T-shirt en de onderarmen worden
gewist, zodat de korte wijde T-shirtmouw niet meer onder de jas uitsteekt.
Hidde's rug is links, die van Tessie rechts; haar krullen vallen over de schouders.
"""
import numpy as np

from kast_vorm import Kleed, wis_zones, lijnmasker
from kast_boven import GEO, romp, mouwen, manchet, capuchon

ZONDER_OLIJF = {'a': 'b', 'b': 'c', 'c': 'h'}


def jas(fid, kleur, lang, breder, vast=None, uitwaaier=0, mouw_breder=None):
    kl = Kleed(fid, kleur, vast, slot='jas')
    kl.wis = wis_zones(fid, ['shirt'], armen=True)
    m = romp(fid, lang, breder)
    if uitwaaier:                                        # A-lijn: onderste rijen breder
        g = GEO[fid]
        y0 = g['taille'] + lang - 8
        for y in range(y0, g['taille'] + lang):
            xs = np.nonzero(m[y])[0]
            if len(xs):
                d = (y - y0) * uitwaaier // 8
                m[y, max(xs.min() - d, 0):xs.max() + d + 1] = True
    kl.stuk(m)
    ml, mr = mouwen(fid, breder=breder if mouw_breder is None else mouw_breder)
    kl.stuk(ml)
    kl.stuk(mr)
    kl.mouw = ml | mr
    kl.zoom = GEO[fid]['taille'] + lang - 1
    return kl


def afronden(kl, y, n=1):
    """Ronde zoomhoeken: de buitenste pixel(s) van rij y en de rij erboven weg."""
    for yy, k in ((y, n), (y - 1, max(n - 1, 0))):
        xs = np.nonzero(kl.stukken[yy])[0]
        for x in list(xs[:k]) + list(xs[len(xs) - k:] if k else []):
            kl.stukken[yy, x] = False
            kl.t[yy, x] = ''


def staande_kraag(kl, fid, hoog=2, toon='c'):
    pts = GEO[fid]['halslijn']
    for k in range(hoog):
        m = lijnmasker([(x, y - k) for x, y in pts]) & ~kl.stukken
        kl.stukken |= m
        kl.t[m] = toon if k else 'b'
    kl.lijn(pts, 'a', alleen_op=False)


def sluiting(kl, fid, van, tot, c='a', knoop=None, stap=4, dubbel=False):
    mx = GEO[fid]['midden']
    for y in range(van, tot + 1):
        kl.zet(mx, y, c)
        kl.zet(mx + 1, y, 'c')
        if knoop and (y - van) % stap == 1:
            kl.zet(mx - 2 if dubbel else mx + 1, y, knoop)
            if dubbel:
                kl.zet(mx + 3, y, knoop)


def zakklep(kl, x, y, b=5, knoop=None):
    kl.pixels(['a' * b, 'c' + 'b' * (b - 2) + 'a', '.' + 'a' * (b - 2) + '.'], x, y)
    if knoop:
        kl.zet(x + b // 2, y + 1, knoop)


def spijkerjas(fid):
    """Spijkerjas tot de heup: puntkraag, pas met stiksels, borstzakken, tailleband."""
    kl = jas(fid, 'petrol', lang=6, breder=2, vast={'k': 'goud'})
    g = GEO[fid]
    mx, h = g['midden'], g['hals']
    manchet(kl, fid, 2)
    sluiting(kl, fid, h + 2, kl.zoom - 2, knoop='k', stap=4)
    kl.lijn([(g['romp_x'][0] - 1, h + 5), (g['romp_x'][1] + 1, h + 5)], 'c')    # pas (yoke)
    kl.rij(kl.zoom - 1, 'a')
    kl.rij(kl.zoom - 2, 'c')
    zakklep(kl, mx - 7, h + 7, 5, 'k')
    zakklep(kl, mx + 3, h + 7, 5 if fid == 'hidde' else 4, 'k')
    kl.pixels(['hhc.....chh', '.hhc...chh.', '..hc...ch..'], mx - 5, h - 1, alleen_op=False)
    return kl.laag()


def puffer(fid):
    """Pufferjas tot het bovenbeen: bolle doorgestikte banen, hoge kraag, rits."""
    kl = jas(fid, 'petrol', lang=9, breder=3, mouw_breder=2)
    g = GEO[fid]
    h = g['hals']
    for y in range(h + 3, kl.zoom, 4):                   # banen: naad, dan licht, dan schaduw
        for x in range(64):
            if kl.stukken[y, x] and kl.t[y, x] not in ('L', 'o'):
                kl.t[y, x] = 'a'
                if kl.stukken[y + 1, x]:
                    kl.t[y + 1, x] = 'h' if (x + y) % 5 == 0 else 'c'
    manchet(kl, fid, 2, rib=True)
    staande_kraag(kl, fid, hoog=3)
    sluiting(kl, fid, h + 1, kl.zoom - 1, c='a')
    kl.rib(kl.zoom - 1, kl.zoom)
    afronden(kl, kl.zoom, 2)
    return kl.laag()


def regenjas(fid):
    """Regenjas tot halverwege het bovenbeen, A-lijn, drukknopen; glanzend zonder olijfschaduw."""
    kl = jas(fid, 'goud', lang=13, breder=2, uitwaaier=3, vast={'k': 'creme'})
    g = GEO[fid]
    mx, h = g['midden'], g['hals']
    capuchon(kl, fid)                                    # regenkap plat in de nek
    sluiting(kl, fid, h + 3, kl.zoom - 1, knoop='k', stap=5)
    for x0 in (mx - 8, mx + 4):                          # zakken met klep
        kl.pixels(['aaaaa', 'cbbbb'], x0, kl.zoom - 8)
    manchet(kl, fid, 1)
    sel = np.isin(kl.t, list(ZONDER_OLIJF))
    kl.t[sel] = np.vectorize(ZONDER_OLIJF.get)(kl.t[sel])
    for y in range(h + 4, kl.zoom - 2, 5):               # glansstreepjes
        kl.zet(g['romp_x'][0] + 1, y, 'h')
    return kl.laag()


def teddyjas(fid):
    """Teddyjas: bolle teddy-lusjes (licht linksboven per bolletje), grote kraag, golvende rand."""
    if fid != 'tessie':
        raise KeyError(fid)
    kl = jas(fid, 'creme', lang=8, breder=3, vast={'k': 'koffie'})
    # teddy: ronde lusjes van 3x2 (licht boven, schaduw onder) in een baksteenverband, met
    # wat variatie zodat het geen raster of stippels wordt
    # teddy: zacht pluche. Lage ruis in basis en licht (2x2 plukjes, verspringend), de schaduwkant
    # blijft donkerder, en pluisjes net buiten de outline maken de rand zacht. Geen stippels.
    rng = np.random.default_rng(7)
    ruis = rng.random((60, 40))
    oud = kl.t.copy()
    binnen = kl.stukken & np.isin(oud, ['a', 'b', 'c', 'h'])
    for y, x in zip(*np.nonzero(binnen)):
        v = ruis[y // 2, (x + (y // 2) % 2) // 2]
        if oud[y, x] == 'a':
            kl.t[y, x] = 'b' if v > 0.75 else 'a'
        else:
            kl.t[y, x] = 'c' if v > 0.45 else 'b'
    rand = kl.stukken & ~np.roll(kl.stukken, 1, 1) | kl.stukken & ~np.roll(kl.stukken, -1, 1)
    for y, x in zip(*np.nonzero(rand)):
        if y > GEO[fid]['hals'] + 2 and (x * 7 + y * 3) % 5 == 0:
            dx = -1 if not kl.stukken[y, x - 1] else 1
            kl.pluis.append((x + dx, y, 'a'))
    onder = max(np.nonzero(kl.stukken.any(1))[0])
    for x in np.nonzero(kl.stukken[onder])[0][::3]:
        kl.pluis.append((int(x), onder + 1, 'a'))
    staande_kraag(kl, fid, hoog=3, toon='h')
    kl.lijn(GEO[fid]['halslijn'], 'c')
    manchet(kl, fid, 2)
    sluiting(kl, fid, GEO[fid]['hals'] + 2, kl.zoom - 2, c='a', knoop='k', stap=5)
    return kl.laag()


JAS = {'regenjas': regenjas, 'puffer': puffer, 'spijkerjas': spijkerjas, 'teddyjas': teddyjas}
