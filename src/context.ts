import type { Map as MapLibreMap } from "maplibre-gl";
import { createContext, useContext } from "solid-js";

/** The map that child components attach themselves to. */
export const MapContext = createContext<MapLibreMap>();

/**
 * The enclosing map. Call it in a component body and keep the result: an
 * owner is needed to read context, and cleanups and event handlers have none.
 */
export function useMap(): MapLibreMap {
	return useContext(MapContext);
}
