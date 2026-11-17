type OptionalKeys<T> = {
	[K in keyof T]-?: Record<never, never> extends Pick<T, K> ? K : never;
}[keyof T];

/**
 * Lets every optional property take an explicit `undefined`, so a prop can be
 * passed as `maxZoom={limit()}` with `limit()` sometimes undefined, also
 * under `exactOptionalPropertyTypes`. `undefined` means "MapLibre's default".
 * Required properties stay required.
 */
export type AllowUndefined<T> = {
	[K in Exclude<keyof T, OptionalKeys<T>>]: T[K];
} & {
	[K in OptionalKeys<T>]?: T[K] | undefined;
};

/** `AllowUndefined` applied to each member of a union. */
export type DistributiveAllowUndefined<T> = T extends unknown
	? AllowUndefined<T>
	: never;

/** `Omit` applied to each member of a union, keeping it discriminated. */
export type DistributiveOmit<T, K extends PropertyKey> = T extends unknown
	? Omit<T, K>
	: never;
