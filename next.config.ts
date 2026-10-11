import type { NextConfig } from "next";
import { hostname, networkInterfaces } from "node:os";
import outputs from "./amplify_outputs.json";

// Permit this machine's exact LAN hosts when testing from a phone.
const localDevHosts = Array.from(new Set([
  hostname(),
  ...Object.values(networkInterfaces()).flatMap(addresses =>
    (addresses ?? []).filter(address => !address.internal && address.family === "IPv4").map(address => address.address),
  ),
]));
const nextConfig: NextConfig = {
  allowedDevOrigins: localDevHosts,
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
