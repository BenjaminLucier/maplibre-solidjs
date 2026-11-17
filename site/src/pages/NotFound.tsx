import { paths } from "../router";
import { usePageTitle } from "../title";

export default function NotFound() {
	usePageTitle(() => "Not found");
	return (
		<div class="mx-auto max-w-6xl px-4 py-24 text-center">
			<h1 class="text-3xl font-bold text-slate-900 dark:text-white">
				Off the map
			</h1>
			<p class="mt-3 text-slate-600 dark:text-slate-400">
				There's nothing at this address.
			</p>
			<a
				href={paths()}
				class="mt-6 inline-block font-medium text-blue-600 hover:underline dark:text-blue-400"
			>
				Back home
			</a>
		</div>
	);
}
