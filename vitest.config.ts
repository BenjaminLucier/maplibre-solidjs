import solid from "@solidjs/vite-plugin";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

const SERVER_TESTS = "src/**/*.server.test.{ts,tsx}";

export default defineConfig({
	test: {
		projects: [
			{
				// Tests run in real Chromium: MapLibre needs WebGL and real layout,
				// and a fake map would only test our idea of MapLibre.
				plugins: [solid()],
				test: {
					name: "browser",
					include: ["src/**/*.test.{ts,tsx}"],
					exclude: [SERVER_TESTS],
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
				// MapLibre loads its worker from a URL relative to its own module,
				// which Vite's dependency pre-bundling would move.
				optimizeDeps: { exclude: ["maplibre-gl"] },
			},
			{
				// Server rendering, in Node with Solid's server build, where
				// `isServer` is true. The browser build can't reach that branch.
				plugins: [solid({ ssr: true })],
				test: {
					name: "server",
					include: [SERVER_TESTS],
					environment: "node",
				},
			},
		],
	},
});
