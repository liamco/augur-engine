import type { NextConfig } from "next";

/**
 * The app is a client-only shell (`app/page.tsx` renders with `ssr: false`) and
 * react-router owns routing, so every non-API path has to fall through to `/`.
 *
 * **`api/` must be excluded, and the reason is subtle.** The array form of
 * `rewrites` is `afterFiles`, which is evaluated after static routes but *before*
 * dynamic ones. So `/api/health` and `/api/lists` survived a bare `/:path*`
 * catch-all, while `/api/lists/[id]` was rewritten to the shell and answered
 * `text/html` — with a 200 status, which is why it looked like it worked. Any
 * dynamic route added under `app/api/` would fail the same way.
 */
const nextConfig: NextConfig = {
    rewrites: async () => [
        {
            source: "/:path((?!api/).*)",
            destination: "/",
        },
    ],
};

export default nextConfig;
