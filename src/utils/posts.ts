import type { MarkdownInstance } from "astro";

const postImports = import.meta.glob<boolean, string, PostMarkdown>("../posts/*.md");

type PostMarkdown = MarkdownInstance<{
	title: string;
	date: string;
	hidden?: boolean;
}>;

type ResolveMarkdownImport = () => Promise<PostMarkdown>;

async function resolveMarkdownImportEntry(relativePath: string, resolveImport: ResolveMarkdownImport): Promise<Post> {
	const fileName = relativePath.split("/").at(-1) ?? null;
	if (!fileName) {
		throw new Error(`Failed to extract file name from path: ${relativePath}`);
	}
	const [postId] = fileName.split(".").slice(0, -1);
	const markdown = await resolveImport();
	const post: Post = {
		postId,
		Content: markdown.Content,
		title: markdown.frontmatter.title,
		date: new Date(markdown.frontmatter.date.replaceAll("-", "/")),
		hidden: markdown.frontmatter.hidden ?? false,
		href: ["blog", postId].join("/")
	};
	return post;
}

export async function getPosts() {
	const promises: Promise<Post>[] = [];
	for (const [importPath, resolveImport] of Object.entries(postImports)) {
		promises.push(resolveMarkdownImportEntry(importPath, resolveImport));
	}
	const posts = await Promise.all(promises);
	return posts
		.sort((a, b) => {
			return b.date.getTime() - a.date.getTime();
		})
		.filter((post) => !post.hidden);
}

interface Post {
	postId: string;
	Content: MarkdownInstance<any>["Content"];
	title: string;
	date: Date;
	hidden: boolean;
	href: string;
}
