import { insert, type JSX } from "@solidjs/web";
import { type Accessor, children, createMemo } from "solid-js";

/**
 * Renders JSX children into a detached `<div>` that MapLibre can take as a
 * marker element or popup content, and says whether there is anything to
 * show. Components that render nothing (a `<Popup>` inside a `<Marker>`)
 * don't count, so `<Marker><Popup /></Marker>` keeps the default marker.
 */
export function createContent(content: () => JSX.Element): {
	element: HTMLDivElement;
	hasContent: Accessor<boolean>;
} {
	const resolved = children(content);
	const element = document.createElement("div");
	insert(element, resolved);
	const hasContent = createMemo(() =>
		resolved
			.toArray()
			.some(
				(node) =>
					node instanceof Node ||
					(node != null && node !== "" && typeof node !== "boolean"),
			),
	);
	return { element, hasContent };
}
