import type { MarkdownInstance } from "astro";

const postImports: Record<string, ResolveMarkdownImport> = import.meta.glob(
	"../posts/*.md"
);

type ResolveMarkdownImport = () => Promise<
	MarkdownInstance<{
		title: string;
		description: string;
		tldr?: string;
		date: string;
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
			date: new Date(markdown.frontmatter.date.replaceAll("-", "/"))
		},
		href: ["blog", postId].join("/")
	} as const;
}

export async function getPosts() {
	const posts = await Promise.all(
		Object.entries(postImports).map(resolveMarkdownImportEntry)
	);
	return posts.sort((a, b) => {
		return b.metaData.date.getTime() - a.metaData.date.getTime();
	});
}

interface Post {
	postId: string;
	Content: MarkdownInstance<any>["Content"];
	metaData: {
		title: string;
		tldr: string | null;
		description: string;
		date: Date;
	};
	href: string;
}
