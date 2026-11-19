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

	test("drops old classes from its children's element when re-created", async () => {
		const [className, setClassName] = createSignal("a");
		const [scale, setScale] = createSignal(1);
		let marker: MapLibreMarker | undefined;
		rendered = renderMap(() => (
			<Marker
				lngLat={[0, 0]}
				className={className()}
				scale={scale()}
				ref={(m) => (marker = m)}
			>
				<b>A</b>
			</Marker>
		));
		await styleLoaded(rendered.map);
		const first = marker as MapLibreMarker;
		// Changed together: the marker is re-created around the same element.
		setClassName("b");
		setScale(2);
		await tick();
		expect(marker).not.toBe(first);
		const element = (marker as MapLibreMarker).getElement();
		expect(element).toBe(first.getElement());
		expect(element.classList.contains("b")).toBe(true);
		expect(element.classList.contains("a")).toBe(false);
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

	test("re-creating it calls neither onClose nor onOpen, as on mount", async () => {
		const onOpen = vi.fn();
		const onClose = vi.fn();
		const [anchor, setAnchor] = createSignal<"top" | "bottom">("top");
		let popup: MapLibrePopup | undefined;
		rendered = renderMap(() => (
			<Popup
				lngLat={[0, 0]}
				text="x"
				anchor={anchor()}
				onOpen={onOpen}
				onClose={onClose}
				ref={(p) => (popup = p)}
			/>
		));
		const { map } = rendered;
		await styleLoaded(map);
		await tick();
		const first = popup as MapLibrePopup;
		expect(onOpen).not.toHaveBeenCalled();
		setAnchor("bottom");
		await tick();
		expect(popup).not.toBe(first);
		expect(popup?.isOpen()).toBe(true);
		expect(onClose).not.toHaveBeenCalled();
		expect(onOpen).not.toHaveBeenCalled();
		// The new popup's events still arrive.
		popup?.remove();
		expect(onClose).toHaveBeenCalledOnce();
	});

	test("stays open inside a marker when re-created, without events", async () => {
		const onOpen = vi.fn();
		const onClose = vi.fn();
		const [anchor, setAnchor] = createSignal<"top" | "bottom">("top");
		let marker: MapLibreMarker | undefined;
		let popup: MapLibrePopup | undefined;
		rendered = renderMap(() => (
			<Marker lngLat={[0, 0]} ref={(m) => (marker = m)}>
				<Popup
					anchor={anchor()}
					onOpen={onOpen}
					onClose={onClose}
					ref={(p) => (popup = p)}
				/>
			</Marker>
		));
		const { map } = rendered;
		await styleLoaded(map);
		await tick();
		marker?.togglePopup();
		expect(onOpen).toHaveBeenCalledOnce();
		const first = popup as MapLibrePopup;
		setAnchor("bottom");
		await tick();
		expect(popup).not.toBe(first);
		expect(marker?.getPopup()).toBe(popup);
		expect(popup?.isOpen()).toBe(true);
		expect(onClose).not.toHaveBeenCalled();
		expect(onOpen).toHaveBeenCalledOnce();
		// Closed when re-created, it stays closed.
		marker?.togglePopup();
		expect(onClose).toHaveBeenCalledOnce();
		setAnchor("top");
		await tick();
		expect(popup?.isOpen()).toBe(false);
		expect(onOpen).toHaveBeenCalledOnce();
	});
});
