interface Config {
  apiUrl: string;
  appName: string;
  version: string;
}

const config: Config = {
  apiUrl: import.meta.env.VITE_API_URL,
  appName: "Skyell URL Crawler",
  version: "1.0.0",
};

export default config;
