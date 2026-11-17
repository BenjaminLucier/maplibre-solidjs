import type { JSX } from "@solidjs/web";
import { createSignal } from "solid-js";
import { CodeBlock } from "./CodeBlock";

/** A live example above (or beside) its source, with a tab to switch on small screens. */
export function Demo(props: { source: string; children: JSX.Element }) {
	const [tab, setTab] = createSignal<"demo" | "code">("demo");
	const tabClass = (name: "demo" | "code") =>
		`px-3 py-1.5 text-sm rounded-md ${
			tab() === name
				? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white"
				: "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
		}`;
	return (
		<div class="space-y-3">
			<div class="inline-flex gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
				<button
					type="button"
					class={tabClass("demo")}
					onClick={() => setTab("demo")}
				>
					Demo
				</button>
				<button
					type="button"
					class={tabClass("code")}
					onClick={() => setTab("code")}
				>
					Code
				</button>
			</div>
			{/* The map stays mounted while the code tab is open. */}
			<div
				class="h-[460px] overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800"
				hidden={tab() !== "demo"}
			>
				{props.children}
			</div>
			<div hidden={tab() !== "code"}>
				<CodeBlock code={props.source} />
			</div>
		</div>
	);
}
