/**
 * Makes every property accept an explicit `undefined`, so a prop can be
 * passed as `maxZoom={limit()}` with `limit()` sometimes undefined, also
 * under `exactOptionalPropertyTypes`. `undefined` means "MapLibre's default".
 */
export type AllowUndefined<T> = { [K in keyof T]?: T[K] | undefined };
