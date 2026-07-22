#!/usr/bin/env bash
# Seed / bootstrap local — regenera .env Renace y deja listo el build.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

cp -f .env.example .env
echo "✅ .env listo con InsForge Renace"
echo "   URL: $(grep VITE_INSFORGE_URL .env)"
echo ""
echo "Dev:   npm run dev"
echo "Build: npm run build"
echo "VPS:   ./deploy.sh"
