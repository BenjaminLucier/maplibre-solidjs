/**
 * Structural equality for style values: arrays and plain objects are compared
 * by content (expressions, paint values, bounds), everything else by identity
 * (DOM elements, class instances, functions, GeoJSON passed by reference).
 */
export function equal(a: unknown, b: unknown): boolean {
	if (Object.is(a, b)) return true;
	if (Array.isArray(a)) {
		return (
			Array.isArray(b) &&
			a.length === b.length &&
			a.every((v, i) => equal(v, b[i]))
		);
	}
	if (isPlainObject(a) && isPlainObject(b)) {
		const keys = Object.keys(a);
		return (
			keys.length === Object.keys(b).length &&
			keys.every((key) => Object.hasOwn(b, key) && equal(a[key], b[key]))
		);
	}
	return false;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
	if (value === null || typeof value !== "object") return false;
	const proto = Object.getPrototypeOf(value);
	return proto === Object.prototype || proto === null;
}

/** The keys whose values differ between two records, either side optional. */
export function changedKeys(
	prev: Readonly<Record<string, unknown>> | undefined,
	next: Readonly<Record<string, unknown>> | undefined,
): string[] {
	const keys = new Set([
		...Object.keys(prev ?? {}),
		...Object.keys(next ?? {}),
	]);
	return [...keys].filter((key) => !equal(prev?.[key], next?.[key]));
}

/** `spec` without `keys`, for comparing the parts that have no setter. */
export function without<T extends object>(
	spec: T,
	keys: readonly string[],
): Partial<T> {
	const out: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(spec)) {
		if (!keys.includes(key) && value !== undefined) out[key] = value;
	}
	return out as Partial<T>;
}
