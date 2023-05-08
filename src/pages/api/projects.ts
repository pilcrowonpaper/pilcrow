import type { APIRoute } from "astro";
import { getProjects } from "@utils/github";

const CACHE_MAX_AGE = 60 * 60 * 24; // 24 hours

export const get: APIRoute = async () => {
	try {
		const projects = await getProjects();
		return new Response(JSON.stringify(projects), {
			headers: new Headers({
				"Cache-Control": `public, max-age=${CACHE_MAX_AGE}`,
				"Content-Type": "application/json"
			})
		});
	} catch (e) {
		return new Response(null, {
			status: 500
		});
	}
};
