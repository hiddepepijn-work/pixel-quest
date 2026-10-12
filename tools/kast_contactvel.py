"""Contactvellen voor de kast: elk getekend item op beide lichamen, en combinaties.

  python tools/kast_contactvel.py            alles (na tools/kast.py)
Schrijft assets/debug/kast_vel_<slot>.png      per slot: elk item in al zijn kleuren, native 6x
         assets/debug/kast_combi_<naam>.png    boven x onder, heel lichaam, hoofd + jas + sjaal
De bronversie (zoals in het huis) komt uit de app zelf: tools/kast_bron.js (tekenLook).
"""
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

sys.path.insert(0, str(Path(__file__).resolve().parent))
import kast  # noqa: E402
import kleding as K  # noqa: E402

ACHTER = (214, 222, 205)
UIT = K.UIT / 'debug'


def start(fid):
    look = {'boven': {'item': 'tshirt_basis', 'kleur': 'origineel'},
            'onder': {'item': 'broek_basis', 'kleur': 'origineel'},
            'schoenen': {'item': 'sneakers_basis', 'kleur': 'origineel'}}
    if fid == 'tessie':
        look['accessoire'] = {'item': 'ketting_basis', 'kleur': 'origineel'}
    return look


def met(fid, *keuzes):
    look = start(fid)
    for it, kleur in keuzes:
        look[it['slot']] = {'item': it['id'], 'kleur': kleur}
    return look


def tegel(b, S=6, crop=(24, 110, 6, 58)):
    y0, y1, x0, x1 = crop
    im = Image.new('RGBA', ((x1 - x0) * S, (y1 - y0) * S), ACHTER + (255,))
    st = Image.fromarray(b[y0:y1, x0:x1]).resize(((x1 - x0) * S, (y1 - y0) * S), Image.NEAREST)
    im.alpha_composite(st)
    return im.convert('RGB')


def vel(rijen, labels, pad, S=6, crop=(24, 110, 6, 58)):
    """rijen: lijst van lijsten met native beelden; labels: tekst per rij."""
    tw, th = (crop[3] - crop[2]) * S, (crop[1] - crop[0]) * S
    n = max(len(r) for r in rijen)
    out = Image.new('RGB', (n * (tw + 6) + 6, len(rijen) * (th + 22) + 4), (245, 241, 230))
    d = ImageDraw.Draw(out)
    for i, (rij, lab) in enumerate(zip(rijen, labels)):
        y = i * (th + 22) + 18
        d.text((6, y - 15), lab, fill=(40, 30, 40))
        for j, b in enumerate(rij):
            out.paste(tegel(b, S, crop), (6 + j * (tw + 6), y))
    out.save(pad)
    return pad


def per_slot(klaar, slot, S=6):
    rijen, labels = [], []
    for it in [i for i in klaar if i['slot'] == slot]:
        rij = []
        for fid in it['lichaam']:
            rij += [kast.samenstel(fid, met(fid, (it, k))) for k in it['kleuren']]
        rijen.append(rij)
        labels.append(f"{it['id']} ({it['herkomst']}) - {', '.join(it['lichaam'])} - {', '.join(it['kleuren'])}")
    if rijen:
        return vel(rijen, labels, UIT / f'kast_vel_{slot}.png', S)


def combi(klaar):
    per = {i['id']: i for i in klaar}
    paden = []
    for fid in ('hidde', 'tessie'):
        boven = [i for i in klaar if i['slot'] == 'boven' and fid in i['lichaam']]
        onder = [i for i in klaar if i['slot'] == 'onder' and fid in i['lichaam']]
        rijen = [[kast.samenstel(fid, met(fid, (b, b['kleuren'][j % len(b['kleuren'])]),
                                          (o, o['kleuren'][(j + 1) % len(o['kleuren'])])))
                  for j, o in enumerate(onder)] for b in boven]
        labels = [f"{fid}: {b['id']} x " + ', '.join(o['id'] for o in onder) for b in boven]
        paden.append(vel(rijen, labels, UIT / f'kast_combi_boven_onder_{fid}.png', 4))
    rijen, labels = [], []
    for fid in ('hidde', 'tessie'):
        heel = [i for i in klaar if i['slot'] == 'heel_lichaam' and fid in i['lichaam']]
        schoen = [i for i in klaar if i['slot'] == 'schoenen' and fid in i['lichaam']]
        rij = []
        for j, h in enumerate(heel):
            s = schoen[j % len(schoen)] if schoen else None
            keuze = [(h, h['kleuren'][0])] + ([(s, s['kleuren'][0])] if s else [])
            if h.get('over_kleding') and 'hoodie_basic' in per and fid in per['hoodie_basic']['lichaam']:
                keuze.append((per['hoodie_basic'], 'petrol'))
            rij.append(kast.samenstel(fid, met(fid, *keuze)))
        rijen.append(rij)
        labels.append(f"{fid}: heel lichaam " + ', '.join(h['id'] for h in heel))
    paden.append(vel(rijen, labels, UIT / 'kast_combi_heel.png', 5))
    rijen, labels = [], []
    for fid in ('hidde', 'tessie'):
        jassen = [i for i in klaar if i['slot'] == 'jas' and fid in i['lichaam']]
        hoofd = [i for i in klaar if i['slot'] == 'hoofd' and fid in i['lichaam']]
        rij = []
        for j, jas in enumerate(jassen):
            h = hoofd[j % len(hoofd)]
            keuze = [(jas, jas['kleuren'][0]), (h, h['kleuren'][1])]
            if 'sjaal' in per:
                keuze.append((per['sjaal'], 'bordeaux'))
            for extra in ('hoodie_basic', 'jeans', 'laarzen'):
                if extra in per and fid in per[extra]['lichaam'] and j % 2:
                    keuze.append((per[extra], per[extra]['kleuren'][1]))
            rij.append(kast.samenstel(fid, met(fid, *keuze)))
        rijen.append(rij)
        labels.append(f"{fid}: jas + hoofd + sjaal (oneven: met hoodie/jeans/laarzen)")
    paden.append(vel(rijen, labels, UIT / 'kast_combi_jas_hoofd.png', 5))
    return paden


def testlooks(klaar):
    """Looks voor tools/kast_bron.js: elk item op beide lichamen + combinaties, met de Python-render
    als verwachting (test-uitvoer/kast_looks.json, niet in git)."""
    per = {i['id']: i for i in klaar}
    looks = []
    for it in klaar:
        for fid in it['lichaam']:
            looks.append({'naam': f"{it['slot']}/{it['id']}", 'fid': fid,
                          'look': met(fid, (it, it['kleuren'][-1]))})
    combis = {'hidde': [('hoodie_basic', 'joggingbroek', 'sloffen'), ('overhemd', 'jeans', 'laarzen'),
                        ('schort', 'hoodie_basic', 'jeans'), ('spijkerjas', 'trui', 'korte_broek', 'petje'),
                        ('puffer', 'beanie', 'sjaal', 'laarzen'), ('regenjas', 'bucket_hat', 'laarzen')],
              'tessie': [('blouse', 'rok', 'ballerinas', 'baret'), ('teddyjas', 'legging', 'enkellaarsjes'),
                         ('schort', 'cardigan', 'wijde_broek'), ('jurk', 'sloffen'), ('overall', 'sneakers_basis'),
                         ('crop_top', 'korte_broek', 'sloffen', 'oorbellen'), ('puffer', 'beanie', 'sjaal')]}
    for fid, lijst in combis.items():
        for ids in lijst:
            keuze = [(per[i], per[i]['kleuren'][k % len(per[i]['kleuren'])]) for k, i in enumerate(ids) if i in per]
            looks.append({'naam': 'combi/' + '+'.join(ids), 'fid': fid, 'look': met(fid, *keuze)})
    for l in looks:
        l['verwacht'] = K.png_data_url(kast.samenstel(l['fid'], l['look']))
    pad = K.ROOT / 'test-uitvoer' / 'kast_looks.json'
    pad.parent.mkdir(exist_ok=True)
    pad.write_text(json.dumps(looks), 'utf-8')
    return pad


def main():
    kleding = json.loads((K.UIT / 'kleding.json').read_text('utf-8'))
    kast.maak_sprites(kleding)
    klaar = [i for i in kast.CATALOGUS if i['status'] == 'klaar']
    slots = sys.argv[1:] or kast.SLOTS
    for slot in slots:
        p = per_slot(klaar, slot)
        if p:
            print(p.relative_to(K.ROOT))
    if not sys.argv[1:]:
        for p in combi(klaar):
            print(p.relative_to(K.ROOT))
        print(testlooks(klaar).relative_to(K.ROOT))


if __name__ == '__main__':
    main()
