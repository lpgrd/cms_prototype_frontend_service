import type { NextConfig } from "next";

// Where /api/* is proxied to, read at build time. On Vercel this is the Render URL of the API.
const API_URL = (process.env.API_URL ?? "http://localhost:4000").replace(/\/$/, "");
if (process.env.VERCEL && !process.env.API_URL) {
  throw new Error(
    "Set API_URL (the backend's public URL, e.g. https://jeweller-api.onrender.com) in the Vercel project's environment variables.",
  );
}

const nextConfig: NextConfig = {
  // Self-contained server bundle (.next/standalone) for the Docker image. Vercel (which sets VERCEL=1)
  // builds and serves Next.js its own way, so the standalone bundle is only produced elsewhere.
  output: process.env.VERCEL ? undefined : "standalone",
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    // The portal renders on the client behind a login, so implicit instant-navigation validation
    // of every page only produces noise; segments that need it can opt in with `export const instant`.
    instantInsights: { validationLevel: "manual-warning" },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  // The browser only ever talks to this origin; /api is proxied to the Express backend,
  // which keeps the httpOnly session cookie first-party.
  // Partners used to be called influencers; keep old links and bookmarks working.
  async redirects() {
    return [
      { source: "/influencers", destination: "/partners", permanent: true },
      { source: "/influencers/:path*", destination: "/partners/:path*", permanent: true },
    ];
  },
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${API_URL}/api/:path*` }];
  },
};

export default nextConfig;
