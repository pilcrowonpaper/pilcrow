import type { AstroGlobal } from "astro";

export const getOrigin = (Astro: AstroGlobal) => {
	if (import.meta.env.DEV) return Astro.url.origin;
	return Astro.url.origin.replace("http://", "https://");
};
