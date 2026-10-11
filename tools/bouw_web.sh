#!/usr/bin/env bash
# Bouwt de webversie van Pixel Quest in dist/: één platte map die werkt via file://, op de VPS en in de
# iPhone-app (Capacitor). dist/index.html is de app (één pagina met tabbalk). De losse pagina's voor de bouwer
# (assets.html = oude assetcontrole, huis.html, kledingkast.html, huis-filmstrip.html) gaan mee voor het debugscherm.
#   bash tools/bouw_web.sh
set -euo pipefail
cd "$(dirname "$0")/.."

rm -rf dist
mkdir -p dist/assets
cp app/*.js app/*.css app/*.html dist/
rm -f dist/*-test.js
cp assets/*.js dist/assets/
for d in bron native native-4x referentie items outfits; do cp -r "assets/$d" dist/assets/; done

cd dist
# Paden: alles staat naast elkaar, assets/ eronder.
sed -i 's#\.\./assets/#assets/#g' *.html *.js

# Controle: geen kapotte scripts, geen paden naar buiten de map, elk script en stijlblad bestaat.
for f in *.js; do node --check "$f" >/dev/null || { echo "FOUT: syntax in $f" >&2; exit 1; }; done
if grep -l '\.\./' *.html *.js; then echo "FOUT: nog ../-paden" >&2; exit 1; fi
[ -f index.html ] && grep -q 'class="tabbalk"' index.html || { echo "FOUT: index.html is niet de app" >&2; exit 1; }
for f in *.html; do
  for s in $(grep -o '\(src\|href\)="[^"#?]*\.\(js\|css\|png\)"' "$f" | sed 's/^[a-z]*="//;s/"$//' | grep -v '^https\?:'); do
    [ -f "$s" ] || { echo "FOUT: $f verwijst naar ontbrekend $s" >&2; exit 1; }
  done
done
echo "dist klaar: $(find . -type f | wc -l) bestanden, $(du -sh . | cut -f1)"
