import {
	GlobeControl,
	Layer,
	Map,
	Projection,
	Sky,
	Source,
} from "maplibre-solidjs";
import { cities } from "../data/cities";
import { basemap } from "../theme";

export default function Globe() {
	return (
		<Map style={basemap()} center={[20, 25]} zoom={1.4} class="h-full w-full">
			<Projection type="globe" />
			<Sky
				atmosphere-blend={[
					"interpolate",
					["linear"],
					["zoom"],
					0,
					1,
					5,
					1,
					7,
					0,
				]}
			/>
			<GlobeControl position="top-right" />
			<Source type="geojson" data={cities}>
				<Layer
					type="circle"
					paint={{
						"circle-radius": [
							"interpolate",
							["linear"],
							["get", "population"],
							5,
							3,
							37,
							12,
						],
						"circle-color": "#f97316",
						"circle-stroke-color": "#ffffff",
						"circle-stroke-width": 1,
					}}
				/>
			</Source>
		</Map>
	);
}
