import type {
	ControlPosition,
	IControl,
	GeolocateControl as MapLibreGeolocateControl,
	Map as MapLibreMap,
	ScaleControl as MapLibreScaleControl,
} from "maplibre-gl";
import { createSignal, Show } from "solid-js";
import { afterEach, describe, expect, test, vi } from "vitest";
import {
	AttributionControl,
	Control,
	FullscreenControl,
	GeolocateControl,
	GlobeControl,
	LogoControl,
	NavigationControl,
	ScaleControl,
	TerrainControl,
} from "./controls.js";
import { Source } from "./source.js";
import { type Rendered, renderMap, styleLoaded, tick } from "./test/render.js";

let rendered: Rendered | undefined;
afterEach(() => {
	rendered?.dispose();
	rendered = undefined;
});

const corner = (host: HTMLElement, position: ControlPosition) =>
	host.querySelector(`.maplibregl-ctrl-${position}`) as HTMLElement;

class Custom implements IControl {
	readonly element = document.createElement("div");
	added = 0;
	removed = 0;
	onAdd(_map: MapLibreMap): HTMLElement {
		this.added++;
		this.element.className = "custom maplibregl-ctrl";
		return this.element;
	}
	onRemove(): void {
		this.removed++;
		this.element.remove();
	}
}

describe("Control", () => {
	test("adds any IControl at a position, moves it, and removes it on unmount", async () => {
		const control = new Custom();
		const [shown, setShown] = createSignal(true);
		const [position, setPosition] = createSignal<ControlPosition>("top-left");
		rendered = renderMap(() => (
			<Show when={shown()}>
				<Control control={control} position={position()} />
			</Show>
		));
		const { map, host } = rendered;
		await styleLoaded(map);
		expect(map.hasControl(control)).toBe(true);
		expect(corner(host, "top-left").contains(control.element)).toBe(true);
		setPosition("bottom-right");
		await tick();
		expect(corner(host, "bottom-right").contains(control.element)).toBe(true);
		expect(control.added).toBe(2);
		setShown(false);
		await tick();
		expect(map.hasControl(control)).toBe(false);
		expect(control.removed).toBe(2);
	});
});

describe("built-in controls", () => {
	test("each adds MapLibre's control", async () => {
		rendered = renderMap(
			() => (
				<>
					<NavigationControl position="top-right" />
					<GeolocateControl position="top-right" />
					<ScaleControl position="bottom-left" />
					<FullscreenControl position="top-right" />
					<AttributionControl position="bottom-right" compact />
					<LogoControl position="bottom-left" />
					<GlobeControl position="top-left" />
					<Source
						id="dem"
						type="raster-dem"
						tiles={["https://example.invalid/{z}/{x}/{y}.png"]}
					>
						<TerrainControl position="top-left" exaggeration={2} />
					</Source>
				</>
			),
			{ attributionControl: false },
		);
		const { map, host } = rendered;
		await styleLoaded(map);
		await tick();
		for (const name of [
			"zoom-in",
			"geolocate",
			"scale",
			"fullscreen",
			"attrib",
			"logo",
			"globe",
			"terrain",
		]) {
			expect(
				host.querySelector(`.maplibregl-ctrl-${name}`),
				name,
			).not.toBeNull();
		}
	});

	test("re-creates the control when an option changes", async () => {
		const [showCompass, setShowCompass] = createSignal(true);
		rendered = renderMap(() => (
			<NavigationControl showCompass={showCompass()} />
		));
		const { map, host } = rendered;
		await styleLoaded(map);
		expect(host.querySelector(".maplibregl-ctrl-compass")).not.toBeNull();
		setShowCompass(false);
		await tick();
		expect(host.querySelector(".maplibregl-ctrl-compass")).toBeNull();
		expect(host.querySelectorAll(".maplibregl-ctrl-zoom-in")).toHaveLength(1);
	});

	test("ScaleControl changes unit in place", async () => {
		const [unit, setUnit] = createSignal<"metric" | "imperial">("metric");
		const refs: MapLibreScaleControl[] = [];
		rendered = renderMap(() => (
			<ScaleControl unit={unit()} ref={(c) => refs.push(c)} />
		));
		const { map, host } = rendered;
		await styleLoaded(map);
		setUnit("imperial");
		await tick();
		expect(refs).toHaveLength(1);
		expect(host.querySelector(".maplibregl-ctrl-scale")?.textContent).toMatch(
			/ft|mi/,
		);
	});

	test("GeolocateControl forwards its events", async () => {
		const onError = vi.fn();
		let control: MapLibreGeolocateControl | undefined;
		rendered = renderMap(() => (
			<GeolocateControl onError={onError} ref={(c) => (control = c)} />
		));
		const { map } = rendered;
		await styleLoaded(map);
		const error = { code: 1, message: "denied" } as GeolocationPositionError;
		control?.fire("error", error);
		expect(onError).toHaveBeenCalledTimes(1);
	});

	test("FullscreenControl forwards its events", async () => {
		const onFullscreenStart = vi.fn();
		const refs: unknown[] = [];
		rendered = renderMap(() => (
			<FullscreenControl
				onFullscreenStart={onFullscreenStart}
				ref={(c) => refs.push(c)}
			/>
		));
		const { map } = rendered;
		await styleLoaded(map);
		(refs[0] as { fire(type: string): void }).fire("fullscreenstart");
		expect(onFullscreenStart).toHaveBeenCalledTimes(1);
	});
});
