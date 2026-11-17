import type { JSX } from "@solidjs/web";
import {
	type AttributionControlOptions,
	type ControlPosition,
	type Evented,
	type FullscreenControlEventType,
	type FullscreenControlOptions,
	type GeolocateControlEventType,
	type GeolocateControlOptions,
	type IControl,
	type LogoControlOptions,
	AttributionControl as MapLibreAttributionControl,
	FullscreenControl as MapLibreFullscreenControl,
	GeolocateControl as MapLibreGeolocateControl,
	GlobeControl as MapLibreGlobeControl,
	LogoControl as MapLibreLogoControl,
	NavigationControl as MapLibreNavigationControl,
	ScaleControl as MapLibreScaleControl,
	TerrainControl as MapLibreTerrainControl,
	type NavigationControlOptions,
	type ScaleControlOptions,
	type TerrainSpecification,
} from "maplibre-gl";
import { type Accessor, createMemo, createSignal, untrack } from "solid-js";
import { useMapContext } from "./context.js";
import { equal } from "./internal/equal.js";
import {
	bindEvents,
	type CoversEvents,
	type EventProps,
	type EventTable,
} from "./internal/events.js";
import { specOf } from "./internal/props.js";
import { reconcile } from "./internal/reconcile.js";
import { applyRef } from "./internal/ref.js";
import type { AllowUndefined } from "./internal/types.js";
import { useSourceId } from "./source.js";

interface ControlOwnProps<Instance> {
	/** The corner to put the control in. Defaults to the control's own default. */
	position?: ControlPosition | undefined;
	/** Receives the control each time it is created. */
	ref?: JSX.Ref<Instance>;
}

export interface ControlProps<Instance extends IControl = IControl> {
	/** Any control implementing MapLibre's `IControl`. A different object replaces it. */
	control: Instance;
	position?: ControlPosition | undefined;
}

/**
 * Adds any `IControl` to the map (`map.addControl(control, position)`), and
 * removes it on unmount. For your own controls; MapLibre's built-in ones
 * have their own components.
 */
export function Control<Instance extends IControl>(
	props: ControlProps<Instance>,
): JSX.Element {
	const ctx = useMapContext();
	reconcile<
		{ control: Instance; position: ControlPosition | undefined },
		Instance
	>(ctx, {
		spec: () => ({ control: props.control, position: props.position }),
		create(map, { control, position }) {
			map.addControl(control, position);
			return control;
		},
		destroy(map, control) {
			if (map.hasControl(control)) map.removeControl(control);
		},
	});
	return null;
}

/**
 * Builds the component for one of MapLibre's controls: options as props, a
 * new control when an option changes (MapLibre's controls have no setters,
 * except where `update` applies one), and event props.
 */
function builtIn<Options extends object, Instance extends IControl>(
	props: ControlOwnProps<Instance>,
	construct: (options: Options) => Instance,
	options: {
		events?: EventTable;
		update?: (control: Instance, prev: Options, next: Options) => boolean;
		spec?: () => Options | undefined;
	} = {},
): void {
	const ctx = useMapContext();
	const [control, setControl] = createSignal<Instance | undefined>(undefined, {
		equals: false,
	});
	const hidden = new Set([
		"position",
		"ref",
		...Object.keys(options.events ?? {}),
	]);

	reconcile<
		{ options: Options; position: ControlPosition | undefined },
		Instance
	>(ctx, {
		spec() {
			const spec = options.spec
				? options.spec()
				: specOf<Options>(props, (key) => hidden.has(key));
			return spec && { options: spec, position: props.position };
		},
		create(map, { options, position }) {
			const control = construct(options);
			map.addControl(control, position);
			return control;
		},
		update(_map, control, prev, next) {
			if (prev.position !== next.position) return false;
			if (equal(prev.options, next.options)) return true;
			return options.update?.(control, prev.options, next.options) ?? false;
		},
		destroy(map, control) {
			if (map.hasControl(control)) map.removeControl(control);
		},
		instance(control) {
			setControl(() => control);
			if (control)
				applyRef(
					untrack(() => props.ref),
					control,
				);
		},
	});

	if (options.events)
		bindEvents(control as Accessor<Evented | undefined>, props, options.events);
}

export type NavigationControlProps = AllowUndefined<NavigationControlOptions> &
	ControlOwnProps<MapLibreNavigationControl>;

/** Zoom buttons and a compass (`NavigationControl`). */
export function NavigationControl(props: NavigationControlProps): JSX.Element {
	builtIn<NavigationControlOptions, MapLibreNavigationControl>(
		props,
		(options) => new MapLibreNavigationControl(options),
	);
	return null;
}

/** `<GeolocateControl>` event props. */
export const GEOLOCATE_CONTROL_EVENTS = {
	onGeolocate: "geolocate",
	onError: "error",
	onOutOfMaxBounds: "outofmaxbounds",
	onTrackUserLocationStart: "trackuserlocationstart",
	onTrackUserLocationEnd: "trackuserlocationend",
	onUserLocationFocus: "userlocationfocus",
	onUserLocationLostFocus: "userlocationlostfocus",
} as const satisfies Record<string, keyof GeolocateControlEventType>;
GEOLOCATE_CONTROL_EVENTS satisfies CoversEvents<
	typeof GEOLOCATE_CONTROL_EVENTS,
	GeolocateControlEventType
>;
export type GeolocateControlEventProps = EventProps<
	typeof GEOLOCATE_CONTROL_EVENTS,
	GeolocateControlEventType
>;

export type GeolocateControlProps = AllowUndefined<GeolocateControlOptions> &
	ControlOwnProps<MapLibreGeolocateControl> &
	GeolocateControlEventProps;

/**
 * A button that shows the user's location (`GeolocateControl`). Call
 * `trigger()` on the instance from `ref` to locate programmatically.
 */
export function GeolocateControl(props: GeolocateControlProps): JSX.Element {
	builtIn<GeolocateControlOptions, MapLibreGeolocateControl>(
		props,
		(options) => new MapLibreGeolocateControl(options),
		{
			events: GEOLOCATE_CONTROL_EVENTS,
		},
	);
	return null;
}

export type ScaleControlProps = AllowUndefined<ScaleControlOptions> &
	ControlOwnProps<MapLibreScaleControl>;

/** A scale bar (`ScaleControl`). `unit` changes in place (`setUnit`). */
export function ScaleControl(props: ScaleControlProps): JSX.Element {
	builtIn<ScaleControlOptions, MapLibreScaleControl>(
		props,
		(options) => new MapLibreScaleControl(options),
		{
			update(control, prev, next) {
				if (prev.maxWidth !== next.maxWidth) return false;
				control.setUnit(next.unit ?? "metric");
				return true;
			},
		},
	);
	return null;
}

/** `<FullscreenControl>` event props. */
export const FULLSCREEN_CONTROL_EVENTS = {
	onFullscreenStart: "fullscreenstart",
	onFullscreenEnd: "fullscreenend",
} as const satisfies Record<string, keyof FullscreenControlEventType>;
FULLSCREEN_CONTROL_EVENTS satisfies CoversEvents<
	typeof FULLSCREEN_CONTROL_EVENTS,
	FullscreenControlEventType
>;
export type FullscreenControlEventProps = EventProps<
	typeof FULLSCREEN_CONTROL_EVENTS,
	FullscreenControlEventType
>;

export type FullscreenControlProps = AllowUndefined<FullscreenControlOptions> &
	ControlOwnProps<MapLibreFullscreenControl> &
	FullscreenControlEventProps;

/** A button that toggles fullscreen (`FullscreenControl`). */
export function FullscreenControl(props: FullscreenControlProps): JSX.Element {
	builtIn<FullscreenControlOptions, MapLibreFullscreenControl>(
		props,
		(options) => new MapLibreFullscreenControl(options),
		{
			events: FULLSCREEN_CONTROL_EVENTS,
		},
	);
	return null;
}

export type AttributionControlProps =
	AllowUndefined<AttributionControlOptions> &
		ControlOwnProps<MapLibreAttributionControl>;

/**
 * The sources' attributions (`AttributionControl`). `<Map>` adds one by
 * default; pass `attributionControl={false}` to the map when using this.
 */
export function AttributionControl(
	props: AttributionControlProps,
): JSX.Element {
	builtIn<AttributionControlOptions, MapLibreAttributionControl>(
		props,
		(options) => new MapLibreAttributionControl(options),
	);
	return null;
}

export type LogoControlProps = AllowUndefined<LogoControlOptions> &
	ControlOwnProps<MapLibreLogoControl>;

/**
 * The MapLibre logo (`LogoControl`). `<Map maplibreLogo>` is the built-in
 * way to show it; this component places it explicitly.
 */
export function LogoControl(props: LogoControlProps): JSX.Element {
	builtIn<LogoControlOptions, MapLibreLogoControl>(
		props,
		(options) => new MapLibreLogoControl(options),
	);
	return null;
}

export type TerrainControlProps = AllowUndefined<
	Omit<TerrainSpecification, "source">
> &
	ControlOwnProps<MapLibreTerrainControl> & {
		/** A `raster-dem` source id. Defaults to the enclosing `<Source>`. */
		source?: string | undefined;
	};

/** A button that toggles 3D terrain from a `raster-dem` source (`TerrainControl`). */
export function TerrainControl(props: TerrainControlProps): JSX.Element {
	const sourceId = useSourceId();
	const source = createMemo(() => props.source ?? sourceId?.());
	builtIn<TerrainSpecification, MapLibreTerrainControl>(
		props,
		(options) => new MapLibreTerrainControl(options),
		{
			spec() {
				const id = source();
				if (id === undefined) return undefined;
				return {
					...specOf<TerrainSpecification>(
						props,
						(key) => key === "position" || key === "ref",
					),
					source: id,
				};
			},
		},
	);
	return null;
}

export type GlobeControlProps = ControlOwnProps<MapLibreGlobeControl>;

/** A button that toggles the globe projection (`GlobeControl`). */
export function GlobeControl(props: GlobeControlProps): JSX.Element {
	builtIn<Record<never, never>, MapLibreGlobeControl>(
		props,
		() => new MapLibreGlobeControl(),
	);
	return null;
}
