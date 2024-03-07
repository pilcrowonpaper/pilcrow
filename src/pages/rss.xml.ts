import rss from "@astrojs/rss";
import { getPosts } from "@utils/posts";

export async function GET() {
	const posts = await getPosts();

	return rss({
		title: "Pilcrow",
		description: "Pilcrow's personal website",
		items: posts.map((post) => ({
			title: post.metaData.title,
			pubDate: post.metaData.date,
			description: post.metaData.description,
			link: post.href
		}))
	});
}
