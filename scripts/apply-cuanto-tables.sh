#!/usr/bin/env bash
# Aplica tablas Cuanto en Postgres del stack Renace InsForge.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SQL="$ROOT/migrations/20260722000002_cuanto_renace_tables.sql"

cyan()  { printf "\033[36m%s\033[0m\n" "$*"; }
green() { printf "\033[32m%s\033[0m\n" "$*"; }
red()   { printf "\033[31m%s\033[0m\n" "$*"; }

if [ ! -f "$SQL" ]; then
  red "No está $SQL"
  exit 1
fi

docker_env() {
  local container="$1" key="$2"
  docker inspect -f '{{range .Config.Env}}{{println .}}{{end}}' "$container" 2>/dev/null \
    | grep "^${key}=" | head -1 | cut -d= -f2- | tr -d '\r' || true
}

resolve_pg_container() {
  local name
  if [ -n "${INSFORGE_PG_CONTAINER:-}" ]; then
    echo "$INSFORGE_PG_CONTAINER"
    return 0
  fi
  # Excluir postgrest (contiene "postgres" en el nombre)
  while IFS= read -r name; do
    [ -z "$name" ] && continue
    echo "$name" | grep -qi 'postgrest' && continue
    echo "$name" | grep -qi 'postgres' || continue
    if docker exec "$name" sh -c 'command -v psql >/dev/null 2>&1' 2>/dev/null; then
      echo "$name"
      return 0
    fi
  done < <(docker ps --format '{{.Names}}' | grep -Ei 'insforge|postgres' || true)
  return 1
}

try_psql() {
  local container="$1" user="$2" db="$3"
  docker exec "$container" psql -U "$user" -d "$db" -c 'SELECT 1' >/dev/null 2>&1
}

discover_creds() {
  local container="$1"
  local user="${POSTGRES_USER:-}" db="${POSTGRES_DB:-}"

  [ -z "$user" ] && user="$(docker_env "$container" POSTGRES_USER)"
  [ -z "$user" ] && user="$(docker_env "$container" PGUSER)"
  [ -z "$db" ] && db="$(docker_env "$container" POSTGRES_DB)"
  [ -z "$db" ] && db="$(docker_env "$container" PGDATABASE)"

  if [ -z "$user" ]; then
    for candidate in postgres insforge supabase admin; do
      if try_psql "$container" "$candidate" postgres \
        || try_psql "$container" "$candidate" insforge \
        || try_psql "$container" "$candidate" "$candidate"; then
        user="$candidate"
        break
      fi
    done
  fi

  if [ -n "$user" ] && [ -z "$db" ]; then
    for candidate in insforge postgres "$user" supabase; do
      if try_psql "$container" "$user" "$candidate"; then
        db="$candidate"
        break
      fi
    done
  fi

  # Defaults Renace
  [ -z "$user" ] && user="postgres"
  [ -z "$db" ] && db="insforge"

  echo "${user}|${db}"
}

CONTAINER="$(resolve_pg_container || true)"
if [ -z "$CONTAINER" ]; then
  red "No se encontró contenedor Postgres con psql."
  echo "Aplica manualmente: psql \$DATABASE_URL -f $SQL"
  exit 1
fi

CREDS="$(discover_creds "$CONTAINER")"
PGUSER="${CREDS%%|*}"
PGDB="${CREDS#*|}"

cyan "── Aplicar tablas Cuanto ──"
echo "   Contenedor: $CONTAINER"
echo "   Usuario:    $PGUSER"
echo "   Base:       $PGDB"

if ! try_psql "$CONTAINER" "$PGUSER" "$PGDB"; then
  red "No conecta con $PGUSER@$PGDB"
  echo "Prueba: POSTGRES_USER=… POSTGRES_DB=… ./scripts/apply-cuanto-tables.sh"
  echo "Env del contenedor:"
  echo "  POSTGRES_USER=$(docker_env "$CONTAINER" POSTGRES_USER)"
  echo "  POSTGRES_DB=$(docker_env "$CONTAINER" POSTGRES_DB)"
  exit 1
fi

docker exec -i "$CONTAINER" psql -U "$PGUSER" -d "$PGDB" -v ON_ERROR_STOP=1 < "$SQL"
green "✅ Tablas cuanto_* aplicadas en $PGDB"
