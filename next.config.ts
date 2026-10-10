import type { NextConfig } from "next";
import outputs from "./amplify_outputs.json";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: `${outputs.storage.bucket_name}.s3.${outputs.storage.aws_region}.amazonaws.com`,
        pathname: "/media/**",
      },
      {
        protocol: "https",
        hostname: `${outputs.storage.bucket_name}.s3.amazonaws.com`,
        pathname: "/media/**",
      },
    ],
  },
  cacheComponents: true,
  partialPrefetching: true,
};

export default nextConfig;
