import { Layer, Map, Source } from "maplibre-solidjs";
import { createSignal, For } from "solid-js";
import { cities } from "../data/cities";
import { BASEMAPS } from "../theme";

type Basemap = keyof typeof BASEMAPS;

export default function StyleSwitch() {
	const [basemap, setBasemap] = createSignal<Basemap>("liberty");

	return (
		// A new style prop goes through setStyle, diffed against the current one.
		<Map
			style={BASEMAPS[basemap()]}
			center={[10, 45]}
			zoom={3}
			class="h-full w-full"
		>
			{/* Sources and layers from components are carried over to each new style. */}
			<Source type="geojson" data={cities}>
				<Layer
					type="circle"
					paint={{
						"circle-radius": 7,
						"circle-color": "#7c3aed",
						"circle-stroke-color": "#ffffff",
						"circle-stroke-width": 2,
					}}
				/>
			</Source>

			<div class="absolute top-3 left-3 flex gap-1 rounded-lg bg-white/95 p-2 text-xs text-slate-700 shadow dark:bg-slate-900/95 dark:text-slate-300">
				<For each={Object.keys(BASEMAPS) as Basemap[]}>
					{(name) => (
						<button
							type="button"
							class={`rounded-md px-2.5 py-1 capitalize ${
								basemap() === name
									? "bg-violet-600 text-white"
									: "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700"
							}`}
							onClick={() => setBasemap(name)}
						>
							{name}
						</button>
					)}
				</For>
			</div>
		</Map>
	);
}
