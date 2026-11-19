import { For } from "solid-js";
import { usePageTitle } from "../title";

interface Entry {
	name: string;
	maplibre: string;
	notes: string;
}

const GROUPS: { title: string; entries: Entry[] }[] = [
	{
		title: "Map",
		entries: [
			{
				name: "<Map>",
				maplibre: "new Map(options)",
				notes:
					"Every MapOptions option and map event as props, plus padding, verticalFieldOfView, missingStyleImageResolver and the debug flags. containerStyle, class and id style its <div>. On the server, renders that <div> empty, without its children.",
			},
			{
				name: "<MapProvider>",
				maplibre: "–",
				notes: "Makes each <Map id> inside it reachable with useMapById.",
			},
		],
	},
	{
		title: "Data and style",
		entries: [
			{
				name: "<Source>",
				maplibre: "addSource",
				notes:
					"Every source type. setData, setClusterOptions, setUrl, setTiles, updateImage and setCoordinates in place; tileLodParams through setSourceTileLodParams. Events: onData, onDataLoading, onDataAbort, onError.",
			},
			{
				name: "<Layer>",
				maplibre: "addLayer",
				notes:
					"Every layer type. paint and layout per property, filter, minzoom/maxzoom and beforeId in place. Layer-scoped mouse and touch events.",
			},
			{
				name: "<CustomLayer>",
				maplibre: "addLayer",
				notes: "A CustomLayerInterface, for your own WebGL rendering.",
			},
			{
				name: "<MapImage>",
				maplibre: "addImage / updateImage",
				notes:
					"From an image, ImageData or bitmap, or from url through loadImage.",
			},
			{
				name: "<FeatureState>",
				maplibre: "setFeatureState",
				notes: "Removes only the keys it set when it unmounts.",
			},
			{
				name: "<Sky>, <Light>",
				maplibre: "setSky, setLight",
				notes: "The specification's properties as props.",
			},
			{
				name: "<Terrain>",
				maplibre: "setTerrain",
				notes: "From the enclosing raster-dem <Source>, or source by id.",
			},
			{
				name: "<Projection>",
				maplibre: "setProjection",
				notes: 'type="globe" or "mercator", or an expression.',
			},
			{
				name: "<Glyphs>, <FontFaces>, <Sprite>",
				maplibre: "setGlyphs, setFontFaces, addSprite",
				notes: "Style resources.",
			},
		],
	},
	{
		title: "Markers and popups",
		entries: [
			{
				name: "<Marker>",
				maplibre: "Marker",
				notes:
					"Every option; setters in place. Children become the marker element. Events: onDragStart, onDrag, onDragEnd, onClick.",
			},
			{
				name: "<Popup>",
				maplibre: "Popup",
				notes:
					"Standalone at lngLat or trackPointer, or inside a <Marker>. Children, html or text as content; html goes to setHTML unsanitised, so sanitise untrusted content or use text or children. Events: onOpen, onClose.",
			},
		],
	},
	{
		title: "Controls",
		entries: [
			{
				name: "<Control>",
				maplibre: "addControl",
				notes: "Any IControl at a position.",
			},
			{
				name: "<NavigationControl>",
				maplibre: "NavigationControl",
				notes: "showCompass, showZoom, visualizePitch, visualizeRoll.",
			},
			{
				name: "<GeolocateControl>",
				maplibre: "GeolocateControl",
				notes: "Every option, and all seven events.",
			},
			{
				name: "<ScaleControl>",
				maplibre: "ScaleControl",
				notes: "unit changes in place.",
			},
			{
				name: "<FullscreenControl>",
				maplibre: "FullscreenControl",
				notes: "onFullscreenStart, onFullscreenEnd.",
			},
			{
				name: "<AttributionControl>, <LogoControl>",
				maplibre: "AttributionControl, LogoControl",
				notes:
					"Pass attributionControl={false} to <Map> when placing your own.",
			},
			{
				name: "<TerrainControl>, <GlobeControl>",
				maplibre: "TerrainControl, GlobeControl",
				notes: "TerrainControl takes its source from the enclosing <Source>.",
			},
		],
	},
	{
		title: "Hooks and primitives",
		entries: [
			{
				name: "useMap()",
				maplibre: "–",
				notes: "The enclosing map, pending until its style has loaded.",
			},
			{
				name: "useMapById(id)",
				maplibre: "–",
				notes:
					"A map inside the enclosing <MapProvider>, pending until it exists and is ready.",
			},
			{
				name: "createMapState(read, events)",
				maplibre: "–",
				notes: "Map state as an accessor, re-read on events.",
			},
			{
				name: "createMapEvent(type, [layer], listener)",
				maplibre: "map.on / map.off",
				notes: "A listener tied to its owner's lifetime.",
			},
			{
				name: "useSourceId()",
				maplibre: "–",
				notes:
					"The enclosing <Source>'s id, for your own layer-like components.",
			},
		],
	},
	{
		title: "Exported tables",
		entries: [
			{
				name: "MAP_OPTION_KINDS",
				maplibre: "MapOptions",
				notes:
					"How <Map> applies each option after construction: setter, handler, camera, bounds, style, globalState or init.",
			},
			{
				name: "MAP_OPTION_SETTERS",
				maplibre: "Map setters",
				notes: "The Map method each setter option goes through.",
			},
			{
				name: "MAP_HANDLER_DEFAULTS",
				maplibre: "Map handlers",
				notes:
					"Each interaction handler, enabled or disabled by default as in MapLibre. A removed handler prop goes back to this.",
			},
			{
				name: "MAP_CAMERA_OPTIONS",
				maplibre: "jumpTo",
				notes: "The camera props, applied together with jumpTo.",
			},
			{
				name: "MAP_PROPERTIES",
				maplibre: "Map setters, properties",
				notes:
					"How the props outside MapOptions (padding, debug flags, …) reach the map.",
			},
			{
				name: "MAP_EVENTS, LAYER_EVENTS",
				maplibre: "MapEventType, MapLayerEventType",
				notes: "<Map> and <Layer> event props and the events they listen to.",
			},
			{
				name: "SOURCE_EVENTS",
				maplibre: "Source events",
				notes: "onData, onDataLoading, onDataAbort, onError.",
			},
			{
				name: "SOURCE_SETTERS",
				maplibre: "Source setters",
				notes:
					"The properties of each source type that change in place. Any other change re-creates the source.",
			},
			{
				name: "MARKER_EVENTS",
				maplibre: "Marker events",
				notes: "onDragStart, onDrag, onDragEnd, onClick.",
			},
			{
				name: "MARKER_OPTION_KINDS",
				maplibre: "MarkerOptions",
				notes:
					"How <Marker> applies each option: setter, or init to re-create the marker.",
			},
			{
				name: "POPUP_EVENTS",
				maplibre: "PopupEventType",
				notes: "onOpen, onClose.",
			},
			{
				name: "POPUP_OPTION_KINDS",
				maplibre: "PopupOptions",
				notes:
					"How <Popup> applies each option: setter, or init to re-create the popup.",
			},
			{
				name: "GEOLOCATE_CONTROL_EVENTS",
				maplibre: "GeolocateControlEventType",
				notes:
					"onGeolocate, onError, onOutOfMaxBounds, onTrackUserLocationStart, onTrackUserLocationEnd, onUserLocationFocus, onUserLocationLostFocus.",
			},
			{
				name: "FULLSCREEN_CONTROL_EVENTS",
				maplibre: "FullscreenControlEventType",
				notes: "onFullscreenStart, onFullscreenEnd.",
			},
		],
	},
];

export default function Api() {
	usePageTitle(() => "API");
	return (
		<div class="mx-auto max-w-6xl px-4 py-10">
			<h1 class="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
				API
			</h1>
			<p class="mt-3 max-w-3xl text-slate-600 dark:text-slate-400">
				Prop types come from <code>maplibre-gl</code>, so your editor shows the
				full list for each component. The exported tables, listed at the end,
				say exactly how each prop is applied.
			</p>
			<For each={GROUPS}>
				{(group) => (
					<section class="mt-10">
						<h2 class="mb-3 text-xl font-semibold text-slate-900 dark:text-white">
							{group.title}
						</h2>
						<div class="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
							<table class="w-full text-left text-sm">
								<thead class="bg-slate-50 text-slate-900 dark:bg-slate-900 dark:text-white">
									<tr>
										<th class="px-4 py-2 font-semibold">Name</th>
										<th class="px-4 py-2 font-semibold">MapLibre</th>
										<th class="px-4 py-2 font-semibold">Notes</th>
									</tr>
								</thead>
								<tbody>
									<For each={group.entries}>
										{(entry) => (
											<tr class="border-t border-slate-200 align-top dark:border-slate-800">
												<td class="px-4 py-2.5 font-mono text-[13px] whitespace-nowrap text-slate-900 dark:text-slate-100">
													{entry.name}
												</td>
												<td class="px-4 py-2.5 font-mono text-[13px] text-slate-600 dark:text-slate-400">
													{entry.maplibre}
												</td>
												<td class="px-4 py-2.5 text-slate-600 dark:text-slate-400">
													{entry.notes}
												</td>
											</tr>
										)}
									</For>
								</tbody>
							</table>
						</div>
					</section>
				)}
			</For>
		</div>
	);
}
