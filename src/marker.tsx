import type { JSX } from "@solidjs/web";
import {
	type LngLatLike,
	Marker as MapLibreMarker,
	type MarkerEventType,
	type MarkerOptions,
} from "maplibre-gl";
import { createSignal, untrack } from "solid-js";
import { useMapContext } from "./context.js";
import { createContent } from "./internal/content.js";
import { equal } from "./internal/equal.js";
import {
	bindEvents,
	type CoversEvents,
	type EventProps,
} from "./internal/events.js";
import { MarkerContext } from "./internal/marker-context.js";
import { reconcile } from "./internal/reconcile.js";
import { applyRef } from "./internal/ref.js";
import type { AllowUndefined } from "./internal/types.js";

/** `<Marker>` event props. */
export const MARKER_EVENTS = {
	onDragStart: "dragstart",
	onDrag: "drag",
	onDragEnd: "dragend",
	onClick: "click",
} as const satisfies Record<string, keyof MarkerEventType>;
MARKER_EVENTS satisfies CoversEvents<typeof MARKER_EVENTS, MarkerEventType>;
export type MarkerEventProps = EventProps<
	typeof MARKER_EVENTS,
	MarkerEventType
>;

/**
 * How `<Marker>` applies each of MapLibre's `MarkerOptions` after the marker
 * exists: through a setter, or (`init`) by re-creating the marker, since
 * MapLibre can only set them at construction. Exhaustive over
 * `MarkerOptions`, so new options fail type checking until classified.
 */
export const MARKER_OPTION_KINDS = {
	element: "init",
	className: "setter",
	offset: "setter",
	anchor: "init",
	color: "init",
	scale: "init",
	draggable: "setter",
	clickTolerance: "init",
	rotation: "setter",
	rotationAlignment: "setter",
	pitchAlignment: "setter",
	opacity: "setter",
	opacityWhenCovered: "setter",
	subpixelPositioning: "setter",
} as const satisfies Record<keyof MarkerOptions, "init" | "setter">;

export type MarkerProps = AllowUndefined<MarkerOptions> &
	MarkerEventProps & {
		/** Where the marker is. */
		lngLat: LngLatLike;
		/**
		 * The marker's content: rendered into the marker element, replacing
		 * MapLibre's default pin. A `<Popup>` here opens when the marker is
		 * clicked.
		 */
		children?: JSX.Element;
		/** Receives the `maplibregl.Marker` each time it is created. */
		ref?: JSX.Ref<MapLibreMarker>;
	};

type MarkerSpec = Omit<MarkerOptions, "element"> & {
	element: HTMLElement | undefined;
	lngLat: LngLatLike;
};

const INIT_KEYS = Object.entries(MARKER_OPTION_KINDS)
	.filter(([, kind]) => kind === "init")
	.map(([key]) => key);

/**
 * A MapLibre marker, removed on unmount. Every `MarkerOptions` option is a
 * prop; changes go through the marker's setters (`setLngLat`, `setOffset`,
 * `setDraggable`, `setRotation`, `setOpacity`, ...), and the options MapLibre
 * only takes at construction (`element`, `anchor`, `color`, `scale`,
 * `clickTolerance`) re-create it.
 *
 * Children become the marker's element, as Solid content that stays
 * reactive. Without children (or `element`) it is MapLibre's default pin.
 */
export function Marker(props: MarkerProps): JSX.Element {
	const ctx = useMapContext();
	const [marker, setMarker] = createSignal<MapLibreMarker | undefined>(
		undefined,
		{
			equals: false,
		},
	);
	const content = createContent(() => (
		<MarkerContext value={marker}>{props.children}</MarkerContext>
	));

	reconcile<MarkerSpec, MapLibreMarker>(ctx, {
		spec() {
			const spec: Record<string, unknown> = {};
			for (const key of Object.keys(MARKER_OPTION_KINDS)) {
				const value = props[key as keyof MarkerOptions];
				if (value !== undefined) spec[key] = value;
			}
			spec.element =
				props.element ?? (content.hasContent() ? content.element : undefined);
			spec.lngLat = props.lngLat;
			return spec as MarkerSpec;
		},
		create(map, { lngLat, element, ...options }) {
			const marker = new MapLibreMarker(
				element ? { ...options, element } : options,
			);
			return marker.setLngLat(lngLat).addTo(map);
		},
		update(_map, marker, prev, next) {
			const p = prev as Record<string, unknown>;
			const n = next as Record<string, unknown>;
			if (INIT_KEYS.some((key) => !equal(p[key], n[key]))) return false;
			const changed = (key: string) => !equal(p[key], n[key]);
			if (changed("lngLat")) marker.setLngLat(next.lngLat);
			if (changed("offset")) marker.setOffset(next.offset ?? [0, 0]);
			if (changed("draggable")) marker.setDraggable(next.draggable ?? false);
			if (changed("rotation")) marker.setRotation(next.rotation ?? 0);
			if (changed("rotationAlignment"))
				marker.setRotationAlignment(next.rotationAlignment ?? "auto");
			if (changed("pitchAlignment"))
				marker.setPitchAlignment(next.pitchAlignment ?? "auto");
			if (changed("opacity") || changed("opacityWhenCovered")) {
				marker.setOpacity(next.opacity, next.opacityWhenCovered);
			}
			if (changed("subpixelPositioning"))
				marker.setSubpixelPositioning(next.subpixelPositioning ?? false);
			if (changed("className"))
				swapClasses(marker, prev.className, next.className);
			return true;
		},
		destroy(_map, marker, { element, className }) {
			marker.remove();
			// MapLibre adds className to the element and never takes it off. The
			// children's element outlives the marker, so a marker re-created
			// around it would keep the old classes. An `element` prop is the
			// caller's, and its classes are theirs to manage.
			if (element !== content.element) return;
			for (const name of className?.split(/\s+/).filter(Boolean) ?? []) {
				element.classList.remove(name);
			}
		},
		instance(marker) {
			setMarker(() => marker);
			if (marker)
				applyRef(
					untrack(() => props.ref),
					marker,
				);
		},
	});

	bindEvents(marker, props, MARKER_EVENTS);

	return null;
}

/** Applies a changed `className` through `addClassName` and `removeClassName`. */
export function swapClasses(
	target: {
		addClassName(name: string): unknown;
		removeClassName(name: string): unknown;
	},
	prev: string | undefined,
	next: string | undefined,
): void {
	const tokens = (value: string | undefined) =>
		new Set(value?.split(/\s+/).filter(Boolean));
	const before = tokens(prev);
	const after = tokens(next);
	for (const name of before) if (!after.has(name)) target.removeClassName(name);
	for (const name of after) if (!before.has(name)) target.addClassName(name);
}
