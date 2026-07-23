/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_INSFORGE_URL?: string
  readonly VITE_INSFORGE_ANON_KEY?: string
  readonly VITE_WHATSAPP_BUSINESS?: string
  readonly VITE_PRO_CODE?: string
  readonly VITE_MASTER_EMAIL?: string
  readonly VITE_AUTH_URL?: string
  /** URL del agente en Netlify, ej. https://cuanto.netlify.app/.netlify/functions/agent */
  readonly VITE_AGENT_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
