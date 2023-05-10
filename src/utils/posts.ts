import type { MarkdownInstance } from "astro";

const postImports = import.meta.glob("../posts/*.md");

const resolveMarkdownImportEntry = async ([relativePath, resolveImport]: [
	string,
	() => Promise<any>
]) => {
	const fileName = relativePath.split("/").at(-1) ?? null;
	if (!fileName) {
		throw new Error(`Failed to extract file name from path: ${relativePath}`);
	}
	const [postId] = fileName.split(".").slice(0, -1);
	const markdown = (await resolveImport()) as MarkdownInstance<{
		title: string;
		description: string;
		tldr: string;
		date: string;
	}>;
	return {
		postId,
		Content: markdown.Content,
		metaData: markdown.frontmatter,
		href: ["blog", postId].join("/")
	} as const;
};

export const getPosts = async () => {
	const posts = await Promise.all(
		Object.entries(postImports).map(resolveMarkdownImportEntry)
	);
	return posts;
};
