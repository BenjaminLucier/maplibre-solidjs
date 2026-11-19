import { renderToString } from "@solidjs/web";
import { describe, expect, test } from "vitest";
import { Map } from "./map.js";
import { Marker } from "./marker.js";

describe("Map on the server", () => {
	test("renders a bare <div> with id, class and containerStyle, and no children", () => {
		const html = renderToString(() => (
			<Map
				id="the-map"
				class="map"
				containerStyle={{ width: "400px", height: "300px" }}
				center={[10, 20]}
				zoom={3}
			>
				<p>child</p>
				<Marker lngLat={[0, 0]} />
			</Map>
		));
		expect(html).toBe(
			'<div id="the-map" class="map" style="width:400px;height:300px"></div>',
		);
	});

	test("takes containerStyle as a string", () => {
		const html = renderToString(() => <Map containerStyle="height: 100px" />);
		expect(html).toBe('<div style="height: 100px"></div>');
	});
});
