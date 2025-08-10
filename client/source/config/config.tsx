const host = import.meta.env.VITE_HOST.replace(/\/$/, "");
const rootPath = import.meta.env.VITE_ROOT_PATH.replace(/\/$/, "");
const encrypted = import.meta.env.VITE_ENCRYPTED === "true";

export const CONFIG_WS_URL = `${encrypted ? "wss" : "ws"}://${host}${rootPath}`;
export const CONFIG_BASE_URL = `${encrypted ? "https" : "http"}://${host}${rootPath}`;
export const CONFIG_ROOT_PATH = rootPath;
export const CONFIG_USER_ITEM = "userinfor";
