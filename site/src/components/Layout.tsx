import {
	BookOpen,
	Code,
	Map as MapIcon,
	Moon,
	Sun,
	SunMoon,
} from "@lucide/solid";
import { type JSX, Loading } from "@solidjs/web";
import { For } from "solid-js";
import { paths } from "../router";
import { setThemeChoice, type ThemeChoice, themeChoice } from "../theme";

export const REPOSITORY = "https://github.com/BenjaminLucier/maplibre-solidjs";

const NAV = [
	{ href: () => paths.guide, label: "Guide" },
	{ href: () => paths.examples, label: "Examples" },
	{ href: () => paths.api, label: "API" },
];

const NEXT_THEME: Record<ThemeChoice, ThemeChoice> = {
	system: "light",
	light: "dark",
	dark: "system",
};

function ThemeToggle() {
	const label = () => `Theme: ${themeChoice()} (click to change)`;
	return (
		<button
			type="button"
			class="rounded-md p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
			title={label()}
			aria-label={label()}
			onClick={() => setThemeChoice(NEXT_THEME[themeChoice()])}
		>
			{themeChoice() === "light" ? (
				<Sun size={18} />
			) : themeChoice() === "dark" ? (
				<Moon size={18} />
			) : (
				<SunMoon size={18} />
			)}
		</button>
	);
}

export function Layout(props: { children?: JSX.Element }) {
	return (
		<div class="flex min-h-screen flex-col">
			<header class="sticky top-0 z-20 border-b border-slate-200 bg-white/85 backdrop-blur dark:border-slate-800 dark:bg-slate-950/85">
				<div class="mx-auto flex h-14 max-w-6xl items-center gap-1 px-4 sm:gap-2">
					<a
						href={paths()}
						aria-label="maplibre-solidjs home"
						class="mr-auto flex items-center gap-2 font-semibold text-slate-900 dark:text-white"
					>
						<MapIcon size={20} class="text-blue-600 dark:text-blue-400" />
						<span class="hidden sm:inline">maplibre-solidjs</span>
					</a>
					<nav class="flex items-center gap-1 text-sm">
						<For each={NAV}>
							{(item) => (
								<a
									href={item.href()}
									class="rounded-md px-2 py-1.5 text-slate-600 sm:px-2.5 hover:bg-slate-100 hover:text-slate-900 aria-[current]:font-medium aria-[current]:text-blue-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white dark:aria-[current]:text-blue-400"
								>
									{item.label}
								</a>
							)}
						</For>
					</nav>
					<a
						href={REPOSITORY}
						class="rounded-md p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
						title="Source on GitHub"
						aria-label="Source on GitHub"
					>
						<Code size={18} />
					</a>
					<ThemeToggle />
				</div>
			</header>
			<main class="flex-1">
				{/* Pages load lazily; the header stays up meanwhile. */}
				<Loading
					fallback={
						<div class="mx-auto max-w-6xl px-4 py-10 text-sm text-slate-500">
							Loading…
						</div>
					}
				>
					{props.children}
				</Loading>
			</main>
			<footer class="border-t border-slate-200 py-8 text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
				<div class="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4">
					<span>MIT OR Apache-2.0</span>
					<a
						class="hover:text-slate-900 dark:hover:text-white"
						href={REPOSITORY}
					>
						GitHub
					</a>
					<a
						class="flex items-center gap-1 hover:text-slate-900 dark:hover:text-white"
						href="https://maplibre.org/maplibre-gl-js/docs/"
					>
						<BookOpen size={14} /> MapLibre GL JS docs
					</a>
					<span class="ml-auto">
						Basemaps by{" "}
						<a class="underline" href="https://openfreemap.org">
							OpenFreeMap
						</a>
					</span>
				</div>
			</footer>
		</div>
	);
}
