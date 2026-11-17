import solid from "@solidjs/vite-plugin";
import { defineConfig } from "vitest/config";

export default defineConfig({
	plugins: [solid()],
	test: {
		environment: "happy-dom",
		// Solid ships separate server and browser builds, picked by export
		// condition. Tests must run the browser build, so Vite processes Solid
		// itself instead of leaving it to Node's resolver.
		server: { deps: { inline: [/solid-js/, /@solidjs\//] } },
		include: ["src/**/*.test.{ts,tsx}"],
	},
	resolve: {
		conditions: ["browser", "development"],
	},
});
