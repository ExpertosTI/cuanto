#!/usr/bin/env bash
# ── cuanto — Renace Protocol deploy.sh ──────────────────────
#  Un solo comando en el VPS:
#      cd /opt/cuanto && ./deploy.sh
#
#  Auth: SMTP (info@renace.tech) + Evolution API QR en el mismo dominio /api

set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/ExpertosTI/cuanto.git}"
PROJECT_DIR="${PROJECT_DIR:-/opt/cuanto}"
STACK_NAME="${STACK_NAME:-cuanto}"
DOMAIN="${DOMAIN:-cuanto.renace.tech}"

DEFAULT_INSFORGE_URL="https://insforge.renace.tech"
DEFAULT_INSFORGE_ANON_KEY="eyJhbGciOiAiSFMyNTYiLCAidHlwIjogIkpXVCJ9.eyJyb2xlIjogImFub24ifQ.YTrshWNWGSWsmc6DUhitFQSXDICh9BTIiz4CK0GX0Cw"
DEFAULT_WHATSAPP="18494577463"
DEFAULT_PRO_CODE="CUANTO-PRO"

cyan()  { printf "\033[36m%s\033[0m\n" "$*"; }
green() { printf "\033[32m%s\033[0m\n" "$*"; }
yellow(){ printf "\033[33m%s\033[0m\n" "$*"; }

# Fase 1: sync y re-ejecutar el script NUEVO
if [[ "${1:-}" != "--go" ]]; then
  cyan "── 1. Sincronizar fuente ───────────────────────"
  if [ -d "$PROJECT_DIR/.git" ]; then
    cd "$PROJECT_DIR"
    # Preserve secrets before hard reset wipe? keep .env outside git
    if [ -f .env ]; then cp -f .env /tmp/cuanto.env.bak; fi
    git fetch origin main
    git reset --hard origin/main
    if [ -f /tmp/cuanto.env.bak ]; then mv -f /tmp/cuanto.env.bak .env; fi
  else
    git clone "$REPO_URL" "$PROJECT_DIR"
    cd "$PROJECT_DIR"
  fi
  chmod +x deploy.sh scripts/*.sh 2>/dev/null || true
  exec "$PROJECT_DIR/deploy.sh" --go
fi

cd "$PROJECT_DIR"

# Load existing .env so SMTP / Evolution secrets survive
if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

gen_secret() {
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -hex 32
  else
    head -c 32 /dev/urandom | od -An -tx1 | tr -d ' \n'
  fi
}

write_env() {
  local auth_secret="${AUTH_SECRET:-}"
  if [ -z "$auth_secret" ]; then
    auth_secret="$(gen_secret)"
  fi

  cat > .env <<EOF
# ── Frontend (Vite build args) ──
VITE_INSFORGE_URL=${VITE_INSFORGE_URL:-$DEFAULT_INSFORGE_URL}
VITE_INSFORGE_ANON_KEY=${VITE_INSFORGE_ANON_KEY:-$DEFAULT_INSFORGE_ANON_KEY}
VITE_WHATSAPP_BUSINESS=${VITE_WHATSAPP_BUSINESS:-$DEFAULT_WHATSAPP}
VITE_PRO_CODE=${VITE_PRO_CODE:-$DEFAULT_PRO_CODE}
VITE_MASTER_EMAIL=${VITE_MASTER_EMAIL:-info@renace.tech}
VITE_AUTH_URL=${VITE_AUTH_URL:-}
DOMAIN=${DOMAIN}

# ── API auth ──
AUTH_SECRET=${auth_secret}
MASTER_EMAILS=${MASTER_EMAILS:-info@renace.tech}
AUTH_DEV_SHOW_CODE=${AUTH_DEV_SHOW_CODE:-0}

# ── SMTP (Hostinger / Renace) ──
SMTP_HOST=${SMTP_HOST:-smtp.hostinger.com}
SMTP_PORT=${SMTP_PORT:-465}
SMTP_USER=${SMTP_USER:-info@renace.tech}
SMTP_PASS=${SMTP_PASS:-}
SMTP_FROM=${SMTP_FROM:-Cuanto <info@renace.tech>}

# ── Evolution API (prefer URL interna en el VPS) ──
EVOLUTION_API_URL=${EVOLUTION_API_URL:-https://evoapi.renace.tech}
EVOLUTION_API_KEY=${EVOLUTION_API_KEY:-}
EVOLUTION_INSTANCE=${EVOLUTION_INSTANCE:-cuanto}
WHATSAPP_BUSINESS=${WHATSAPP_BUSINESS:-$DEFAULT_WHATSAPP}

# ── Agent ──
GEMINI_API_KEY=${GEMINI_API_KEY:-}
EOF
}

cyan "── 2. Autoconfigurar .env (stack Renace) ───────"
write_env
set -a
# shellcheck disable=SC1091
source .env
set +a
export DOMAIN

green "   Dominio     → $DOMAIN"
green "   InsForge    → ${VITE_INSFORGE_URL}"
green "   SMTP        → ${SMTP_HOST} / ${SMTP_USER}"
green "   Evolution   → ${EVOLUTION_API_URL} · ${EVOLUTION_INSTANCE}"
if [ -z "${SMTP_PASS:-}" ]; then
  yellow "   ⚠ SMTP_PASS vacío — OTP master irá a modo desarrollo hasta que lo configures"
fi
if [ -z "${EVOLUTION_API_KEY:-}" ]; then
  yellow "   ⚠ EVOLUTION_API_KEY vacío — no se podrá escanear QR ni enviar OTP WA"
fi

cyan "── 3. Construir imágenes (web + api) ───────────"
docker compose build --no-cache

cyan "── 4. Asegurar red RenaceNet ───────────────────"
if ! docker network ls --format '{{.Name}}' | grep -qx "RenaceNet"; then
  docker network create --driver overlay --attachable RenaceNet
fi

cyan "── 5. Desplegar stack ($STACK_NAME → $DOMAIN) ──"
docker stack deploy -c docker-compose.yml "$STACK_NAME"

cyan "── 6. Forzar uso de imágenes nuevas ────────────"
docker service update --force "${STACK_NAME}_web" >/dev/null 2>&1 || true
docker service update --force "${STACK_NAME}_api" >/dev/null 2>&1 || true

cyan "── 7. Limpiar imágenes huérfanas ───────────────"
docker image prune -f >/dev/null

green ""
green "✅ cuanto desplegado en tu servidor."
green "   Sitio:  https://$DOMAIN"
green "   API:    https://$DOMAIN/api/healthz"
green "   Master: OTP correo → escanear QR Evolution → listo"
green "   Editar secretos: $PROJECT_DIR/.env  (luego ./deploy.sh)"
