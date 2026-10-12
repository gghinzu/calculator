/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the calculator API. Leave unset to use the same origin. */
  readonly VITE_API_BASE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
