import { createEffect } from "solid-js";

/** Sets the document title while the calling page is shown. */
export function usePageTitle(title: () => string): void {
	createEffect(title, (value) => {
		document.title = value ? `${value} · maplibre-solidjs` : "maplibre-solidjs";
	});
}
