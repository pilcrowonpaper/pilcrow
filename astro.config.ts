import { defineConfig } from "astro/config";
import markdown from "./integrations/markdown";
import siena from "siena";
import tailwind from "@astrojs/tailwind";

// https://astro.build/config
export default defineConfig({
	integrations: [tailwind(), markdown(), siena()]
});
