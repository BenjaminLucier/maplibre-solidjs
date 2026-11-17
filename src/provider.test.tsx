import { Loading, render } from "@solidjs/web";
import type { Map as MapLibreMap } from "maplibre-gl";
import { createSignal, Show } from "solid-js";
import { describe, expect, test, vi } from "vitest";
import { Map } from "./map.js";
import { MapProvider, useMapById } from "./provider.js";
import { EMPTY_STYLE, styleLoaded, tick } from "./test/render.js";

describe("MapProvider", () => {
	test("hands a map to components outside it, pending until it is ready", async () => {
		const host = document.createElement("div");
		document.body.append(host);
		let map: MapLibreMap | undefined;
		const [shown, setShown] = createSignal(false);
		function Toolbar() {
			const main = useMapById("main");
			return <output>{main().getZoom()}</output>;
		}
		const dispose = render(
			() => (
				<MapProvider>
					<Loading fallback={<p>waiting</p>}>
						<Toolbar />
					</Loading>
					<Show when={shown()}>
						<Map
							id="main"
							style={EMPTY_STYLE}
							zoom={5}
							containerStyle={{ width: "200px", height: "200px" }}
							ref={(m) => (map = m)}
						/>
					</Show>
				</MapProvider>
			),
			host,
		);
		try {
			await tick();
			expect(host.querySelector("p")?.textContent).toBe("waiting");
			setShown(true);
			await tick();
			if (!map) throw new Error("no map");
			await styleLoaded(map);
			await vi.waitFor(() =>
				expect(host.querySelector("output")?.textContent).toBe("5"),
			);
		} finally {
			dispose();
			host.remove();
		}
	});

	test("useMapById throws outside a provider", () => {
		function Child() {
			useMapById("x");
			return null;
		}
		expect(() =>
			render(() => <Child />, document.createElement("div")),
		).toThrow();
	});
});
