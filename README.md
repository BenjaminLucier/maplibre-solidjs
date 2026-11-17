# maplibre-solidjs

[SolidJS 2](https://docs.solidjs.com) components for
[MapLibre GL JS](https://maplibre.org/maplibre-gl-js/docs/).

> **Status:** early development, not yet published to npm.

## Goals

- Declarative `Map`, `Source`, `Layer`, `Marker`, `Popup`, controls, images,
  feature state, sky, light, terrain and projection.
- Props are reactive: changes are applied in place through MapLibre's setters
  (`setData`, `setPaintProperty`, `setFilter`, ...) rather than by removing and
  re-adding.
- Everything a component adds is removed when it unmounts, and restored when
  the map's style changes.
- Types come from `maplibre-gl` itself, every layer type included.

## Requirements

Peer dependencies: `solid-js` 2, `@solidjs/web` 2 and `maplibre-gl` 6.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

Licensed under either of [Apache License, Version 2.0](LICENSE-APACHE) or
[MIT license](LICENSE-MIT) at your option.

Unless you explicitly state otherwise, any contribution intentionally
submitted for inclusion in this project by you, as defined in the
Apache-2.0 license, shall be dual licensed as above, without any additional
terms or conditions.
