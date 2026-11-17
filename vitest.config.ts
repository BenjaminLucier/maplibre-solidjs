import solid from "@solidjs/vite-plugin";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

// Tests run in real Chromium: MapLibre needs WebGL and real layout, and a fake
// map would only test our idea of MapLibre.
export default defineConfig({
	plugins: [solid()],
	test: {
		include: ["src/**/*.test.{ts,tsx}"],
		browser: {
			enabled: true,
			headless: true,
			provider: playwright(),
			instances: [{ browser: "chromium" }],
			screenshotFailures: false,
		},
	},
	resolve: {
		conditions: ["browser", "development"],
	},
	// MapLibre loads its worker from a URL relative to its own module, which
	// Vite's dependency pre-bundling would move.
	optimizeDeps: { exclude: ["maplibre-gl"] },
});
