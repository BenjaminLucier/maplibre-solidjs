import { copyFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import solid from "@solidjs/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, type Plugin } from "vite";

/**
 * GitHub Pages serves 404.html for unknown paths. Making it a copy of
 * index.html lets the router handle deep links like /examples/markers.
 */
function spaFallback(): Plugin {
	return {
		name: "spa-fallback",
		apply: "build",
		async writeBundle(options) {
			const dir = options.dir ?? "dist";
			await copyFile(join(dir, "index.html"), join(dir, "404.html"));
		},
	};
}

export default defineConfig({
	// Served from https://benjaminlucier.github.io/maplibre-solidjs/.
	base: "/maplibre-solidjs/",
	plugins: [solid(), tailwindcss(), spaFallback()],
	resolve: {
		// The site always shows the library as it is in this checkout.
		alias: {
			"maplibre-solidjs": fileURLToPath(
				new URL("../src/index.ts", import.meta.url),
			),
		},
	},
	// MapLibre itself is about 1.1 MB minified, in its own chunk.
	build: { chunkSizeWarningLimit: 1200 },
	// MapLibre's worker is an ES module.
	worker: { format: "es" },
});
