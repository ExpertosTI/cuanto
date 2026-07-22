# Cuanto

App de gastos e ingresos en español, con detección automática de país/moneda, categorías renombrables, invitaciones por WhatsApp/QR y esquema SaaS en **InsForge**.

## Arranque

```bash
npm install
cp .env.example .env
npm run dev
```

Abre `http://localhost:5173`.

## InsForge (base de datos SaaS)

1. Crea un proyecto en [insforge.dev](https://insforge.dev)
2. Completa `.env` con `VITE_INSFORGE_URL`, `VITE_INSFORGE_ANON_KEY` y `VITE_WHATSAPP_BUSINESS`
3. Vincula y aplica migraciones:

```bash
npx @insforge/cli login
npx @insforge/cli link
npx @insforge/cli db migrations up --all
```

La migración `migrations/20260722000001_saas_schema.sql` crea:

- `organizations`, `profiles`, `memberships`
- `plans`, `subscriptions` (SaaS)
- `categories`, `transactions`
- `invites`, `member_codes`, `scan_events` (WhatsApp/QR)
- RLS por organización (admin/member)

Sin InsForge configurado, la app corre en **modo local** (`localStorage`).

## Flujos clave

- **País**: se detecta por zona horaria (`America/Santo_Domingo` → DOP)
- **Categorías**: renombra Salario, Remesas, etc. a tus datos
- **WhatsApp/QR**: pestaña Equipo → genera QR de cliente/admin → compartir por WhatsApp
- **Admin scan**: botón Escanear para leer QR de miembros o invitaciones
- **Registro**: ruta `/unirse/:token`

## Stack

- React + Vite + TypeScript
- Framer Motion (transiciones)
- Lucide (íconos)
- InsForge SDK + Postgres

## Despliegue (Renace Protocol)

Repo: https://github.com/ExpertosTI/cuanto  
Dominio: https://cuanto.renace.tech

En el VPS:

```bash
git clone https://github.com/ExpertosTI/cuanto.git /opt/cuanto
cd /opt/cuanto
cp .env.example .env
chmod +x deploy.sh
./deploy.sh
```

Stack Swarm: `cuanto` · servicio: `cuanto_web` · red: `RenaceNet` · TLS: Let's Encrypt.
