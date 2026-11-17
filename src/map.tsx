import { insert, isServer, type JSX } from "@solidjs/web";
import {
	LngLat,
	Map as MapLibreMap,
	type MapOptions,
	type StyleOptions,
	type StyleSpecification,
	type StyleSwapOptions,
} from "maplibre-gl";
import {
	createEffect,
	createMemo,
	createSignal,
	onCleanup,
	untrack,
} from "solid-js";
import { MapContext, type MapContextValue } from "./context.js";
import { changedKeys, equal } from "./internal/equal.js";
import { bindEvents } from "./internal/events.js";
import { attempt } from "./internal/reconcile.js";
import { applyRef } from "./internal/ref.js";
import type { AllowUndefined } from "./internal/types.js";
import { MAP_EVENTS, type MapEventProps } from "./map-events.js";
import {
	MAP_CAMERA_OPTIONS,
	MAP_HANDLER_DEFAULTS,
	MAP_OPTION_KINDS,
	MAP_OPTION_SETTERS,
} from "./map-options.js";

export type MapProps = AllowUndefined<Omit<MapOptions, "container">> &
	MapEventProps & {
		/**
		 * An existing element (or its id) to render the map into. Without it,
		 * `<Map>` renders its own `<div>`, styled with `class`, `id` and
		 * `containerStyle`.
		 */
		container?: HTMLElement | string;
		id?: string;
		class?: string;
		/**
		 * CSS for the map's `<div>`. (`style` is MapLibre's map style.) The
		 * element needs a size for the map to show.
		 */
		containerStyle?: JSX.CSSProperties | string;
		/** Receives the `maplibregl.Map` as soon as it is constructed. */
		ref?: JSX.Ref<MapLibreMap>;
		/**
		 * Sources, layers, markers and the rest. They are rendered inside the
		 * map's container, and wait for the style to load before adding
		 * anything to it.
		 */
		children?: JSX.Element;
	};

/**
 * A MapLibre map. Takes every `MapOptions` option as a prop, and every map
 * event as an `on*` prop (`onLoad`, `onMoveEnd`, ...).
 *
 * The map is constructed when the component is created. After that, changed
 * props are applied the way MapLibre allows: through setters
 * (`setMaxBounds`, `setPixelRatio`, ...), by enabling or disabling
 * interaction handlers, with `jumpTo` for camera props, `fitBounds` for
 * `bounds`, and `setStyle` for `style`. Options MapLibre can't change after
 * construction keep their first value. See `MAP_OPTION_KINDS` for which is
 * which.
 *
 * Camera props are applied only when they change, and only if the map isn't
 * already there, so a prop fed from `onMove` doesn't fight user interaction.
 *
 * A new `style` is applied with MapLibre's diffing, and the sources and
 * layers declared by components are carried over into it.
 */
export function Map(props: MapProps): JSX.Element {
	if (isServer) {
		return (
			<div id={props.id} class={props.class} style={props.containerStyle} />
		);
	}

	const external = untrack(() => props.container);
	const element =
		external === undefined
			? ((
					<div id={props.id} class={props.class} style={props.containerStyle} />
				) as HTMLDivElement)
			: undefined;
	const container = element ?? (external as HTMLElement | string);

	const applied: Partial<MapOptions> = {};
	for (const key of Object.keys(MAP_OPTION_KINDS) as (keyof MapOptions)[]) {
		const value = untrack(() => props[key as keyof MapProps]);
		if (value !== undefined) (applied as Record<string, unknown>)[key] = value;
	}
	const owned = { sources: new Set<string>(), layers: new Set<string>() };
	const map = new MapLibreMap({
		...applied,
		container,
		transformStyle: (prev, next) =>
			carryOver(
				owned,
				prev,
				untrack(() => props.transformStyle)?.(prev, next) ?? next,
			),
	});

	const [styleLoaded, setStyleLoaded] = createSignal(false);
	const [styleVersion, setStyleVersion] = createSignal(0);
	const [styleRevision, setStyleRevision] = createSignal(0);
	const touch = () => setStyleVersion((v) => v + 1);
	map.on("styledataloading", () => setStyleLoaded(false));
	map.on("style.load", () => {
		setStyleLoaded(true);
		setStyleRevision((r) => r + 1);
		touch();
	});
	map.on("styledata", () => {
		if (map.isStyleLoaded()) setStyleLoaded(true);
		touch();
	});

	const ctx: MapContextValue = {
		map,
		ready: createMemo(() =>
			styleLoaded() ? map : new Promise<MapLibreMap>(() => {}),
		),
		styleVersion,
		styleRevision,
		touch,
		owned,
	};

	bindEvents(() => map, props, MAP_EVENTS, { immediate: true });
	applyOptions(map, ctx.ready, props, applied, owned);
	applyRef(
		untrack(() => props.ref),
		map,
	);
	onCleanup(() => map.remove());

	const content = () => <MapContext value={ctx}>{props.children}</MapContext>;
	if (!element) return content();
	insert(element, content);
	return element;
}

/** Keeps the map in line with props that changed after construction. */
function applyOptions(
	map: MapLibreMap,
	ready: () => MapLibreMap,
	props: MapProps,
	applied: Record<string, unknown>,
	owned: MapContextValue["owned"],
): void {
	// Each effect compares with the value last applied, so only props that
	// actually changed reach MapLibre.
	const changes = (keys: readonly string[], next: Record<string, unknown>) =>
		keys.filter((key) => {
			if (equal(applied[key], next[key])) return false;
			applied[key] = next[key];
			return true;
		});
	const read = (keys: readonly string[]) => () =>
		Object.fromEntries(keys.map((key) => [key, props[key as keyof MapProps]]));

	const setterKeys = Object.keys(
		MAP_OPTION_SETTERS,
	) as (keyof typeof MAP_OPTION_SETTERS)[];
	createEffect(read(setterKeys), (next) => {
		for (const key of changes(setterKeys, next)) {
			const setter = map[
				MAP_OPTION_SETTERS[key as keyof typeof MAP_OPTION_SETTERS]
			] as (value: unknown) => void;
			attempt(map, () =>
				setter.call(map, next[key] ?? SETTER_DEFAULTS[key]?.() ?? null),
			);
		}
	});

	const handlerKeys = Object.keys(
		MAP_HANDLER_DEFAULTS,
	) as (keyof typeof MAP_HANDLER_DEFAULTS)[];
	createEffect(read(handlerKeys), (next) => {
		for (const key of changes(handlerKeys, next)) {
			const value =
				next[key] ??
				MAP_HANDLER_DEFAULTS[key as keyof typeof MAP_HANDLER_DEFAULTS];
			const handler = map[key as keyof typeof MAP_HANDLER_DEFAULTS] as {
				enable(options?: unknown): void;
				disable(): void;
			};
			attempt(map, () =>
				value === false
					? handler.disable()
					: handler.enable(typeof value === "object" ? value : undefined),
			);
		}
	});

	createEffect(read(MAP_CAMERA_OPTIONS), (next) => {
		const camera: Record<string, unknown> = {};
		for (const key of changes(MAP_CAMERA_OPTIONS, next)) {
			const value = next[key];
			if (value !== undefined && !atCamera(map, key, value))
				camera[key] = value;
		}
		if (Object.keys(camera).length > 0) attempt(map, () => map.jumpTo(camera));
	});

	createEffect(read(["bounds", "fitBoundsOptions"]), (next) => {
		applied.fitBoundsOptions = next.fitBoundsOptions;
		if (changes(["bounds"], next).length > 0 && next.bounds !== undefined) {
			attempt(map, () =>
				map.fitBounds(
					next.bounds as MapOptions["bounds"] & {},
					next.fitBoundsOptions as MapOptions["fitBoundsOptions"],
				),
			);
		}
	});

	createEffect(
		() => {
			ready();
			return read(["globalState"])();
		},
		(next) => {
			const prev = applied.globalState as Record<string, unknown> | undefined;
			const state = next.globalState as Record<string, unknown> | undefined;
			applied.globalState = state;
			for (const key of changedKeys(prev, state)) {
				attempt(map, () =>
					map.setGlobalStateProperty(key, state?.[key] ?? null),
				);
			}
		},
	);

	createEffect(
		read([
			"style",
			"validateStyle",
			"localIdeographFontFamily",
			"transformStyle",
		]),
		(next) => {
			if (changes(["style"], next).length === 0) return;
			const transform = next.transformStyle as MapOptions["transformStyle"];
			const options: StyleSwapOptions & StyleOptions = {
				transformStyle: (prev, style) =>
					carryOver(owned, prev, transform?.(prev, style) ?? style),
			};
			if (next.validateStyle !== undefined) {
				options.validate = next.validateStyle as boolean;
			}
			if (next.localIdeographFontFamily !== undefined) {
				options.localIdeographFontFamily =
					next.localIdeographFontFamily as string;
			}
			attempt(map, () =>
				map.setStyle(
					(next.style as StyleSpecification | string | undefined) ?? null,
					options,
				),
			);
		},
	);
}

/** MapLibre's defaults, for setter props that are removed. */
const SETTER_DEFAULTS: Record<string, (() => unknown) | undefined> = {
	zoomSnap: () => 0,
	pixelRatio: () => devicePixelRatio,
	centerClampedToGround: () => true,
};

const EPSILON = 1e-9;

/** Whether the map's camera already has this value. */
function atCamera(map: MapLibreMap, key: string, value: unknown): boolean {
	switch (key) {
		case "center": {
			const center = LngLat.convert(value as LngLat);
			const current = map.getCenter();
			return (
				Math.abs(center.lng - current.lng) < EPSILON &&
				Math.abs(center.lat - current.lat) < EPSILON
			);
		}
		case "zoom":
			return Math.abs(map.getZoom() - (value as number)) < EPSILON;
		case "bearing":
			return Math.abs(map.getBearing() - (value as number)) < EPSILON;
		case "pitch":
			return Math.abs(map.getPitch() - (value as number)) < EPSILON;
		case "roll":
			return Math.abs(map.getRoll() - (value as number)) < EPSILON;
		case "elevation":
			return Math.abs(map.getCenterElevation() - (value as number)) < EPSILON;
		default:
			return false;
	}
}

/**
 * Copies the sources and layers components own from the outgoing style into
 * the incoming one, so `setStyle`'s diff keeps them instead of removing them.
 * Each layer goes before the first layer that followed it before and exists
 * in the new style, which keeps the relative order.
 */
function carryOver(
	owned: MapContextValue["owned"],
	prev: StyleSpecification | undefined,
	next: StyleSpecification,
): StyleSpecification {
	if (!prev) return next;
	const sources = { ...next.sources };
	for (const id of owned.sources) {
		const source = prev.sources[id];
		if (source && !(id in sources)) sources[id] = source;
	}
	const layers = [...next.layers];
	const present = new Set(layers.map((layer) => layer.id));
	prev.layers.forEach((layer, index) => {
		if (!owned.layers.has(layer.id) || present.has(layer.id)) return;
		if (
			"source" in layer &&
			typeof layer.source === "string" &&
			!(layer.source in sources)
		)
			return;
		const anchor = prev.layers
			.slice(index + 1)
			.find((later) => present.has(later.id));
		const at = anchor
			? layers.findIndex((l) => l.id === anchor.id)
			: layers.length;
		layers.splice(at, 0, layer);
		present.add(layer.id);
	});
	return { ...next, sources, layers };
}
