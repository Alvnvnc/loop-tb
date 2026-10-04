#!/usr/bin/env bash
# Redeploy SIGAP ke dua target sekaligus:
#   1) GitHub Pages (static export, basePath /loop-tb, API menunjuk ke VPS)
#   2) VPS (container Docker unified UI+API, dilayani via Tailscale Funnel)
# Lalu verifikasi via funnel + Pages.
set -euo pipefail
cd "$(dirname "$0")/.."

FUNNEL_URL="${FUNNEL_URL:-https://ip-172-26-13-244.tail40f715.ts.net}"
VPS_HOST="${VPS_HOST:-Lightsail-Coretax}"

echo "== 1/4) Build static export untuk Pages =="
( cd web && NEXT_EXPORT=1 NEXT_BASE_PATH=/loop-tb NEXT_PUBLIC_BASE_PATH=/loop-tb NEXT_PUBLIC_API_URL="$FUNNEL_URL" npm run build 2>&1 | tail -2 )

echo "== 2/4) Push gh-pages =="
D="$HOME/.cache/sigap/pages-deploy"
rm -rf "$D" && mkdir -p "$D"
cp -r web/out/. "$D/"
touch "$D/.nojekyll"
(
  cd "$D"
  git init -q -b gh-pages
  git add -A
  git -c user.name="Alvnvnc" -c user.email="alvnvnc@users.noreply.github.com" commit -q -m "deploy: SIGAP static (v2 UI)"
  git remote add origin git@github.com:Alvnvnc/loop-tb.git
  git push -f -q origin gh-pages
)
echo "gh-pages pushed"

echo "== 3/4) Rebuild VPS container =="
STAGE_ONLY=1 bash api/deploy_hf.sh > /dev/null
ssh -o BatchMode=yes "$VPS_HOST" 'mkdir -p ~/sigap && rm -rf ~/sigap/*'
rsync -az --delete "$HOME/.cache/sigap/hf_space/" "$VPS_HOST:~/sigap/" > /dev/null
ssh -o BatchMode=yes "$VPS_HOST" 'cd ~/sigap && sudo docker build -q -t sigap-api . > /dev/null && { sudo docker rm -f sigap > /dev/null 2>&1 || true; } && sudo docker run -d --name sigap --restart unless-stopped -p 8099:7860 sigap-api > /dev/null && echo container-up'

echo "== 4/4) Verifikasi =="
H=""
for i in $(seq 1 45); do
  sleep 10
  H=$(curl -s -m 10 "$FUNNEL_URL/health" || true)
  [ -n "$H" ] && break
  echo "[$i] menunggu health…"
done
echo "health: ${H:0:160}"
curl -s -m 15 -o /dev/null -w "VPS UI    -> %{http_code}\n" "$FUNNEL_URL/"
sleep 60
curl -s -m 15 -o /dev/null -w "Pages UI  -> %{http_code}\n" https://alvnvnc.github.io/loop-tb/
echo "REDEPLOY DONE"