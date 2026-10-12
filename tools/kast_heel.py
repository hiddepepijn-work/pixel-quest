"""Heel lichaam - NIEUW GETEKEND per lichaam (kast_vorm.Kleed).

Pyjama, onesie, jurk en overall vervangen boven en onder: het originele shirt en de broek
worden gewist of overgetekend. Het schort gaat óver de gekozen kleding heen
(over_kleding: tekenLook legt het direct boven de bovenkleding).
"""
from kast_vorm import Kleed, veelhoek, wis_zones
from kast_boven import GEO as GB, romp, mouwen, manchet, halsboord, capuchon
from kast_onder import GEO as GO, benen, wis_broek


def wis_alles(fid, armen=True):
    return wis_zones(fid, ['shirt'], armen=armen) | wis_broek(fid)


def pijpen(kl, fid, ruim=1, kolom=True):
    g = GO[fid]
    kl.stuk(veelhoek(g['heup']), schaduw=1, kolom=kolom)
    for (a, b, c, d), k in zip(g['recht'], (-1, 1)):    # alleen naar buiten ruimer
        l, r = (ruim, 0) if k < 0 else (0, ruim)
        kl.stuk(veelhoek([(a[0] - l, a[1]), (b[0] + r, b[1]), (c[0] + r, c[1]), (d[0] - l, d[1])]),
                naad='a' if kolom else None, schaduw=1, kolom=kolom)
    return g['zoom']


def bovenstuk(kl, fid, lang, breder=1, naad='o'):
    kl.stuk(romp(fid, lang, breder), naad=naad, kolom=naad is not None)
    ml, mr = mouwen(fid, breder=breder)
    kl.stuk(ml)
    kl.stuk(mr)
    kl.mouw = ml | mr


def stipjes(kl, y0, y1, stap=5):
    """Verspreide sterretjes-stipjes (elke 3e rij, verspringend)."""
    for y in range(y0, y1):
        for x in range(64):
            if y % 3 == 0 and (x + (y // 3) * 2) % stap == 0 and kl.t[y, x] == 'b':
                kl.t[y, x] = 'h'


def pyjama(fid):
    """Pyjama: jasje met bies, kraagje en knoopjes, losse broek, sterretjes-stipjes."""
    kl = Kleed(fid, 'lavendel', {'k': 'creme'}, slot='heel_lichaam')
    kl.wis = wis_alles(fid)
    zoom = pijpen(kl, fid)
    kl.rij(zoom - 1, 'h')
    bovenstuk(kl, fid, lang=4)
    g = GB[fid]
    manchet(kl, fid, 1)
    stipjes(kl, g['hals'] + 2, zoom - 1)
    mx, h = g['midden'], g['hals']
    for y in range(h + 2, g['taille'] + 4):
        kl.zet(mx, y, 'h')
        if (y - h) % 4 == 3:
            kl.zet(mx + 1, y, 'k')
    if fid == 'hidde':
        kl.pixels(['hhh.....hhh', '.hhh...hhh.', '..hc...ch..'], mx - 5, h - 1, alleen_op=False)
    else:
        kl.pixels(['hhh....hhh', '.hhc..chh.', '..c....c..'], mx - 5, h - 1, alleen_op=False)
    kl.rij(g['taille'] + 3, 'h')
    return kl.laag()


def onesie(fid):
    """Onesie uit één stuk: rits van hals tot kruis, capuchon met oortjes, boorden."""
    kl = Kleed(fid, 'hazelnoot', {'k': 'creme'}, slot='heel_lichaam')
    kl.wis = wis_alles(fid)
    zoom = pijpen(kl, fid, ruim=1, kolom=False)
    kl.rib(zoom - 2, zoom)
    kl.lijn([(GO[fid]['midden'], GO[fid]['kruis'] - 1), (GO[fid]['midden'], GO[fid]['kruis'] + 3)], 'a')
    bovenstuk(kl, fid, lang=8, breder=1, naad=None)
    manchet(kl, fid, 2, rib=True)
    capuchon(kl, fid)
    g = GB[fid]
    mx, h = g['midden'], g['hals']
    if fid == 'hidde':                                   # oortjes op de capuchon (rug links)
        kl.pixels(['.oo.', 'ocbo', 'oaao'], 18, 44, alleen_op=False)
    else:
        kl.pixels(['.oo.', 'ocbo', 'oaao'], 37, 52, alleen_op=False)
    for y in range(h + 4, GO[fid]['kruis'] - 1):          # rits
        kl.zet(mx, y, 'a')
        kl.zet(mx + 1, y, 'c')
    kl.zet(mx + 1, h + 4, 'k')
    kl.zet(mx + 1, h + 5, 'k')
    return kl.laag()


def schort(fid):
    """Keukenschort óver de kleding: borststuk, halsband, strik in de taille, zak."""
    kl = Kleed(fid, 'creme', slot='heel_lichaam')
    kl.over_kleding = True
    if fid == 'hidde':
        kl.stuk(veelhoek([(27, 54), (37, 54), (38, 63), (42, 64), (44, 90), (22, 90), (23, 64), (26, 63)]))
        kl.lijn([(27, 54), (28, 50)], 'b', alleen_op=False)
        kl.lijn([(37, 54), (36, 50)], 'b', alleen_op=False)
        band, zak = 64, (28, 74)
    else:
        kl.stuk(veelhoek([(24, 60), (33, 60), (34, 66), (37, 67), (39, 88), (19, 88), (21, 67), (23, 66)]))
        kl.lijn([(24, 60), (24, 57)], 'b', alleen_op=False)
        kl.lijn([(33, 60), (32, 57)], 'b', alleen_op=False)
        band, zak = 67, (25, 74)
    kl.stukken |= kl.t != ''
    kl.rij(band, 'a')
    kl.rij(band + 1, 'c')
    zx, zy = zak
    kl.pixels(['aaaaaaaa', 'acbbbbba', 'acbbbbba', 'aaaaaaaa'], zx, zy)
    kl.rij(GO[fid]['kruis'] + (5 if fid == 'hidde' else 4), 'a')
    return kl.laag()


# --- alleen Tessie ---
def jurk(fid):
    """Jurk tot de knie: getailleerd lijfje, pofmouwtjes, strikje, wijde rok; blote benen."""
    if fid != 'tessie':
        raise KeyError(fid)
    kl = Kleed(fid, 'lavendel', slot='heel_lichaam')
    kl.wis = wis_alles(fid, armen=False)
    benen(kl, fid, 88)
    kl.stuk(veelhoek([(22, 69), (36, 69), (38, 75), (42, 90), (16, 90), (19, 75)]), schaduw=1)
    for xa, xb in ((25, 22), (29, 29), (33, 36)):
        kl.lijn([(xa, 72), (xb, 89)], 'a', licht='c')
    for x in range(17, 42):
        kl.zet(x, 89, 'c' if x % 2 else 'a')
    kl.stuk(romp(fid))
    for pts in ([(19, 59), (16, 62), (16, 66), (22, 66), (23, 60)], [(35, 59), (40, 61), (42, 66), (36, 66)]):
        kl.stuk(veelhoek(pts))
        kl.rij(65, 'a', min(p[0] for p in pts) + 1, max(p[0] for p in pts) - 1)
    halsboord(kl, fid)
    kl.rij(69, 'a')
    kl.rij(70, 'c')
    kl.pixels(['hh.hh', '.hch.', 'h...h'], 26, 69)
    return kl.laag()


def overall(fid):
    """Tuinbroek: borstlap met bandjes en gouden knopen over het shirt, ruime pijpen met omslag."""
    if fid != 'tessie':
        raise KeyError(fid)
    kl = Kleed(fid, 'petrol', {'k': 'goud'}, slot='heel_lichaam')
    kl.wis = wis_broek(fid)
    zoom = pijpen(kl, fid)
    kl.rij(zoom - 1, 'c')
    kl.rij(zoom - 2, 'a')
    kl.stuk(veelhoek([(23, 62), (34, 62), (35, 72), (22, 72)]))
    for pts in ([(23, 62), (21, 57)], [(34, 62), (36, 57)]):
        kl.lijn(pts, 'b', alleen_op=False)
        kl.lijn([(p[0] + (1 if p[0] < 28 else -1), p[1]) for p in pts], 'a', alleen_op=False)
    kl.stukken |= kl.t != ''
    kl.zet(24, 63, 'k')
    kl.zet(33, 63, 'k')
    kl.pixels(['aaaaa', 'acbba', 'aaaaa'], 26, 65)
    kl.rij(72, 'a')
    kl.zet(22, 74, 'k')
    kl.zet(37, 74, 'k')
    return kl.laag()


HEEL = {'pyjama': pyjama, 'onesie': onesie, 'schort': schort, 'jurk': jurk, 'overall': overall}
