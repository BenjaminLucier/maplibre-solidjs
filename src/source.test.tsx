import type { FeatureCollection } from "geojson";
import {
	type GeoJSONSource,
	Map as MapLibreMap,
	type VectorTileSource,
} from "maplibre-gl";
import { createMemo, createSignal, Show } from "solid-js";
import { afterEach, describe, expect, test, vi } from "vitest";
import { Source, useSourceId } from "./source.js";
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

const point = (lng: number, lat: number): FeatureCollection => ({
	type: "FeatureCollection",
	features: [
		{
			type: "Feature",
			properties: {},
			geometry: { type: "Point", coordinates: [lng, lat] },
		},
	],
});

describe("Source", () => {
	test("adds the source once the style loads and removes it on unmount", async () => {
		const [shown, setShown] = createSignal(true);
		rendered = renderMap(() => (
			<Show when={shown()}>
				<Source id="points" type="geojson" data={point(0, 0)} />
			</Show>
		));
		const { map } = rendered;
		expect(map.getSource("points")).toBeUndefined();
		await styleLoaded(map);
		expect(map.getSource("points")?.type).toBe("geojson");
		setShown(false);
		await tick();
		expect(map.getSource("points")).toBeUndefined();
	});

	test("generates an id and shares it with children", async () => {
		let id: string | undefined;
		function Child() {
			id = useSourceId()?.();
			return null;
		}
		rendered = renderMap(() => (
			<Source type="geojson" data={point(0, 0)}>
				<Child />
			</Source>
		));
		await styleLoaded(rendered.map);
		expect(id).toMatch(/^maplibre-solidjs-source-\d+$/);
		expect(rendered.map.getSource(id as string)).toBeDefined();
	});

	test("updates GeoJSON data in place", async () => {
		const [data, setData] = createSignal(point(0, 0));
		rendered = renderMap(() => (
			<Source id="points" type="geojson" data={data()} />
		));
		const { map } = rendered;
		await styleLoaded(map);
		const source = map.getSource<GeoJSONSource>("points");
		const setDataSpy = vi.spyOn(source as GeoJSONSource, "setData");
		setData(point(5, 5));
		await tick();
		expect(map.getSource("points")).toBe(source);
		expect(setDataSpy).toHaveBeenCalledWith(point(5, 5));
		expect(await source?.getData()).toEqual(point(5, 5));
	});

	test("updates clustering in place", async () => {
		const [radius, setRadius] = createSignal(50);
		rendered = renderMap(() => (
			<Source
				id="points"
				type="geojson"
				data={point(0, 0)}
				cluster
				clusterRadius={radius()}
			/>
		));
		const { map } = rendered;
		await styleLoaded(map);
		const source = map.getSource<GeoJSONSource>("points") as GeoJSONSource;
		const spy = vi.spyOn(source, "setClusterOptions");
		setRadius(80);
		await tick();
		expect(map.getSource("points")).toBe(source);
		expect(spy).toHaveBeenCalledWith({ cluster: true, clusterRadius: 80 });
	});

	test("updates tiles in place", async () => {
		const [tiles, setTiles] = createSignal([
			"https://example.invalid/a/{z}/{x}/{y}.pbf",
		]);
		rendered = renderMap(() => (
			<Source id="tiles" type="vector" tiles={tiles()} />
		));
		const { map } = rendered;
		await styleLoaded(map);
		const source = map.getSource<VectorTileSource>("tiles") as VectorTileSource;
		const spy = vi.spyOn(source, "setTiles");
		setTiles(["https://example.invalid/b/{z}/{x}/{y}.pbf"]);
		await tick();
		expect(map.getSource("tiles")).toBe(source);
		expect(spy).toHaveBeenCalledWith([
			"https://example.invalid/b/{z}/{x}/{y}.pbf",
		]);
	});

	test("re-creates the source when a property without a setter changes", async () => {
		const [buffer, setBuffer] = createSignal(64);
		rendered = renderMap(() => (
			<Source id="points" type="geojson" data={point(0, 0)} buffer={buffer()} />
		));
		const { map } = rendered;
		await styleLoaded(map);
		const before = map.getSource("points");
		setBuffer(128);
		await tick();
		const after = map.getSource("points");
		expect(after).toBeDefined();
		expect(after).not.toBe(before);
		expect((after as GeoJSONSource).serialize()).toMatchObject({ buffer: 128 });
	});

	test("re-creates the source when its id changes", async () => {
		const [id, setId] = createSignal("a");
		rendered = renderMap(() => (
			<Source id={id()} type="geojson" data={point(0, 0)} />
		));
		const { map } = rendered;
		await styleLoaded(map);
		setId("b");
		await tick();
		expect(map.getSource("a")).toBeUndefined();
		expect(map.getSource("b")).toBeDefined();
	});

	test("applies tileLodParams, and MapLibre's default once removed", async () => {
		const spy = vi.spyOn(MapLibreMap.prototype, "setSourceTileLodParams");
		const [lod, setLod] = createSignal<
			| { maxZoomLevelsOnScreen: number; tileCountMaxMinRatio: number }
			| undefined
		>({ maxZoomLevelsOnScreen: 4, tileCountMaxMinRatio: 2 });
		try {
			rendered = renderMap(() => (
				<Source
					id="tiles"
					type="vector"
					tiles={["https://example.invalid/{z}/{x}/{y}.pbf"]}
					tileLodParams={lod()}
				/>
			));
			await styleLoaded(rendered.map);
			expect(spy).toHaveBeenLastCalledWith(4, 2, "tiles");
			setLod(undefined);
			await tick();
			expect(spy).toHaveBeenLastCalledWith(9.314, 3, "tiles");
			expect(spy).toHaveBeenCalledTimes(2);
		} finally {
			spy.mockRestore();
		}
	});

	test("waits for async data", async () => {
		let resolve!: (data: FeatureCollection) => void;
		rendered = renderMap(() => {
			const data = createMemo(
				() => new Promise<FeatureCollection>((r) => (resolve = r)),
			);
			return <Source id="points" type="geojson" data={data()} />;
		});
		const { map } = rendered;
		await styleLoaded(map);
		expect(map.getSource("points")).toBeUndefined();
		resolve(point(1, 1));
		await vi.waitFor(() => expect(map.getSource("points")).toBeDefined());
	});

	test("hands the instance to ref and calls event props", async () => {
		const ref = vi.fn();
		const onData = vi.fn();
		rendered = renderMap(() => (
			<Source
				id="points"
				type="geojson"
				data={point(0, 0)}
				ref={ref}
				onData={onData}
			/>
		));
		const { map } = rendered;
		await styleLoaded(map);
		expect(ref).toHaveBeenCalledWith(map.getSource("points"));
		await vi.waitFor(() => expect(onData).toHaveBeenCalled());
	});

	test("survives a style change", async () => {
		const [style, setStyle] = createSignal(EMPTY_STYLE);
		rendered = renderMap(
			() => <Source id="points" type="geojson" data={point(0, 0)} />,
			{
				get style() {
					return style();
				},
			},
		);
		const { map } = rendered;
		await styleLoaded(map);
		const before = map.getSource("points");
		setStyle({
			version: 8,
			sources: {},
			layers: [{ id: "background", type: "background" }],
		});
		await vi.waitFor(() => expect(map.getLayer("background")).toBeDefined());
		// Carried over by setStyle's diff: the same instance, not a re-add.
		expect(map.getSource("points")).toBe(before);
	});

	test("comes back after a full style reload", async () => {
		rendered = renderMap(() => (
			<Source id="points" type="geojson" data={point(0, 0)} />
		));
		const { map } = rendered;
		await styleLoaded(map);
		map.setStyle({ version: 8, sources: {}, layers: [] }, { diff: false });
		await map.once("style.load");
		await vi.waitFor(() => expect(map.getSource("points")).toBeDefined());
	});
});
