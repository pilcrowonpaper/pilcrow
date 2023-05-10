import type { AstroGlobal } from "astro";

export const getOrigin = (Astro: AstroGlobal): string => {
	if (import.meta.env.DEV) return Astro.url.origin;
	return `https://${import.meta.env.PROD_DOMAIN}`;
};
