import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
	build: {
		outDir: "build",
	},
	server: {
		port: 8000,
		host: "127.0.0.1",
	},
	plugins: [react(), tailwindcss()],
});
