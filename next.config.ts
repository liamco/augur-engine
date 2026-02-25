import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    rewrites: async () => [
        {
            source: "/:path*",
            destination: "/",
        },
    ],
};

export default nextConfig;
