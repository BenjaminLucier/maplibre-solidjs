import {
	FullscreenControl,
	GeolocateControl,
	Map,
	NavigationControl,
	ScaleControl,
} from "maplibre-solidjs";
import { basemap } from "../theme";

export default function Basic() {
	return (
		<Map
			style={basemap()}
			center={[-74.006, 40.7128]}
			zoom={11}
			class="h-full w-full"
		>
			<NavigationControl position="top-right" visualizePitch />
			<GeolocateControl position="top-right" trackUserLocation />
			<FullscreenControl position="top-right" />
			<ScaleControl position="bottom-left" />
		</Map>
	);
}
