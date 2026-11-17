import type { Map as MapLibreMap } from "maplibre-gl";
import { createEffect, createMemo, onCleanup } from "solid-js";
import type { MapContextValue } from "../context.js";
import { equal } from "./equal.js";

export interface ReconcileOptions<Spec, Instance> {
	/**
	 * Reads every input the resource depends on. It runs in a tracking scope,
	 * so a pending async input holds the resource back until it resolves.
	 * `undefined` means "nothing to put on the map".
	 */
	spec: () => Spec | undefined;
	/** Puts the resource on the map. */
	create: (map: MapLibreMap, spec: Spec) => Instance;
	/**
	 * Applies a change in place through MapLibre's setters. Returns `false`
	 * when a changed value has no setter and the resource has to be created
	 * again. Without it, any change re-creates the resource.
	 */
	update?: (
		map: MapLibreMap,
		instance: Instance,
		prev: Spec,
		next: Spec,
	) => boolean;
	/** Takes the resource off the map. */
	destroy: (map: MapLibreMap, instance: Instance, spec: Spec) => void;
	/**
	 * How a style change affects the resource:
	 * - a function: the resource lives in the style (sources, layers,
	 *   images). After any style change the function says whether it is still
	 *   there, and it is created again if a new style dropped it.
	 * - `"style"`: it is a style property (sky, light, terrain...) that a new
	 *   style replaces, so it is applied again after every `style.load`.
	 * - omitted: style changes don't touch it (markers, popups, controls).
	 */
	style?: ((map: MapLibreMap, instance: Instance) => boolean) | "style";
	/** Receives the instance after every create, and `undefined` after removal. */
	instance?: (instance: Instance | undefined) => void;
}

/**
 * The lifecycle every component in this library shares: keep an imperative
 * MapLibre resource in line with reactive inputs. Changes go through
 * MapLibre's setters where it has them, the resource is rebuilt where it
 * doesn't, it is re-added when a style change drops it, and it is removed
 * when the owner is disposed.
 *
 * MapLibre calls that throw are reported as the map's `error` event, the way
 * MapLibre reports its own errors, instead of halting the reactive system.
 */
export function reconcile<Spec, Instance>(
	ctx: MapContextValue,
	options: ReconcileOptions<Spec, Instance>,
): void {
	const { map } = ctx;
	let current:
		| { instance: Instance; spec: Spec; generation: number }
		| undefined;

	// Changes when a style change has taken the resource away.
	const { style } = options;
	const generation = createMemo((prev: number = 0): number => {
		if (style === undefined) return prev;
		if (style === "style") return ctx.styleRevision();
		ctx.styleVersion();
		if (!current) return prev;
		const { instance } = current;
		return attempt(map, () => style(map, instance)) === true ? prev : prev + 1;
	});

	const release = (disposing = false) => {
		if (!current) return;
		const { instance, spec } = current;
		current = undefined;
		// No signal writes while the owner is being disposed.
		if (!disposing) options.instance?.(undefined);
		attempt(map, () => options.destroy(map, instance, spec));
	};

	createEffect(
		() => {
			// Pending until the style has loaded, so nothing is added before
			// MapLibre accepts it.
			ctx.ready();
			return { spec: options.spec(), generation: generation() };
		},
		{
			// A rejected async input (a failed fetch) is reported like any
			// other MapLibre error.
			error(error) {
				map.fire("error", { error });
			},
			effect: ({ spec, generation }) => {
				if (current && current.generation !== generation) {
					// It went away with the old style; there is nothing to remove.
					current = undefined;
				}
				if (spec === undefined) {
					release();
					return;
				}
				if (current) {
					const { instance, spec: prev } = current;
					const { update } = options;
					const kept = update
						? attempt(map, () => update(map, instance, prev, spec)) === true
						: equal(prev, spec);
					if (kept) {
						current.spec = spec;
						return;
					}
					release();
				}
				const instance = attempt(map, () => options.create(map, spec));
				if (instance === FAILED) return;
				current = { instance, spec, generation };
				options.instance?.(instance);
				ctx.touch();
			},
		},
	);

	onCleanup(() => release(true));
}

const FAILED: unique symbol = Symbol("failed");

/** Runs a MapLibre call, reporting a throw as the map's `error` event. */
export function attempt<T>(map: MapLibreMap, fn: () => T): T | typeof FAILED {
	try {
		return fn();
	} catch (error) {
		map.fire("error", { error });
		return FAILED;
	}
}
