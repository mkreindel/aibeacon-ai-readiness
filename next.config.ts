import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Off on purpose: the admin pages read the session on every request and must return
  // a real 404 from notFound(). See docs/adr/0002-cache-components-off.md.
  cacheComponents: false,
  partialPrefetching: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
