/**
 * Liveness probe, and the first route handler in the app.
 *
 * Worth recording why this works: `next.config.ts` rewrites `/:path*` → `/` so
 * react-router can own client routing, which looks like it would swallow every
 * API path. It does not. The array form of `rewrites` is `afterFiles`, so it is
 * only consulted once route handlers and files have had their chance — verified
 * by request: `/api/health` answers with JSON while `/test-lab` still returns the
 * app shell.
 *
 * If that rewrite is ever moved to `beforeFiles`, every route here starts
 * returning HTML instead. Nothing in the unit suite can catch that, since it is
 * server-runtime behaviour rather than module behaviour.
 */
export async function GET() {
    return Response.json({ ok: true });
}
