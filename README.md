# maplibre-solidjs

[SolidJS 2](https://docs.solidjs.com) components for
[MapLibre GL JS](https://maplibre.org/maplibre-gl-js/docs/).

[![npm](https://img.shields.io/npm/v/maplibre-solidjs)](https://www.npmjs.com/package/maplibre-solidjs)
[![CI](https://github.com/BenjaminLucier/maplibre-solidjs/actions/workflows/ci.yml/badge.svg)](https://github.com/BenjaminLucier/maplibre-solidjs/actions/workflows/ci.yml)

> **Status:** early (0.x). The API follows MapLibre's and may still change
> between minor versions.

**[Docs and live examples](https://benjaminlucier.github.io/maplibre-solidjs/)**

- **Faithful to MapLibre.** Every `MapOptions` option, map event, source
  type, layer type, control and style property is a prop, named and typed
  as MapLibre names and types it. Nothing is renamed or wrapped in a second
  API.
- **Updates in place.** Changed props go through MapLibre's setters
  (`setData`, `setPaintProperty`, `setFilter`, `setLngLat`, ...). Only
  options MapLibre can't change re-create the thing they belong to.
- **Owns what it adds.** Everything a component adds is removed when it
  unmounts, and survives `setStyle`.
- **Built for Solid 2.** The map is a pending accessor until its style loads,
  so `<Loading>` waits for it. Any prop can be an async value.
- **Checked against MapLibre's types.** Tables of options and events are
  checked at compile time to cover every key, so a MapLibre upgrade that adds
  one fails type checking here until it is handled.

## Install

```sh
pnpm add maplibre-solidjs maplibre-gl solid-js @solidjs/web
```

Peer dependencies: `solid-js` 2, `@solidjs/web` 2 and `maplibre-gl` 6.

Import MapLibre's stylesheet once:

```ts
import "maplibre-gl/dist/maplibre-gl.css";
```

MapLibre finds its web worker relative to its own module at runtime, which
bundlers can't follow, so production builds ship without it. With Vite,
bundle the worker explicitly and hand MapLibre its URL, once, before the
first map:

```ts
import { setWorkerUrl } from "maplibre-gl";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";

setWorkerUrl(workerUrl);
```

```ts
// vite.config.ts: the worker is an ES module.
export default defineConfig({
  worker: { format: "es" },
});
```

## Usage

```tsx
import { createSignal } from "solid-js";
import {
  Layer,
  Map,
  Marker,
  NavigationControl,
  Popup,
  Source,
} from "maplibre-solidjs";

function App() {
  const [zoom, setZoom] = createSignal(3);
  return (
    <Map
      style="https://demotiles.maplibre.org/style.json"
      center={[0, 20]}
      zoom={zoom()}
      onZoomEnd={(event) => setZoom(event.target.getZoom())}
      containerStyle={{ width: "100%", height: "400px" }}
    >
      <NavigationControl position="top-right" />
      <Source type="geojson" data="/parks.geojson">
        <Layer
          type="circle"
          paint={{ "circle-radius": 6, "circle-color": "#0a7" }}
          onClick={(event) => console.log(event.features?.[0])}
        />
      </Source>
      <Marker lngLat={[2.35, 48.85]} color="#c00">
        <Popup>Paris</Popup>
      </Marker>
    </Map>
  );
}
```

`<Map>` takes every `MapOptions` option except `container` as a prop, plus
`containerStyle`, `class` and `id` for its `<div>` (it needs a size), or
`container` to render into an existing element. `ref` receives the
`maplibregl.Map` as soon as it is constructed.

### How props are applied

| Kind | Applied with |
| --- | --- |
| Options with a setter (`minZoom`, `maxBounds`, `pixelRatio`, ...) | the setter; removing the prop restores MapLibre's default |
| Interaction handlers (`scrollZoom`, `dragPan`, ...) | `enable(options)` / `disable()` |
| Camera (`center`, `zoom`, `bearing`, `pitch`, `roll`, `elevation`) | `jumpTo`, skipped when the map is already there, so props fed by `onMove` don't fight the user |
| `bounds` | `fitBounds(bounds, fitBoundsOptions)` |
| `style` | `setStyle` (diffed); sources and layers owned by components are carried over |
| `globalState` | `setGlobalStateProperty` for the keys that changed |
| `padding`, `verticalFieldOfView`, `missingStyleImageResolver`, debug flags (`showTileBoundaries`, `showCollisionBoxes`, `repaint`, ...) | their setters and properties |
| Everything else (`hash`, `canvasContextAttributes`, `attributionControl`, ...) | construction only, as with MapLibre |

`MAP_OPTION_KINDS`, `MAP_OPTION_SETTERS` and `MAP_PROPERTIES` are exported
if you need the exact tables.

### Events

Every event is an `on*` prop with MapLibre's event type: `onLoad`,
`onMoveEnd`, `onStyleImageMissing`, ... on `<Map>`; `onClick`,
`onMouseEnter`, ... on `<Layer>` (scoped to that layer); `onData` and
`onError` on `<Source>`; `onDragEnd` on `<Marker>`; `onOpen` and `onClose`
on `<Popup>`; `onGeolocate` and the rest on `<GeolocateControl>`. Swapping a
handler doesn't resubscribe.

MapLibre deletes `event.features` once a layer listener returns, so read it
inside the handler.

## Components

| Component | MapLibre |
| --- | --- |
| `Map` | `new Map(options)` |
| `Source` | `addSource`, with `setData`, `setClusterOptions`, `setUrl`, `setTiles`, `updateImage`, `setCoordinates` and `setSourceTileLodParams` (`tileLodParams`) |
| `Layer` | `addLayer` for every layer type, with `setPaintProperty`, `setLayoutProperty`, `setFilter`, `setLayerZoomRange` and `moveLayer` (`beforeId`) |
| `CustomLayer` | `addLayer` for a `CustomLayerInterface` |
| `MapImage` | `addImage` / `updateImage`, from an image or from a URL through `loadImage` |
| `FeatureState` | `setFeatureState` / `removeFeatureState`, for the keys it set |
| `Sky`, `Light`, `Terrain`, `Projection` | `setSky`, `setLight`, `setTerrain`, `setProjection` |
| `Glyphs`, `FontFaces`, `Sprite` | `setGlyphs`, `setFontFaces`, `addSprite` |
| `Marker` | `Marker`, with every setter; children become the marker element |
| `Popup` | `Popup`, standalone or inside a `Marker` (`setPopup`); children become its content |
| `Control` | `addControl` for any `IControl` |
| `NavigationControl`, `GeolocateControl`, `ScaleControl`, `FullscreenControl`, `AttributionControl`, `LogoControl`, `TerrainControl`, `GlobeControl` | the built-in controls, at `position` |

Layers, `Terrain` and `TerrainControl` inside a `<Source>` use it without a
`source` prop, and wait for a source named by id. A `<Layer beforeId>` whose
layer isn't on the map yet goes on top, and moves into place once it is.

MapLibre's global functions (`setWorkerUrl`, `addProtocol`,
`setRTLTextPlugin`, `prewarm`, ...) don't need a component: import them from
`maplibre-gl`.

## Solid 2

### The map is pending until it is ready

`useMap()` returns the enclosing map as an accessor that is pending until
the style has loaded, and again while MapLibre rebuilds the style from
scratch (a diffed `setStyle` keeps the map usable, so it stays ready). Read
it in a tracking scope and Solid waits for it:

```tsx
import { Loading } from "@solidjs/web";
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
</Map>;
```

The map itself is constructed synchronously, so a pending child never
holds it back.

### Async props

Any prop may be an async value, such as a `createMemo` that returns a
promise. The component adds its source, layer or image once the value has
resolved, and reports a rejection as a map `error` event:

```tsx
const parks = createMemo(async () => (await fetch("/parks.geojson")).json());

<Source type="geojson" data={parks()}>
  <Layer type="fill" paint={{ "fill-color": "#0a7" }} />
</Source>;
```

`<MapImage url>` loads its image through `map.loadImage` the same way.

### Primitives

- `createMapState(read, events)`: an accessor over any map state, re-read
  when one of `events` fires; pending until the map is ready.
- `createMapEvent(type, listener)` and `createMapEvent(type, layer, listener)`:
  a listener that lives as long as its owner. `layer` may be an accessor.
- `<MapProvider>` and `useMapById(id)`: reach a `<Map id>` from outside it,
  for a toolbar beside the map or a second map that follows the first. The
  accessor is pending until that map has mounted and loaded. A map is
  registered under the `id` it was created with; changing `id` afterwards
  doesn't re-register it.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

Licensed under either of [Apache License, Version 2.0](LICENSE-APACHE) or
[MIT license](LICENSE-MIT) at your option.

Unless you explicitly state otherwise, any contribution intentionally
submitted for inclusion in this project by you, as defined in the
Apache-2.0 license, shall be dual licensed as above, without any additional
terms or conditions.
