import type { Marker } from "maplibre-gl";
import { type Accessor, createContext, useContext } from "solid-js";

/** The enclosing `<Marker>`'s instance, for a `<Popup>` inside it. */
export const MarkerContext = createContext<Accessor<Marker | undefined> | null>(
	null,
	{
		name: "MarkerContext",
	},
);

export function useMarker(): Accessor<Marker | undefined> | null {
	return useContext(MarkerContext);
}
