import type { MiddlewareResponseHandler } from "astro";

export const onRequest: MiddlewareResponseHandler = async (_, next) => {
	const response = await next();
	const html = await response.text();
	const modifiedHtml = html
		.replaceAll(
			`<span style="color: #6F42C1">.</span>`,
			`<span style="color: #24292EFF">.</span>`
		)
		.replaceAll(
			`<span style="color: #6F42C1">.`,
			`<span style="color: #24292EFF">.</span><span style="color: #6F42C1">`
		)
		.replaceAll("#C2C3C5", "#a8a8a8") // comment
		.replaceAll("#22863A", "#509c30") // string
		.replaceAll("#6F42C1", "#239ecf") // function
		.replaceAll("#1976D2", "#7575ff") // variables, object keys
		.replaceAll("#D32F2F", "#e35349"); // keyword (const, await, if, `:`, etc.)
	return new Response(modifiedHtml, {
		headers: response.headers
	});
};
