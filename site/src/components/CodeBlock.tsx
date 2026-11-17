import { Check, Copy } from "@lucide/solid";
import { createSignal } from "solid-js";

/** Source code with a copy button. */
export function CodeBlock(props: { code: string; class?: string }) {
	const [copied, setCopied] = createSignal(false);
	const copy = async () => {
		await navigator.clipboard.writeText(props.code);
		setCopied(true);
		setTimeout(() => setCopied(false), 1500);
	};
	return (
		<div
			class={`group relative overflow-hidden rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900 ${props.class ?? ""}`}
		>
			<button
				type="button"
				onClick={copy}
				class="absolute top-2 right-2 rounded-md border border-slate-200 bg-white p-1.5 text-slate-500 opacity-0 transition group-hover:opacity-100 hover:text-slate-900 focus:opacity-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:text-white"
				aria-label="Copy code"
				title="Copy code"
			>
				{copied() ? <Check size={14} /> : <Copy size={14} />}
			</button>
			<pre class="overflow-x-auto p-4 font-mono text-[13px] leading-6 text-slate-800 dark:text-slate-200">
				<code>{props.code.trimEnd()}</code>
			</pre>
		</div>
	);
}
