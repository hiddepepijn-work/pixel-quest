"""Tekenmotor voor kleding die de vorm van het lichaam verandert - NIEUW GETEKEND.

Een kledingstuk wordt per lichaam opgebouwd uit stukken (veelhoeken op het native raster
64 x 112): achterste mouw, romp, voorste mouw, broekpijpen. Elk stuk krijgt licht van
linksboven (lichte binnenrand links en boven, schaduw rechts en onder). Het geheel krijgt
een donkere getrapte outline (toon o). Naden, plooien, knopen en zakken zet je met de hand.

Daarnaast heeft een item twee lagen voor het lichaam (zie app/figuur.js tekenLook):
  wis   lichaamspixels die wegvallen (de originele kledingzone + haar outline), zodat een
        rok of slanke mouw smaller kan zijn dan de wijde broek of het T-shirt van het origineel
  huid  blote huid (benen, buik, enkels) in de huidtinten van dat figuur, direct boven het
        lichaam en onder schoenen en kleding
Handen, gezicht en haar worden nooit overgetekend of gewist.
"""
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage as ndi

import kleding as K
from kast_teken import Laag, TOON_CODE, toon_stop, lichaam, kleur_rgb, W, H

Z = K.Z
VIER = np.array([[0, 1, 0], [1, 1, 1], [0, 1, 0]], bool)
ACHT = np.ones((3, 3), bool)
OUTLINE = '#231c22'   # donker grijsbruin: tussen de zwarte outline van het lichaam en de bruine van de huid

# Per lichaam: polsrij (onderkant manchet) en handvakken (huid vanaf de pols blijft van het origineel).
POLS = {'hidde': 69, 'tessie': 70}
HANDVAK = {'hidde': [(14, 70, 27, 77), (39, 70, 48, 77)],
           'tessie': [(15, 71, 25, 78), (34, 71, 44, 78)]}


def veelhoek(*punten_lijsten):
    """Bool-masker van een of meer veelhoeken (inclusief rand), coördinaten in artpixels."""
    im = Image.new('L', (W, H), 0)
    d = ImageDraw.Draw(im)
    for pts in punten_lijsten:
        d.polygon([tuple(p) for p in pts], fill=255, outline=255)
    return np.asarray(im) > 0


def lijnmasker(punten, dikte=1):
    im = Image.new('L', (W, H), 0)
    ImageDraw.Draw(im).line([tuple(p) for p in punten], fill=255, width=dikte)
    return np.asarray(im) > 0


def handen(fid):
    sp, z = lichaam(fid)
    m = np.zeros((H, W), bool)
    for x0, y0, x1, y1 in HANDVAK[fid]:
        m[y0:y1, x0:x1] = z[y0:y1, x0:x1] == Z['huid']
    return m


def haarlaag(z):
    haar = z == Z['haar']
    return haar | (ndi.binary_dilation(haar, ACHT) & (z == Z['lijn']))


def beschermd(fid):
    """Pixels die een kledingstuk nooit tekent of wist: handen (+ hun outline), hoofd en haar."""
    sp, z = lichaam(fid)
    hand = handen(fid)
    hand_lijn = ndi.binary_dilation(hand, VIER) & (z == Z['lijn'])
    hoofd = np.zeros((H, W), bool)
    hoofd[:{'hidde': 48, 'tessie': 57}[fid]] = True
    hoofd &= sp[..., 3] > 0
    return hand | hand_lijn | hoofd | haarlaag(z) | (z == Z['detail'])


def wis_zones(fid, zones, armen=False, extra=None, behoud=(), vanaf=0):
    """Wis-masker: de genoemde zones + de outline eromheen, zonder handen/hoofd/haar.
    armen=True wist ook de huid van de onderarmen (boven de pols): een lange mouw ligt eroverheen.
    behoud: zones waarvan de grens-outline blijft staan (bv. de zoom van het shirt boven een broek).
    vanaf: alleen rijen vanaf deze y (bv. de gesp in de broekband, niet het hangertje)."""
    sp, z = lichaam(fid)
    m = np.isin(z, [Z[n] for n in zones])
    m[:vanaf] = False
    if armen:
        arm = (z == Z['huid']) & ~handen(fid)
        arm[:{'hidde': 56, 'tessie': 62}[fid]] = False
        m |= arm
    lijn = ndi.binary_dilation(m, ACHT, iterations=2) & (z == Z['lijn'])
    if behoud:
        lijn &= ~ndi.binary_dilation(np.isin(z, [Z[n] for n in behoud]), ACHT)
    m |= lijn
    if extra is not None:
        m |= extra
    return m & ~beschermd(fid)


def huidtinten(fid):
    """Vijf huidtinten van dit figuur (donker -> licht) uit de huidzone, plus een outline."""
    sp, z = lichaam(fid)
    sel = (z == Z['huid'])
    sel[:{'hidde': 40, 'tessie': 46}[fid]] = False
    px = sp[sel][:, :3].astype(float)
    L = K.U.luminantie(px)
    orde = np.argsort(L)
    kies = lambda p: px[orde[int(p * (len(orde) - 1))]].astype(np.uint8)
    return {'S': np.array([84, 38, 28], np.uint8),        # outline: donker roodbruin, als de handen
            'D': kies(0.04), 'A': kies(0.22), 'B': kies(0.55), 'C': kies(0.9)}


class Kleed:
    """Eén kledingstuk voor één lichaam. t = toonkaart ('' leeg, o/a/b/c/h of vaste letter)."""

    def __init__(self, fid, basis, vast=None, slot=None):
        self.fid, self.basis, self.slot = fid, basis, slot
        self.vast = dict(vast or {})
        self.t = np.full((H, W), '', object)
        self.stukken = np.zeros((H, W), bool)
        self.wis = np.zeros((H, W), bool)
        self.huid = np.full((H, W), '', object)
        self.over_kleding = False

    # --- stukken ---
    def stuk(self, m, naad='o', licht=True, toon='b', schaduw=1, glans=True):
        """Vul masker m. naad = toon van de rand waar dit stuk over een eerder stuk ligt.
        Licht van linksboven: lichte binnenrand links en boven, schaduw rechts (schaduw px) en onder."""
        m = m.copy()
        t = np.where(m, toon, '')
        if licht:
            for y in range(H):
                xs = np.nonzero(m[y])[0]
                if len(xs) >= 4:
                    t[y, xs.min() + 1] = 'c'
                    for k in range(1, schaduw + 1):
                        if len(xs) >= 3 + 2 * k:
                            t[y, xs.max() - k] = 'a'
            for x in range(W):
                ys = np.nonzero(m[:, x])[0]
                if len(ys) >= 4:
                    t[ys.max() - 1, x] = 'a'
                    if t[ys.min() + 1, x] == toon:
                        t[ys.min() + 1, x] = 'c'
            if glans:
                ys, xs = np.nonzero(m)
                y0 = ys.min() + 2
                rij = np.nonzero(m[y0])[0]
                if len(rij) >= 6:
                    t[y0, rij.min() + 2] = 'h'
                    t[y0 + 1, rij.min() + 2] = 'h' if m[y0 + 1, rij.min() + 2] else t[y0 + 1, rij.min() + 2]
        rand = m & ~ndi.binary_erosion(m, VIER, border_value=0)
        if naad:
            t[rand & self.stukken] = naad
        self.t[m] = t[m]
        self.stukken |= m
        return m

    def zet(self, x, y, c, alleen_op=True):
        if 0 <= x < W and 0 <= y < H and (not alleen_op or self.stukken[y, x]):
            self.t[y, x] = c

    def pixels(self, rijen, x0, y0, alleen_op=True):
        """Pixeltekening; '.' = niets, '_' = wissen uit het kledingstuk."""
        for dy, rij in enumerate(rijen):
            for dx, c in enumerate(rij):
                if c == '.' or c == ' ':
                    continue
                x, y = x0 + dx, y0 + dy
                if c == '_':
                    if 0 <= x < W and 0 <= y < H:
                        self.t[y, x] = ''
                        self.stukken[y, x] = False
                else:
                    self.zet(x, y, c, alleen_op)

    def lijn(self, punten, c='a', licht=None, alleen_op=True):
        """Naad of plooi langs een polylijn; licht = toon van een parallelle lichtrand links."""
        m = lijnmasker(punten) & (self.stukken if alleen_op else True)
        if licht:
            for y, x in zip(*np.nonzero(m)):
                if x > 0 and not m[y, x - 1] and self.t[y, x - 1] not in ('o', ''):
                    self.t[y, x - 1] = licht
        self.t[m] = c

    def rij(self, y, c, x0=0, x1=W - 1, behalve=('o',)):
        for x in range(x0, x1 + 1):
            if self.stukken[y, x] and self.t[y, x] not in behalve:
                self.t[y, x] = c

    def rib(self, y0, y1, x0=0, x1=W - 1, stap=2):
        """Boordstof: verticale ribbels (b/a), bovenrij licht."""
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                if self.stukken[y, x] and self.t[y, x] != 'o':
                    self.t[y, x] = 'a' if x % stap == 0 else ('c' if y == y0 else 'b')

    # --- huid ---
    def huid_stuk(self, m, licht=True):
        """Blote huid (S outline, D/A schaduw, B basis, C licht) in de tinten van dit figuur."""
        t = np.where(m, 'B', '')
        if licht:
            for y in range(H):
                xs = np.nonzero(m[y])[0]
                if len(xs) >= 3:
                    t[y, xs.min() + 1] = 'C'
                    t[y, xs.max() - 1] = 'A'
        rand = m & ~ndi.binary_erosion(m, VIER, border_value=0)
        t[rand] = 'S'
        self.huid[m] = t[m]
        return m

    def huid_pixels(self, rijen, x0, y0):
        for dy, rij in enumerate(rijen):
            for dx, c in enumerate(rij):
                if c not in '.  ':
                    if c == '_':
                        self.huid[y0 + dy, x0 + dx] = ''
                    else:
                        self.huid[y0 + dy, x0 + dx] = c

    # --- afronden ---
    def laag(self):
        rand = self.stukken & ~ndi.binary_erosion(self.stukken, VIER, border_value=0)
        self.t[rand] = 'L'                       # vaste donkere outline, zoals die van het lichaam
        self.vast.setdefault('L', OUTLINE)
        bes = beschermd(self.fid)
        self.t[bes] = ''
        self.huid[bes] = ''
        lg = Laag()
        ramp = K.RAMPEN[self.basis]
        for y, x in zip(*np.nonzero(self.t != '')):
            c = self.t[y, x]
            if c in TOON_CODE:
                lg.zet(x, y, K.hex2rgb(ramp['stops'][toon_stop(ramp, c)]), TOON_CODE[c])
            else:
                lg.zet(x, y, kleur_rgb(self.vast[c]), 0)
        # Eén cel extra over lege native cellen: in native verandert er niets, maar op de bronversie
        # vallen zo ook de bronpixels van de oude outline weg die net over de celgrens liggen.
        sp, _ = lichaam(self.fid)
        wis = self.wis & ~bes
        wis |= ndi.binary_dilation(wis, ACHT) & (sp[..., 3] == 0) & ~ndi.binary_dilation(bes, ACHT)
        lg.wis_masker = wis
        tint = huidtinten(self.fid)
        lg.huid = np.zeros((H, W, 4), np.uint8)
        for y, x in zip(*np.nonzero(self.huid != '')):
            lg.huid[y, x, :3] = tint[self.huid[y, x]]
            lg.huid[y, x, 3] = 255
        lg.over_kleding = self.over_kleding
        lg.slot = self.slot
        return lg
