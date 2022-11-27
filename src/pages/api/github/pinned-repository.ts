import type { APIRoute } from "astro";
import { GITHUB_API_KEY } from "../../../utils/env";
import { getPinnedRepositories } from "../../../utils/github";

export const get: APIRoute = async () => {
  console.log("PINNED");
  console.log("GITHUB_API_KEY", GITHUB_API_KEY);
  console.log("env", process.env.GITHUB_API_KEY);
  try {
    const repositories = await getPinnedRepositories();
    return new Response(JSON.stringify(repositories), {
      headers: new Headers({
        "Cache-Control": `public, max-age=${10}`,
        "Content-Type": "application/json",
      }),
    });
  } catch (e) {
    return new Response(null, {
      status: 500,
    });
  }
};
