# ── cuanto — Renace Protocol ────────────────────────────────
#  Multi-stage: build con Vite, sirve estáticos con nginx:alpine.

# ---- Build ----
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Vars públicas de Vite (pueden sobreescribirse en build)
ARG VITE_INSFORGE_URL=
ARG VITE_INSFORGE_ANON_KEY=
ARG VITE_WHATSAPP_BUSINESS=
ENV VITE_INSFORGE_URL=$VITE_INSFORGE_URL \
    VITE_INSFORGE_ANON_KEY=$VITE_INSFORGE_ANON_KEY \
    VITE_WHATSAPP_BUSINESS=$VITE_WHATSAPP_BUSINESS

RUN npm run build

# ---- Runtime ----
FROM nginx:1.27-alpine

LABEL org.opencontainers.image.title="cuanto" \
      org.opencontainers.image.description="Control de gastos e ingresos - Renace.tech" \
      org.opencontainers.image.url="https://cuanto.renace.tech" \
      org.opencontainers.image.vendor="renace.tech"

RUN rm -rf /etc/nginx/conf.d/default.conf /usr/share/nginx/html/*

COPY nginx.conf /etc/nginx/conf.d/cuanto.conf
COPY --from=build /app/dist /usr/share/nginx/html

RUN printf 'ok\n' > /usr/share/nginx/html/healthz

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1/healthz || exit 1
