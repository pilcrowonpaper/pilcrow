import type { AstroIntegration } from "astro";
import rehype from "./rehype";

export default () => {
	const integration: AstroIntegration = {
		name: "lucia:markdown",
		hooks: {
			"astro:config:setup": ({ updateConfig }) => {
				updateConfig({
					markdown: {
						shikiConfig: {
							theme: "css-variables"
						},
						rehypePlugins: [rehype()]
					}
				});
			}
		}
	};
	return integration;
};
