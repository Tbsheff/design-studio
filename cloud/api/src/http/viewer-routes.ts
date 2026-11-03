import { Effect } from "effect";
import type { Layer, ManagedRuntime } from "effect";
import type { Hono } from "hono";

import type { AppEnv } from "../platform/bindings.js";
import { GONE, NOT_FOUND, UNAUTHORIZED } from "../shared-actions.js";
import type { viewerLayer } from "../viewer/layer.js";
import { readSiteFile } from "../viewer/read-site-file.js";
import { withPublic } from "./middleware/viewer.js";

type ViewerRuntime = ManagedRuntime.ManagedRuntime<
  Layer.Success<typeof viewerLayer>,
  unknown
>;

const SLUG_PATH_PARTS = 3;

const SITE_HEADERS = {
  "cache-control": "public, max-age=60",
  "content-security-policy": "sandbox allow-scripts allow-forms allow-popups",
  "referrer-policy": "no-referrer",
  "x-content-type-options": "nosniff",
  "x-robots-tag": "noindex",
} as const;

const toText = (text: string, status: number): Response =>
  new Response(text, { headers: { "cache-control": "no-store" }, status });

const toFilePath = (url: string): string =>
  new URL(url).pathname.split("/").slice(SLUG_PATH_PARTS).join("/");

const serveSite = Effect.fn("Viewer.serve")(function* run(
  slug: string,
  rawPath: string
) {
  return yield* readSiteFile(rawPath).pipe(
    Effect.map(
      (site) =>
        new Response(site.object.body, {
          headers: { ...SITE_HEADERS, "content-type": site.contentType },
        })
    ),
    withPublic(slug),
    Effect.catchTag("Gone", () =>
      Effect.succeed(toText("This page is no longer available.", GONE))
    ),
    Effect.catchTag("NotFound", () =>
      Effect.succeed(toText("Not found.", NOT_FOUND))
    ),
    Effect.catchTag("Unauthenticated", () =>
      Effect.succeed(toText("This page needs a password.", UNAUTHORIZED))
    )
  );
});

const mountViewer = (
  app: Hono<{ Bindings: AppEnv }>,
  runtime: ViewerRuntime
): void => {
  app.get(
    "/p/:slug",
    async (context) =>
      await runtime.runPromise(serveSite(context.req.param("slug"), ""))
  );

  app.get(
    "/p/:slug/*",
    async (context) =>
      await runtime.runPromise(
        serveSite(context.req.param("slug"), toFilePath(context.req.url))
      )
  );
};

export { mountViewer };
