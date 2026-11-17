import type { JSX } from "@solidjs/web";
import type {
	CanvasSource,
	CanvasSourceSpecification,
	GeoJSONSource,
	GeoJSONSourceSpecification,
	ImageSource,
	ImageSourceSpecification,
	RasterDEMSourceSpecification,
	RasterDEMTileSource,
	RasterSourceSpecification,
	RasterTileSource,
	SourceEventType,
	VectorSourceSpecification,
	VectorTileSource,
	VideoSource,
	VideoSourceSpecification,
} from "maplibre-gl";
import {
	type Accessor,
	createContext,
	createEffect,
	createMemo,
	createSignal,
	untrack,
	useContext,
} from "solid-js";
import { useMapContext } from "./context.js";
import { equal, without } from "./internal/equal.js";
import {
	bindEvents,
	type CoversEvents,
	type EventProps,
} from "./internal/events.js";
import { generateId, specOf } from "./internal/props.js";
import { attempt, reconcile } from "./internal/reconcile.js";
import { applyRef } from "./internal/ref.js";
import type { AllowUndefined } from "./internal/types.js";

/** `<Source>` event props: the events a source instance fires. */
export const SOURCE_EVENTS = {
	onData: "data",
	onDataLoading: "dataloading",
	onDataAbort: "dataabort",
	onError: "error",
} as const satisfies Record<string, keyof SourceEventType>;
SOURCE_EVENTS satisfies CoversEvents<typeof SOURCE_EVENTS, SourceEventType>;
export type SourceEventProps = EventProps<
	typeof SOURCE_EVENTS,
	SourceEventType
>;

/** The specification and the instance MapLibre creates for each source type. */
interface SourceTypes {
	vector: [VectorSourceSpecification, VectorTileSource];
	raster: [RasterSourceSpecification, RasterTileSource];
	"raster-dem": [RasterDEMSourceSpecification, RasterDEMTileSource];
	geojson: [GeoJSONSourceSpecification, GeoJSONSource];
	image: [ImageSourceSpecification, ImageSource];
	video: [VideoSourceSpecification, VideoSource];
	canvas: [CanvasSourceSpecification, CanvasSource];
}

/** A MapLibre source instance of any type. */
export type SourceInstance = SourceTypes[keyof SourceTypes][1];

/** Any source specification `<Source>` accepts. */
export type SourceSpecification = SourceTypes[keyof SourceTypes][0];

interface SourceOwnProps<Instance> {
	/** The source id. Generated when omitted; layers inside the source don't need it. */
	id?: string | undefined;
	/** Receives the MapLibre source instance each time the source is added. */
	ref?: JSX.Ref<Instance>;
	/** Layers that draw this source; they don't need a `source` prop. */
	children?: JSX.Element;
	/**
	 * How many zoom levels of tiles may show at once when the map is pitched
	 * (`map.setSourceTileLodParams(..., id)`). MapLibre's default is 9.314
	 * and 3.
	 */
	tileLodParams?: TileLodParams | undefined;
}

/** Level-of-detail parameters for a source's tiles. */
export interface TileLodParams {
	maxZoomLevelsOnScreen: number;
	tileCountMaxMinRatio: number;
}

const DEFAULT_TILE_LOD: TileLodParams = {
	maxZoomLevelsOnScreen: 9.314,
	tileCountMaxMinRatio: 3,
};

/**
 * `<Source>` props: a MapLibre source specification of any type, discriminated
 * by `type`, plus `id`, `ref`, `children` and the source events.
 */
export type SourceProps = {
	[Type in keyof SourceTypes]: AllowUndefined<SourceTypes[Type][0]> &
		SourceOwnProps<SourceTypes[Type][1]> &
		SourceEventProps;
}[keyof SourceTypes];

/**
 * The properties of each source type that MapLibre can change in place.
 * Changing any other property re-creates the source (and re-adds its layers).
 */
export const SOURCE_SETTERS = {
	geojson: ["data", "cluster", "clusterRadius", "clusterMaxZoom"],
	vector: ["url", "tiles"],
	raster: ["url", "tiles"],
	"raster-dem": ["url", "tiles"],
	image: ["url", "coordinates"],
	video: ["coordinates"],
	canvas: ["coordinates"],
} as const satisfies {
	[Type in keyof SourceTypes]: readonly (keyof SourceTypes[Type][0])[];
};

const OWN_PROPS = new Set([
	"id",
	"ref",
	"children",
	"tileLodParams",
	...Object.keys(SOURCE_EVENTS),
]);

/** What a `<Source>` shares with the components inside it. */
export interface EnclosingSource {
	id: Accessor<string>;
	/**
	 * `true` once the source's specification has resolved and the map is
	 * ready: the source is added in that same flush, before any child's
	 * effect runs, since parent effects run first. Pending until then.
	 * Children read this instead of polling the map, which would make them
	 * re-run after the source's effect.
	 */
	added: Accessor<boolean>;
}

const SourceContext = createContext<EnclosingSource>(undefined, {
	name: "SourceContext",
});

/** The enclosing `<Source>`, or `undefined` outside one. */
export function useEnclosingSource(): EnclosingSource | undefined {
	try {
		return useContext(SourceContext);
	} catch {
		return undefined;
	}
}

/** The id of the enclosing `<Source>`, or `undefined` outside one. */
export function useSourceId(): Accessor<string> | undefined {
	return useEnclosingSource()?.id;
}

/**
 * A MapLibre source: `map.addSource(id, spec)`, removed on unmount.
 *
 * Props are the source specification for its `type`. Changes go through the
 * source's setters where MapLibre has them (see {@link SOURCE_SETTERS}):
 * GeoJSON `data` through `setData`, clustering through `setClusterOptions`,
 * tile `url` and `tiles` through `setUrl` and `setTiles`, and image, video
 * and canvas `coordinates` through `setCoordinates`. Any other change
 * re-creates the source, re-adding the layers that use it.
 *
 * Any prop may be an async value, such as GeoJSON from an async
 * `createMemo`: the source is added once it has resolved, and updated in
 * place when it changes.
 */
export function Source(props: SourceProps): JSX.Element {
	const ctx = useMapContext();
	const fallbackId = generateId("source");
	const id = createMemo(() => props.id ?? fallbackId);
	const [instance, setInstance] = createSignal<SourceInstance | undefined>(
		undefined,
		{
			equals: false,
		},
	);

	const spec = createMemo(() => ({
		...specOf<SourceSpecification>(props, (key) => OWN_PROPS.has(key)),
		id: id(),
	}));
	const added = createMemo(() => {
		ctx.ready();
		spec();
		return true;
	});

	reconcile<SourceSpecification & { id: string }, SourceInstance>(ctx, {
		spec,
		create(map, { id, ...spec }) {
			map.addSource(id, spec);
			ctx.owned.sources.add(id);
			return map.getSource(id) as SourceInstance;
		},
		update: (_map, source, prev, next) => updateSource(source, prev, next),
		destroy(map, _source, { id }) {
			ctx.owned.sources.delete(id);
			if (!map.getSource(id)) return;
			for (const layer of map.getLayersOrder()) {
				if (map.getLayer(layer)?.source === id) map.removeLayer(layer);
			}
			map.removeSource(id);
		},
		style: (map, source) => map.getSource(source.id) === source,
		instance(source) {
			setInstance(() => source);
			if (source)
				applyRef(untrack(() => props.ref) as JSX.Ref<SourceInstance>, source);
		},
	});

	bindEvents(instance, props, SOURCE_EVENTS);

	// Re-applied each time the source is added: a new source starts from
	// MapLibre's default.
	let lodApplied = false;
	createEffect(
		() => ({ source: instance(), lod: props.tileLodParams }),
		({ source, lod }) => {
			if (!source || (!lod && !lodApplied)) return;
			lodApplied = lod !== undefined;
			const { maxZoomLevelsOnScreen, tileCountMaxMinRatio } =
				lod ?? DEFAULT_TILE_LOD;
			attempt(ctx.map, () =>
				ctx.map.setSourceTileLodParams(
					maxZoomLevelsOnScreen,
					tileCountMaxMinRatio,
					source.id,
				),
			);
		},
	);

	return <SourceContext value={{ id, added }}>{props.children}</SourceContext>;
}

/** Applies a changed specification through the source's setters, if it can. */
function updateSource(
	source: SourceInstance,
	prev: SourceSpecification & { id: string },
	next: SourceSpecification & { id: string },
): boolean {
	if (prev.type !== next.type) return false;
	const settable: readonly string[] =
		SOURCE_SETTERS[next.type as keyof typeof SOURCE_SETTERS] ?? [];
	if (!equal(without(prev, settable), without(next, settable))) return false;
	const changed = (key: string) =>
		!equal(
			(prev as Record<string, unknown>)[key],
			(next as Record<string, unknown>)[key],
		);

	switch (next.type) {
		case "geojson": {
			const geojson = source as GeoJSONSource;
			const before = prev as GeoJSONSourceSpecification;
			if (changed("data")) geojson.setData(next.data);
			if (
				changed("cluster") ||
				changed("clusterRadius") ||
				changed("clusterMaxZoom")
			) {
				const options: Parameters<GeoJSONSource["setClusterOptions"]>[0] = {};
				if (next.cluster !== undefined) options.cluster = next.cluster;
				if (next.clusterRadius !== undefined)
					options.clusterRadius = next.clusterRadius;
				if (next.clusterMaxZoom !== undefined)
					options.clusterMaxZoom = next.clusterMaxZoom;
				if (before.cluster && next.cluster === undefined)
					options.cluster = false;
				geojson.setClusterOptions(options);
			}
			return true;
		}
		case "vector":
		case "raster":
		case "raster-dem": {
			const tiled = source as VectorTileSource | RasterTileSource;
			if (changed("url")) {
				if (next.url === undefined) return false;
				tiled.setUrl(next.url);
			}
			if (changed("tiles")) {
				if (next.tiles === undefined) return false;
				tiled.setTiles(next.tiles);
			}
			return true;
		}
		case "image": {
			const image = source as ImageSource;
			if (changed("url")) {
				if (next.url === undefined) return false;
				image.updateImage({ url: next.url, coordinates: next.coordinates });
			} else if (changed("coordinates")) {
				image.setCoordinates(next.coordinates);
			}
			return true;
		}
		case "video":
		case "canvas":
			if (changed("coordinates"))
				(source as ImageSource).setCoordinates(next.coordinates);
			return true;
	}
}
