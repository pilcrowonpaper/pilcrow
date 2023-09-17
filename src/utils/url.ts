import type { AstroGlobal } from "astro";

export function getOrigin(Astro: AstroGlobal): string {
	if (import.meta.env.DEV) return Astro.url.origin;
	return `https://${import.meta.env.PROD_DOMAIN}`;
}
