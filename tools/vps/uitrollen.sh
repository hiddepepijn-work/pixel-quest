#!/usr/bin/env bash
# Vanaf deze laptop: laat de VPS de laatste webversie ophalen en installeren.
# Grote uploads van thuis naar de VPS worden onderweg afgebroken (zie Uurwerk), daarom gaat het pakket via
# de GitHub-release web-latest (gemaakt door de workflow) en stuurt deze laptop alleen één kort commando.
#   bash tools/vps/uitrollen.sh [ubuntu@51.75.74.94]
set -euo pipefail
TARGET="${1:-ubuntu@51.75.74.94}"
RAW=https://raw.githubusercontent.com/hiddepepijn-work/pixel-quest/main/tools/vps
ssh "$TARGET" "rm -rf /tmp/pq && mkdir -p /tmp/pq && curl -fsSL $RAW/installeer.sh -o /tmp/pq/installeer.sh && curl -fsSL $RAW/pixelquest.caddy -o /tmp/pq/pixelquest.caddy && bash /tmp/pq/installeer.sh /tmp/pq"
echo "Klaar: https://pixelquest.51-75-74-94.sslip.io/"
