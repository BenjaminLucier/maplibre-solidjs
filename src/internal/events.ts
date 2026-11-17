import {
	type Accessor,
	createEffect,
	createMemo,
	onCleanup,
	untrack,
} from "solid-js";

/** Maps a component's `on*` prop names to the event types MapLibre fires. */
export type EventTable = Readonly<Record<string, string>>;

/**
 * Typed handler props for an event table: `onMoveEnd` receives what MapLibre
 * passes to a `moveend` listener.
 */
export type EventProps<Table extends EventTable, Events> = {
	[Prop in keyof Table]?: Table[Prop] extends keyof Events
		? ((event: Events[Table[Prop]]) => void) | undefined
		: never;
};

/**
 * Resolves to the table when it names every event in `Events`, and to the
 * list of missing ones otherwise, so a MapLibre upgrade that adds an event
 * fails type checking until the event has a prop.
 */
export type CoversEvents<Table extends EventTable, Events> = [
	Exclude<keyof Events, Table[keyof Table]>,
] extends [never]
	? Table
	: { missingEvents: Exclude<keyof Events, Table[keyof Table]> };

interface Evented {
	on(type: string, ...args: never[]): unknown;
	off(type: string, ...args: never[]): unknown;
}

/**
 * Subscribes `target` to the events whose handler props are set. A listener
 * calls the current prop when its event fires, so swapping a handler doesn't
 * resubscribe; adding or removing one does. With `layer`, events are scoped
 * to that layer (`map.on(type, layerId, listener)`).
 *
 * With `immediate`, the handlers present now are subscribed synchronously
 * rather than on the first effect run, so events fired during setup (a map's
 * `load`) reach them even while an enclosing `<Loading>` holds effects back.
 */
export function bindEvents(
	target: Accessor<Evented | undefined>,
	props: object,
	table: EventTable,
	options: { layer?: Accessor<string | undefined>; immediate?: boolean } = {},
): void {
	const { layer } = options;
	const bound = new Map<string, () => void>();
	let boundTarget: Evented | undefined;
	let boundLayer: string | undefined;

	const unbindAll = () => {
		for (const off of bound.values()) off();
		bound.clear();
	};

	const sync = (
		target: Evented | undefined,
		layerId: string | undefined,
		active: string,
	) => {
		if (target !== boundTarget || layerId !== boundLayer) {
			unbindAll();
			boundTarget = target;
			boundLayer = layerId;
		}
		if (!target) return;
		const names = active ? active.split(" ") : [];
		for (const [prop, off] of bound) {
			if (!names.includes(prop)) {
				off();
				bound.delete(prop);
			}
		}
		for (const prop of names) {
			if (bound.has(prop)) continue;
			const type = table[prop] as string;
			const listener = (event: unknown) => {
				const handler = (props as Record<string, unknown>)[prop];
				if (typeof handler === "function") handler(event);
			};
			const args = (
				layerId === undefined ? [listener] : [layerId, listener]
			) as never[];
			target.on(type, ...args);
			bound.set(prop, () => target.off(type, ...args));
		}
	};

	const active = createMemo(() =>
		Object.keys(table)
			.filter((prop) => (props as Record<string, unknown>)[prop] != null)
			.join(" "),
	);
	if (options.immediate) untrack(() => sync(target(), layer?.(), active()));
	createEffect(
		() => ({ target: target(), layer: layer?.(), active: active() }),
		({ target, layer, active }) => sync(target, layer, active),
	);
	onCleanup(unbindAll);
}
