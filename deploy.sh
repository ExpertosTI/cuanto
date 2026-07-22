#!/usr/bin/env bash
# ── cuanto — Renace Protocol deploy.sh ──────────────────────
#  Uso en el VPS:
#      cd /opt/cuanto && ./deploy.sh
#  Primera vez: clona el repo en PROJECT_DIR y despliega.

set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/ExpertosTI/cuanto.git}"
PROJECT_DIR="${PROJECT_DIR:-/opt/cuanto}"
STACK_NAME="${STACK_NAME:-cuanto}"
SERVICE_NAME="${STACK_NAME}_web"
DOMAIN="${DOMAIN:-cuanto.renace.tech}"

cyan()  { printf "\033[36m%s\033[0m\n" "$*"; }
green() { printf "\033[32m%s\033[0m\n" "$*"; }
red()   { printf "\033[31m%s\033[0m\n" "$*"; }

cyan "── 1. Sincronizar fuente ───────────────────────"
if [ -d "$PROJECT_DIR/.git" ]; then
  cd "$PROJECT_DIR"
  git fetch origin main
  git reset --hard origin/main
else
  git clone "$REPO_URL" "$PROJECT_DIR"
  cd "$PROJECT_DIR"
fi

cyan "── 2. Verificar .env ───────────────────────────"
if [ ! -f ".env" ]; then
  cp .env.example .env
  red "❌ Editá .env con las claves de producción, luego re-ejecutá ./deploy.sh"
  exit 1
fi

cyan "── 3. Construir imagen local ───────────────────"
set -a
# shellcheck disable=SC1091
source .env
set +a
export DOMAIN
docker compose build

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
green "✅ cuanto desplegado."
green "   Sitio:    https://$DOMAIN"
green "   Servicio: $SERVICE_NAME"
green "   Logs:     docker service logs -f $SERVICE_NAME"
