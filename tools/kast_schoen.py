"""Schoenen - NIEUW GETEKEND per voet (kast_vorm.Kleed).

De originele sneakers en hun outline worden gewist (de grondschaduw op rij 107 blijft).
Per voet: de neus (teen links of rechts), de enkel boven de schoen en de bovenkant van de
voet. Schoenen liggen onder de broek (laagvolgorde van de spec): bij een lange broek zie je
alleen de voet, bij een korte broek of rok ook de schacht. Lage schoenen tekenen de enkel
erbij in de huidtinten van het figuur (onder de broek valt die weg).
"""
import numpy as np

from kast_vorm import Kleed, veelhoek, wis_zones

VOETEN = {
    'hidde': [{'teen': 'l', 'enkel': (18, 25), 'top': 101, 'x': (12, 26)},
              {'teen': 'r', 'enkel': (35, 41), 'top': 100, 'x': (31, 46)}],
    'tessie': [{'teen': 'l', 'enkel': (21, 26), 'top': 102, 'x': (15, 27)},
               {'teen': 'l', 'enkel': (32, 37), 'top': 102, 'x': (28, 40)}],
}
ZOOL = 106


def wis_schoenen(fid):
    m = wis_zones(fid, ['schoenen'], behoud=('broek',))
    m[107:] = False                       # grondschaduw blijft
    return m


def voet(v, top=None, neus=2, hak=0):
    """Veelhoek van een voet: neus afgerond aan de teenkant, hiel recht."""
    x0, x1 = v['x']
    t = v['top'] if top is None else top
    e0, e1 = v['enkel']
    if v['teen'] == 'l':
        pts = [(e0 - 1, t), (x1 - hak, t), (x1, t + 1), (x1, ZOOL), (x0 + 1, ZOOL), (x0, ZOOL - 1),
               (x0, ZOOL - neus), (x0 + neus, max(t, ZOOL - 3 - neus)), (e0 - 1, max(t, ZOOL - 3 - neus))]
    else:
        pts = [(x0 + hak, t), (e1 + 1, t), (e1 + 1, max(t, ZOOL - 3 - neus)), (x1 - neus, max(t, ZOOL - 3 - neus)),
               (x1, ZOOL - neus), (x1, ZOOL - 1), (x1 - 1, ZOOL), (x0, ZOOL), (x0, t + 1)]
    return veelhoek(pts)


def schacht(v, y0, extra=1, fid=None, i=0):
    """Schacht van y0 tot de voet. Met fid volgt hij het (schuine) been uit kast_onder, 1 px ruimer."""
    if fid is None:
        e0, e1 = v['enkel']
        return veelhoek([(e0 - extra, y0), (e1 + extra, y0), (e1 + extra, v['top'] + 1), (e0 - extra, v['top'] + 1)])
    from scipy import ndimage as ndi
    from kast_onder import GEO as GO
    m = veelhoek(GO[fid]['been'][i])
    m = ndi.binary_dilation(m, np.array([[0, 0, 0], [1, 1, 1], [0, 0, 0]], bool), iterations=extra)
    m[:y0] = False
    m[v['top'] + 2:] = False
    return m


def zool(kl, v, c='z', rijen=1):
    for y in range(ZOOL - rijen + 1, ZOOL + 1):
        kl.rij(y, c, *v['x'], behalve=())


def enkels(kl, fid, tot, vanaf=96):
    """Blote enkel boven een lage schoen (verdwijnt onder een lange broek)."""
    for v in VOETEN[fid]:
        e0, e1 = v['enkel']
        kl.huid_stuk(veelhoek([(e0, vanaf), (e1, vanaf), (e1, tot), (e0, tot)]))


def laarzen(fid):
    """Laarzen tot halverwege de kuit: omgeslagen rand, stevige zool en hak."""
    kl = Kleed(fid, 'koffie', {'z': '#2a2026'}, slot='schoenen')
    kl.wis = wis_schoenen(fid)
    for i, v in enumerate(VOETEN[fid]):
        kl.stuk(schacht(v, 89, fid=fid, i=i), schaduw=1)
        kl.stuk(voet(v, neus=2), naad='a', schaduw=1)
        kl.rij(90, 'c')
        kl.rij(91, 'a')
        zool(kl, v, rijen=1)
        hiel = v['x'][1] - 2 if v['teen'] == 'l' else v['x'][0] + 1
        kl.zet(hiel, ZOOL - 1, 'z')
        kl.zet(hiel + 1, ZOOL - 1, 'z')
    return kl.laag()


def sloffen(fid):
    """Pluizige sloffen: een bolle neus die hoger is dan de hiel, een pluizen rand langs de instap
    en een zachte zool."""
    kl = Kleed(fid, 'creme', slot='schoenen')
    kl.wis = wis_schoenen(fid)
    enkels(kl, fid, ZOOL - 2)
    for v in VOETEN[fid]:
        x0, x1 = v['x']
        if v['teen'] == 'l':
            pts = [(x0, ZOOL - 1), (x0, ZOOL - 3), (x0 + 2, ZOOL - 5), (x0 + 6, ZOOL - 5), (x0 + 8, ZOOL - 3),
                   (x1, ZOOL - 3), (x1, ZOOL), (x0 + 1, ZOOL)]
            rand = range(x0 + 8, x1)
        else:
            pts = [(x1, ZOOL - 1), (x1, ZOOL - 3), (x1 - 2, ZOOL - 5), (x1 - 6, ZOOL - 5), (x1 - 8, ZOOL - 3),
                   (x0, ZOOL - 3), (x0, ZOOL), (x1 - 1, ZOOL)]
            rand = range(x0 + 1, x1 - 7)
        kl.stuk(veelhoek(pts), schaduw=1)
        for x in rand:                                   # pluizen rand langs de instap
            kl.zet(x, ZOOL - 3, 'h', alleen_op=False)
            kl.stukken[ZOOL - 3, x] = True
            if (x + fid.__len__()) % 3 == 0:
                kl.pluis.append((x, ZOOL - 4, 'c'))
        kl.rij(ZOOL - 1, 'a', x0, x1)
    return kl.laag()


# --- alleen Tessie ---
def ballerinas(fid):
    """Ballerina's: lage neus met strikje; de wreef en enkel zijn nieuw getekend in huidtinten."""
    if fid != 'tessie':
        raise KeyError(fid)
    kl = Kleed(fid, 'bordeaux', slot='schoenen')
    kl.wis = wis_schoenen(fid)
    enkels(kl, fid, ZOOL - 2)
    for v in VOETEN[fid]:
        x0, x1 = v['x']
        e0, e1 = v['enkel']
        # wreef: blote voet tussen enkel en neus
        kl.huid_stuk(veelhoek([(x0 + 2, ZOOL - 4), (e1, ZOOL - 4), (e1, ZOOL - 2), (x0 + 2, ZOOL - 2)]))
        kl.stuk(veelhoek([(x0 + 1, ZOOL - 3), (x0 + 4, ZOOL - 4), (e0, ZOOL - 3), (e0, ZOOL - 2),
                          (x1, ZOOL - 2), (x1, ZOOL), (x0, ZOOL), (x0, ZOOL - 2)]), schaduw=1)
        kl.pixels(['h.h', '.c.'], x0 + 2, ZOOL - 4, alleen_op=False)   # strikje
        kl.stukken[ZOOL - 4, x0 + 2] = kl.stukken[ZOOL - 4, x0 + 4] = True
        zool(kl, v, 'o')
    return kl.laag()


def enkellaarsjes(fid):
    """Enkellaarsjes met blokhak, schacht tot net boven de enkel."""
    if fid != 'tessie':
        raise KeyError(fid)
    kl = Kleed(fid, 'koffie', {'z': '#2a2026'}, slot='schoenen')
    kl.wis = wis_schoenen(fid)
    for v in VOETEN[fid]:
        kl.stuk(schacht(v, 96, extra=1), schaduw=1)
        kl.stuk(voet(v, neus=2), naad='a', schaduw=1)
        e0, e1 = v['enkel']
        kl.rij(97, 'c', e0 - 1, e1 + 1)
        zool(kl, v)
        x1 = v['x'][1]
        for x in (x1 - 2, x1 - 1):                     # blokhak aan de hielkant
            kl.zet(x, ZOOL - 1, 'z')
        kl.lijn([(e0 + 1, 98), (e0 + 1, 103)], 'a')     # rits aan de zijkant
    return kl.laag()


SCHOEN = {'laarzen': laarzen, 'sloffen': sloffen, 'ballerinas': ballerinas, 'enkellaarsjes': enkellaarsjes}
