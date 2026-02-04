import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  /* config options here */
};

export default withSentryConfig(nextConfig, {
  org: "taetae",
  project: "to-high-fe",
  silent: !process.env.CI,
  widenClientFileUpload: true,
});
