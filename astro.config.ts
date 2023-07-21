import { defineConfig } from "astro/config";
import markdown from "./integrations/markdown";
import siena from "siena";

// https://astro.build/config
import tailwind from "@astrojs/tailwind";

// https://astro.build/config
import vercel from "@astrojs/vercel/serverless";

// https://astro.build/config
export default defineConfig({
	integrations: [tailwind(), markdown(), siena()],
	output: "server",
	adapter: vercel()
});
