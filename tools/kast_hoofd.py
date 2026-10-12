"""Hoofditems - NIEUW GETEKEND op het native raster (64 x 112), per lichaam.

Hidde kijkt naar rechts (kruin 33,27; ogen y38-42), Tessie naar links (kruin 28,33;
ogen y45-48). Licht valt van linksboven, voor beide figuren gelijk. Items met een rand
knippen het haar erboven weg (Laag.knip), zodat er geen haar door het hoofddeksel steekt.
"""
from kast_teken import Laag, teken, knip_boven, band

BEANIE = [
    '.........ooooooo.........',
    '......ooochhbbbbooo......',
    '....oocchhcbbbbbbbaoo....',
    '...ocbchcbbbbbbbbbbbaao..',
    '..ocbcccbbbbbbbbbbbbbaao.',
    '..obccbbbbbbbbbbbbbbbbao.',
    '.ocbcbbbbbbbbbbbbbbbbbbao',
    '.obcbbbbbbbbbbbbbbbbbbbao',
    'ooooooooooooooooooooooooo',
    'ocbcbcbcbcbcbcbcbcbcbcbco',
    'obabababababababababababo',
    'oaaaaaaaaaaaaaaaaaaaaaaao',
    '.ooooooooooooooooooooooo.',
]

# Tessie: smaller hoofd, lager op het voorhoofd, krullen puilen aan de zijkant uit.
BEANIE_T = [
    '........ooooooo........',
    '.....ooochhbbbbooo.....',
    '...oocchhcbbbbbbbaoo...',
    '..ocbchcbbbbbbbbbbbao..',
    '.ocbcccbbbbbbbbbbbbbao.',
    '.obccbbbbbbbbbbbbbbbbao',
    'ocbcbbbbbbbbbbbbbbbbbao',
    'obcbbbbbbbbbbbbbbbbbbao',
    'ooooooooooooooooooooooo',
    'ocbcbcbcbcbcbcbcbcbcbco',
    'obababababababababababo',
    'oaaaaaaaaaaaaaaaaaaaaao',
    '.ooooooooooooooooooooo.',
]

PET = [
    '.......oooooooo...............',
    '.....oocchhbbbboo.............',
    '...oocchhcbbbbbbaoo...........',
    '..ocbcccbbbbbbbbbbao..........',
    '..obccbbbbbbbwbbbbbao.........',
    '.ocbcbbbbbbbwwwbbbbbao........',
    '.obcbbbbbbbbbwbbbbbbbao.......',
    '.oaabbbbbbbbbbbbbbbbbaoooooo..',
    '.oaaaaaaaaaaaaaaaaaaaaacccccoo',
    '..ooooooooooooooooooooaaabbbbo',
    '......................oooooooo',
]

BUCKET = [
    '..........ooooooooo..........',
    '........oocchbbbbbbaoo.......',
    '......occhcbbbbbbbbbbbao.....',
    '.....ocbccbbbbbbbbbbbbbao....',
    '.....obcbbbbbbbbbbbbbbbbao...',
    '.....obbbbbbbbbbbbbbbbbbbo...',
    '.....okkkkkkkkkkkkkkkkkkko...',
    '...ooobbbbbbbbbbbbbbbbbbbooo.',
    '.oocccbbbbbbbbbbbbbbbbbbbbaoo',
    'oaabbbbbbbbbbbbbbbbbbbbbbbbaao',
    '.oooooooooooooooooooooooooooo.',
]

KROON = [
    'o...o...o',
    'oho.oro.o',
    'ochcbbbco',
    'occbhbcbo',
    'obbbbbbao',
    'oaaaaaaao',
    '.ooooooo.',
]


def beanie(fid):
    lg = Laag()
    if fid == 'hidde':
        teken(lg, BEANIE, 24, 21, 'koraal')
        return knip_boven(lg, 24, 48, 33, zijmarge=4, y_zij=30)
    teken(lg, BEANIE_T, 18, 28, 'koraal')
    return knip_boven(lg, 18, 40, 40, zijmarge=6, y_zij=36)


def petje(fid):
    lg = Laag()
    if fid == 'hidde':
        teken(lg, PET, 24, 22, 'petrol', {'w': 'creme'})
        return knip_boven(lg, 24, 46, 31, zijmarge=4, y_zij=29)
    teken(lg, PET, 11, 29, 'petrol', {'w': 'creme'}, spiegel=True)
    return knip_boven(lg, 18, 40, 38, zijmarge=6, y_zij=36)


def bucket_hat(fid):
    lg = Laag()
    if fid == 'hidde':
        teken(lg, BUCKET, 21, 22, 'hazelnoot', {'k': 'koffie'})
        return knip_boven(lg, 21, 50, 32, zijmarge=3, y_zij=30)
    teken(lg, BUCKET, 15, 30, 'hazelnoot', {'k': 'koffie'})
    return knip_boven(lg, 15, 43, 40, zijmarge=5, y_zij=38)


def kroontje(fid):
    lg = Laag()
    if fid == 'hidde':
        return teken(lg, KROON, 30, 20, 'goud', {'r': 'koraal'})
    return teken(lg, KROON, 25, 26, 'goud', {'r': 'koraal'})


HOOFD = {'beanie': beanie, 'petje': petje, 'bucket_hat': bucket_hat, 'kroontje': kroontje}


KOPTEL_KAP = [
    '.oooo..',
    'ochbbo.',
    'ocbbbao',
    'ocbkbao',
    'ocbkbao',
    'ocbkbao',
    'oabbaao',
    '.oaaao.',
    '..ooo..',
]
KOPTEL_VER = ['.oo', 'oba', 'oba', 'oba', 'oaa', '.oo']

STRIK = [
    'oo.......oo',
    'ocoo...ooao',
    'ochbooobbao',
    'ocbbobobbao',
    'ocbbooobaao',
    'oaoo.o.ooao',
    'oo..oao..oo',
    '....o.o....',
]

BARET = [
    '............oo............',
    '...........oaao...........',
    '.......ooooooooooo........',
    '....oocchhcbbbbbbbooo.....',
    '..occhhcbbbbbbbbbbbbaoo...',
    '.ocbccbbbbbbbbbbbbbbbbaoo.',
    'ocbcbbbbbbbbbbbbbbbbbbbaao',
    'obbbbbbbbbbbbbbbbbbbbbbbao',
    '.oaabbbbbbbbbbbbbbbbbbaaoo',
    '..ooaaaaaaaaaaaaaaaaaaoo..',
    '....oooooooooooooooooo....',
]

# Tessie: bollere baret die schuin naar achteren (rechts) zakt; smallere band op het hoofd.
BARET_T = [
    '...........oo.............',
    '..........oaao............',
    '......oooooooooooo........',
    '....oochhhcbbbbbbbooo.....',
    '...ochhccbbbbbbbbbbbaoo...',
    '..ochccbbbbbbbbbbbbbbbaoo.',
    '.ocbcbbbbbbbbbbbbbbbbbbbao',
    '.ocbbbbbbbbbbbbbbbbbbbbbao',
    '.obbbbbbbbbbbbbbbbbbbbbaao',
    '..oabbbbbbbbbbbbbbbbbbaaoo',
    '...ooabbbbbbbbbbbbbbaaoo..',
    '....oaaaaaaaaaaaaaaaaao...',
    '....ocbcbcbcbcbcbcbcbco...',
    '.....oooooooooooooooooo...',
]

CLIP = ['.oooooo.', 'ohhcbbbo', 'ocbbbbao', '.oooooo.']


def koptelefoon(fid):
    lg = Laag()
    if fid == 'hidde':
        teken(lg, KOPTEL_VER, 48, 31, 'nacht')
        band(lg, [(23, 35), (22, 31), (22, 28), (24, 26), (27, 24), (31, 23), (35, 22), (40, 22),
                  (44, 23), (47, 25), (49, 28), (49, 31)], 'nacht')
        teken(lg, KOPTEL_KAP, 20, 35, 'nacht', {'k': 'koraal'})
        return knip_boven(lg, 25, 47, 30)
    teken(lg, KOPTEL_VER, 15, 39, 'nacht', spiegel=True)
    band(lg, [(38, 45), (40, 41), (40, 38), (38, 35), (35, 33), (31, 32), (27, 32), (23, 33),
              (20, 35), (18, 38), (17, 40)], 'nacht')
    teken(lg, KOPTEL_KAP, 35, 44, 'nacht', {'k': 'koraal'}, spiegel=True)
    return knip_boven(lg, 20, 38, 34)


def haarband(fid):
    lg = Laag()
    if fid == 'hidde':
        band(lg, [(24, 37), (25, 33), (28, 30), (32, 29), (37, 29), (42, 30), (46, 32), (48, 35)], 'koraal', dikte=3)
        return lg
    band(lg, [(20, 43), (21, 39), (24, 36), (28, 35), (32, 35), (36, 36), (39, 39), (40, 43)], 'koraal', dikte=3)
    return lg


def strik(fid):
    lg = Laag()
    if fid == 'hidde':
        return teken(lg, STRIK, 22, 26, 'koraal')
    return teken(lg, STRIK, 36, 32, 'koraal')


def baret(fid):
    lg = Laag()
    if fid == 'hidde':
        teken(lg, BARET, 22, 20, 'bordeaux')
        return knip_boven(lg, 22, 47, 30, zijmarge=3, y_zij=27)
    teken(lg, BARET_T, 16, 28, 'bordeaux')
    return knip_boven(lg, 19, 41, 41, zijmarge=6, y_zij=37)


def haarclip(fid):
    lg = Laag()
    if fid == 'hidde':
        return teken(lg, CLIP, 25, 33, 'goud')
    return teken(lg, CLIP, 18, 37, 'goud')


HOOFD.update({'koptelefoon': koptelefoon, 'haarband': haarband, 'strik': strik, 'baret': baret,
              'haarclip': haarclip})
