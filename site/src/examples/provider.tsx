import { Loading } from "@solidjs/web";
import {
	Map,
	MapProvider,
	NavigationControl,
	useMapById,
} from "maplibre-solidjs";
import { createSignal, For } from "solid-js";
import { basemap } from "../theme";

const PLACES: { name: string; center: [number, number]; zoom: number }[] = [
	{ name: "Tokyo", center: [139.6917, 35.6895], zoom: 10 },
	{ name: "Cape Town", center: [18.4241, -33.9249], zoom: 10 },
	{ name: "Reykjavík", center: [-21.8174, 64.1265], zoom: 11 },
	{ name: "Lima", center: [-77.0428, -12.0464], zoom: 10 },
];

/** Lives outside both maps, and reaches the main one by id. */
function Toolbar() {
	const main = useMapById("main");
	return (
		<div class="flex flex-wrap gap-1">
			<For each={PLACES}>
				{(place) => (
					<button
						type="button"
						class="rounded-md bg-slate-100 px-2.5 py-1 text-xs hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700"
						// Reading main() here is what makes <Loading> wait for the map.
						disabled={!main()}
						onClick={() =>
							main().flyTo({ center: place.center, zoom: place.zoom })
						}
					>
						{place.name}
					</button>
				)}
			</For>
		</div>
	);
}

export default function Provider() {
	const [center, setCenter] = createSignal<[number, number]>([0, 20]);
	const [zoom, setZoom] = createSignal(1.5);

	return (
		<MapProvider>
			<div class="flex h-full flex-col">
				<div class="border-b border-slate-200 p-2 dark:border-slate-800">
					<Loading fallback={<span class="text-xs">Waiting for the map…</span>}>
						<Toolbar />
					</Loading>
				</div>
				<div class="relative flex-1">
					<Map
						id="main"
						style={basemap()}
						center={[0, 20]}
						zoom={1.5}
						class="h-full w-full"
						onMove={(event) => {
							const { lng, lat } = event.target.getCenter();
							setCenter([lng, lat]);
							setZoom(event.target.getZoom());
						}}
					>
						<NavigationControl position="top-right" />
					</Map>
					{/* An overview map that follows the main one through camera props. */}
					<div class="absolute bottom-3 left-3 h-36 w-48 overflow-hidden rounded-md border-2 border-white shadow-lg dark:border-slate-700">
						<Map
							id="overview"
							style={basemap()}
							center={center()}
							zoom={Math.max(zoom() - 4, 0)}
							interactive={false}
							attributionControl={false}
							class="h-full w-full"
						/>
					</div>
				</div>
			</div>
		</MapProvider>
	);
}
