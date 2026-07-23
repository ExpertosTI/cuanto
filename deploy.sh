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

# Cargar .env previo sin romper el script (SMTP_FROM con <...> rompía bash)
load_env_file() {
  local file="$1"
  [ -f "$file" ] || return 0
  # Autoreparar línea SMTP_FROM sin comillas
  if grep -qE '^SMTP_FROM=Cuanto <' "$file" 2>/dev/null; then
    sed -i "s|^SMTP_FROM=Cuanto <info@renace.tech>|SMTP_FROM='Cuanto <info@renace.tech>'|" "$file" 2>/dev/null || true
    sed -i 's|^SMTP_FROM=\([^'\''"].*\)$|SMTP_FROM='\''\1'\''|' "$file" 2>/dev/null || true
  fi
  set -a
  # shellcheck disable=SC1091
  if ! source "$file"; then
    yellow "   .env inválido — se respalda y regenera (secretos Evolution se pedirán de nuevo si no estaban exportados)"
    mv -f "$file" "${file}.broken.$(date +%s)" 2>/dev/null || rm -f "$file"
    set +a
    return 1
  fi
  set +a
  return 0
}

load_env_file .env || true

# Reutilizar Evolution de otros stacks Renace en el mismo VPS (sin inventar keys)
discover_evolution() {
  local f key val
  if [ -n "${EVOLUTION_API_URL:-}" ] && [ -n "${EVOLUTION_API_KEY:-}" ]; then
    return 0
  fi
  for f in \
    /opt/cuanto/.evolution.local \
    /opt/presta_pro/.evolution.local \
    /opt/presta_pro/.env \
    /opt/rnv-manger/.evolution.local \
    /opt/rnv-manger/.env \
    /opt/citas/.evolution.local \
    /opt/citas/.env \
    /opt/rk/.evolution.local \
    /opt/rk/.env \
    /opt/raices/.evolution.local \
    /opt/raices/.env
  do
    [ -f "$f" ] || continue
    if [ -z "${EVOLUTION_API_KEY:-}" ]; then
      val="$(grep -E '^EVOLUTION_API_KEY=' "$f" 2>/dev/null | tail -1 | cut -d= -f2- | tr -d '\r' | sed -e "s/^['\"]//" -e "s/['\"]$//")"
      [ -n "$val" ] && EVOLUTION_API_KEY="$val"
    fi
    if [ -z "${EVOLUTION_API_URL:-}" ]; then
      val="$(grep -E '^EVOLUTION_API_URL=' "$f" 2>/dev/null | tail -1 | cut -d= -f2- | tr -d '\r' | sed -e "s/^['\"]//" -e "s/['\"]$//")"
      [ -n "$val" ] && EVOLUTION_API_URL="$val"
    fi
    if [ -z "${EVOLUTION_INSTANCE:-}" ]; then
      val="$(grep -E '^EVOLUTION_INSTANCE=' "$f" 2>/dev/null | tail -1 | cut -d= -f2- | tr -d '\r' | sed -e "s/^['\"]//" -e "s/['\"]$//")"
      [ -n "$val" ] && EVOLUTION_INSTANCE="$val"
    fi
    if [ -n "${EVOLUTION_API_KEY:-}" ] && [ -n "${EVOLUTION_API_URL:-}" ]; then
      green "   Evolution ← $f"
      break
    fi
  done
  # Misma red Swarm → URL interna (evita Cloudflare 502)
  if [ -n "${EVOLUTION_API_KEY:-}" ] && { [ -z "${EVOLUTION_API_URL:-}" ] || [[ "${EVOLUTION_API_URL}" == https://evoapi* ]]; }; then
    if docker network inspect RenaceNet >/dev/null 2>&1; then
      EVOLUTION_API_URL="http://evolution_api:8080"
    else
      EVOLUTION_API_URL="${EVOLUTION_API_URL:-https://evoapi.renace.tech}"
    fi
  fi
  # Key del stack Evolution si existe AUTHENTICATION_API_KEY
  if [ -z "${EVOLUTION_API_KEY:-}" ]; then
    for f in /opt/evolution*/.env /opt/*/evolution*/.env /root/evolution*/.env; do
      [ -f "$f" ] || continue
      val="$(grep -E '^AUTHENTICATION_API_KEY=' "$f" 2>/dev/null | tail -1 | cut -d= -f2- | tr -d '\r' | sed -e "s/^['\"]//" -e "s/['\"]$//")"
      if [ -n "$val" ] && [ "$val" != "CHANGE_ME" ]; then
        EVOLUTION_API_KEY="$val"
        EVOLUTION_API_URL="${EVOLUTION_API_URL:-http://evolution_api:8080}"
        green "   Evolution key ← $f"
        break
      fi
    done
  fi
  export EVOLUTION_API_URL EVOLUTION_API_KEY EVOLUTION_INSTANCE
}

# También cargar .evolution.local del propio proyecto (como ZAV / RNV)
if [ -f "$PROJECT_DIR/.evolution.local" ]; then
  set -a
  # shellcheck disable=SC1091
  source "$PROJECT_DIR/.evolution.local" 2>/dev/null || true
  set +a
fi

discover_evolution

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
VITE_INSFORGE_URL='${VITE_INSFORGE_URL:-$DEFAULT_INSFORGE_URL}'
VITE_INSFORGE_ANON_KEY='${VITE_INSFORGE_ANON_KEY:-$DEFAULT_INSFORGE_ANON_KEY}'
# Vacío = se toma del owner conectado en Evolution tras escanear QR
VITE_WHATSAPP_BUSINESS='${VITE_WHATSAPP_BUSINESS:-}'
VITE_PRO_CODE='${VITE_PRO_CODE:-$DEFAULT_PRO_CODE}'
VITE_MASTER_EMAIL='${VITE_MASTER_EMAIL:-expertostird@gmail.com}'
VITE_AUTH_URL='${VITE_AUTH_URL:-}'
DOMAIN='${DOMAIN}'

# ── API auth ──
AUTH_SECRET='${auth_secret}'
# Admin OTP llega a tu Gmail; la casilla de salida es info@renace.tech
MASTER_EMAILS='${MASTER_EMAILS:-expertostird@gmail.com}'
# Teléfonos master (opcional, comas). Vacío = primer teléfono que entre queda master.
MASTER_PHONES='${MASTER_PHONES:-}'
AUTH_DEV_SHOW_CODE='${AUTH_DEV_SHOW_CODE:-0}'

# ── SMTP (Hostinger / Renace — misma conf PrestaPro) ──
SMTP_HOST='${SMTP_HOST:-smtp.hostinger.com}'
SMTP_PORT='${SMTP_PORT:-465}'
SMTP_USER='${SMTP_USER:-info@renace.tech}'
SMTP_PASS='${SMTP_PASS:-JustWork2027@}'
SMTP_FROM='${SMTP_FROM:-Cuanto <info@renace.tech>}'

# ── Evolution API (misma key global Renace evoapi / ZAV / RNV / Catagce) ──
# URL interna en Swarm; instancia se descubre si vacía
EVOLUTION_API_URL='${EVOLUTION_API_URL:-http://evolution_api:8080}'
EVOLUTION_API_KEY='${EVOLUTION_API_KEY:-63DDF268-C21A-435A-A9BA-AB25D68BFFAC}'
EVOLUTION_INSTANCE='${EVOLUTION_INSTANCE:-renace}'
WHATSAPP_BUSINESS='${WHATSAPP_BUSINESS:-}'

# ── Agent ──
GEMINI_API_KEY='${GEMINI_API_KEY:-}'
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
green "   Evolution   → ${EVOLUTION_API_URL:-'(sin URL)'} · instancia ${EVOLUTION_INSTANCE:-'(auto fetchInstances)'}"
if [ -z "${SMTP_PASS:-}" ]; then
  yellow "   ⚠ SMTP_PASS vacío — OTP master fallará hasta configurarlo (no se inventan códigos)"
fi
if [ -z "${EVOLUTION_API_URL:-}" ] || [ -z "${EVOLUTION_API_KEY:-}" ]; then
  yellow "   ⚠ EVOLUTION_API_URL / EVOLUTION_API_KEY — requeridos para QR y OTP WhatsApp"
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
