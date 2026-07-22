#!/usr/bin/env bash
# ── cuanto — Renace Protocol deploy.sh ──────────────────────
#  Un solo comando en el VPS:
#      curl -fsSL https://raw.githubusercontent.com/ExpertosTI/cuanto/main/deploy.sh | bash
#  o:  cd /opt/cuanto && ./deploy.sh

set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/ExpertosTI/cuanto.git}"
PROJECT_DIR="${PROJECT_DIR:-/opt/cuanto}"
STACK_NAME="${STACK_NAME:-cuanto}"
SERVICE_NAME="${STACK_NAME}_web"
DOMAIN="${DOMAIN:-cuanto.renace.tech}"

# Claves del stack Renace (insforge.renace.tech) — mismas que ZAV/RK
DEFAULT_INSFORGE_URL="https://insforge.renace.tech"
DEFAULT_INSFORGE_ANON_KEY="eyJhbGciOiAiSFMyNTYiLCAidHlwIjogIkpXVCJ9.eyJyb2xlIjogImFub24ifQ.YTrshWNWGSWsmc6DUhitFQSXDICh9BTIiz4CK0GX0Cw"
DEFAULT_WHATSAPP="17174156171"

cyan()  { printf "\033[36m%s\033[0m\n" "$*"; }
green() { printf "\033[32m%s\033[0m\n" "$*"; }

write_env() {
  cat > .env <<EOF
VITE_INSFORGE_URL=${VITE_INSFORGE_URL:-$DEFAULT_INSFORGE_URL}
VITE_INSFORGE_ANON_KEY=${VITE_INSFORGE_ANON_KEY:-$DEFAULT_INSFORGE_ANON_KEY}
VITE_WHATSAPP_BUSINESS=${VITE_WHATSAPP_BUSINESS:-$DEFAULT_WHATSAPP}
DOMAIN=${DOMAIN}
EOF
}

cyan "── 1. Sincronizar fuente ───────────────────────"
if [ -d "$PROJECT_DIR/.git" ]; then
  cd "$PROJECT_DIR"
  git fetch origin main
  git reset --hard origin/main
else
  git clone "$REPO_URL" "$PROJECT_DIR"
  cd "$PROJECT_DIR"
fi
chmod +x deploy.sh scripts/*.sh 2>/dev/null || true

cyan "── 2. Autoconfigurar .env (stack Renace) ───────"
write_env
green "   InsForge → ${DEFAULT_INSFORGE_URL}"
green "   Dominio  → ${DOMAIN}"

cyan "── 3. Construir imagen local ───────────────────"
set -a
# shellcheck disable=SC1091
source .env
set +a
export DOMAIN
docker compose build --no-cache

cyan "── 4. Asegurar red RenaceNet ───────────────────"
if ! docker network ls --format '{{.Name}}' | grep -qx "RenaceNet"; then
  docker network create --driver overlay --attachable RenaceNet
fi

cyan "── 5. Desplegar stack ($STACK_NAME → $DOMAIN) ──"
docker stack deploy -c docker-compose.yml "$STACK_NAME"

cyan "── 6. Forzar uso de la imagen nueva ────────────"
docker service update --force "$SERVICE_NAME" >/dev/null 2>&1 || true

cyan "── 7. Limpiar imágenes huérfanas ───────────────"
docker image prune -f >/dev/null

green ""
green "✅ cuanto desplegado (InsForge Renace + seed local)."
green "   Sitio:    https://$DOMAIN"
green "   Servicio: $SERVICE_NAME"
green "   Logs:     docker service logs -f $SERVICE_NAME"
