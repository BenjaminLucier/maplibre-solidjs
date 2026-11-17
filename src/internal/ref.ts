import type { JSX } from "@solidjs/web";

/** Hands an instance to a component's `ref` prop: a callback, or an array of them. */
export function applyRef<T>(ref: JSX.Ref<T> | undefined, value: T): void {
	if (typeof ref === "function") (ref as (value: T) => void)(value);
	else if (Array.isArray(ref)) for (const r of ref) applyRef(r, value);
}
