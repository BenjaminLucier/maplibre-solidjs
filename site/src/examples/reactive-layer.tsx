import { Layer, Map, Source } from "maplibre-solidjs";
import { createSignal, Show } from "solid-js";
import { cities } from "../data/cities";
import { basemap } from "../theme";

export default function ReactiveLayer() {
	const [radius, setRadius] = createSignal(6);
	const [color, setColor] = createSignal("#2563eb");
	const [minPopulation, setMinPopulation] = createSignal(0);
	const [labels, setLabels] = createSignal(true);

	return (
		<Map style={basemap()} center={[30, 20]} zoom={1.3} class="h-full w-full">
			<Source type="geojson" data={cities}>
				{/* Each change goes through setPaintProperty or setFilter; the layer is never re-created. */}
				<Layer
					type="circle"
					filter={[">=", ["get", "population"], minPopulation()]}
					paint={{
						"circle-radius": [
							"*",
							radius(),
							["sqrt", ["/", ["get", "population"], 10]],
						],
						"circle-color": color(),
						"circle-opacity": 0.8,
						"circle-stroke-width": 1.5,
						"circle-stroke-color": "#ffffff",
					}}
				/>
				<Show when={labels()}>
					<Layer
						type="symbol"
						filter={[">=", ["get", "population"], minPopulation()]}
						layout={{
							"text-field": ["get", "name"],
							"text-font": ["Noto Sans Regular"],
							"text-size": 12,
							"text-offset": [0, 1.5],
						}}
						paint={{ "text-halo-color": "#ffffff", "text-halo-width": 1.5 }}
					/>
				</Show>
			</Source>

			<form class="absolute top-3 left-3 grid w-60 gap-3 rounded-lg bg-white/95 p-4 text-xs text-slate-700 shadow dark:bg-slate-900/95 dark:text-slate-300">
				<label class="grid gap-1">
					Radius scale: {radius()}
					<input
						type="range"
						min="2"
						max="14"
						value={radius()}
						onInput={(event) => setRadius(event.currentTarget.valueAsNumber)}
					/>
				</label>
				<label class="grid gap-1">
					At least {minPopulation()} million people
					<input
						type="range"
						min="0"
						max="30"
						value={minPopulation()}
						onInput={(event) =>
							setMinPopulation(event.currentTarget.valueAsNumber)
						}
					/>
				</label>
				<label class="flex items-center justify-between">
					Color
					<input
						type="color"
						value={color()}
						onInput={(event) => setColor(event.currentTarget.value)}
					/>
				</label>
				<label class="flex items-center gap-2">
					<input
						type="checkbox"
						checked={labels()}
						onChange={(event) => setLabels(event.currentTarget.checked)}
					/>
					Labels
				</label>
			</form>
		</Map>
	);
}
