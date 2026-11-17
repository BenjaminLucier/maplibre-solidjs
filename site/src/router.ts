import { createRouter } from "@solidjs/router";
import { lazy } from "solid-js";

export const Router = createRouter({
	base: import.meta.env.BASE_URL,
	routes: [
		{ path: "/", component: lazy(() => import("./pages/Home")) },
		{ path: "/guide", component: lazy(() => import("./pages/Guide")) },
		{ path: "/examples", component: lazy(() => import("./pages/Examples")) },
		{
			path: "/examples/:id",
			component: lazy(() => import("./pages/Example")),
		},
		{ path: "/api", component: lazy(() => import("./pages/Api")) },
		{ path: "*404", component: lazy(() => import("./pages/NotFound")) },
	],
});

export const { paths } = Router;
