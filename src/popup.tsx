import type { JSX } from "@solidjs/web";
import {
	type LngLatLike,
	Popup as MapLibrePopup,
	type PopupEventType,
	type PopupOptions,
} from "maplibre-gl";
import { createSignal, untrack } from "solid-js";
import { useMapContext } from "./context.js";
import { createContent } from "./internal/content.js";
import { equal } from "./internal/equal.js";
import {
	bindEvents,
	type CoversEvents,
	type EventProps,
} from "./internal/events.js";
import { useMarker } from "./internal/marker-context.js";
import { reconcile } from "./internal/reconcile.js";
import { applyRef } from "./internal/ref.js";
import type { AllowUndefined } from "./internal/types.js";
import { swapClasses } from "./marker.js";

/** `<Popup>` event props. */
export const POPUP_EVENTS = {
	onOpen: "open",
	onClose: "close",
} as const satisfies Record<string, keyof PopupEventType>;
POPUP_EVENTS satisfies CoversEvents<typeof POPUP_EVENTS, PopupEventType>;
export type PopupEventProps = EventProps<typeof POPUP_EVENTS, PopupEventType>;

/**
 * How `<Popup>` applies each of MapLibre's `PopupOptions` after the popup
 * exists: through a setter, or (`init`) by re-creating the popup. Exhaustive
 * over `PopupOptions`, so new options fail type checking until classified.
 */
export const POPUP_OPTION_KINDS = {
	closeButton: "init",
	closeOnClick: "init",
	closeOnMove: "init",
	focusAfterOpen: "init",
	anchor: "init",
	offset: "setter",
	className: "setter",
	maxWidth: "setter",
	subpixelPositioning: "setter",
	locationOccludedOpacity: "init",
	padding: "setter",
} as const satisfies Record<keyof PopupOptions, "init" | "setter">;

export type PopupProps = AllowUndefined<PopupOptions> &
	PopupEventProps & {
		/**
		 * Where the popup points. Ignored inside a `<Marker>`, which positions
		 * its popup itself.
		 */
		lngLat?: LngLatLike | undefined;
		/**
		 * Follow the mouse pointer instead of `lngLat` (`popup.trackPointer()`).
		 * Switched off, the popup goes back to `lngLat`, or without one is
		 * hidden until it gets one.
		 */
		trackPointer?: boolean | undefined;
		/** Plain-text content (`setText`), when there are no children. */
		text?: string | undefined;
		/** HTML content (`setHTML`), when there are no children. Not sanitized. */
		html?: string | undefined;
		/** The popup's content, as Solid content that stays reactive (`setDOMContent`). */
		children?: JSX.Element;
		/** Receives the `maplibregl.Popup` each time it is created. */
		ref?: JSX.Ref<MapLibrePopup>;
	};

type PopupSpec = PopupOptions & {
	marker: ReturnType<NonNullable<ReturnType<typeof useMarker>>>;
	lngLat: LngLatLike | undefined;
	trackPointer: boolean;
	content:
		| { dom: HTMLElement }
		| { html: string }
		| { text: string }
		| undefined;
};

const INIT_KEYS = [
	...Object.entries(POPUP_OPTION_KINDS)
		.filter(([, kind]) => kind === "init")
		.map(([key]) => key),
	"marker",
];

/**
 * A MapLibre popup, removed on unmount. Every `PopupOptions` option is a
 * prop; changes go through the popup's setters (`setLngLat`, `setOffset`,
 * `setMaxWidth`, `setPadding`, ...), and the rest re-create it.
 *
 * On its own, the popup opens at `lngLat` when mounted. Closing it from the
 * map (close button, `closeOnClick`) fires `onClose`; unmount it there to
 * keep your state in step. Re-creating it (an option without a setter
 * changed) fires neither `onClose` nor `onOpen`, the same as mounting and
 * unmounting it. Inside a `<Marker>`, it is the marker's popup
 * (`marker.setPopup`) and opens when the marker is clicked.
 */
export function Popup(props: PopupProps): JSX.Element {
	const ctx = useMapContext();
	const marker = useMarker();
	const [popup, setPopup] = createSignal<MapLibrePopup | undefined>(undefined, {
		equals: false,
	});
	const content = createContent(() => props.children);
	// A marker's popup open when it is re-created opens again on the marker.
	let reopen = false;

	reconcile<PopupSpec, MapLibrePopup>(ctx, {
		spec() {
			const owner = marker?.();
			if (marker && !owner) return undefined;
			const spec: Record<string, unknown> = {};
			for (const key of Object.keys(POPUP_OPTION_KINDS)) {
				const value = props[key as keyof PopupOptions];
				if (value !== undefined) spec[key] = value;
			}
			const html = props.html;
			const text = props.text;
			return {
				...spec,
				marker: owner,
				lngLat: props.lngLat,
				trackPointer: props.trackPointer ?? false,
				content: content.hasContent()
					? { dom: content.element }
					: html !== undefined
						? { html }
						: text !== undefined
							? { text }
							: undefined,
			} as PopupSpec;
		},
		create(map, spec) {
			const { marker, lngLat, trackPointer, content, ...options } = spec;
			const popup = new MapLibrePopup(options);
			setContent(popup, content);
			if (marker) {
				marker.setPopup(popup);
				if (reopen && !popup.isOpen()) marker.togglePopup();
				reopen = false;
				return popup;
			}
			if (trackPointer) popup.trackPointer();
			else if (lngLat) popup.setLngLat(lngLat);
			return popup.addTo(map);
		},
		update(_map, popup, prev, next) {
			const p = prev as Record<string, unknown>;
			const n = next as Record<string, unknown>;
			if (INIT_KEYS.some((key) => !equal(p[key], n[key]))) return false;
			const changed = (key: string) => !equal(p[key], n[key]);
			if (!next.marker) {
				// Losing its position (trackPointer off or lngLat removed, with
				// neither left) has no setter: MapLibre only stops tracking by
				// moving to a lngLat. Re-create it, unplaced, as it would be
				// constructed without either.
				if (
					!next.trackPointer &&
					!next.lngLat &&
					(changed("trackPointer") || changed("lngLat"))
				)
					return false;
				if (next.trackPointer && changed("trackPointer")) popup.trackPointer();
				else if (
					!next.trackPointer &&
					next.lngLat &&
					(changed("lngLat") || changed("trackPointer"))
				) {
					popup.setLngLat(next.lngLat);
				}
			}
			if (changed("offset")) popup.setOffset(next.offset);
			if (changed("maxWidth")) popup.setMaxWidth(next.maxWidth ?? "240px");
			if (changed("padding")) popup.setPadding(next.padding);
			if (changed("subpixelPositioning"))
				popup.setSubpixelPositioning(next.subpixelPositioning ?? false);
			if (changed("className"))
				swapClasses(popup, prev.className, next.className);
			if (changed("content")) setContent(popup, next.content);
			return true;
		},
		destroy(_map, popup, { marker }) {
			reopen = popup.isOpen();
			if (marker?.getPopup() === popup) marker.setPopup(null);
			popup.remove();
		},
		instance(popup) {
			setPopup(() => popup);
			if (popup)
				applyRef(
					untrack(() => props.ref),
					popup,
				);
		},
	});

	bindEvents(popup, props, POPUP_EVENTS);

	return null;
}

function setContent(popup: MapLibrePopup, content: PopupSpec["content"]): void {
	if (!content) popup.setText("");
	else if ("dom" in content) popup.setDOMContent(content.dom);
	else if ("html" in content) popup.setHTML(content.html);
	else popup.setText(content.text);
}
