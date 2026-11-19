import type {
	Marker as MapLibreMarker,
	Popup as MapLibrePopup,
} from "maplibre-gl";
import { createSignal, Show } from "solid-js";
import { afterEach, describe, expect, test, vi } from "vitest";
import { Marker } from "./marker.js";
import { Popup } from "./popup.js";
import { type Rendered, renderMap, styleLoaded, tick } from "./test/render.js";

let rendered: Rendered | undefined;
afterEach(() => {
	rendered?.dispose();
	rendered = undefined;
});

const markers = (host: HTMLElement) =>
	host.querySelectorAll(".maplibregl-marker");

describe("Marker", () => {
	test("adds MapLibre's default marker and removes it on unmount", async () => {
		const [shown, setShown] = createSignal(true);
		rendered = renderMap(() => (
			<Show when={shown()}>
				<Marker lngLat={[10, 20]} color="#f00" />
			</Show>
		));
		const { map, host } = rendered;
		await styleLoaded(map);
		expect(markers(host)).toHaveLength(1);
		expect(host.querySelector(".maplibregl-marker svg")).not.toBeNull();
		setShown(false);
		await tick();
		expect(markers(host)).toHaveLength(0);
	});

	test("renders children as the marker element, reactively", async () => {
		const [label, setLabel] = createSignal("A");
		let marker: MapLibreMarker | undefined;
		rendered = renderMap(() => (
			<Marker lngLat={[0, 0]} ref={(m) => (marker = m)}>
				<b>{label()}</b>
			</Marker>
		));
		const { map, host } = rendered;
		await styleLoaded(map);
		const first = marker;
		expect(host.querySelector(".maplibregl-marker b")?.textContent).toBe("A");
		setLabel("B");
		await tick();
		expect(host.querySelector(".maplibregl-marker b")?.textContent).toBe("B");
		expect(marker).toBe(first);
	});

	test("applies setter options in place, re-creates for construction options", async () => {
		const [lngLat, setLngLat] = createSignal<[number, number]>([0, 0]);
		const [rotation, setRotation] = createSignal(0);
		const [draggable, setDraggable] = createSignal(false);
		const [className, setClassName] = createSignal("a b");
		const [color, setColor] = createSignal("#f00");
		let marker: MapLibreMarker | undefined;
		rendered = renderMap(() => (
			<Marker
				lngLat={lngLat()}
				rotation={rotation()}
				draggable={draggable()}
				className={className()}
				color={color()}
				opacity="0.5"
				ref={(m) => (marker = m)}
			/>
		));
		const { map } = rendered;
		await styleLoaded(map);
		const first = marker as MapLibreMarker;
		setLngLat([5, 5]);
		setRotation(45);
		setDraggable(true);
		setClassName("b c");
		await tick();
		expect(marker).toBe(first);
		expect(first.getLngLat().toArray()).toEqual([5, 5]);
		expect(first.getRotation()).toBe(45);
		expect(first.isDraggable()).toBe(true);
		expect([...first.getElement().classList]).toEqual(
			expect.arrayContaining(["b", "c"]),
		);
		expect(first.getElement().classList.contains("a")).toBe(false);

		setColor("#00f");
		await tick();
		expect(marker).not.toBe(first);
		expect(marker?.getLngLat().toArray()).toEqual([5, 5]);
	});

	test("calls event props", async () => {
		const onClick = vi.fn();
		let marker: MapLibreMarker | undefined;
		rendered = renderMap(() => (
			<Marker lngLat={[0, 0]} onClick={onClick} ref={(m) => (marker = m)} />
		));
		await styleLoaded(rendered.map);
		marker
			?.getElement()
			.dispatchEvent(new MouseEvent("click", { bubbles: true }));
		expect(onClick).toHaveBeenCalledOnce();
	});

	test("attaches a child popup, which opens on click", async () => {
		let marker: MapLibreMarker | undefined;
		let popup: MapLibrePopup | undefined;
		rendered = renderMap(() => (
			<Marker lngLat={[0, 0]} ref={(m) => (marker = m)}>
				<Popup ref={(p) => (popup = p)}>
					<i>hello</i>
				</Popup>
			</Marker>
		));
		const { map, host } = rendered;
		await styleLoaded(map);
		// The popup renders nothing in place, so the default pin stays.
		expect(host.querySelector(".maplibregl-marker svg")).not.toBeNull();
		expect(marker?.getPopup()).toBe(popup);
		expect(popup?.isOpen()).toBe(false);
		marker?.togglePopup();
		expect(popup?.isOpen()).toBe(true);
		expect(host.querySelector(".maplibregl-popup i")?.textContent).toBe(
			"hello",
		);
	});
});

describe("Popup", () => {
	test("opens at lngLat with its children, and is removed on unmount", async () => {
		const [shown, setShown] = createSignal(true);
		rendered = renderMap(() => (
			<Show when={shown()}>
				<Popup lngLat={[0, 0]}>
					<p>content</p>
				</Popup>
			</Show>
		));
		const { map, host } = rendered;
		await styleLoaded(map);
		expect(host.querySelector(".maplibregl-popup p")?.textContent).toBe(
			"content",
		);
		setShown(false);
		await tick();
		expect(host.querySelector(".maplibregl-popup")).toBeNull();
	});

	test("shows text or html, and applies setters in place", async () => {
		const [text, setText] = createSignal("one");
		const [lngLat, setLngLat] = createSignal<[number, number]>([0, 0]);
		const [maxWidth, setMaxWidth] = createSignal("100px");
		let popup: MapLibrePopup | undefined;
		rendered = renderMap(() => (
			<Popup
				lngLat={lngLat()}
				text={text()}
				maxWidth={maxWidth()}
				ref={(p) => (popup = p)}
			/>
		));
		const { map, host } = rendered;
		await styleLoaded(map);
		const first = popup as MapLibrePopup;
		setText("two");
		setLngLat([3, 4]);
		setMaxWidth("300px");
		await tick();
		expect(popup).toBe(first);
		expect(
			host.querySelector(".maplibregl-popup-content")?.textContent,
		).toContain("two");
		expect(first.getLngLat().toArray()).toEqual([3, 4]);
		expect(first.getMaxWidth()).toBe("300px");
	});

	test("switches trackPointer on and off, and back to lngLat", async () => {
		const [trackPointer, setTrackPointer] = createSignal<boolean | undefined>(
			true,
		);
		const [lngLat, setLngLat] = createSignal<[number, number] | undefined>([
			0, 0,
		]);
		let popup: MapLibrePopup | undefined;
		rendered = renderMap(() => (
			<Popup
				trackPointer={trackPointer()}
				lngLat={lngLat()}
				text="x"
				ref={(p) => (popup = p)}
			/>
		));
		const { map } = rendered;
		await styleLoaded(map);
		const first = popup as MapLibrePopup;
		const tracking = () => ({
			popup: first
				.getElement()
				.classList.contains("maplibregl-popup-track-pointer"),
			map: map
				.getCanvasContainer()
				.classList.contains("maplibregl-track-pointer"),
		});
		expect(tracking()).toEqual({ popup: true, map: true });

		// It follows the pointer, not lngLat.
		const canvas = map.getCanvas();
		const box = canvas.getBoundingClientRect();
		canvas.dispatchEvent(
			new MouseEvent("mousemove", {
				bubbles: true,
				clientX: box.left + 50,
				clientY: box.top + 60,
			}),
		);
		expect(first._pos?.x).toBe(50);
		expect(first._pos?.y).toBe(60);

		// A new lngLat leaves it tracking.
		setLngLat([3, 4]);
		await tick();
		expect(tracking()).toEqual({ popup: true, map: true });

		// Off: back at lngLat.
		setTrackPointer(false);
		await tick();
		expect(popup).toBe(first);
		expect(tracking()).toEqual({ popup: false, map: false });
		expect(first.getLngLat().toArray()).toEqual([3, 4]);

		// Removing the prop is the same as false; on again tracks again.
		setTrackPointer(true);
		await tick();
		expect(tracking()).toEqual({ popup: true, map: true });
		setTrackPointer(undefined);
		await tick();
		expect(tracking()).toEqual({ popup: false, map: false });
		expect(first.getLngLat().toArray()).toEqual([3, 4]);

		// lngLat changes apply while it isn't tracking.
		setLngLat([5, 6]);
		await tick();
		expect(first.getLngLat().toArray()).toEqual([5, 6]);
		expect(popup).toBe(first);
	});

	test("starts at lngLat and switches to trackPointer", async () => {
		const [trackPointer, setTrackPointer] = createSignal(false);
		let popup: MapLibrePopup | undefined;
		rendered = renderMap(() => (
			<Popup
				trackPointer={trackPointer()}
				lngLat={[1, 2]}
				text="x"
				ref={(p) => (popup = p)}
			/>
		));
		const { map, host } = rendered;
		await styleLoaded(map);
		const first = popup as MapLibrePopup;
		expect(first.getLngLat().toArray()).toEqual([1, 2]);
		expect(host.querySelector(".maplibregl-popup-track-pointer")).toBeNull();
		setTrackPointer(true);
		await tick();
		expect(popup).toBe(first);
		expect(
			host.querySelector(".maplibregl-popup-track-pointer"),
		).not.toBeNull();
	});

	test("stops tracking with no lngLat to go to, and shows again at a new lngLat", async () => {
		const [trackPointer, setTrackPointer] = createSignal(true);
		const [lngLat, setLngLat] = createSignal<[number, number] | undefined>();
		let popup: MapLibrePopup | undefined;
		rendered = renderMap(() => (
			<Popup
				trackPointer={trackPointer()}
				lngLat={lngLat()}
				text="x"
				ref={(p) => (popup = p)}
			/>
		));
		const { map, host } = rendered;
		await styleLoaded(map);
		const tracking = () =>
			map.getCanvasContainer().classList.contains("maplibregl-track-pointer");
		expect(tracking()).toBe(true);
		expect(host.querySelector(".maplibregl-popup")).not.toBeNull();

		// Nowhere to go: unplaced, like a popup with neither prop.
		setTrackPointer(false);
		await tick();
		expect(tracking()).toBe(false);
		expect(host.querySelector(".maplibregl-popup")).toBeNull();

		const unplaced = popup as MapLibrePopup;
		setLngLat([1, 2]);
		await tick();
		expect(popup).toBe(unplaced);
		expect(unplaced.getLngLat().toArray()).toEqual([1, 2]);
		expect(host.querySelector(".maplibregl-popup")).not.toBeNull();

		// Removing lngLat while not tracking unplaces it too.
		setLngLat(undefined);
		await tick();
		expect(host.querySelector(".maplibregl-popup")).toBeNull();
		expect(tracking()).toBe(false);
	});

	test("calls onClose when closed from the map, not when unmounted", async () => {
		const onClose = vi.fn();
		const [shown, setShown] = createSignal(true);
		rendered = renderMap(() => (
			<Show when={shown()}>
				<Popup lngLat={[0, 0]} text="x" onClose={onClose} />
			</Show>
		));
		const { map, host } = rendered;
		await styleLoaded(map);
		(
			host.querySelector(".maplibregl-popup-close-button") as HTMLButtonElement
		).click();
		expect(onClose).toHaveBeenCalledOnce();
		setShown(false);
		await tick();
		expect(onClose).toHaveBeenCalledOnce();
	});
});
