import type { FeatureCollection } from "geojson";
import { createSignal, Show } from "solid-js";
import { afterEach, describe, expect, test, vi } from "vitest";
import { FeatureState } from "./feature-state.js";
import { Source } from "./source.js";
import {
	captureDiagnostics,
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

const data: FeatureCollection = {
	type: "FeatureCollection",
	features: [
		{
			type: "Feature",
			id: 1,
			properties: {},
			geometry: { type: "Point", coordinates: [0, 0] },
		},
	],
};

describe("FeatureState", () => {
	test("sets, updates and removes the keys it owns", async () => {
		const [state, setState] = createSignal<Record<string, unknown>>({
			hover: true,
			rank: 1,
		});
		const [shown, setShown] = createSignal(true);
		rendered = renderMap(() => (
			<Source id="points" type="geojson" data={data}>
				<Show when={shown()}>
					<FeatureState id={1} state={state()} />
				</Show>
			</Source>
		));
		const { map } = rendered;
		await styleLoaded(map);
		const target = { source: "points", id: 1 };
		map.setFeatureState(target, { other: "kept" });
		expect(map.getFeatureState(target)).toEqual({
			hover: true,
			rank: 1,
			other: "kept",
		});

		setState({ hover: false });
		await tick();
		expect(map.getFeatureState(target)).toEqual({
			hover: false,
			other: "kept",
		});

		setShown(false);
		await tick();
		expect(map.getFeatureState(target)).toEqual({ other: "kept" });
	});

	test("sets the state again when the source is re-created", async () => {
		const [buffer, setBuffer] = createSignal(64);
		rendered = renderMap(() => (
			<Source id="points" type="geojson" data={data} buffer={buffer()}>
				<FeatureState id={1} state={{ hover: true }} />
			</Source>
		));
		const { map } = rendered;
		await styleLoaded(map);
		const before = map.getSource("points");
		setBuffer(128);
		await tick();
		expect(map.getSource("points")).not.toBe(before);
		// Re-applied on MapLibre's next styledata, which waits for a frame.
		await vi.waitFor(() =>
			expect(map.getFeatureState({ source: "points", id: 1 })).toEqual({
				hover: true,
			}),
		);
	});

	test("sets state inside a <Source> without Solid reporting a relay tear", async () => {
		// A relay tear: a computation re-running because another component's
		// effect wrote a signal it had already read in the same flush.
		const diagnostics = captureDiagnostics();
		rendered = renderMap(() => (
			<Source id="points" type="geojson" data={data}>
				<FeatureState id={1} state={{ hover: true }} />
			</Source>
		));
		const { map } = rendered;
		await styleLoaded(map);
		await tick(50);
		expect(map.getFeatureState({ source: "points", id: 1 })).toEqual({
			hover: true,
		});
		expect(
			diagnostics.stop().filter((d) => d.startsWith("EFFECT_RELAY_TEAR")),
		).toEqual([]);
	});
});
