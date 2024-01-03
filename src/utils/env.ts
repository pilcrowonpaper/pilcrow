const dev = import.meta.env.DEV;

export const GITHUB_API_KEY = dev ? import.meta.env.GITHUB_API_KEY : process.env.GITHUB_API_KEY;
