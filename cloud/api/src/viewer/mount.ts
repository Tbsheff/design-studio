import { Effect, Layer, ManagedRuntime } from "effect";
import type { Hono } from "hono";

import { ViewerAuth, withPublic } from "../http/middleware/viewer.js";
import { CloudBindings } from "../platform/bindings.js";
import type { AppEnv } from "../platform/bindings.js";
import { PublicationRepo } from "../tenant/repos/publication.js";
import { Resolver } from "../tenant/resolver.js";
import { readSiteFile } from "./read-site-file.js";

const HTTP_UNAUTHORIZED = 401;

const HTTP_NOT_FOUND = 404;

const HTTP_GONE = 410;

const SITE_HEADERS = {
  "cache-control": "public, max-age=60",
  "content-security-policy": "sandbox allow-scripts allow-forms allow-popups",
  "referrer-policy": "no-referrer",
  "x-content-type-options": "nosniff",
  "x-robots-tag": "noindex",
} as const;

const viewerLayer = Layer.mergeAll(
  ViewerAuth.layer.pipe(Layer.provide(Resolver.layer)),
  PublicationRepo.layer
).pipe(Layer.provideMerge(CloudBindings.layer));

const runtime = ManagedRuntime.make(viewerLayer);

interface ViewerFailure {
  readonly _tag?: string;
}

const serveSite = Effect.fn("Viewer.serve")(function* run(
  slug: string,
  rawPath: string
) {
  return yield* readSiteFile(rawPath).pipe(
    withPublic(slug),
    Effect.match({
      onFailure: (error: ViewerFailure): Response => {
        if (error._tag === "Gone") {
          return new Response("This page is no longer available.", {
            status: HTTP_GONE,
          });
        }

        return new Response("Not found.", { status: HTTP_NOT_FOUND });
      },
      onSuccess: (site): Response => {
        if (site.hasPassword) {
          return new Response("This page needs a password.", {
            headers: { "cache-control": "no-store" },
            status: HTTP_UNAUTHORIZED,
          });
        }

        return new Response(site.object.body, {
          headers: { ...SITE_HEADERS, "content-type": site.contentType },
        });
      },
    })
  );
});

const mountViewer = (app: Hono<{ Bindings: AppEnv }>): void => {
  app.get(
    "/p/:slug",
    async (context) =>
      await runtime.runPromise(serveSite(context.req.param("slug"), ""))
  );

  app.get("/p/:slug/*", async (context) => {
    const slug = context.req.param("slug");
    const rest = new URL(context.req.url).pathname.slice(`/p/${slug}/`.length);

    return await runtime.runPromise(serveSite(slug, rest));
  });
};

export { mountViewer };
