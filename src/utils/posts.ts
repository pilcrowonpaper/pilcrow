import type { MarkdownInstance } from "astro";

const postImports: Record<string, ResolveMarkdownImport> = import.meta.glob("../posts/*.md");

type ResolveMarkdownImport = () => Promise<
	MarkdownInstance<{
		title: string;
		description: string;
		tldr?: string;
		date: string;
		hidden?: boolean;
	}>
>;
async function resolveMarkdownImportEntry([relativePath, resolveImport]: [
	string,
	ResolveMarkdownImport
]): Promise<Post> {
	const fileName = relativePath.split("/").at(-1) ?? null;
	if (!fileName) {
		throw new Error(`Failed to extract file name from path: ${relativePath}`);
	}
	const [postId] = fileName.split(".").slice(0, -1);
	const markdown = await resolveImport();
	return {
		postId,
		Content: markdown.Content,
		metaData: {
			title: markdown.frontmatter.title,
			tldr: markdown.frontmatter.tldr ?? null,
			description: markdown.frontmatter.description,
			date: new Date(markdown.frontmatter.date.replaceAll("-", "/")),
			hidden: markdown.frontmatter.hidden ?? false
		},
		href: ["blog", postId].join("/")
	} as const;
}

export async function getPosts() {
	const posts = await Promise.all(Object.entries(postImports).map(resolveMarkdownImportEntry));
	return posts
		.sort((a, b) => {
			return b.metaData.date.getTime() - a.metaData.date.getTime();
		})
		.filter((post) => !post.metaData.hidden);
}

interface Post {
	postId: string;
	Content: MarkdownInstance<any>["Content"];
	metaData: PostMetaData;
	href: string;
}

interface PostMetaData {
	title: string;
	tldr: string | null;
	description: string;
	date: Date;
	hidden: boolean;
}
