import type { JSX } from "@solidjs/web";
import type {
	FontFacesSpecification,
	LightSpecification,
	Map as MapLibreMap,
	ProjectionSpecification,
	SkySpecification,
	TerrainSpecification,
} from "maplibre-gl";
import { createMemo } from "solid-js";
import { type MapContextValue, useMapContext } from "./context.js";
import { specOf } from "./internal/props.js";
import { reconcile } from "./internal/reconcile.js";
import { createSourceExists } from "./internal/style.js";
import type { AllowUndefined } from "./internal/types.js";
import { useEnclosingSource } from "./source.js";

/**
 * Sets a root property of the style while mounted (`setSky`, `setLight`,
 * ...), applies changes through the same setter, and puts the style's own
 * value back on unmount. A new style replaces the property, so it is set
 * again after every `style.load`, and the value restored on unmount is the
 * new style's.
 */
function styleProperty<Value>(
	ctx: MapContextValue,
	value: () => Value | undefined,
	get: (map: MapLibreMap) => Value | null | undefined,
	set: (map: MapLibreMap, value: Value | null | undefined) => void,
): void {
	reconcile<Value, { previous: Value | null | undefined }>(ctx, {
		spec: value,
		create(map, value) {
			const previous = copy(get(map));
			set(map, value);
			return { previous };
		},
		update(map, _instance, _prev, next) {
			set(map, next);
			return true;
		},
		destroy(map, { previous }) {
			set(map, previous);
		},
		style: "style",
	});
}

/** Style values are JSON; copy so later changes to the style can't alter them. */
function copy<T>(value: T): T {
	return value == null ? value : (JSON.parse(JSON.stringify(value)) as T);
}

export type SkyProps = AllowUndefined<SkySpecification>;

/**
 * The style's sky and fog (`map.setSky`), with the properties of MapLibre's
 * `SkySpecification` as props: `<Sky sky-color="#199EF3" horizon-fog-blend={0.5} />`.
 */
export function Sky(props: SkyProps): JSX.Element {
	const ctx = useMapContext();
	styleProperty<SkySpecification>(
		ctx,
		() => specOf(props, () => false),
		(map) => map.getSky(),
		(map, sky) => map.setSky(sky ?? {}),
	);
	return null;
}

export type LightProps = AllowUndefined<LightSpecification>;

/** The style's light (`map.setLight`), with `LightSpecification`'s properties as props. */
export function Light(props: LightProps): JSX.Element {
	const ctx = useMapContext();
	styleProperty<LightSpecification>(
		ctx,
		() => specOf(props, () => false),
		(map) => map.getLight(),
		(map, light) => map.setLight(light ?? {}),
	);
	return null;
}

export type TerrainProps = AllowUndefined<
	Omit<TerrainSpecification, "source">
> & {
	/** A `raster-dem` source id. Defaults to the enclosing `<Source>`. */
	source?: string | undefined;
};

/**
 * 3D terrain (`map.setTerrain`) from a `raster-dem` source, which it waits
 * for: `<Source type="raster-dem" url={...}><Terrain exaggeration={1.5} /></Source>`.
 * Unmounting turns terrain off again, or back to the style's own.
 */
export function Terrain(props: TerrainProps): JSX.Element {
	const ctx = useMapContext();
	const enclosing = useEnclosingSource();
	const source = createMemo(() => props.source ?? enclosing?.id());
	const sourceExists = createSourceExists(ctx, source, enclosing);
	styleProperty<TerrainSpecification>(
		ctx,
		() => {
			const id = source();
			if (id === undefined || !sourceExists()) return undefined;
			return {
				...specOf<TerrainSpecification>(props, () => false),
				source: id,
			};
		},
		(map) => map.getTerrain(),
		(map, terrain) => map.setTerrain(terrain ?? null),
	);
	return null;
}

export type ProjectionProps = AllowUndefined<ProjectionSpecification>;

/** The map projection (`map.setProjection`), for example `<Projection type="globe" />`. */
export function Projection(props: ProjectionProps): JSX.Element {
	const ctx = useMapContext();
	styleProperty<ProjectionSpecification>(
		ctx,
		() => specOf(props, () => false),
		(map) => map.getProjection(),
		(map, projection) => map.setProjection(projection ?? { type: "mercator" }),
	);
	return null;
}

export interface GlyphsProps {
	/** The glyphs URL template, with `{fontstack}` and `{range}`. */
	url: string;
}

/** The style's glyphs URL (`map.setGlyphs`). */
export function Glyphs(props: GlyphsProps): JSX.Element {
	const ctx = useMapContext();
	styleProperty<string>(
		ctx,
		() => props.url,
		(map) => map.getGlyphs(),
		(map, url) => map.setGlyphs(url ?? null),
	);
	return null;
}

export interface FontFacesProps {
	/** Font faces for text rendered with local fonts, keyed by font name. */
	fontFaces: FontFacesSpecification;
}

/** The style's font faces (`map.setFontFaces`). */
export function FontFaces(props: FontFacesProps): JSX.Element {
	const ctx = useMapContext();
	styleProperty<FontFacesSpecification>(
		ctx,
		() => props.fontFaces,
		(map) => map.getFontFaces(),
		(map, fontFaces) => map.setFontFaces(fontFaces ?? null),
	);
	return null;
}

export interface SpriteProps {
	/** The sprite id, used as the prefix of its images (`id:image`). */
	id: string;
	/** The sprite URL, without the `.json` or `.png` extension. */
	url: string;
}

/**
 * An additional sprite (`map.addSprite`), removed on unmount. A changed `id`
 * or `url` replaces it.
 */
export function Sprite(props: SpriteProps): JSX.Element {
	const ctx = useMapContext();
	reconcile<{ id: string; url: string }, string>(ctx, {
		spec: () => ({ id: props.id, url: props.url }),
		create(map, { id, url }) {
			map.addSprite(id, url);
			return id;
		},
		destroy(map, id) {
			if (map.getSprite().some((sprite) => sprite.id === id))
				map.removeSprite(id);
		},
		style: (map, id) => map.getSprite().some((sprite) => sprite.id === id),
	});
	return null;
}
