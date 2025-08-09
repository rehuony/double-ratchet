/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_WS_URL: string;
  readonly VITE_BASE_URL: string;
  readonly USER_INFOR_STORAGE: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
