import { Loading } from "@solidjs/web";
import type { FeatureCollection } from "geojson";
import { createMapState, Layer, Map, Source } from "maplibre-solidjs";
import { createMemo } from "solid-js";
import { basemap } from "../theme";

const EARTHQUAKES =
	"https://maplibre.org/maplibre-gl-js/docs/assets/earthquakes.geojson";

/** Map state as accessors: pending until the map is ready, then updated on each event. */
function CameraReadout() {
	const zoom = createMapState((map) => map.getZoom(), ["zoom"]);
	const center = createMapState((map) => map.getCenter(), ["move"]);
	return (
		<span>
			zoom {zoom().toFixed(2)} · {center().lat.toFixed(3)},{" "}
			{center().lng.toFixed(3)}
		</span>
	);
}

export default function AsyncData() {
	// An async memo: the source waits for it, and so does <Loading>.
	const quakes = createMemo(async () => {
		const response = await fetch(EARTHQUAKES);
		return (await response.json()) as FeatureCollection;
	});

	return (
		<Map style={basemap()} center={[-120, 50]} zoom={2} class="h-full w-full">
			<Source type="geojson" data={quakes()}>
				<Layer
					type="heatmap"
					maxzoom={9}
					paint={{
						"heatmap-weight": [
							"interpolate",
							["linear"],
							["get", "mag"],
							0,
							0,
							6,
							1,
						],
						"heatmap-intensity": [
							"interpolate",
							["linear"],
							["zoom"],
							0,
							1,
							9,
							3,
						],
						"heatmap-radius": [
							"interpolate",
							["linear"],
							["zoom"],
							0,
							2,
							9,
							20,
						],
						"heatmap-opacity": [
							"interpolate",
							["linear"],
							["zoom"],
							7,
							1,
							9,
							0,
						],
					}}
				/>
				<Layer
					type="circle"
					minzoom={7}
					paint={{
						"circle-radius": [
							"interpolate",
							["linear"],
							["get", "mag"],
							1,
							2,
							6,
							10,
						],
						"circle-color": "#e11d48",
						"circle-stroke-color": "#ffffff",
						"circle-stroke-width": 1,
					}}
				/>
			</Source>

			<div class="absolute top-3 left-3 rounded-md bg-white/90 px-3 py-2 font-mono text-xs text-slate-800 shadow dark:bg-slate-900/90 dark:text-slate-200">
				<Loading fallback={<span>Loading earthquakes…</span>}>
					<div>{quakes().features.length} earthquakes</div>
					<CameraReadout />
				</Loading>
			</div>
		</Map>
	);
}
