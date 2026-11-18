import type { HighlighterCore, ThemedToken } from "shiki/core";
import { createSignal } from "solid-js";

export type Language = "tsx" | "sh";

// Only the grammars and themes the site uses, with the JavaScript regex
// engine instead of Oniguruma's WebAssembly, loaded after the first paint.
const load = async (): Promise<HighlighterCore> => {
	const [{ createHighlighterCore }, { createJavaScriptRegexEngine }] =
		await Promise.all([
			import("shiki/core"),
			import("shiki/engine/javascript"),
		]);
	return createHighlighterCore({
		engine: createJavaScriptRegexEngine(),
		langs: [
			import("shiki/langs/tsx.mjs"),
			import("shiki/langs/shellscript.mjs"),
		],
		themes: [
			import("shiki/themes/github-light.mjs"),
			import("shiki/themes/github-dark.mjs"),
		],
	});
};

const [highlighter, setHighlighter] = createSignal<HighlighterCore>();
let started = false;

/**
 * Splits `code` into lines of tokens colored for both themes (as
 * `--shiki-light` and `--shiki-dark`), or returns undefined until the
 * highlighter has loaded, so code shows as plain text first.
 */
export function highlight(
	code: string,
	lang: Language,
): ThemedToken[][] | undefined {
	if (!started) {
		started = true;
		load().then(
			(instance) => void setHighlighter(() => instance),
			(error: unknown) => console.error("Syntax highlighting failed", error),
		);
	}
	return highlighter()?.codeToTokens(code, {
		lang: lang === "sh" ? "shellscript" : "tsx",
		themes: { light: "github-light", dark: "github-dark" },
		defaultColor: false,
	}).tokens;
}
