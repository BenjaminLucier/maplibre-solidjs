import { ArrowRight } from "@lucide/solid";
import { For } from "solid-js";
import { EXAMPLES } from "../examples";
import { usePageTitle } from "../title";
import { exampleHref } from "./Example";

export default function Examples() {
	usePageTitle(() => "Examples");
	return (
		<div class="mx-auto max-w-6xl px-4 py-10">
			<h1 class="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
				Examples
			</h1>
			<p class="mt-3 text-slate-600 dark:text-slate-400">
				Each example is live, and its code tab shows the file that runs.
			</p>
			<div class="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
				<For each={EXAMPLES}>
					{(example) => (
						<a
							href={exampleHref(example.id)}
							class="group rounded-xl border border-slate-200 p-5 hover:border-blue-400 hover:shadow-md dark:border-slate-800 dark:hover:border-blue-500"
						>
							<h2 class="flex items-center justify-between font-semibold text-slate-900 dark:text-white">
								{example.title}
								<ArrowRight
									size={16}
									class="text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-blue-500"
								/>
							</h2>
							<p class="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
								{example.description}
							</p>
						</a>
					)}
				</For>
			</div>
		</div>
	);
}
