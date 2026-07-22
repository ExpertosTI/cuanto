#!/usr/bin/env bash
# Aplica tablas Cuanto en Postgres del stack Renace (si hay acceso local).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SQL="$ROOT/migrations/20260722000002_cuanto_renace_tables.sql"

if [ ! -f "$SQL" ]; then
  echo "No está $SQL"
  exit 1
fi

# Intenta contenedor postgres común del stack Renace
CONTAINER="${INSFORGE_PG_CONTAINER:-}"
if [ -z "$CONTAINER" ]; then
  CONTAINER="$(docker ps --format '{{.Names}}' | grep -E 'postgres|insforge.*db|postgrest' | head -1 || true)"
fi

if [ -z "$CONTAINER" ]; then
  echo "No se encontró contenedor Postgres. Aplica manualmente:"
  echo "  psql \$DATABASE_URL -f $SQL"
  exit 0
fi

echo "Aplicando migración en $CONTAINER…"
docker exec -i "$CONTAINER" psql -U postgres -d postgres < "$SQL" \
  || docker exec -i "$CONTAINER" psql -U postgres < "$SQL" \
  || echo "No se pudo aplicar vía docker exec; usa psql con DATABASE_URL."
echo "Listo."
