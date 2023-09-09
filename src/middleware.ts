import type { MiddlewareResponseHandler } from "astro";

export const onRequest: MiddlewareResponseHandler = async (_, next) => {
	const response = await next();
	const html = await response.text();
	const modifiedHtml = html
		.replaceAll("background-color: #1E1E1E", "")
		.replaceAll("#569CD6", COLORS.KEYWORD)
		.replaceAll("#4FC1FF", COLORS.BLACK)
		.replaceAll("#C586C0", COLORS.KEYWORD)
		.replaceAll("#9CDCFE", COLORS.BLACK)
		.replaceAll("#6A9955", COLORS.COMMENT)
		.replaceAll("#DCDCAA", COLORS.FUNCTION)
		.replaceAll("#4EC9B0", COLORS.KEYWORD)
		.replaceAll("#CE9178", COLORS.STRING)
		.replaceAll("#B5CEA8", COLORS.NUMBER)
		.replaceAll("#D4D4D4", COLORS.BLACK)
	return new Response(modifiedHtml, {
		headers: response.headers
	});
};

const COLORS = {
	COMMENT: "#8D8D8D",
	BLACK: "#000000",
	STRING: "#E28A17",
	NUMBER: "#E92F89",
	KEYWORD: "#5931ED",
	FUNCTION: "#518DFD"
}