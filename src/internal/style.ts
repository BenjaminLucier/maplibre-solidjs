import { type Accessor, createMemo } from "solid-js";
import type { MapContextValue } from "../context.js";
import type { EnclosingSource } from "../source.js";

/**
 * Whether the source a component depends on is on the map, re-checked
 * whenever the style changes. `undefined` (no source needed) counts as there.
 * For the enclosing `<Source>`, its `added` accessor answers instead.
 */
export function createSourceExists(
	ctx: MapContextValue,
	source: Accessor<string | undefined>,
	enclosing?: EnclosingSource,
): Accessor<boolean> {
	return createMemo(() => {
		const id = source();
		if (id === undefined) return true;
		// The enclosing <Source> says when it is added, without a re-run.
		if (enclosing && id === enclosing.id()) return enclosing.added();
		return watchStyle(ctx, ctx.map.getSource(id) !== undefined);
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
		if (before === undefined) return undefined;
		return watchStyle(ctx, ctx.map.getLayer(before) !== undefined)
			? before
			: undefined;
	});
}

/**
 * Subscribes the calling memo to the style changes that could flip `found`:
 * while something is missing, every change including other components'
 * additions (`styleVersion`); once found, only MapLibre's own style events
 * (`styleData`), which are what could take it away. Subscribing to the
 * narrower signal once found keeps components from re-running each other.
 */
function watchStyle(ctx: MapContextValue, found: boolean): boolean {
	if (found) ctx.styleData();
	else ctx.styleVersion();
	return found;
}
