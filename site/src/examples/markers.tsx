import { Map, Marker, Popup } from "maplibre-solidjs";
import { createSignal } from "solid-js";
import { basemap } from "../theme";

export default function Markers() {
	const [position, setPosition] = createSignal<[number, number]>([
		2.3376, 48.8606,
	]);

	return (
		<Map
			style={basemap()}
			center={[2.32, 48.858]}
			zoom={12.5}
			class="h-full w-full"
		>
			{/* MapLibre's default marker, draggable, with a popup attached. */}
			<Marker
				lngLat={position()}
				color="#2563eb"
				draggable
				onDragEnd={(event) => {
					const { lng, lat } = event.target.getLngLat();
					setPosition([lng, lat]);
				}}
			>
				<Popup offset={30}>Drag me around</Popup>
			</Marker>

			{/* Children become the marker element. */}
			<Marker lngLat={[2.2945, 48.8584]} anchor="bottom">
				<div class="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-900 shadow-md ring-1 ring-slate-200 dark:bg-slate-800 dark:text-white dark:ring-slate-700">
					Eiffel Tower
				</div>
			</Marker>

			{/* Other children are plain DOM inside the map's container. */}
			<div class="absolute top-3 left-3 rounded-md bg-white/90 px-3 py-2 font-mono text-xs text-slate-800 shadow dark:bg-slate-900/90 dark:text-slate-200">
				{position()[1].toFixed(5)}, {position()[0].toFixed(5)}
			</div>
		</Map>
	);
}
