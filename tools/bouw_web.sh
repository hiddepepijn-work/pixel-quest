#!/usr/bin/env bash
# Bouwt de webversie van Pixel Quest in dist/: één platte map die werkt via file://, op de VPS en in de
# iPhone-app (Capacitor). Startpagina = het overzicht (app/start.html); app/index.html heet daar preview.html.
#   bash tools/bouw_web.sh
set -euo pipefail
cd "$(dirname "$0")/.."

rm -rf dist
mkdir -p dist/assets
cp app/*.js app/*.css dist/
rm -f dist/*-test.js
cp app/start.html dist/index.html
cp app/index.html dist/preview.html
cp app/kledingkast.html app/huis.html dist/
cp assets/*.js dist/assets/
for d in bron native native-4x referentie items outfits; do cp -r "assets/$d" dist/assets/; done

cd dist
# Paden: alles staat naast elkaar, assets/ eronder.
sed -i 's#\.\./assets/#assets/#g' *.html *.js
# Links: het overzicht is nu index.html, de assetpagina preview.html.
sed -i 's#href="index.html#href="preview.html#g' index.html
for f in preview.html kledingkast.html huis.html; do
  sed -i 's#href="index.html"#href="preview.html"#' "$f"
  grep -q '>Overzicht<' "$f" ||
    sed -i '0,/<a class="tablink"/s#\( *\)<a class="tablink"#\1<a class="tablink" href="index.html">Overzicht</a>\n&#' "$f"
done

# Controle: geen kapotte scripts, geen paden naar buiten de map.
for f in *.js; do node --check "$f" >/dev/null || { echo "FOUT: syntax in $f" >&2; exit 1; }; done
if grep -l '\.\./' *.html *.js; then echo "FOUT: nog ../-paden" >&2; exit 1; fi
for f in *.html; do
  for s in $(grep -o 'src="[^"]*"' "$f" | sed 's/src="//;s/"$//' | grep -v '^https\?:'); do
    [ -f "$s" ] || { echo "FOUT: $f verwijst naar ontbrekend $s" >&2; exit 1; }
  done
done
echo "dist klaar: $(find . -type f | wc -l) bestanden, $(du -sh . | cut -f1)"
