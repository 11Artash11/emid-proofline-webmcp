/** Cloudflare Worker entry point for the vinext-starter template. */
import handler from "vinext/server/app-router-entry";

interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/_vinext/image") {
      // This demo serves static assets and has no image-transform use case.
      // Reject before touching ASSETS or any metered image binding.
      return new Response("Not found", { status: 404 });
    }

    return handler.fetch(request, env, ctx);
  },
};

export default worker;
