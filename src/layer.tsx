import type { JSX } from "@solidjs/web";
import type {
	AllLayoutProperties,
	AllPaintProperties,
	CustomLayerInterface,
	LayerSpecification,
	MapLayerEventType,
	Map as MapLibreMap,
} from "maplibre-gl";
import { createMemo, untrack } from "solid-js";
import { type MapContextValue, useMapContext } from "./context.js";
import { changedKeys, equal } from "./internal/equal.js";
import {
	bindEvents,
	type CoversEvents,
	type EventProps,
} from "./internal/events.js";
import { generateId, specOf } from "./internal/props.js";
import { reconcile } from "./internal/reconcile.js";
import { applyRef } from "./internal/ref.js";
import { createBeforeId, createSourceExists } from "./internal/style.js";
import type { AllowUndefined } from "./internal/types.js";
import { useSourceId } from "./source.js";

/** `<Layer>` event props: MapLibre's layer-scoped events (`map.on(type, layerId, ...)`). */
export const LAYER_EVENTS = {
	onClick: "click",
	onDblClick: "dblclick",
	onMouseDown: "mousedown",
	onMouseUp: "mouseup",
	onMouseMove: "mousemove",
	onMouseEnter: "mouseenter",
	onMouseLeave: "mouseleave",
	onMouseOver: "mouseover",
	onMouseOut: "mouseout",
	onContextMenu: "contextmenu",
	onTouchStart: "touchstart",
	onTouchEnd: "touchend",
	onTouchCancel: "touchcancel",
} as const satisfies Record<string, keyof MapLayerEventType>;
LAYER_EVENTS satisfies CoversEvents<typeof LAYER_EVENTS, MapLayerEventType>;
export type LayerEventProps = EventProps<
	typeof LAYER_EVENTS,
	MapLayerEventType
>;

/** The style layer MapLibre creates for a `<Layer>`. */
export type StyleLayer = NonNullable<ReturnType<MapLibreMap["getLayer"]>>;

interface LayerOwnProps {
	/** The layer id. Generated when omitted. */
	id?: string | undefined;
	/**
	 * The id of an existing layer to insert this one before; on top when
	 * omitted. Changing it moves the layer (`moveLayer`). If that layer isn't
	 * on the map yet, this one is moved there once it is.
	 */
	beforeId?: string | undefined;
	/** Receives MapLibre's style layer each time the layer is added. */
	ref?: JSX.Ref<StyleLayer>;
}

/**
 * `<Layer>` props: a MapLibre layer specification of any type, discriminated
 * by `type`. `source` defaults to the enclosing `<Source>`. `paint` and
 * `layout` properties may be `undefined`, which resets them to their default.
 */
export type LayerProps = LayerSpecification extends infer Spec
	? Spec extends LayerSpecification
		? AllowUndefined<Omit<Spec, "id" | "source" | "paint" | "layout">> &
				("source" extends keyof Spec
					? { source?: string | undefined }
					: unknown) &
				("paint" extends keyof Spec
					? { paint?: AllowUndefined<NonNullable<Spec["paint"]>> | undefined }
					: unknown) &
				("layout" extends keyof Spec
					? { layout?: AllowUndefined<NonNullable<Spec["layout"]>> | undefined }
					: unknown) &
				LayerOwnProps &
				LayerEventProps
		: never
	: never;

type LayerSpec = LayerSpecification & {
	source?: string;
	before?: string | undefined;
};

const OWN_PROPS = new Set([
	"id",
	"beforeId",
	"ref",
	...Object.keys(LAYER_EVENTS),
]);

/**
 * A MapLibre style layer: `map.addLayer(spec, beforeId)`, removed on unmount.
 *
 * Props are the layer specification for its `type`. Changes are applied in
 * place: `paint` and `layout` per property (`setPaintProperty`,
 * `setLayoutProperty`; a removed property returns to its default), `filter`
 * through `setFilter`, `minzoom` and `maxzoom` through `setLayerZoomRange`,
 * and `beforeId` through `moveLayer`. Changing `id`, `type`, `source`,
 * `source-layer` or `metadata` re-creates the layer.
 *
 * The layer waits for its source to exist, so it can be declared before a
 * `<Source>` or reference a source from the map style.
 */
export function Layer(props: LayerProps): JSX.Element {
	const ctx = useMapContext();
	const sourceId = useSourceId();
	const fallbackId = generateId("layer");
	const id = createMemo(() => props.id ?? fallbackId);

	const source = createMemo(() =>
		props.type === "background"
			? undefined
			: ((props as { source?: string }).source ?? sourceId?.()),
	);
	const sourceExists = createSourceExists(ctx, source);
	const before = createBeforeId(ctx, () => props.beforeId);

	reconcile<LayerSpec, string>(ctx, {
		spec() {
			if (!sourceExists()) return undefined;
			const spec = specOf<LayerSpec>(props, (key) => OWN_PROPS.has(key));
			const src = source();
			return {
				...spec,
				...(src === undefined ? {} : { source: src }),
				id: id(),
				before: before(),
			} as LayerSpec;
		},
		create(map, { before, ...layer }) {
			map.addLayer(layer as LayerSpecification, before);
			ctx.owned.layers.add(layer.id);
			return layer.id;
		},
		update: (map, _id, prev, next) => updateLayer(map, prev, next),
		destroy: (map, id) => removeLayer(ctx, map, id),
		style: (map, id) => map.getLayer(id) !== undefined,
		instance(id) {
			const layer = id === undefined ? undefined : ctx.map.getLayer(id);
			if (layer)
				applyRef(
					untrack(() => props.ref),
					layer,
				);
		},
	});

	bindEvents(() => ctx.map, props, LAYER_EVENTS, { layer: id });

	return null;
}

const RECREATE = ["id", "type", "source", "source-layer", "metadata"];

/** Applies a changed specification in place, if it can. */
function updateLayer(
	map: MapLibreMap,
	prev: LayerSpec,
	next: LayerSpec,
): boolean {
	const p = prev as Record<string, unknown>;
	const n = next as Record<string, unknown>;
	if (RECREATE.some((key) => !equal(p[key], n[key]))) return false;
	const { id } = next;
	const paint = n.paint as Record<string, unknown> | undefined;
	for (const key of changedKeys(p.paint as typeof paint, paint)) {
		map.setPaintProperty(
			id,
			key as keyof AllPaintProperties,
			paint?.[key] as never,
		);
	}
	const layout = n.layout as Record<string, unknown> | undefined;
	for (const key of changedKeys(p.layout as typeof layout, layout)) {
		map.setLayoutProperty(
			id,
			key as keyof AllLayoutProperties,
			layout?.[key] as never,
		);
	}
	if (!equal(p.filter, n.filter)) {
		map.setFilter(
			id,
			(n.filter as Parameters<MapLibreMap["setFilter"]>[1]) ?? null,
		);
	}
	if (!equal(p.minzoom, n.minzoom) || !equal(p.maxzoom, n.maxzoom)) {
		map.setLayerZoomRange(
			id,
			(n.minzoom as number | undefined) ?? 0,
			(n.maxzoom as number | undefined) ?? 24,
		);
	}
	if (prev.before !== next.before) map.moveLayer(id, next.before);
	return true;
}

function removeLayer(ctx: MapContextValue, map: MapLibreMap, id: string): void {
	ctx.owned.layers.delete(id);
	if (map.getLayer(id)) map.removeLayer(id);
}

export interface CustomLayerProps {
	/**
	 * A MapLibre custom layer (`CustomLayerInterface`): WebGL rendering of
	 * your own, such as three.js or deck.gl. A different object re-adds the
	 * layer.
	 */
	layer: CustomLayerInterface;
	/** As for `<Layer>`: the layer to insert this one before. */
	beforeId?: string | undefined;
}

/**
 * A MapLibre custom layer: `map.addLayer(customLayer, beforeId)`, removed on
 * unmount and re-added if a style change drops it.
 */
export function CustomLayer(props: CustomLayerProps): JSX.Element {
	const ctx = useMapContext();
	const before = createBeforeId(ctx, () => props.beforeId);

	reconcile<
		{ layer: CustomLayerInterface; before: string | undefined },
		string
	>(ctx, {
		spec: () => ({ layer: props.layer, before: before() }),
		create(map, { layer, before }) {
			map.addLayer(layer, before);
			ctx.owned.layers.add(layer.id);
			return layer.id;
		},
		update(map, id, prev, next) {
			if (prev.layer !== next.layer) return false;
			if (prev.before !== next.before) map.moveLayer(id, next.before);
			return true;
		},
		destroy: (map, id) => removeLayer(ctx, map, id),
		style: (map, id) => map.getLayer(id) !== undefined,
	});

	return null;
}
