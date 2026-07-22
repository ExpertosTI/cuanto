/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_INSFORGE_URL?: string
  readonly VITE_INSFORGE_ANON_KEY?: string
  readonly VITE_WHATSAPP_BUSINESS?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
