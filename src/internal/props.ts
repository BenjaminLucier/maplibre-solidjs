import { omit } from "solid-js";

let nextId = 0;

/** An id for a source or layer whose `id` prop is omitted. */
export function generateId(kind: string): string {
	nextId += 1;
	return `maplibre-solidjs-${kind}-${nextId}`;
}

/**
 * The props that describe a MapLibre object (a source or layer
 * specification, an options object), read in a tracking scope. `hidden`
 * names the component's own props (`children`, `ref`, event handlers);
 * undefined values are dropped, so "not passed" and "passed undefined" mean
 * the same: MapLibre's default.
 */
export function specOf<T>(props: object, hidden: (key: string) => boolean): T {
	const spec: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(
		omit(props as Record<string, unknown>, hidden),
	)) {
		if (value !== undefined) spec[key] = value;
	}
	return spec as T;
}
