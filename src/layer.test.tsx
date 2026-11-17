import type { FeatureCollection } from "geojson";
import type { CustomLayerInterface, MapLayerMouseEvent } from "maplibre-gl";
import { createSignal, Show } from "solid-js";
import { afterEach, describe, expect, test, vi } from "vitest";
import { CustomLayer, Layer } from "./layer.js";
import { Source } from "./source.js";
import {
	captureDiagnostics,
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

const world: FeatureCollection = {
	type: "FeatureCollection",
	features: [
		{
			type: "Feature",
			properties: { name: "world" },
			geometry: {
				type: "Polygon",
				coordinates: [
					[
						[-170, -80],
						[170, -80],
						[170, 80],
						[-170, 80],
						[-170, -80],
					],
				],
			},
		},
	],
};

describe("Layer", () => {
	test("adds a layer for the enclosing source and removes it on unmount", async () => {
		const [shown, setShown] = createSignal(true);
		rendered = renderMap(() => (
			<Source id="world" type="geojson" data={world}>
				<Show when={shown()}>
					<Layer id="fill" type="fill" paint={{ "fill-color": "#f00" }} />
				</Show>
			</Source>
		));
		const { map } = rendered;
		await styleLoaded(map);
		expect(map.getLayer("fill")?.source).toBe("world");
		expect(map.getPaintProperty("fill", "fill-color")).toBe("#f00");
		setShown(false);
		await tick();
		expect(map.getLayer("fill")).toBeUndefined();
		expect(map.getSource("world")).toBeDefined();
	});

	test("adds a background layer, which has no source", async () => {
		rendered = renderMap(() => <Layer id="bg" type="background" />);
		await styleLoaded(rendered.map);
		expect(rendered.map.getLayer("bg")?.type).toBe("background");
	});

	test("waits for a source declared after it, or by id", async () => {
		rendered = renderMap(() => (
			<>
				<Layer id="fill" type="fill" source="world" />
				<Source id="world" type="geojson" data={world} />
			</>
		));
		const { map } = rendered;
		await styleLoaded(map);
		await vi.waitFor(() => expect(map.getLayer("fill")?.source).toBe("world"));
	});

	test("updates paint, layout, filter and zoom range in place", async () => {
		const [color, setColor] = createSignal<string | undefined>("#f00");
		const [visibility, setVisibility] = createSignal<"visible" | "none">(
			"visible",
		);
		const [filter, setFilter] = createSignal<
			["==", string, string] | undefined
		>(undefined);
		const [minzoom, setMinzoom] = createSignal(0);
		rendered = renderMap(() => (
			<Source id="world" type="geojson" data={world}>
				<Layer
					id="fill"
					type="fill"
					paint={{ "fill-color": color(), "fill-opacity": 0.5 }}
					layout={{ visibility: visibility() }}
					filter={filter()}
					minzoom={minzoom()}
				/>
			</Source>
		));
		const { map } = rendered;
		await styleLoaded(map);
		const layer = map.getLayer("fill");
		const addLayer = vi.spyOn(map, "addLayer");

		setColor("#00f");
		setVisibility("none");
		setFilter(["==", "name", "world"]);
		setMinzoom(3);
		await tick();
		expect(map.getLayer("fill")).toBe(layer);
		expect(map.getPaintProperty("fill", "fill-color")).toBe("#00f");
		expect(map.getPaintProperty("fill", "fill-opacity")).toBe(0.5);
		expect(map.getLayoutProperty("fill", "visibility")).toBe("none");
		expect(map.getFilter("fill")).toEqual(["==", "name", "world"]);
		expect(map.getLayer("fill")?.minzoom).toBe(3);

		// A removed property goes back to its default.
		setColor(undefined);
		await tick();
		expect(map.getPaintProperty("fill", "fill-color")).toBeUndefined();
		expect(addLayer).not.toHaveBeenCalled();
	});

	test("re-creates the layer when its type changes", async () => {
		const [type, setType] = createSignal<"fill" | "line">("fill");
		rendered = renderMap(() => (
			<Source id="world" type="geojson" data={world}>
				<Layer id="shape" type={type()} />
			</Source>
		));
		const { map } = rendered;
		await styleLoaded(map);
		setType("line");
		await tick();
		expect(map.getLayer("shape")?.type).toBe("line");
	});

	test("orders layers with beforeId, and moves them when it changes", async () => {
		const [before, setBefore] = createSignal<string | undefined>("a");
		rendered = renderMap(() => (
			<>
				<Layer id="a" type="background" />
				<Layer id="b" type="background" />
				<Layer id="c" type="background" beforeId={before()} />
			</>
		));
		const { map } = rendered;
		await styleLoaded(map);
		expect(map.getLayersOrder()).toEqual(["c", "a", "b"]);
		setBefore("b");
		await tick();
		expect(map.getLayersOrder()).toEqual(["a", "c", "b"]);
		setBefore(undefined);
		await tick();
		expect(map.getLayersOrder()).toEqual(["a", "b", "c"]);
	});

	test("moves into place once its beforeId layer appears", async () => {
		rendered = renderMap(() => (
			<>
				<Layer id="c" type="background" beforeId="label" />
				<Layer id="label" type="background" />
			</>
		));
		const { map } = rendered;
		await styleLoaded(map);
		await vi.waitFor(() =>
			expect(map.getLayersOrder()).toEqual(["c", "label"]),
		);
	});

	test("calls layer-scoped event props", async () => {
		// MapLibre deletes `features` once the listener returns.
		const clicked: unknown[] = [];
		const onClick = vi.fn((event: MapLayerMouseEvent) => {
			clicked.push(event.features?.[0]?.properties);
		});
		const onOtherClick = vi.fn();
		rendered = renderMap(() => (
			<Source id="world" type="geojson" data={world}>
				<Layer id="fill" type="fill" onClick={onClick} />
				<Layer
					id="other"
					type="fill"
					filter={["==", "name", "nothing"]}
					onClick={onOtherClick}
				/>
			</Source>
		));
		const { map } = rendered;
		await map.once("idle");
		const canvas = map.getCanvas();
		const box = canvas.getBoundingClientRect();
		const at = {
			clientX: box.left + box.width / 2,
			clientY: box.top + box.height / 2,
			bubbles: true,
		};
		canvas.dispatchEvent(new MouseEvent("mousedown", at));
		canvas.dispatchEvent(new MouseEvent("mouseup", at));
		canvas.dispatchEvent(new MouseEvent("click", at));
		expect(onClick).toHaveBeenCalledOnce();
		expect(clicked).toEqual([{ name: "world" }]);
		expect(onOtherClick).not.toHaveBeenCalled();
	});

	test("adds sources and layers without Solid reporting a relay tear", async () => {
		// A relay tear: a computation re-running because another component's
		// effect wrote a signal it had already read in the same flush.
		const diagnostics = captureDiagnostics();
		rendered = renderMap(() => (
			<>
				<Source id="a" type="geojson" data={world}>
					<Layer type="circle" filter={["has", "x"]} />
					<Layer type="circle" filter={["!", ["has", "x"]]} />
				</Source>
				<Source id="b" type="geojson" data={world}>
					<Layer type="fill" />
					<Layer type="line" beforeId="later" />
				</Source>
			</>
		));
		await styleLoaded(rendered.map);
		await tick(50);
		expect(rendered.map.getLayersOrder()).toHaveLength(4);
		expect(
			diagnostics.stop().filter((d) => d.startsWith("EFFECT_RELAY_TEAR")),
		).toEqual([]);
	});

	test("hands the style layer to ref", async () => {
		const ref = vi.fn();
		rendered = renderMap(() => <Layer id="bg" type="background" ref={ref} />);
		await styleLoaded(rendered.map);
		expect(ref).toHaveBeenCalledWith(rendered.map.getLayer("bg"));
	});

	test("keeps its place across a style change", async () => {
		const [style, setStyle] = createSignal({
			...EMPTY_STYLE,
			layers: [
				{ id: "base", type: "background" as const },
				{ id: "labels", type: "background" as const },
			],
		});
		rendered = renderMap(
			() => <Layer id="mine" type="background" beforeId="labels" />,
			{
				get style() {
					return style();
				},
			},
		);
		const { map } = rendered;
		await styleLoaded(map);
		await vi.waitFor(() =>
			expect(map.getLayersOrder()).toEqual(["base", "mine", "labels"]),
		);
		setStyle({
			...EMPTY_STYLE,
			layers: [
				{ id: "base2", type: "background" },
				{ id: "labels", type: "background" },
			],
		});
		await vi.waitFor(() =>
			expect(map.getLayersOrder()).toEqual(["base2", "mine", "labels"]),
		);
	});

	test("comes back after a full style reload", async () => {
		rendered = renderMap(() => <Layer id="bg" type="background" />);
		const { map } = rendered;
		await styleLoaded(map);
		map.setStyle(EMPTY_STYLE, { diff: false });
		await map.once("style.load");
		await vi.waitFor(() => expect(map.getLayer("bg")).toBeDefined());
	});
});

test("types props by layer type", () => {
	// Compiled, never rendered: each marked line must fail type checking.
	const typed = () => (
		<>
			<Layer
				type="line"
				paint={{ "line-width": 2 }}
				layout={{ "line-cap": "round" }}
			/>
			{/* @ts-expect-error: line paint on a fill layer */}
			<Layer type="fill" paint={{ "line-width": 2 }} />
			{/* @ts-expect-error: background layers have no source */}
			<Layer type="background" source="world" />
			{/* @ts-expect-error: not a layer type */}
			<Layer type="polygon" />
		</>
	);
	expect(typed).toBeTypeOf("function");
});

describe("CustomLayer", () => {
	test("adds the custom layer and removes it on unmount", async () => {
		const onAdd = vi.fn();
		const onRemove = vi.fn();
		const layer: CustomLayerInterface = {
			id: "custom",
			type: "custom",
			onAdd,
			onRemove,
			render() {},
		};
		const [shown, setShown] = createSignal(true);
		rendered = renderMap(() => (
			<Show when={shown()}>
				<CustomLayer layer={layer} />
			</Show>
		));
		const { map } = rendered;
		await styleLoaded(map);
		expect(map.getLayer("custom")).toBeDefined();
		expect(onAdd).toHaveBeenCalledOnce();
		setShown(false);
		await tick();
		expect(map.getLayer("custom")).toBeUndefined();
		expect(onRemove).toHaveBeenCalledOnce();
	});
});
