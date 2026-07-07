#!/bin/bash
# Woof ID — testen op telefoon (zelfde WiFi als deze Mac)
set -euo pipefail

cd "$(dirname "$0")"

IP="$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || true)"
if [ -z "$IP" ]; then
  echo "Geen WiFi-IP gevonden. Zit je Mac op WiFi?"
  exit 1
fi

# Pas .env aan (NextAuth cookies werken alleen als URL klopt)
if grep -q '^NEXTAUTH_URL=' .env; then
  sed -i '' "s|^NEXTAUTH_URL=.*|NEXTAUTH_URL=\"http://${IP}:3000\"|" .env
else
  echo "NEXTAUTH_URL=\"http://${IP}:3000\"" >> .env
fi

echo ""
echo "  Woof ID — telefoon test"
echo "  -----------------------"
echo "  Telefoon:  http://${IP}:3000"
echo "  Zelfde WiFi als je Mac."
echo ""
echo "  NEXTAUTH_URL in .env is gezet op http://${IP}:3000"
echo "  Herstart de dev server als die al draaide."
echo ""
echo "  QR scannen: gebruik de Camera-app op je iPhone"
echo "  (in-app camera vraagt HTTPS; scan de QR op je Mac-scherm)."
echo ""

npm run dev
