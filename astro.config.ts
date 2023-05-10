import { defineConfig } from "astro/config";
import markdown from "./integrations/markdown";

// https://astro.build/config
import tailwind from "@astrojs/tailwind";

// https://astro.build/config
import vercel from "@astrojs/vercel/serverless";

// https://astro.build/config
export default defineConfig({
	integrations: [tailwind(), markdown()],
	output: "server",
	adapter: vercel()
});
