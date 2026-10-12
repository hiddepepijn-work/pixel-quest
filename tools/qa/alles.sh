#!/usr/bin/env bash
# QA-ronde van de app (docs/qa-app-ui.md): bouwt dist/ en draait alle scenario's in Edge op 390×844 en 430×932.
# puppeteer-core hoort niet in de repo: PQ_PUPPETEER=<pad>/node_modules/puppeteer-core bash tools/qa/alles.sh
# Schermafbeeldingen in test-uitvoer/qa/ (niet in git).
set -uo pipefail
cd "$(dirname "$0")"
bash ../bouw_web.sh >/dev/null || exit 1
node ../test_regels.js | tail -1
fout=0
for t in "flows1.js" "flows1.js 430 932" "flows2.js" "flows3.js" "gebaren.js" "gebaren.js 430 932" "signalen.js" "signalen.js 430 932" \
         "robuust.js" "perf.js" "klein.js" "tour.js" "tour.js 430 932" "zoom.js" "zoom.js 430 932" \n         "winkel.js" "winkel.js 430 932"; do
  uit=$(node $t 2>&1)
  echo "$t: $(echo "$uit" | grep -E '^\{"ok"|CRASH' | tail -1)"
  echo "$uit" | grep '✗' && fout=1
  echo "$uit" | grep -q '"mis":0' || fout=1
done
exit $fout
