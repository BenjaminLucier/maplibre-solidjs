import { render } from "@solidjs/web";
import type { Map as MapLibreMap } from "maplibre-gl";
import { expect, test } from "vitest";
import { MapContext, useMap } from "./index.js";

test("useMap returns the map from the nearest provider", () => {
	const map = {} as MapLibreMap;
	let seen: MapLibreMap | undefined;
	function Child() {
		seen = useMap();
		return null;
	}
	const dispose = render(
		() => (
			<MapContext value={map}>
				<Child />
			</MapContext>
		),
		document.body,
	);
	expect(seen).toBe(map);
	dispose();
});

test("useMap throws outside a map", () => {
	function Child() {
		useMap();
		return null;
	}
	expect(() => render(() => <Child />, document.body)).toThrow();
});
