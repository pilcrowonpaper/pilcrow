import rss from "@astrojs/rss";
import { getPosts } from "@utils/posts";

export async function GET() {
	const posts = await getPosts();

	return rss({
		title: "Pilcrow",
		description:
			"I think I'm best \"known\" for my work on auth libraries, but I'm interested in anything web dev... well maybe except CSS. I enjoy taking photos, drawing, playing games, traveling, and cooking. Italian food is my favorite.",
		site: "https://pilcrowonpaper.com/",
		items: posts.map((post) => ({
			title: post.metaData.title,
			pubDate: post.metaData.date,
			description: post.metaData.description,
			link: post.href
		}))
	});
}
