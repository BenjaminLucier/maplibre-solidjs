import { type JSX, render } from "@solidjs/web";
import type { Map as MapLibreMap, StyleSpecification } from "maplibre-gl";
import { Map, type MapProps } from "../map.js";

/** A style with nothing in it, so tests need no network. */
export const EMPTY_STYLE: StyleSpecification = {
	version: 8,
	sources: {},
	layers: [],
};

export interface Rendered {
	map: MapLibreMap;
	host: HTMLElement;
	dispose(): void;
}

/**
 * Renders `<Map>` into the document with an empty style. `props` is read
 * reactively, so tests can pass getters backed by signals.
 */
export function renderMap(
	children?: () => JSX.Element,
	props: Partial<MapProps> = {},
): Rendered {
	const host = document.createElement("div");
	document.body.append(host);
	let map: MapLibreMap | undefined;
	const dispose = render(
		() => (
			<Map
				style={EMPTY_STYLE}
				containerStyle={{ width: "400px", height: "300px" }}
				ref={(instance) => {
					map = instance;
				}}
				{...props}
			>
				{children?.()}
			</Map>
		),
		host,
	);
	if (!map) throw new Error("<Map> did not hand over its map");
	return {
		map,
		host,
		dispose() {
			dispose();
			host.remove();
		},
	};
}

/** Resolves once the map's style has loaded. */
export async function styleLoaded(map: MapLibreMap): Promise<void> {
	if (!map.isStyleLoaded()) await map.once("style.load");
	await tick();
}

/** Lets pending microtasks, Solid flushes and timers run. */
export function tick(ms = 0): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}
