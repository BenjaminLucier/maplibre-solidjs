import { Heart, Landmark } from "@lucide/solid";
import { Map, Marker, Popup } from "maplibre-solidjs";
import { createSignal } from "solid-js";
import { basemap } from "../theme";

export default function Markers() {
	const [position, setPosition] = createSignal<[number, number]>([
		2.3376, 48.8606,
	]);
	const [likes, setLikes] = createSignal(0);

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

			{/* Children become the marker element: live JSX, with its own state. */}
			<Marker lngLat={[2.2945, 48.8584]} anchor="bottom">
				<div class="flex flex-col items-center">
					<div class="flex items-center gap-2 rounded-xl bg-white p-1.5 pr-2 shadow-lg ring-2 ring-rose-500 dark:bg-slate-800">
						<span class="grid size-8 place-items-center rounded-lg bg-rose-500 text-white">
							<Landmark size={18} />
						</span>
						<span class="text-xs leading-tight">
							<span class="block font-semibold text-slate-900 dark:text-white">
								Eiffel Tower
							</span>
							<span class="text-slate-500 dark:text-slate-400">
								A JSX marker
							</span>
						</span>
						<button
							type="button"
							class="ml-1 flex items-center gap-1 rounded-full bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-100 dark:bg-rose-500/15 dark:text-rose-300 dark:hover:bg-rose-500/25"
							aria-label="Like the Eiffel Tower"
							onClick={() => setLikes((n) => n + 1)}
						>
							<Heart size={14} fill={likes() > 0 ? "currentColor" : "none"} />
							{likes()}
						</button>
					</div>
					{/* A pointer down to the tower's position. */}
					<span class="size-0 border-x-[7px] border-t-[9px] border-x-transparent border-t-rose-500" />
				</div>
			</Marker>

			{/* Other children are plain DOM inside the map's container. */}
			<div class="absolute top-3 left-3 rounded-md bg-white/90 px-3 py-2 font-mono text-xs text-slate-800 shadow dark:bg-slate-900/90 dark:text-slate-200">
				{position()[1].toFixed(5)}, {position()[0].toFixed(5)}
			</div>
		</Map>
	);
}
