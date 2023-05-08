import { GITHUB_API_KEY } from "./env";
import projectMetaData from "./projects.json";

export const getProjects = async () => {
	return await Promise.all(
		projectMetaData.map(async (projectMetaData) => {
			const requestUrl = new URL(
				`https://api.github.com/repos/${projectMetaData.repository}`
			);
			const response = await fetch(requestUrl, {
				headers: {
					Authorization: `Bearer ${GITHUB_API_KEY}`,
					"Cache-Control": "max-age=120"
				}
			});
			if (!response.ok) {
				await logApiError(response);
				throw new Error("Failed to fetch data");
			}
			const result = (await response.json()) as {
				stargazers_count: number;
			};
			const repositoryUrl = new URL(
				`https://github.com/${projectMetaData.repository}`
			);
			return {
				stars: result.stargazers_count,
				repositoryUrl,
				...projectMetaData
			};
		})
	);
};

export type Projects = Awaited<ReturnType<typeof getProjects>>

const logApiError = async (response: Response) => {
	try {
		console.log(await response.json());
	} catch {
		console.log("Failed to parse JSON");
	}
};
