import solid from "@solidjs/vite-plugin";
import { defineConfig } from "vite";

// Library build: ESM only, every bare import external (solid-js,
// @solidjs/web and maplibre-gl are peers). Types come from
// `tsc -p tsconfig.build.json`.
export default defineConfig({
	plugins: [solid()],
	build: {
		lib: {
			entry: { index: "src/index.ts" },
			formats: ["es"],
		},
		rollupOptions: {
			external: (id) => !id.startsWith(".") && !id.startsWith("/"),
		},
	},
});
