import { Loading } from "@solidjs/web";
import type { MapLayerMouseEvent } from "maplibre-gl";
import { createSignal, Show } from "solid-js";
import { afterEach, describe, expect, test, vi } from "vitest";
import { useMap } from "./context.js";
import { Layer } from "./layer.js";
import { createMapEvent, createMapState } from "./primitives.js";
import { Source } from "./source.js";
import { type Rendered, renderMap, styleLoaded, tick } from "./test/render.js";

let rendered: Rendered | undefined;
afterEach(() => {
	rendered?.dispose();
	rendered = undefined;
});

describe("createMapEvent", () => {
	test("listens while the component lives", async () => {
		const listener = vi.fn();
		const [shown, setShown] = createSignal(true);
		function Listen() {
			createMapEvent("moveend", listener);
			return null;
		}
		rendered = renderMap(() => (
			<Show when={shown()}>
				<Listen />
			</Show>
		));
		const { map } = rendered;
		await styleLoaded(map);
		listener.mockClear();
		map.jumpTo({ zoom: 2 });
		expect(listener).toHaveBeenCalledTimes(1);
		setShown(false);
		await tick();
		map.jumpTo({ zoom: 3 });
		expect(listener).toHaveBeenCalledTimes(1);
	});

	test("scopes to a layer, following an accessor", async () => {
		const [layer, setLayer] = createSignal<string | undefined>("a");
		const ids: string[] = [];
		function Listen() {
			createMapEvent("click", layer, (event: MapLayerMouseEvent) => {
				ids.push(String(event.features?.[0]?.layer.id));
			});
			return null;
		}
		const point: GeoJSON.Feature = {
			type: "Feature",
			properties: {},
			geometry: { type: "Point", coordinates: [0, 0] },
		};
		rendered = renderMap(() => (
			<Source id="s" type="geojson" data={point}>
				<Layer id="a" type="circle" paint={{ "circle-radius": 20 }} />
				<Layer id="b" type="circle" paint={{ "circle-radius": 20 }} />
				<Listen />
			</Source>
		));
		const { map } = rendered;
		await styleLoaded(map);
		await map.once("idle");
		const click = () => {
			const { x, y } = map.project([0, 0]);
			const rect = map.getCanvas().getBoundingClientRect();
			for (const type of ["mousedown", "mouseup", "click"]) {
				map.getCanvas().dispatchEvent(
					new MouseEvent(type, {
						bubbles: true,
						clientX: rect.left + x,
						clientY: rect.top + y,
					}),
				);
			}
		};
		click();
		setLayer("b");
		await tick();
		click();
		setLayer(undefined);
		await tick();
		click();
		expect(ids).toEqual(["a", "b"]);
	});
});

describe("createMapState", () => {
	test("is pending until the map is ready, then follows its events", async () => {
		let zoom: (() => number) | undefined;
		function Zoom() {
			const map = useMap();
			zoom = createMapState(() => map().getZoom(), ["zoom"]);
			return <output>{zoom()}</output>;
		}
		rendered = renderMap(
			() => (
				<Loading fallback={<p>loading</p>}>
					<Zoom />
				</Loading>
			),
			{ zoom: 1 },
		);
		const { map, host } = rendered;
		expect(host.querySelector("p")).not.toBeNull();
		await styleLoaded(map);
		await vi.waitFor(() =>
			expect(host.querySelector("output")?.textContent).toBe("1"),
		);
		map.zoomTo(4, { duration: 0 });
		await tick();
		expect(host.querySelector("output")?.textContent).toBe("4");
	});
});
