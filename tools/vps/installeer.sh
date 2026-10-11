#!/usr/bin/env bash
# Draait OP de VPS. Haalt de laatste webversie van GitHub (release web-latest) en zet die in
# /opt/pixelquest/web. De eerste keer haakt het ook het eigen Caddy-blok in. Raakt Reisbouwer en
# Uurwerk niet aan: hun Caddy-blokken blijven ongewijzigd, er komt alleen één import-regel onderaan bij.
#   bash installeer.sh <map-met-pixelquest.caddy>
set -euo pipefail
HIER="${1:-$(dirname "$0")}"
URL=https://github.com/hiddepepijn-work/pixel-quest/releases/download/web-latest/pixelquest-web.tgz
DOEL=/opt/pixelquest
CADDY=/etc/caddy/Caddyfile

# 1. Webversie: eerst naast de oude uitpakken, dan in één keer wisselen (geen halve site tijdens de update).
sudo mkdir -p "$DOEL"
TMP=$(mktemp -d)
curl -fsSL "$URL" -o "$TMP/web.tgz"
mkdir "$TMP/web"
tar -xzf "$TMP/web.tgz" -C "$TMP/web"
[ -f "$TMP/web/index.html" ] || { echo "FOUT: geen index.html in het pakket" >&2; exit 1; }
sudo rm -rf "$DOEL/web.nieuw"
sudo mv "$TMP/web" "$DOEL/web.nieuw"
sudo chown -R root:root "$DOEL/web.nieuw"
sudo chmod -R a+rX "$DOEL/web.nieuw"
[ -d "$DOEL/web" ] && sudo rm -rf "$DOEL/web.oud" && sudo mv "$DOEL/web" "$DOEL/web.oud"
sudo mv "$DOEL/web.nieuw" "$DOEL/web"
rm -rf "$TMP"
echo "web: $(find "$DOEL/web" -type f | wc -l) bestanden"

# 2. Caddy: eigen bestand, en één import-regel in de gedeelde Caddyfile (alleen als die er nog niet staat).
sudo install -m 644 "$HIER/pixelquest.caddy" /etc/caddy/pixelquest.caddy
if ! sudo grep -q '^import /etc/caddy/pixelquest.caddy' "$CADDY"; then
  sudo cp "$CADDY" "$CADDY.voor-pixelquest-$(date +%F)"
  printf '\n# Pixel Quest (statisch, eigen hostnaam)\nimport /etc/caddy/pixelquest.caddy\n' | sudo tee -a "$CADDY" >/dev/null
fi
# Eerst controleren; pas bij een geldige config herladen. Herladen is naadloos voor de andere sites.
if sudo caddy validate --config "$CADDY" --adapter caddyfile >/tmp/pq-validate.log 2>&1; then
  sudo systemctl reload caddy
  echo "caddy: geldig en herladen"
else
  cat /tmp/pq-validate.log >&2
  echo "FOUT: caddy-config ongeldig, niet herladen" >&2
  exit 1
fi
