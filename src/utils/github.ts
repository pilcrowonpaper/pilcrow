import { GITHUB_API_KEY } from "./env";

export const getPinnedRepositories = async (): Promise<Repository[]> => {
  const response = await fetch("https://api.github.com/graphql", {
    method: "POST",
    body: JSON.stringify({
      query: `{
            user(login: "pilcrowonpaper") {
              pinnedItems(first: 10, types: REPOSITORY) {
                nodes {
                    ... on Repository {
                        name,
                        description,
                        stargazerCount,
                        languages(first: 1) {
                            nodes {
                                ... on Language {
                                    name
                                }
                            }
                        }
                        url
                    }
                }
              }
            }
          }`,
    }),
    headers: {
      Authorization: `Bearer ${GITHUB_API_KEY}`,
    },
  });
  if (!response.ok) throw new Error("Failed to fetch data");
  interface Nodes<T> {
    nodes: T;
  }
  interface Result {
    data: {
      user: {
        pinnedItems: Nodes<
          {
            name: string;
            description: string;
            stargazerCount: number;
            url: string;
            languages: Nodes<
              {
                name: string;
              }[]
            >;
          }[]
        >;
      };
    };
  }
  const result = (await response.json()) as Result;
  return result.data.user.pinnedItems.nodes.map((repository) => {
    return {
      name: repository.name,
      description: repository.description,
      stars: repository.stargazerCount,
      language: repository.languages.nodes[0].name || "",
      url: repository.url,
    };
  });
};
