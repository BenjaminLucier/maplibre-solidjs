import { createSignal, Show } from "solid-js";
import { afterEach, describe, expect, test, vi } from "vitest";
import { MapImage } from "./image.js";
import {
	EMPTY_STYLE,
	type Rendered,
	renderMap,
	styleLoaded,
	tick,
} from "./test/render.js";

let rendered: Rendered | undefined;
afterEach(() => {
	rendered?.dispose();
	rendered = undefined;
});

const pixels = (size: number, value = 255) =>
	new ImageData(new Uint8ClampedArray(size * size * 4).fill(value), size, size);

/** A 2x2 PNG, so loading needs no network. */
function pngUrl(): string {
	const canvas = document.createElement("canvas");
	canvas.width = 2;
	canvas.height = 2;
	return canvas.toDataURL("image/png");
}

describe("MapImage", () => {
	test("adds the image and removes it on unmount", async () => {
		const [shown, setShown] = createSignal(true);
		rendered = renderMap(() => (
			<Show when={shown()}>
				<MapImage id="dot" image={pixels(4)} pixelRatio={2} />
			</Show>
		));
		const { map } = rendered;
		await styleLoaded(map);
		expect(map.hasImage("dot")).toBe(true);
		expect(map.getImage("dot")?.pixelRatio).toBe(2);
		setShown(false);
		await tick();
		expect(map.hasImage("dot")).toBe(false);
	});

	test("updates an image of the same size in place, re-adds one of another size", async () => {
		const [image, setImage] = createSignal(pixels(4));
		rendered = renderMap(() => <MapImage id="dot" image={image()} />);
		const { map } = rendered;
		await styleLoaded(map);
		const updateImage = vi.spyOn(map, "updateImage");
		const addImage = vi.spyOn(map, "addImage");
		setImage(pixels(4, 0));
		await tick();
		expect(updateImage).toHaveBeenCalledOnce();
		expect(addImage).not.toHaveBeenCalled();
		setImage(pixels(8));
		await tick();
		expect(addImage).toHaveBeenCalledOnce();
		expect(map.getImage("dot")?.data.width).toBe(8);
	});

	test("loads an image from a url", async () => {
		rendered = renderMap(() => <MapImage id="loaded" url={pngUrl()} />);
		const { map } = rendered;
		await styleLoaded(map);
		await vi.waitFor(() => expect(map.hasImage("loaded")).toBe(true));
		expect(map.getImage("loaded")?.data.width).toBe(2);
	});

	test("reports a failed load as a map error", async () => {
		const onError = vi.fn();
		rendered = renderMap(
			() => <MapImage id="missing" url="https://example.invalid/x.png" />,
			{
				onError,
			},
		);
		const { map } = rendered;
		await styleLoaded(map);
		await vi.waitFor(() => expect(onError).toHaveBeenCalled(), {
			timeout: 5000,
		});
		expect(map.hasImage("missing")).toBe(false);
	});

	test("comes back after a full style reload", async () => {
		rendered = renderMap(() => <MapImage id="dot" image={pixels(4)} />);
		const { map } = rendered;
		await styleLoaded(map);
		map.setStyle(EMPTY_STYLE, { diff: false });
		await map.once("style.load");
		await vi.waitFor(() => expect(map.hasImage("dot")).toBe(true));
	});
});
