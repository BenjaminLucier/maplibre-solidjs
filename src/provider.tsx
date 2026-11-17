import type { JSX } from "@solidjs/web";
import type { Map as MapLibreMap } from "maplibre-gl";
import {
	type Accessor,
	createContext,
	createMemo,
	createSignal,
	onCleanup,
	useContext,
} from "solid-js";
import type { MapContextValue } from "./context.js";

interface MapRegistry {
	maps: Accessor<ReadonlyMap<string, MapContextValue>>;
	register(id: string, ctx: MapContextValue): void;
}

const MapRegistryContext = createContext<MapRegistry | null>(null, {
	name: "MapRegistryContext",
});

/**
 * Makes every `<Map id>` inside it reachable by id with `useMapById`, from
 * anywhere inside the provider: a toolbar beside the map, or a second map
 * that follows the first.
 */
export function MapProvider(props: { children?: JSX.Element }): JSX.Element {
	const [maps, setMaps] = createSignal<ReadonlyMap<string, MapContextValue>>(
		new Map(),
		// Maps register from their component body.
		{ equals: false, ownedWrite: true },
	);
	const registry: MapRegistry = {
		maps,
		register(id, ctx) {
			setMaps((maps) => new Map(maps).set(id, ctx));
			onCleanup(() =>
				setMaps((maps) => {
					if (maps.get(id) !== ctx) return maps;
					const next = new Map(maps);
					next.delete(id);
					return next;
				}),
			);
		},
	};
	return (
		<MapRegistryContext value={registry}>{props.children}</MapRegistryContext>
	);
}

/** Registers a `<Map>`'s context with the enclosing `<MapProvider>`, if any. */
export function registerMap(
	id: string | undefined,
	ctx: MapContextValue,
): void {
	const registry = useContext(MapRegistryContext);
	if (registry && id !== undefined) registry.register(id, ctx);
}

/**
 * The map rendered as `<Map id={id}>` inside the enclosing `<MapProvider>`.
 *
 * Like `useMap`, the accessor is pending until that map exists and its style
 * has loaded, so components can be written against a map that hasn't mounted
 * yet, or that is replaced, and `<Loading>` covers the wait.
 */
export function useMapById(
	id: string | Accessor<string>,
): Accessor<MapLibreMap> {
	const registry = useContext(MapRegistryContext);
	if (!registry)
		throw new Error("useMapById must be used inside <MapProvider>");
	const key = typeof id === "function" ? id : () => id;
	return createMemo(() => {
		const ctx = registry.maps().get(key());
		return ctx ? ctx.ready() : new Promise<MapLibreMap>(() => {});
	});
}
