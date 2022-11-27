const getEnvironmentVariable = (envVar: string) => {
  const dev = import.meta.env.DEV;
  console.log( process.env)
  return dev ? import.meta.env[envVar] : process.env[envVar];
};

export const GITHUB_API_KEY = getEnvironmentVariable("GITHUB_API_KEY");
