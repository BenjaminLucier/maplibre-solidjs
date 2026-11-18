import {
	ArrowRight,
	Layers,
	Map as MapIcon,
	Package,
	Radio,
	ShieldCheck,
	Zap,
} from "@lucide/solid";
import {
	Layer,
	Map,
	NavigationControl,
	Popup,
	Projection,
	Source,
} from "maplibre-solidjs";
import { createSignal, For, Show } from "solid-js";
import { CodeBlock } from "../components/CodeBlock";
import { cities } from "../data/cities";
import { paths } from "../router";
import { basemap } from "../theme";
import { usePageTitle } from "../title";

const INSTALL = "pnpm add maplibre-solidjs maplibre-gl solid-js @solidjs/web";

const SAMPLE = `import { createSignal } from "solid-js";
import { Layer, Map, Marker, Popup, Source } from "maplibre-solidjs";
import "maplibre-gl/dist/maplibre-gl.css";

function App() {
  const [radius, setRadius] = createSignal(6);
  return (
    <Map style="https://tiles.openfreemap.org/styles/liberty" zoom={2}>
      <Source type="geojson" data="/cities.geojson">
        <Layer
          type="circle"
          paint={{ "circle-radius": radius(), "circle-color": "#2563eb" }}
          onClick={(event) => console.log(event.features?.[0])}
        />
      </Source>
      <Marker lngLat={[2.35, 48.85]}>
        <Popup>Paris</Popup>
      </Marker>
    </Map>
  );
}`;

const FEATURES = [
	{
		icon: MapIcon,
		title: "Faithful to MapLibre",
		body: "Every map option, event, source, layer type, control and style property, named and typed as MapLibre has them.",
	},
	{
		icon: Zap,
		title: "Updates in place",
		body: "Changed props go through setData, setPaintProperty, setFilter, setLngLat and the other setters. Nothing is torn down to change a color.",
	},
	{
		icon: Layers,
		title: "Owns what it adds",
		body: "Unmounting removes what a component added, and switching styles keeps it.",
	},
	{
		icon: Radio,
		title: "Built for Solid 2",
		body: "The map is a pending accessor until its style loads, so <Loading> waits for it. Props can be async.",
	},
	{
		icon: ShieldCheck,
		title: "Checked against MapLibre",
		body: "Option and event tables are checked at compile time, so a MapLibre upgrade can't add something silently unsupported.",
	},
	{
		icon: Package,
		title: "Small and dependency-free",
		body: "Just solid-js, @solidjs/web and maplibre-gl as peers. ESM with type declarations.",
	},
];

function HeroMap() {
	const [selected, setSelected] = createSignal<{
		name: string;
		lngLat: [number, number];
	}>();
	return (
		<Map
			style={basemap()}
			center={[40, 25]}
			zoom={1.2}
			class="h-full w-full"
			cooperativeGestures
		>
			<Projection type="globe" />
			<NavigationControl position="top-right" showCompass={false} />
			<Source type="geojson" data={cities}>
				<Layer
					type="circle"
					paint={{
						"circle-radius": [
							"interpolate",
							["linear"],
							["get", "population"],
							5,
							4,
							37,
							14,
						],
						"circle-color": "#2563eb",
						"circle-opacity": 0.85,
						"circle-stroke-color": "#ffffff",
						"circle-stroke-width": 1.5,
					}}
					onClick={(event) => {
						const city = event.features?.[0];
						if (city?.geometry.type !== "Point") return;
						setSelected({
							name: city.properties.name,
							lngLat: city.geometry.coordinates as [number, number],
						});
					}}
				/>
			</Source>
			<Show when={selected()}>
				{(city) => (
					<Popup lngLat={city().lngLat} onClose={() => setSelected(undefined)}>
						{city().name}
					</Popup>
				)}
			</Show>
		</Map>
	);
}

export default function Home() {
	usePageTitle(() => "");
	return (
		<>
			<section class="mx-auto grid max-w-6xl items-center gap-10 px-4 py-12 md:grid-cols-2 md:py-20">
				<div class="min-w-0">
					<p class="mb-3 text-sm font-medium text-blue-600 dark:text-blue-400">
						For SolidJS 2 and MapLibre GL JS 6
					</p>
					<h1 class="text-4xl font-bold tracking-tight text-slate-900 md:text-5xl dark:text-white">
						MapLibre, as Solid components.
					</h1>
					<p class="mt-5 text-lg leading-8 text-slate-600 dark:text-slate-400">
						Maps, sources, layers, markers and controls as reactive, fully typed
						props, built on Solid 2's async model.
					</p>
					<div class="mt-8 flex flex-wrap gap-3">
						<a
							href={paths.guide}
							class="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-500"
						>
							Get started <ArrowRight size={16} />
						</a>
						<a
							href={paths.examples}
							class="rounded-lg px-4 py-2.5 text-sm font-semibold text-slate-900 ring-1 ring-slate-300 hover:bg-slate-50 dark:text-white dark:ring-slate-700 dark:hover:bg-slate-900"
						>
							Examples
						</a>
					</div>
					<CodeBlock code={INSTALL} lang="sh" class="mt-8" />
				</div>
				<div class="h-[420px] overflow-hidden rounded-2xl border border-slate-200 shadow-xl dark:border-slate-800">
					<HeroMap />
				</div>
			</section>

			<section class="border-y border-slate-200 bg-slate-50 py-16 dark:border-slate-800 dark:bg-slate-900/40">
				<div class="mx-auto grid max-w-6xl gap-8 px-4 sm:grid-cols-2 lg:grid-cols-3">
					<For each={FEATURES}>
						{(feature) => (
							<div>
								<feature.icon
									size={22}
									class="text-blue-600 dark:text-blue-400"
								/>
								<h2 class="mt-3 font-semibold text-slate-900 dark:text-white">
									{feature.title}
								</h2>
								<p class="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
									{feature.body}
								</p>
							</div>
						)}
					</For>
				</div>
			</section>

			<section class="mx-auto max-w-6xl px-4 py-16">
				<h2 class="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
					Reads like MapLibre
				</h2>
				<p class="mt-3 max-w-2xl text-slate-600 dark:text-slate-400">
					Props are MapLibre's own options and style specification. Signals in,
					setters out.
				</p>
				<CodeBlock code={SAMPLE} class="mt-6" />
			</section>
		</>
	);
}
