import type { APIRoute } from "astro";
import { getPinnedRepositories } from "../../../utils/github";

export const get: APIRoute = async () => {
  try {
    const repositories = await getPinnedRepositories();
    return new Response(JSON.stringify(repositories), {
        headers: {
            "Cache-Control": `public,max-age=${10}`
        }
    });
  } catch {
    return new Response(null, {
      status: 500,
    });
  }
};
