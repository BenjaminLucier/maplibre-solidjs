import {
	Layer,
	Map,
	NavigationControl,
	Sky,
	Source,
	Terrain,
	TerrainControl,
} from "maplibre-solidjs";
import { createSignal } from "solid-js";
import { basemap } from "../theme";

const DEM = "https://demotiles.maplibre.org/terrain-tiles/tiles.json";

export default function TerrainExample() {
	const [exaggeration, setExaggeration] = createSignal(1.5);

	return (
		<Map
			style={basemap()}
			center={[11.39085, 47.27574]}
			zoom={12}
			pitch={70}
			maxPitch={85}
			class="h-full w-full"
		>
			<Sky
				sky-color="#199EF3"
				sky-horizon-blend={0.5}
				horizon-color="#ffffff"
				horizon-fog-blend={0.5}
				fog-color="#0000ff"
				fog-ground-blend={0.5}
			/>
			<Source type="raster-dem" url={DEM} tileSize={256}>
				<Terrain exaggeration={exaggeration()} />
				<TerrainControl position="top-right" />
			</Source>
			{/* MapLibre recommends a separate source for hillshading. */}
			<Source type="raster-dem" url={DEM} tileSize={256}>
				<Layer
					type="hillshade"
					paint={{ "hillshade-shadow-color": "#473B24" }}
				/>
			</Source>
			<NavigationControl position="top-right" visualizePitch />

			<label class="absolute top-3 left-3 grid w-56 gap-1 rounded-lg bg-white/95 p-3 text-xs text-slate-700 shadow dark:bg-slate-900/95 dark:text-slate-300">
				Exaggeration: {exaggeration().toFixed(1)}
				<input
					type="range"
					min="0"
					max="4"
					step="0.1"
					value={exaggeration()}
					onInput={(event) =>
						setExaggeration(event.currentTarget.valueAsNumber)
					}
				/>
			</label>
		</Map>
	);
}
