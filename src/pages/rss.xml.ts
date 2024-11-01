import rss from "@astrojs/rss";
import { getPosts } from "@utils/posts";

import type { APIContext } from "astro";

export async function GET(context: APIContext) {
	const posts = await getPosts();
	return rss({
		title: "pilcrow",
		description: "pilcrow's personal website",
		items: posts.map((post) => ({
			title: post.title,
			pubDate: post.date,
			link: post.href
		})),
		site: context.site!
	});
}
