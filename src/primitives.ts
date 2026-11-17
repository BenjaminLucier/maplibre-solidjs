import type {
	MapEventType,
	MapLayerEventType,
	Map as MapLibreMap,
} from "maplibre-gl";
import {
	type Accessor,
	createEffect,
	createMemo,
	createSignal,
	type MemoOptions,
	onCleanup,
} from "solid-js";
import { useMapContext } from "./context.js";

type LayerIds = string | readonly string[];

/**
 * Listens to a map event for as long as the calling component lives.
 *
 * ```tsx
 * createMapEvent("moveend", (event) => save(event.target.getCenter()));
 * createMapEvent("click", "parks", (event) => select(event.features?.[0]));
 * ```
 *
 * With a layer id (or several), the listener receives only events over that
 * layer's features (`map.on(type, layerId, listener)`). The id may be an
 * accessor; the listener moves when it changes. Read `event.features` inside
 * the listener: MapLibre deletes them once it returns.
 */
export function createMapEvent<Type extends keyof MapEventType>(
	type: Type,
	listener: (event: MapEventType[Type] & object) => void,
): void;
export function createMapEvent<Type extends keyof MapLayerEventType>(
	type: Type,
	layer: LayerIds | Accessor<LayerIds | undefined>,
	listener: (event: MapLayerEventType[Type] & object) => void,
): void;
export function createMapEvent(
	type: string,
	...args:
		| [listener: (event: never) => void]
		| [
				layer: LayerIds | Accessor<LayerIds | undefined>,
				listener: (event: never) => void,
		  ]
): void {
	const { map } = useMapContext();
	const on = map.on.bind(map) as (...args: unknown[]) => unknown;
	const off = map.off.bind(map) as (...args: unknown[]) => unknown;

	if (args.length === 1) {
		const [listener] = args;
		on(type, listener);
		onCleanup(() => off(type, listener));
		return;
	}

	const [layer, listener] = args;
	const ids = typeof layer === "function" ? layer : () => layer;
	createEffect(
		() => {
			const value = ids();
			return value === undefined || typeof value === "string"
				? value
				: [...value];
		},
		(value) => {
			if (value === undefined || value.length === 0) return;
			on(type, value, listener);
			return () => off(type, value, listener);
		},
	);
}

/**
 * A reactive view of map state that MapLibre doesn't expose as a signal.
 * `read` runs once the map is ready and again whenever one of `events`
 * fires; the accessor is pending until the map's style has loaded, so a
 * `<Loading>` boundary covers it.
 *
 * ```tsx
 * const map = useMap();
 * const zoom = createMapState(() => map().getZoom(), ["zoom"]);
 * const bounds = createMapState(() => map().getBounds(), ["moveend"]);
 * ```
 */
export function createMapState<T>(
	read: (map: MapLibreMap) => T,
	events: readonly (keyof MapEventType)[],
	options?: MemoOptions<T>,
): Accessor<T> {
	const ctx = useMapContext();
	const [version, setVersion] = createSignal(0);
	const bump = () => setVersion((version) => version + 1);
	for (const type of events) ctx.map.on(type, bump);
	onCleanup(() => {
		for (const type of events) ctx.map.off(type, bump);
	});
	return createMemo(() => {
		version();
		return read(ctx.ready());
	}, options);
}
