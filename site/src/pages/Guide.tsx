import { For } from "solid-js";
import { CodeBlock } from "../components/CodeBlock";
import { paths } from "../router";
import { usePageTitle } from "../title";

const SECTIONS = [
	["install", "Install"],
	["first-map", "Your first map"],
	["props", "How props are applied"],
	["events", "Events"],
	["content", "Sources, layers and more"],
	["pending", "The map is pending until ready"],
	["async", "Async props"],
	["primitives", "Primitives"],
	["globals", "Global functions"],
	["server", "Server rendering"],
] as const;

export default function Guide() {
	usePageTitle(() => "Guide");
	return (
		<div class="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)] gap-10 px-4 py-10 lg:grid-cols-[200px_minmax(0,1fr)]">
			<aside class="hidden lg:block">
				<nav class="sticky top-20 grid gap-1 text-sm">
					<For each={SECTIONS}>
						{([id, label]) => (
							<a
								href={`#${id}`}
								class="rounded px-2 py-1 text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
							>
								{label}
							</a>
						)}
					</For>
				</nav>
			</aside>
			<article class="prose-doc min-w-0 max-w-3xl">
				<h1 class="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
					Guide
				</h1>

				<h2 id="install">Install</h2>
				<CodeBlock
					code="pnpm add maplibre-solidjs maplibre-gl solid-js @solidjs/web"
					lang="sh"
				/>
				<p>
					Peer dependencies are <code>solid-js</code> 2,{" "}
					<code>@solidjs/web</code> 2 and <code>maplibre-gl</code> 6.16 or
					later. Import MapLibre's stylesheet once:
				</p>
				<CodeBlock code={`import "maplibre-gl/dist/maplibre-gl.css";`} />
				<p>
					MapLibre finds its web worker relative to its own module at runtime,
					which bundlers can't follow, so production builds ship without it.
					With Vite, bundle the worker explicitly and hand MapLibre its URL,
					once, before the first map:
				</p>
				<CodeBlock
					code={`import { setWorkerUrl } from "maplibre-gl";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";

setWorkerUrl(workerUrl);`}
				/>
				<CodeBlock
					class="mt-3"
					code={`// vite.config.ts
import solid from "@solidjs/vite-plugin";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [solid()],
  // MapLibre's worker is an ES module.
  worker: { format: "es" },
});`}
				/>

				<h2 id="first-map">Your first map</h2>
				<CodeBlock
					code={`import { Map, NavigationControl } from "maplibre-solidjs";

export function App() {
  return (
    <Map
      style="https://tiles.openfreemap.org/styles/liberty"
      center={[2.35, 48.85]}
      zoom={10}
      containerStyle={{ width: "100%", height: "400px" }}
    >
      <NavigationControl position="top-right" />
    </Map>
  );
}`}
				/>
				<p>
					<code>&lt;Map&gt;</code> takes every MapLibre <code>MapOptions</code>{" "}
					option except <code>container</code> as a prop. Its{" "}
					<code>&lt;div&gt;</code> needs a size: give it{" "}
					<code>containerStyle</code> or a <code>class</code>, or pass{" "}
					<code>container</code> to render into an element you already have.{" "}
					<code>ref</code> receives the <code>maplibregl.Map</code> as soon as
					it is constructed.
				</p>

				<h2 id="props">How props are applied</h2>
				<p>
					After construction, each kind of prop reaches MapLibre the way
					MapLibre allows:
				</p>
				<div class="overflow-x-auto">
					<table>
						<thead>
							<tr>
								<th>Props</th>
								<th>Applied with</th>
							</tr>
						</thead>
						<tbody>
							<tr>
								<td>
									Options with a setter: <code>minZoom</code>,{" "}
									<code>maxBounds</code>, <code>pixelRatio</code>, …
								</td>
								<td>
									The setter. Removing the prop restores MapLibre's default.
								</td>
							</tr>
							<tr>
								<td>
									Handlers: <code>scrollZoom</code>, <code>dragPan</code>, …
								</td>
								<td>
									<code>enable(options)</code> or <code>disable()</code>
								</td>
							</tr>
							<tr>
								<td>
									Camera: <code>center</code>, <code>zoom</code>,{" "}
									<code>bearing</code>, <code>pitch</code>, <code>roll</code>,{" "}
									<code>elevation</code>
								</td>
								<td>
									<code>jumpTo</code>, skipped when the map is already there, so
									props fed from <code>onMove</code> don't fight the user
								</td>
							</tr>
							<tr>
								<td>
									<code>bounds</code>
								</td>
								<td>
									<code>fitBounds(bounds, fitBoundsOptions)</code>
								</td>
							</tr>
							<tr>
								<td>
									<code>style</code>
								</td>
								<td>
									<code>setStyle</code>, diffed; components' sources and layers
									are carried over
								</td>
							</tr>
							<tr>
								<td>
									<code>globalState</code>
								</td>
								<td>
									<code>setGlobalStateProperty</code> for the keys that changed
								</td>
							</tr>
							<tr>
								<td>
									<code>padding</code>, <code>verticalFieldOfView</code>, debug
									flags like <code>showTileBoundaries</code>
								</td>
								<td>Their setters and properties</td>
							</tr>
							<tr>
								<td>
									Everything else: <code>hash</code>,{" "}
									<code>canvasContextAttributes</code>, …
								</td>
								<td>Construction only, as with MapLibre itself</td>
							</tr>
						</tbody>
					</table>
				</div>
				<p>
					Other components work the same way: a <code>&lt;Layer&gt;</code>'s{" "}
					<code>paint</code> goes through <code>setPaintProperty</code> one
					property at a time, a GeoJSON <code>&lt;Source&gt;</code>'s{" "}
					<code>data</code> through <code>setData</code>, a{" "}
					<code>&lt;Marker&gt;</code>'s <code>lngLat</code> through{" "}
					<code>setLngLat</code>. Only options MapLibre can't change re-create
					the thing they belong to.
				</p>

				<h2 id="events">Events</h2>
				<p>
					Every event is an <code>on*</code> prop typed with MapLibre's event:{" "}
					<code>onLoad</code> and <code>onMoveEnd</code> on the map,{" "}
					<code>onClick</code> and <code>onMouseEnter</code> on a layer (scoped
					to its features), <code>onDragEnd</code> on a marker,{" "}
					<code>onClose</code> on a popup, <code>onGeolocate</code> on the
					geolocate control. Swapping a handler doesn't resubscribe.
				</p>
				<CodeBlock
					code={`<Layer
  type="circle"
  paint={{ "circle-color": "#2563eb" }}
  onClick={(event) => {
    // MapLibre clears event.features once the handler returns.
    const feature = event.features?.[0];
    select(feature?.properties.id);
  }}
/>`}
				/>

				<h2 id="content">Sources, layers and more</h2>
				<p>
					Layers inside a <code>&lt;Source&gt;</code> use it without a{" "}
					<code>source</code> prop, and wait for a source named by id. Layer
					props are the style specification for their <code>type</code>, so{" "}
					<code>paint</code> and <code>layout</code> are type-checked per layer
					type. See the <a href={paths.api}>API overview</a> for every component
					and the <a href={paths.examples}>examples</a> for each in use.
				</p>
				<CodeBlock
					code={`<Source type="geojson" data={points()} cluster clusterRadius={50}>
  <Layer type="circle" filter={["has", "point_count"]} paint={{ "circle-radius": 18 }} />
  <Layer type="circle" filter={["!", ["has", "point_count"]]} paint={{ "circle-radius": 5 }} />
</Source>`}
				/>
				<p>
					A <code>&lt;Popup&gt;</code>'s <code>html</code> goes to MapLibre's{" "}
					<code>setHTML</code> as it is, without sanitising. Sanitise untrusted
					content first, or use <code>text</code> or children, which are
					inserted as text and DOM nodes.
				</p>

				<h2 id="pending">The map is pending until ready</h2>
				<p>
					<code>useMap()</code> returns the enclosing map as an accessor that is{" "}
					<em>pending</em> until its style has loaded, and again while MapLibre
					rebuilds the style from scratch. Read it in a tracking scope and Solid
					waits: effects hold, and a <code>&lt;Loading&gt;</code> boundary shows
					its fallback. A diffed <code>setStyle</code> keeps the map usable
					throughout, so the map stays ready while it switches.
				</p>
				<CodeBlock
					code={`import { Loading } from "@solidjs/web";
import { createMapState, useMap } from "maplibre-solidjs";

function Zoom() {
  const map = useMap();
  const zoom = createMapState(() => map().getZoom(), ["zoom"]);
  return <output>{zoom().toFixed(1)}</output>;
}

<Map style={style}>
  <Loading fallback={<p>Loading map…</p>}>
    <Zoom />
  </Loading>
</Map>`}
				/>
				<p>
					The map itself is constructed synchronously, so a pending child never
					holds it back.
				</p>

				<h2 id="async">Async props</h2>
				<p>
					Any prop may be an async value, such as a <code>createMemo</code> that
					returns a promise. The component adds its source, layer or image once
					the value has resolved, and reports a rejection as a map{" "}
					<code>error</code> event. <code>&lt;MapImage url&gt;</code> loads its
					image through <code>map.loadImage</code> the same way.
				</p>
				<CodeBlock
					code={`const parks = createMemo(async () => (await fetch("/parks.geojson")).json());

<Source type="geojson" data={parks()}>
  <Layer type="fill" paint={{ "fill-color": "#0a7" }} />
</Source>`}
				/>

				<h2 id="primitives">Primitives</h2>
				<ul>
					<li>
						<code>createMapState(read, events)</code>: an accessor over any map
						state, re-read when one of <code>events</code> fires, pending until
						the map is ready.
					</li>
					<li>
						<code>createMapEvent(type, listener)</code> and{" "}
						<code>createMapEvent(type, layer, listener)</code>: a listener that
						lives as long as its owner. <code>layer</code> may be an accessor.
					</li>
					<li>
						<code>&lt;MapProvider&gt;</code> and <code>useMapById(id)</code>:
						reach a <code>&lt;Map id&gt;</code> from outside it, pending until
						that map has mounted and loaded.
					</li>
				</ul>

				<h2 id="globals">Global functions</h2>
				<p>
					MapLibre's global functions (<code>setWorkerUrl</code>,{" "}
					<code>addProtocol</code>, <code>setRTLTextPlugin</code>,{" "}
					<code>prewarm</code>, …) don't need a component: import them from{" "}
					<code>maplibre-gl</code> and call them before rendering a map.
				</p>

				<h2 id="server">Server rendering</h2>
				<p>
					MapLibre needs a browser, so on the server <code>&lt;Map&gt;</code>{" "}
					renders an empty <code>&lt;div&gt;</code> with its <code>id</code>,{" "}
					<code>class</code> and <code>containerStyle</code>, and doesn't render
					its children: the map, and the sources, layers, markers and the rest
					inside it, exist only in the browser.
				</p>
			</article>
		</div>
	);
}
