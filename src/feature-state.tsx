import type { JSX } from "@solidjs/web";
import type { FeatureIdentifier } from "maplibre-gl";
import { createMemo } from "solid-js";
import { useMapContext } from "./context.js";
import { changedKeys, equal } from "./internal/equal.js";
import { reconcile } from "./internal/reconcile.js";
import { createSourceExists } from "./internal/style.js";
import { type SourceInstance, useEnclosingSource } from "./source.js";

export interface FeatureStateProps {
	/** The feature id (from the data, `generateId` or `promoteId`). */
	id: string | number;
	/** The source id. Defaults to the enclosing `<Source>`. */
	source?: string | undefined;
	/** For vector sources, the source layer the feature is in. */
	sourceLayer?: string | undefined;
	/** The state to set, read by `feature-state` expressions in layers. */
	state: Record<string, unknown>;
}

interface StateSpec {
	target: FeatureIdentifier;
	state: Record<string, unknown>;
}

/**
 * Feature state (`map.setFeatureState`), for styling features with
 * `["feature-state", key]` expressions, typically on hover or selection:
 *
 * ```tsx
 * <Show when={hovered()}>{(id) => <FeatureState id={id()} state={{ hover: true }} />}</Show>
 * ```
 *
 * Changed keys are set, removed keys are removed, and unmounting removes
 * the keys it set (`removeFeatureState`), leaving any others alone. It waits
 * for the source, and sets the state again if the source is re-created.
 */
export function FeatureState(props: FeatureStateProps): JSX.Element {
	const ctx = useMapContext();
	const enclosing = useEnclosingSource();
	const source = createMemo(() => props.source ?? enclosing?.id());
	const sourceExists = createSourceExists(ctx, source, enclosing);

	reconcile<StateSpec, SourceInstance>(ctx, {
		spec() {
			const id = source();
			if (id === undefined || !sourceExists()) return undefined;
			const target: FeatureIdentifier = { source: id, id: props.id };
			if (props.sourceLayer !== undefined)
				target.sourceLayer = props.sourceLayer;
			return { target, state: props.state };
		},
		create(map, { target, state }) {
			map.setFeatureState(target, state);
			return map.getSource(target.source) as SourceInstance;
		},
		update(map, _source, prev, next) {
			if (!equal(prev.target, next.target)) return false;
			const set: Record<string, unknown> = {};
			for (const key of changedKeys(prev.state, next.state)) {
				if (key in next.state) set[key] = next.state[key];
				else map.removeFeatureState(next.target, key);
			}
			if (Object.keys(set).length > 0) map.setFeatureState(next.target, set);
			return true;
		},
		destroy(map, source, { target, state }) {
			if (map.getSource(target.source) !== source) return;
			for (const key of Object.keys(state)) map.removeFeatureState(target, key);
		},
		// Feature state lives in the source; a re-created source starts empty.
		style: (map, source) => map.getSource(source.id) === source,
	});

	return null;
}
