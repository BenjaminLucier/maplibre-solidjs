import { Loading, render } from "@solidjs/web";
import { Map as MapLibreMap } from "maplibre-gl";
import { createEffect, createSignal } from "solid-js";
import { afterEach, describe, expect, test, vi } from "vitest";
import { useMap } from "./context.js";
import { Map } from "./map.js";
import {
	EMPTY_STYLE,
	type Rendered,
	renderMap,
	styleLoaded,
	tick,
} from "./test/render.js";

let rendered: Rendered | undefined;
afterEach(() => {
	rendered?.dispose();
	rendered = undefined;
});

describe("Map", () => {
	test("constructs a map in its own container and hands it to ref", async () => {
		rendered = renderMap(undefined, { class: "the-map", id: "map-id" });
		const { map, host } = rendered;
		expect(map).toBeInstanceOf(MapLibreMap);
		const container = host.querySelector("#map-id");
		expect(container?.classList.contains("the-map")).toBe(true);
		expect(map.getContainer()).toBe(container);
		await styleLoaded(map);
		expect(map.getCanvas().width).toBeGreaterThan(0);
	});

	test("keeps MapLibre's own elements beside its children", async () => {
		// Components that render nothing (sources, layers, controls) resolve to
		// an array of nulls, which must not clear the container.
		const Nothing = () => null;
		rendered = renderMap(() => (
			<>
				<Nothing />
				<Nothing />
			</>
		));
		const { map } = rendered;
		await styleLoaded(map);
		const container = map.getContainer();
		expect(container.querySelector(".maplibregl-canvas")).not.toBeNull();
		expect(container.querySelector(".maplibregl-ctrl-top-left")).not.toBeNull();
	});

	test("renders into an existing container", async () => {
		const element = document.createElement("div");
		element.style.cssText = "width: 200px; height: 100px";
		document.body.append(element);
		let map: MapLibreMap | undefined;
		const dispose = render(
			() => (
				<Map container={element} style={EMPTY_STYLE} ref={(m) => (map = m)} />
			),
			document.body,
		);
		expect(map?.getContainer()).toBe(element);
		dispose();
		element.remove();
	});

	test("passes construction options to MapLibre", () => {
		rendered = renderMap(undefined, {
			zoom: 3,
			center: [10, 20],
			maxZoom: 12,
			scrollZoom: false,
		});
		const { map } = rendered;
		expect(map.getZoom()).toBe(3);
		expect(map.getCenter().toArray()).toEqual([10, 20]);
		expect(map.getMaxZoom()).toBe(12);
		expect(map.scrollZoom.isEnabled()).toBe(false);
	});

	test("applies changed setter options", async () => {
		const [maxZoom, setMaxZoom] = createSignal<number | undefined>(12);
		const [renderWorldCopies, setRenderWorldCopies] = createSignal(true);
		rendered = renderMap(undefined, {
			get maxZoom() {
				return maxZoom();
			},
			get renderWorldCopies() {
				return renderWorldCopies();
			},
		});
		const { map } = rendered;
		setMaxZoom(8);
		setRenderWorldCopies(false);
		await tick();
		expect(map.getMaxZoom()).toBe(8);
		expect(map.getRenderWorldCopies()).toBe(false);
		setMaxZoom(undefined);
		await tick();
		expect(map.getMaxZoom()).toBe(22);
	});

	test("enables and disables interaction handlers", async () => {
		const [dragPan, setDragPan] = createSignal<boolean | undefined>(true);
		const [cooperativeGestures, setCooperativeGestures] = createSignal(false);
		rendered = renderMap(undefined, {
			get dragPan() {
				return dragPan();
			},
			get cooperativeGestures() {
				return cooperativeGestures();
			},
		});
		const { map } = rendered;
		setDragPan(false);
		setCooperativeGestures(true);
		await tick();
		expect(map.dragPan.isEnabled()).toBe(false);
		expect(map.cooperativeGestures.isEnabled()).toBe(true);
		setDragPan(undefined);
		await tick();
		expect(map.dragPan.isEnabled()).toBe(true);
	});

	test("moves the camera for changed camera props only", async () => {
		const [zoom, setZoom] = createSignal(2);
		const [center, setCenter] = createSignal<[number, number]>([0, 0]);
		rendered = renderMap(undefined, {
			get zoom() {
				return zoom();
			},
			get center() {
				return center();
			},
		});
		const { map } = rendered;
		setZoom(5);
		await tick();
		expect(map.getZoom()).toBe(5);

		// The user zooms; then only the center prop changes. The zoom prop
		// didn't change, so the user's zoom stays.
		map.setZoom(7);
		setCenter([30, 10]);
		await tick();
		expect(map.getCenter().toArray()).toEqual([30, 10]);
		expect(map.getZoom()).toBe(7);
	});

	test("doesn't move a map that is already where a prop says", async () => {
		const [zoom, setZoom] = createSignal(2);
		rendered = renderMap(undefined, {
			get zoom() {
				return zoom();
			},
			onZoomEnd: (event) => setZoom(event.target.getZoom()),
		});
		const { map } = rendered;
		const jumpTo = vi.spyOn(map, "jumpTo");
		map.zoomTo(4, { animate: false });
		await tick();
		expect(zoom()).toBe(4);
		expect(jumpTo).not.toHaveBeenCalled();
	});

	test("fits changed bounds", async () => {
		const [bounds, setBounds] = createSignal<[number, number, number, number]>([
			0, 0, 10, 10,
		]);
		rendered = renderMap(undefined, {
			get bounds() {
				return bounds();
			},
		});
		const { map } = rendered;
		const fitBounds = vi.spyOn(map, "fitBounds");
		setBounds([20, 20, 30, 30]);
		await tick();
		expect(fitBounds).toHaveBeenCalledWith([20, 20, 30, 30], undefined);
	});

	test("sets changed global state properties", async () => {
		const [state, setState] = createSignal<Record<string, unknown>>({
			a: 1,
			b: 2,
		});
		rendered = renderMap(undefined, {
			get globalState() {
				return state();
			},
		});
		const { map } = rendered;
		await styleLoaded(map);
		const set = vi.spyOn(map, "setGlobalStateProperty");
		setState({ a: 1, c: 3 });
		await tick();
		expect(set.mock.calls).toEqual(
			expect.arrayContaining([
				["b", null],
				["c", 3],
			]),
		);
		expect(set).toHaveBeenCalledTimes(2);
	});

	test("calls event props, including events fired during load", async () => {
		const onLoad = vi.fn();
		const onStyleLoad = vi.fn();
		rendered = renderMap(undefined, { onLoad, onStyleLoad });
		await rendered.map.once("load");
		expect(onStyleLoad).toHaveBeenCalledOnce();
		expect(onLoad).toHaveBeenCalledOnce();
	});

	test("swaps, adds and removes event handlers", async () => {
		const first = vi.fn();
		const second = vi.fn();
		const [handler, setHandler] = createSignal<
			((e: unknown) => void) | undefined
		>(() => first);
		rendered = renderMap(undefined, {
			get onResize() {
				return handler();
			},
		});
		const { map } = rendered;
		map.fire("resize");
		setHandler(() => second);
		await tick();
		map.fire("resize");
		setHandler(undefined);
		await tick();
		map.fire("resize");
		expect(first).toHaveBeenCalledOnce();
		expect(second).toHaveBeenCalledOnce();
	});

	test("removes the map on unmount", async () => {
		const onRemove = vi.fn();
		rendered = renderMap(undefined, { onRemove });
		await styleLoaded(rendered.map);
		rendered.dispose();
		rendered = undefined;
		expect(onRemove).toHaveBeenCalledOnce();
	});

	test("switches styles", async () => {
		const [style, setStyle] = createSignal(EMPTY_STYLE);
		rendered = renderMap(undefined, {
			get style() {
				return style();
			},
		});
		const { map } = rendered;
		await styleLoaded(map);
		setStyle({
			version: 8,
			sources: {},
			layers: [{ id: "background", type: "background" }],
		});
		await vi.waitFor(() => expect(map.getLayer("background")).toBeDefined());
	});
});

describe("useMap", () => {
	test("is pending until the style loads", async () => {
		const seen: MapLibreMap[] = [];
		function Child() {
			const map = useMap();
			createEffect(
				() => map(),
				(map) => {
					seen.push(map);
				},
			);
			return null;
		}
		rendered = renderMap(() => <Child />);
		expect(seen).toEqual([]);
		await styleLoaded(rendered.map);
		expect(seen).toEqual([rendered.map]);
	});

	test("applies map properties outside MapOptions, and resets removed ones", async () => {
		const [debug, setDebug] = createSignal<boolean | undefined>(true);
		const [fov, setFov] = createSignal<number | undefined>(20);
		const [padding, setPadding] = createSignal<
			{ top: number; bottom: number; left: number; right: number } | undefined
		>({ top: 10, bottom: 0, left: 30, right: 0 });
		rendered = renderMap(undefined, {
			get showTileBoundaries() {
				return debug();
			},
			get verticalFieldOfView() {
				return fov();
			},
			get padding() {
				return padding();
			},
		});
		const { map } = rendered;
		await styleLoaded(map);
		expect(map.showTileBoundaries).toBe(true);
		expect(map.getVerticalFieldOfView()).toBeCloseTo(20);
		expect(map.getPadding()).toMatchObject({ top: 10, left: 30 });
		const defaultFov = new MapLibreMap({
			container: document.createElement("div"),
			style: EMPTY_STYLE,
		});
		const expectedFov = defaultFov.getVerticalFieldOfView();
		defaultFov.remove();
		setDebug(undefined);
		setFov(undefined);
		setPadding(undefined);
		await tick();
		expect(map.showTileBoundaries).toBe(false);
		expect(map.getVerticalFieldOfView()).toBeCloseTo(expectedFov);
		expect(map.getPadding()).toMatchObject({ top: 0, left: 0 });
	});

	test("suspends a <Loading> boundary until the map is ready", async () => {
		function Zoom() {
			const map = useMap();
			return <output>{map().getZoom()}</output>;
		}
		rendered = renderMap(
			() => (
				<Loading fallback={<p>loading</p>}>
					<Zoom />
				</Loading>
			),
			{ zoom: 3 },
		);
		const { host, map } = rendered;
		expect(host.querySelector("p")?.textContent).toBe("loading");
		await styleLoaded(map);
		await vi.waitFor(() =>
			expect(host.querySelector("output")?.textContent).toBe("3"),
		);
	});

	test("throws outside a <Map>", () => {
		function Child() {
			useMap();
			return null;
		}
		expect(() =>
			render(() => <Child />, document.createElement("div")),
		).toThrow();
	});
});
