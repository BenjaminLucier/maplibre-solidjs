import { createSignal, Show } from "solid-js";
import { afterEach, describe, expect, test, vi } from "vitest";
import { Source } from "./source.js";
import {
	FontFaces,
	Glyphs,
	Light,
	Projection,
	Sky,
	Sprite,
	Terrain,
} from "./style.js";
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

describe("Sky", () => {
	test("sets the sky, updates it, and restores the style's on unmount", async () => {
		const [color, setColor] = createSignal("#ff0000");
		const [shown, setShown] = createSignal(true);
		rendered = renderMap(
			() => (
				<Show when={shown()}>
					<Sky sky-color={color()} />
				</Show>
			),
			{ style: { ...EMPTY_STYLE, sky: { "sky-color": "#00ff00" } } },
		);
		const { map } = rendered;
		await styleLoaded(map);
		expect(map.getSky()?.["sky-color"]).toBe("#ff0000");
		setColor("#0000ff");
		await tick();
		expect(map.getSky()?.["sky-color"]).toBe("#0000ff");
		setShown(false);
		await tick();
		expect(map.getSky()?.["sky-color"]).toBe("#00ff00");
	});

	test("is set again after a style change", async () => {
		const [style, setStyle] = createSignal(EMPTY_STYLE);
		rendered = renderMap(() => <Sky sky-color="#ff0000" />, {
			get style() {
				return style();
			},
		});
		const { map } = rendered;
		await styleLoaded(map);
		setStyle({ ...EMPTY_STYLE, sky: { "sky-color": "#00ff00" } });
		await map.once("style.load");
		await vi.waitFor(() => expect(map.getSky()?.["sky-color"]).toBe("#ff0000"));
	});
});

describe("Light", () => {
	test("sets and updates the light", async () => {
		const [intensity, setIntensity] = createSignal(0.2);
		rendered = renderMap(() => <Light anchor="map" intensity={intensity()} />);
		const { map } = rendered;
		await styleLoaded(map);
		expect(map.getLight()).toMatchObject({ anchor: "map", intensity: 0.2 });
		setIntensity(0.8);
		await tick();
		expect(map.getLight()).toMatchObject({ intensity: 0.8 });
	});
});

describe("Terrain", () => {
	test("waits for its source, then turns terrain on and off", async () => {
		const [shown, setShown] = createSignal(true);
		rendered = renderMap(() => (
			<Source
				id="dem"
				type="raster-dem"
				tiles={["https://example.invalid/{z}/{x}/{y}.png"]}
			>
				<Show when={shown()}>
					<Terrain exaggeration={2} />
				</Show>
			</Source>
		));
		const { map } = rendered;
		map.on("error", () => {}); // tiles from an unreachable host
		await styleLoaded(map);
		await vi.waitFor(() =>
			expect(map.getTerrain()).toEqual({ source: "dem", exaggeration: 2 }),
		);
		setShown(false);
		await tick();
		expect(map.getTerrain()).toBeNull();
	});
});

describe("Projection", () => {
	test("sets the projection and restores it on unmount", async () => {
		const [shown, setShown] = createSignal(true);
		rendered = renderMap(() => (
			<Show when={shown()}>
				<Projection type="globe" />
			</Show>
		));
		const { map } = rendered;
		await styleLoaded(map);
		expect(map.getProjection()).toEqual({ type: "globe" });
		setShown(false);
		await tick();
		expect(map.getProjection()?.type ?? "mercator").toBe("mercator");
	});
});

describe("Glyphs and FontFaces", () => {
	test("set the style's glyphs and font faces", async () => {
		rendered = renderMap(() => (
			<>
				<Glyphs url="https://example.invalid/{fontstack}/{range}.pbf" />
				<FontFaces
					fontFaces={{ Inter: "https://example.invalid/inter.woff2" }}
				/>
			</>
		));
		const { map } = rendered;
		await styleLoaded(map);
		expect(map.getGlyphs()).toBe(
			"https://example.invalid/{fontstack}/{range}.pbf",
		);
		expect(map.getFontFaces()).toEqual({
			Inter: "https://example.invalid/inter.woff2",
		});
	});
});

describe("Sprite", () => {
	test("adds a sprite and removes it on unmount", async () => {
		const [shown, setShown] = createSignal(true);
		rendered = renderMap(() => (
			<Show when={shown()}>
				<Sprite id="icons" url="https://example.invalid/icons" />
			</Show>
		));
		const { map } = rendered;
		map.on("error", () => {}); // the sprite's host is unreachable
		await styleLoaded(map);
		expect(map.getSprite()).toEqual([
			{ id: "icons", url: "https://example.invalid/icons" },
		]);
		setShown(false);
		await tick();
		expect(map.getSprite()).toEqual([]);
	});
});
