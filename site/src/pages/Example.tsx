import { ArrowLeft } from "@lucide/solid";
import { useParams } from "@solidjs/router";
import { dynamic, Loading } from "@solidjs/web";
import { createMemo, Show } from "solid-js";
import { Demo } from "../components/Demo";
import { EXAMPLES, exampleComponent, exampleSource } from "../examples";
import { paths } from "../router";
import { usePageTitle } from "../title";
import NotFound from "./NotFound";

export function exampleHref(id: string): string {
	return `${paths.examples}/${id}`;
}

export default function Example() {
	const params = useParams<{ id: string }>();
	const info = createMemo(() =>
		EXAMPLES.find((example) => example.id === params.id),
	);
	const Component = dynamic(() => exampleComponent(params.id));
	usePageTitle(() => info()?.title ?? "Not found");

	return (
		<Show when={info()} fallback={<NotFound />}>
			{(example) => (
				<div class="mx-auto max-w-6xl px-4 py-10">
					<a
						href={paths.examples}
						class="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
					>
						<ArrowLeft size={14} /> All examples
					</a>
					<h1 class="mt-3 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
						{example().title}
					</h1>
					<p class="mt-2 mb-6 text-slate-600 dark:text-slate-400">
						{example().description}
					</p>
					<Demo source={exampleSource(example().id)}>
						<Loading
							fallback={
								<div class="grid h-full place-items-center text-sm text-slate-500">
									Loading example…
								</div>
							}
						>
							<Component />
						</Loading>
					</Demo>
					<Show when={exampleSource(example().id).includes("basemap()")}>
						<p class="mt-4 text-sm text-slate-500 dark:text-slate-400">
							<code>basemap()</code> is this site's light or dark OpenFreeMap
							style; any style URL or object works.
						</p>
					</Show>
				</div>
			)}
		</Show>
	);
}
