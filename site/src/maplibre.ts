import { setWorkerUrl } from "maplibre-gl";
// MapLibre finds its worker relative to its own module at runtime, which
// bundlers can't see. Bundle the worker explicitly and point MapLibre at it.
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";

setWorkerUrl(workerUrl);
