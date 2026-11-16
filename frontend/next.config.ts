import type { NextConfig } from "next";
const apiOrigin = process.env.API_URL || "http://localhost:4000";
if (
  process.env.NETLIFY &&
  (!process.env.API_URL || new URL(apiOrigin).protocol !== "https:")
) {
  throw new Error(
    "Netlify requires API_URL pointing to the approved HTTPS backend",
  );
}
const config: NextConfig = {
  output: process.env.NETLIFY ? undefined : "standalone",
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${apiOrigin.replace(/\/$/, "")}/api/:path*`,
      },
    ];
  },
};
export default config;
