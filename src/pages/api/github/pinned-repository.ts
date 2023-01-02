import type { APIRoute } from "astro";
import { getPinnedRepositories } from "../../../utils/github";

const CACHE_MAX_AGE = 60 * 60 * 24; // 24 hours

export const get: APIRoute = async () => {
  try {
    const repositories = await getPinnedRepositories();
    return new Response(JSON.stringify(repositories), {
      headers: new Headers({
        "Cache-Control": `public, max-age=${CACHE_MAX_AGE}`,
        "Content-Type": "application/json",
      }),
    });
  } catch (e) {
    return new Response(null, {
      status: 500,
    });
  }
};
