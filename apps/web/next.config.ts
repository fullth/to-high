import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  async redirects() {
    return [{ source: "/admin", destination: "/admin/budget", permanent: false }];
  },
};

export default withSentryConfig(nextConfig, {
  org: "taetae",
  project: "to-high-fe",
  silent: !process.env.CI,
  widenClientFileUpload: true,
});
