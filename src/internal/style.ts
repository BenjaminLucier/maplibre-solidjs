import { type Accessor, createMemo } from "solid-js";
import type { MapContextValue } from "../context.js";

/**
 * Whether the source a component depends on is on the map, re-checked
 * whenever the style changes. `undefined` (no source needed) counts as there.
 */
export function createSourceExists(
	ctx: MapContextValue,
	source: Accessor<string | undefined>,
): Accessor<boolean> {
	return createMemo(() => {
		const id = source();
		ctx.styleVersion();
		return id === undefined || ctx.map.getSource(id) !== undefined;
	});
}

/**
 * `beforeId` once that layer is on the map, `undefined` until then, so a
 * layer can name one declared after it and moves there once it exists.
 */
export function createBeforeId(
	ctx: MapContextValue,
	beforeId: Accessor<string | undefined>,
): Accessor<string | undefined> {
	return createMemo(() => {
		const before = beforeId();
		ctx.styleVersion();
		return before !== undefined && ctx.map.getLayer(before)
			? before
			: undefined;
	});
}
