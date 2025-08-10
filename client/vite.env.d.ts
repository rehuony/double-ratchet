/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_HOST: string;
  readonly VITE_ROOT_PATH: string;
  readonly VITE_ENCRYPTED: "true" | "false";
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
