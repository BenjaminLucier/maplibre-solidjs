import type { JSX } from "@solidjs/web";
import type { Map as MapLibreMap, StyleImageMetadata } from "maplibre-gl";
import { createMemo } from "solid-js";
import { useMapContext } from "./context.js";
import { equal } from "./internal/equal.js";
import { specOf } from "./internal/props.js";
import { reconcile } from "./internal/reconcile.js";
import type { AllowUndefined } from "./internal/types.js";

/** Anything `map.addImage` accepts: an image, bitmap, pixel data or a `StyleImageInterface`. */
export type MapImageSource = Parameters<MapLibreMap["addImage"]>[1];

export type MapImageProps = AllowUndefined<Partial<StyleImageMetadata>> & {
	/** The image id that layers refer to (`icon-image`, `fill-pattern`, ...). */
	id: string;
} & (
		| { image: MapImageSource; url?: undefined }
		| {
				/**
				 * Loads the image with `map.loadImage(url)`. The image is added
				 * once it has loaded, and the load counts as pending async work
				 * for `<Loading>` and `isPending`.
				 */
				url: string;
				image?: undefined;
		  }
	);

interface ImageSpec {
	id: string;
	image: MapImageSource;
	options: Partial<StyleImageMetadata>;
}

/**
 * An image in the style (`map.addImage`), for icons and patterns, removed on
 * unmount. A changed image of the same size is swapped in place
 * (`updateImage`); a different size or changed metadata (`pixelRatio`,
 * `sdf`, ...) re-adds it. A style change that drops it adds it back.
 */
export function MapImage(props: MapImageProps): JSX.Element {
	const ctx = useMapContext();
	const image = createMemo(() => {
		const url = props.url;
		if (url === undefined) return props.image as MapImageSource;
		return ctx.map.loadImage(url).then((response) => response.data);
	});

	reconcile<ImageSpec, string>(ctx, {
		spec: () => ({
			id: props.id,
			image: image(),
			options: specOf<Partial<StyleImageMetadata>>(
				props,
				(key) => key === "id" || key === "image" || key === "url",
			),
		}),
		create(map, { id, image, options }) {
			map.addImage(id, image, options);
			return id;
		},
		update(map, id, prev, next) {
			if (prev.id !== next.id || !equal(prev.options, next.options))
				return false;
			if (prev.image === next.image) return true;
			if (!sameSize(prev.image, next.image)) return false;
			map.updateImage(id, next.image);
			return true;
		},
		destroy(map, id) {
			if (map.hasImage(id)) map.removeImage(id);
		},
		style: (map, id) => map.hasImage(id),
	});

	return null;
}

function sameSize(a: MapImageSource, b: MapImageSource): boolean {
	const size = (image: MapImageSource) =>
		"width" in image ? [image.width, image.height] : [Number.NaN, Number.NaN];
	const [aw, ah] = size(a);
	const [bw, bh] = size(b);
	return aw === bw && ah === bh;
}
