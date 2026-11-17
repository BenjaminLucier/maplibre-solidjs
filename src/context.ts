import type { Map as MapLibreMap } from "maplibre-gl";
import { type Accessor, createContext, useContext } from "solid-js";

/** What `<Map>` shares with the components inside it. */
export interface MapContextValue {
	/** The map instance. It exists from the start, before its style loads. */
	map: MapLibreMap;
	/**
	 * The map once its style has loaded. Pending before that, and again while
	 * MapLibre rebuilds the style from scratch (a diffed `setStyle` keeps the
	 * current one usable, so it stays ready), so reading it holds effects and
	 * `<Loading>` boundaries until the map accepts sources and layers.
	 */
	ready: Accessor<MapLibreMap>;
	/**
	 * Changes whenever the style's contents may have changed: on `styledata`,
	 * on `style.load`, and after a component adds or removes something.
	 */
	styleVersion: Accessor<number>;
	/**
	 * Changes on MapLibre's `styledata` and `style.load` events only, not on
	 * `touch()`: for checks that a style change dropped something, which a
	 * component's own additions must not re-run.
	 */
	styleData: Accessor<number>;
	/** Changes on every `style.load`, when a new style replaced the old one. */
	styleRevision: Accessor<number>;
	/** Marks the style as changed, after a component added or removed something. */
	touch(): void;
	/**
	 * The ids of the sources and layers components own, so a style switch can
	 * carry them over to the new style.
	 */
	owned: { sources: Set<string>; layers: Set<string> };
}

export const MapContext = createContext<MapContextValue>(undefined, {
	name: "MapContext",
});

/** The enclosing `<Map>`'s shared state. Throws outside a `<Map>`. */
export function useMapContext(): MapContextValue {
	return useContext(MapContext);
}

/**
 * The enclosing map, once its style has loaded.
 *
 * The accessor is pending until then, and again while MapLibre rebuilds the
 * style from scratch; a diffed `setStyle` keeps the map ready throughout.
 * Read it in a tracking scope (an effect's compute function, a memo, JSX)
 * and Solid waits for it: effects run once the map is ready, and a
 * `<Loading>` boundary shows its fallback the first time. Call `useMap` in a
 * component body; cleanups and event handlers have no owner to read context
 * from.
 *
 * ```tsx
 * function Zoom() {
 *   const map = useMap();
 *   const zoom = createMapState(() => map().getZoom(), ["zoom"]);
 *   return <span>{zoom().toFixed(1)}</span>;
 * }
 * ```
 */
export function useMap(): Accessor<MapLibreMap> {
	return useMapContext().ready;
}
