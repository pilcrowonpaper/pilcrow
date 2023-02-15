import { defineConfig } from "astro/config";
import type { AstroIntegration } from "astro";

// https://astro.build/config
import tailwind from "@astrojs/tailwind";

// https://astro.build/config
import vercel from "@astrojs/vercel/edge";


const testIntegration: AstroIntegration = {
  name: "test",
  hooks: {
    "astro:server:setup": (options) => {
      console.dir(options.server)
    },
  },
};

// https://astro.build/config
export default defineConfig({
  integrations: [tailwind(), testIntegration],
  output: "server",
  adapter: vercel(),
});
