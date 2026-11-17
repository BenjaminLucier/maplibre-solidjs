import { createSignal } from "solid-js";

export type ThemeChoice = "light" | "dark" | "system";

const media = matchMedia("(prefers-color-scheme: dark)");

function stored(): ThemeChoice {
	try {
		const value = localStorage.getItem("theme");
		if (value === "light" || value === "dark") return value;
	} catch {}
	return "system";
}

const [choice, setChoiceSignal] = createSignal<ThemeChoice>(stored());
const [systemDark, setSystemDark] = createSignal(media.matches);
media.addEventListener("change", (event) => setSystemDark(event.matches));

/** The theme the user picked: light, dark, or following the system. */
export { choice as themeChoice };

const darkFor = (theme: ThemeChoice, systemIsDark: boolean) =>
	theme === "dark" || (theme === "system" && systemIsDark);

/** Whether the page is dark right now. */
export const isDark = () => darkFor(choice(), systemDark());

export function setThemeChoice(next: ThemeChoice): void {
	setChoiceSignal(next);
	try {
		if (next === "system") localStorage.removeItem("theme");
		else localStorage.setItem("theme", next);
	} catch {}
	// From `next`, not isDark(): a signal read right after its write still
	// returns the old value until Solid flushes.
	document.documentElement.classList.toggle(
		"dark",
		darkFor(next, media.matches),
	);
}

media.addEventListener("change", (event) =>
	document.documentElement.classList.toggle(
		"dark",
		darkFor(stored(), event.matches),
	),
);

/** OpenFreeMap basemaps: free, no API key. */
export const BASEMAPS = {
	liberty: "https://tiles.openfreemap.org/styles/liberty",
	positron: "https://tiles.openfreemap.org/styles/positron",
	dark: "https://tiles.openfreemap.org/styles/dark",
} as const;

/** The basemap for the current theme. */
export const basemap = () => (isDark() ? BASEMAPS.dark : BASEMAPS.positron);
