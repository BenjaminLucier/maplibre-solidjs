import type { Map as MapLibreMap, MapOptions } from "maplibre-gl";

/**
 * How `<Map>` applies each of MapLibre's `MapOptions` after the map exists:
 *
 * - `setter`: through the `Map` method named in {@link MAP_OPTION_SETTERS}.
 * - `handler`: by enabling or disabling the interaction handler of the same
 *   name (`map.scrollZoom.enable(options)` / `.disable()`).
 * - `camera`: by `jumpTo`, for the values that changed.
 * - `bounds`: by `fitBounds(bounds, fitBoundsOptions)`.
 * - `style`: by `setStyle`, keeping the sources and layers components own.
 * - `globalState`: by `setGlobalStateProperty`, for the keys that changed.
 * - `init`: MapLibre has no way to change it after construction, so changes
 *   are ignored, as they would be with MapLibre itself.
 *
 * `satisfies Record<keyof MapOptions, ...>` makes this exhaustive: a MapLibre
 * upgrade that adds an option fails type checking until it is classified.
 */
export const MAP_OPTION_KINDS = {
	hash: "init",
	interactive: "init",
	container: "init",
	bearingSnap: "init",
	zoomSnap: "setter",
	attributionControl: "init",
	maplibreLogo: "init",
	logoPosition: "init",
	canvasContextAttributes: "init",
	refreshExpiredTiles: "init",
	maxBounds: "setter",
	scrollZoom: "handler",
	minZoom: "setter",
	maxZoom: "setter",
	minPitch: "setter",
	maxPitch: "setter",
	anisotropicFilterPitch: "setter",
	boxZoom: "handler",
	dragRotate: "handler",
	dragPan: "handler",
	keyboard: "handler",
	doubleClickZoom: "handler",
	touchZoomRotate: "handler",
	touchPitch: "handler",
	cooperativeGestures: "handler",
	trackResize: "init",
	center: "camera",
	elevation: "camera",
	zoom: "camera",
	bearing: "camera",
	pitch: "camera",
	roll: "camera",
	renderWorldCopies: "setter",
	maxTileCacheSize: "init",
	maxTileCacheZoomLevels: "init",
	transformRequest: "setter",
	transformCameraUpdate: "setter",
	transformConstrain: "setter",
	locale: "init",
	fadeDuration: "init",
	crossSourceCollisions: "init",
	collectResourceTiming: "init",
	clickTolerance: "init",
	bounds: "bounds",
	fitBoundsOptions: "bounds",
	localIdeographFontFamily: "style",
	style: "style",
	pitchWithRotate: "init",
	rollEnabled: "init",
	rotateSpeed: "init",
	pitchSpeed: "init",
	reduceMotion: "init",
	pixelRatio: "setter",
	validateStyle: "style",
	globalState: "globalState",
	transformStyle: "style",
	maxCanvasSize: "init",
	cancelPendingTileRequestsWhileZooming: "init",
	centerClampedToGround: "setter",
	terrainSkirtLength: "init",
	zoomLevelsToOverscale: "init",
	aroundCenter: "init",
} as const satisfies Record<
	keyof MapOptions,
	"init" | "setter" | "handler" | "camera" | "bounds" | "style" | "globalState"
>;

type OptionsOfKind<Kind> = {
	[K in keyof typeof MAP_OPTION_KINDS]: (typeof MAP_OPTION_KINDS)[K] extends Kind
		? K
		: never;
}[keyof typeof MAP_OPTION_KINDS];

/** The `Map` method each `setter` option goes through. */
export const MAP_OPTION_SETTERS = {
	zoomSnap: "setZoomSnap",
	maxBounds: "setMaxBounds",
	minZoom: "setMinZoom",
	maxZoom: "setMaxZoom",
	minPitch: "setMinPitch",
	maxPitch: "setMaxPitch",
	anisotropicFilterPitch: "setAnisotropicFilterPitch",
	renderWorldCopies: "setRenderWorldCopies",
	transformRequest: "setTransformRequest",
	transformCameraUpdate: "setTransformCameraUpdate",
	transformConstrain: "setTransformConstrain",
	pixelRatio: "setPixelRatio",
	centerClampedToGround: "setCenterClampedToGround",
} as const satisfies Record<OptionsOfKind<"setter">, keyof MapLibreMap>;

/** The interaction handlers, with the state MapLibre gives them by default. */
export const MAP_HANDLER_DEFAULTS = {
	scrollZoom: true,
	boxZoom: true,
	dragRotate: true,
	dragPan: true,
	keyboard: true,
	doubleClickZoom: true,
	touchZoomRotate: true,
	touchPitch: true,
	cooperativeGestures: false,
} as const satisfies Record<OptionsOfKind<"handler">, boolean>;

/** The camera options, applied together with `jumpTo`. */
export const MAP_CAMERA_OPTIONS = [
	"center",
	"zoom",
	"bearing",
	"pitch",
	"roll",
	"elevation",
] as const satisfies readonly OptionsOfKind<"camera">[];

/** MapLibre's default vertical field of view, in degrees. */
const DEFAULT_VERTICAL_FIELD_OF_VIEW = (0.6435011087932844 * 180) / Math.PI;

/**
 * Map state that isn't a `MapOptions` option: camera padding, the field of
 * view, the missing-image resolver, and the debug switches MapLibre exposes
 * as properties (`map.showTileBoundaries = true`).
 */
export interface MapPropertyProps {
	/** Camera padding (`setPadding`). */
	padding?: Parameters<MapLibreMap["setPadding"]>[0] | undefined;
	/** The vertical field of view in degrees (`setVerticalFieldOfView`). */
	verticalFieldOfView?: number | undefined;
	/** Called for images the style uses but the map lacks (`setMissingStyleImageResolver`). */
	missingStyleImageResolver?:
		| (Parameters<MapLibreMap["setMissingStyleImageResolver"]>[0] & {})
		| undefined;
	/** Draws tile outlines and ids. */
	showTileBoundaries?: boolean | undefined;
	/** Draws the camera padding box. */
	showPadding?: boolean | undefined;
	/** Draws symbol collision boxes. */
	showCollisionBoxes?: boolean | undefined;
	/** Shows overdraw by blending each pixel. */
	showOverdrawInspector?: boolean | undefined;
	/** Redraws continuously, for benchmarking. */
	repaint?: boolean | undefined;
	/** Draws vertex wireframes. */
	vertices?: boolean | undefined;
}

/**
 * How each {@link MapPropertyProps} prop reaches the map, given the new value
 * or `undefined` to go back to MapLibre's default. Exhaustive like
 * {@link MAP_OPTION_KINDS}.
 */
export const MAP_PROPERTIES: {
	[Key in keyof MapPropertyProps]-?: (
		map: MapLibreMap,
		value: MapPropertyProps[Key],
	) => void;
} = {
	padding: (map, value) =>
		map.setPadding(value ?? { top: 0, bottom: 0, left: 0, right: 0 }),
	verticalFieldOfView: (map, value) =>
		map.setVerticalFieldOfView(value ?? DEFAULT_VERTICAL_FIELD_OF_VIEW),
	missingStyleImageResolver: (map, value) =>
		map.setMissingStyleImageResolver(value ?? null),
	showTileBoundaries: (map, value) => {
		map.showTileBoundaries = value ?? false;
	},
	showPadding: (map, value) => {
		map.showPadding = value ?? false;
	},
	showCollisionBoxes: (map, value) => {
		map.showCollisionBoxes = value ?? false;
	},
	showOverdrawInspector: (map, value) => {
		map.showOverdrawInspector = value ?? false;
	},
	repaint: (map, value) => {
		map.repaint = value ?? false;
	},
	vertices: (map, value) => {
		map.vertices = value ?? false;
	},
};
