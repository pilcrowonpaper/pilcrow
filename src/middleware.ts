import type { MiddlewareResponseHandler } from "astro";

export const onRequest: MiddlewareResponseHandler = async (_, next) => {
	const response = await next();
	const html = await response.text();
	const modifiedHtml = html
		.replaceAll("background-color: #1E1E1E", "")
		.replaceAll("#569CD6", COLORS.KEYWORD)
		.replaceAll("#4FC1FF", COLORS.BASE)
		.replaceAll("#C586C0", COLORS.KEYWORD)
		.replaceAll("#9CDCFE", COLORS.BASE)
		.replaceAll("#6A9955", COLORS.COMMENT)
		.replaceAll("#DCDCAA", COLORS.FUNCTION)
		.replaceAll("#4EC9B0", COLORS.KEYWORD)
		.replaceAll("#CE9178", COLORS.STRING)
		.replaceAll("#B5CEA8", COLORS.NUMBER)
		.replaceAll("#D4D4D4", COLORS.BASE);
	return new Response(modifiedHtml, {
		headers: response.headers
	});
};

const BLACK = "#000000";
const PINK = "#f255a1";
const BLUE = "#3685f5";
const ORANGE = "#fc9c26";
const GRAY = "#8D8D8D";

const COLORS = {
	COMMENT: GRAY,
	BASE: BLACK,
	STRING: ORANGE,
	NUMBER: PINK,
	KEYWORD: BLUE,
	FUNCTION: BLUE
};
