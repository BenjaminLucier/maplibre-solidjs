import type { GeoJSONSource } from "maplibre-gl";
import { Layer, Map, Popup, Source } from "maplibre-solidjs";
import { createSignal, Show } from "solid-js";
import { basemap } from "../theme";

const EARTHQUAKES =
	"https://maplibre.org/maplibre-gl-js/docs/assets/earthquakes.geojson";

interface Quake {
	lngLat: [number, number];
	magnitude: number;
}

export default function Clusters() {
	let source: GeoJSONSource | undefined;
	const [selected, setSelected] = createSignal<Quake>();
	const pointer =
		(cursor: string) =>
		(event: { target: { getCanvas(): HTMLCanvasElement } }) => {
			event.target.getCanvas().style.cursor = cursor;
		};

	return (
		<Map
			style={basemap()}
			center={[-103.6, 40.7]}
			zoom={2.5}
			class="h-full w-full"
		>
			<Source
				type="geojson"
				data={EARTHQUAKES}
				cluster
				clusterRadius={50}
				clusterMaxZoom={14}
				ref={(instance) => (source = instance)}
			>
				<Layer
					type="circle"
					filter={["has", "point_count"]}
					paint={{
						"circle-color": [
							"step",
							["get", "point_count"],
							"#51bbd6",
							100,
							"#f1f075",
							750,
							"#f28cb1",
						],
						"circle-radius": [
							"step",
							["get", "point_count"],
							18,
							100,
							26,
							750,
							36,
						],
					}}
					onMouseEnter={pointer("pointer")}
					onMouseLeave={pointer("")}
					onClick={async (event) => {
						// Read features before awaiting: MapLibre clears them after the handler returns.
						const cluster = event.features?.[0];
						if (!source || cluster?.geometry.type !== "Point") return;
						const center = cluster.geometry.coordinates as [number, number];
						const zoom = await source.getClusterExpansionZoom(
							cluster.properties.cluster_id,
						);
						event.target.easeTo({ center, zoom });
					}}
				/>
				<Layer
					type="symbol"
					filter={["has", "point_count"]}
					layout={{
						"text-field": ["get", "point_count_abbreviated"],
						"text-font": ["Noto Sans Regular"],
						"text-size": 12,
					}}
				/>
				<Layer
					type="circle"
					filter={["!", ["has", "point_count"]]}
					paint={{
						"circle-color": "#11b4da",
						"circle-radius": 5,
						"circle-stroke-width": 1,
						"circle-stroke-color": "#fff",
					}}
					onMouseEnter={pointer("pointer")}
					onMouseLeave={pointer("")}
					onClick={(event) => {
						const quake = event.features?.[0];
						if (quake?.geometry.type !== "Point") return;
						setSelected({
							lngLat: quake.geometry.coordinates as [number, number],
							magnitude: quake.properties.mag,
						});
					}}
				/>
			</Source>
			<Show when={selected()}>
				{(quake) => (
					<Popup lngLat={quake().lngLat} onClose={() => setSelected(undefined)}>
						<strong>Magnitude {quake().magnitude}</strong>
					</Popup>
				)}
			</Show>
		</Map>
	);
}
