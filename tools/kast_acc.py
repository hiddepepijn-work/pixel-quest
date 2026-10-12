"""Accessoires - NIEUW GETEKEND op het native raster, per lichaam.

Bril, sjaal, tas en oorbellen zijn met de hand gezet. Handschoenen volgen de vorm van de
handen uit de zonekaart (alleen tint nieuw, de vorm is die van de goedgekeurde handen).
"""
import numpy as np

import kleding as K
from kast_teken import Laag, teken, band, toon_stop, TOON_CODE, lichaam

BRIL_H = [
    '......ooooo.......',
    '.....og....o..ooo.',
    'oooooo.....ooog..o',
    '.....o.....o.o...o',
    '......ooooo..o...o',
    '.............o...o',
    '..............ooo.',
]
BRIL_T = [
    '.ooooo..............',
    'o.....o.............',
    'og....o...oooooo....',
    'o.....oooo.g....o...',
    '.ooooo...o......oooo',
    '.........o......o...',
    '.........o......o...',
    '.........o......o...',
    '..........oooooo....',
]

SJAAL = [
    '...ooooooooooooo...',
    '..obbcbbbcbbbcbbbo.',
    '.obbbcbbbcbbbcbbbao',
    '.oabbcbbbcbbbcbbaao',
    '..ooaaaaobbbcboooo.',
    '......oobbbcbo.....',
    '......obbbcbbo.....',
    '......obbcbbao.....',
    '......obcbbbao.....',
    '......obbbbaao.....',
    '......oaaaaaao.....',
    '......a.a.a.a......',
]

TAS = [
    '.oooooooo.',
    'ocbbbbbbao',
    'oooooooooo',
    'ocbbkkbbao',
    'obbbbbbbao',
    'obbbbbbbao',
    'oabbbbbaao',
    'oaaaaaaaao',
    '.oooooooo.',
]

# Oorhangertje: knopje in het oor, kettinkje, een glanzende druppel die onder de krul uitkomt.
OORBEL = ['.o.', 'oho', '.o.', '.a.', 'oco', 'chb', 'cbb', 'obo']


def bril(fid):
    lg = Laag()
    if fid == 'hidde':
        return teken(lg, BRIL_H, 26, 37, 'koffie', {'g': '#e4f1f2'})
    return teken(lg, BRIL_T, 18, 41, 'koffie', {'g': '#e4f1f2'})


def sjaal(fid):
    lg = Laag()
    lg.boven_haar = False   # haar valt over de sjaal
    if fid == 'hidde':
        return teken(lg, SJAAL, 23, 46, 'bordeaux', {'w': 'creme'})
    return teken(lg, SJAAL, 17, 53, 'bordeaux', {'w': 'creme'}, spiegel=True)


def tas(fid):
    lg = Laag()
    lg.boven_haar = False   # de riem loopt onder Tessies krullen door
    if fid == 'hidde':
        band(lg, [(21, 51), (26, 55), (31, 59), (36, 63), (40, 68)], 'eik', dikte=1)
        return teken(lg, TAS, 37, 68, 'eik', {'k': 'goud'})
    band(lg, [(35, 57), (30, 61), (25, 66), (20, 71)], 'eik', dikte=1)
    return teken(lg, TAS, 12, 70, 'eik', {'k': 'goud'})


def oorbellen(fid):
    lg = Laag()
    if fid == 'tessie':
        teken(lg, OORBEL, 37, 50, 'goud')
    return lg


# Handen: huidpixels onder de pols binnen deze vakken (native canvas).
HANDVAK = {'hidde': [(15, 66, 25, 76), (38, 66, 47, 76)],
           'tessie': [(15, 68, 24, 78), (33, 68, 43, 78)]}


def handschoenen(fid):
    sprite, zones = lichaam(fid)
    lg = Laag()
    ramp = K.RAMPEN['petrol']
    L = K.U.luminantie(sprite[..., :3].astype(float))
    for x0, y0, x1, y1 in HANDVAK[fid]:
        m = np.zeros(zones.shape, bool)
        m[y0:y1, x0:x1] = zones[y0:y1, x0:x1] == K.Z['huid']
        if not m.any():
            continue
        lo, hi = np.percentile(L[m], [30, 75])
        boven = np.nonzero(m.any(1))[0].min()
        for y, x in zip(*np.nonzero(m)):
            t = 'c' if y <= boven + 1 else ('a' if L[y, x] < lo else ('c' if L[y, x] > hi else 'b'))
            lg.zet(x, y, K.hex2rgb(ramp['stops'][toon_stop(ramp, t)]), TOON_CODE[t])
    return lg


ACC = {'bril': bril, 'sjaal': sjaal, 'tas': tas, 'oorbellen': oorbellen, 'handschoenen': handschoenen}
