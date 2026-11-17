import type { Component } from "solid-js";
import { lazy } from "solid-js";

export interface ExampleInfo {
	id: string;
	title: string;
	description: string;
}

export const EXAMPLES: ExampleInfo[] = [
	{
		id: "basic",
		title: "A map with controls",
		description:
			"The built-in navigation, geolocate, fullscreen and scale controls.",
	},
	{
		id: "markers",
		title: "Markers and popups",
		description:
			"A draggable marker with a popup, a marker made from JSX, and an overlay.",
	},
	{
		id: "reactive-layer",
		title: "Reactive paint and filters",
		description:
			"Signals drive paint properties and filters, updated in place.",
	},
	{
		id: "clusters",
		title: "Clustered GeoJSON",
		description:
			"Clustering, layer events, zooming into clusters and a popup per point.",
	},
	{
		id: "async-data",
		title: "Async data",
		description:
			"An async memo as GeoJSON data, <Loading>, and createMapState.",
	},
	{
		id: "style-switch",
		title: "Switching styles",
		description: "Sources and layers from components survive setStyle.",
	},
	{
		id: "terrain",
		title: "3D terrain and sky",
		description: "Terrain from a raster-dem source, hillshading, sky and fog.",
	},
	{
		id: "globe",
		title: "Globe",
		description: "The globe projection with atmosphere.",
	},
	{
		id: "provider",
		title: "Two maps and a toolbar",
		description: "MapProvider, useMapById, and a map that follows another.",
	},
];

const modules = import.meta.glob<{ default: Component }>("./*.tsx");
const sources = import.meta.glob<string>("./*.tsx", {
	query: "?raw",
	import: "default",
	eager: true,
});

const components = new Map<string, Component>();

/** The example's component, loaded on first use. */
export function exampleComponent(id: string): Component | undefined {
	const load = modules[`./${id}.tsx`];
	if (!load) return undefined;
	let component = components.get(id);
	if (!component) {
		component = lazy(load);
		components.set(id, component);
	}
	return component;
}

/** The example's source, as shown on the site. */
export function exampleSource(id: string): string {
	return sources[`./${id}.tsx`] ?? "";
}
