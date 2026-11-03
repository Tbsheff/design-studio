import { Effect, Option, Schema } from "effect";
import type { Layer, ManagedRuntime } from "effect";
import type { Hono } from "hono";

import type { AppEnv } from "../platform/bindings.js";
import {
  BAD_REQUEST,
  GONE,
  NOT_FOUND,
  UNAUTHORIZED,
} from "../shared-actions.js";
import type { viewerLayer } from "../viewer/layer.js";
import { readSiteFile } from "../viewer/read-site-file.js";
import { unlockSite } from "../viewer/unlock.js";
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

const toUnlockPage = (slug: string): Response =>
  new Response(
    `<!doctype html><meta charset="utf-8"><title>Password</title><form method="post" action="/p/${encodeURIComponent(slug)}/unlock"><label>Password <input type="password" name="password" autofocus required></label> <button type="submit">Open</button></form>`,
    {
      headers: {
        "cache-control": "no-store",
        "content-type": "text/html; charset=utf-8",
      },
      status: UNAUTHORIZED,
    }
  );

const toSiteHeaders = (
  contentType: string,
  isPasswordProtected: boolean
): Headers => {
  const headers = new Headers(SITE_HEADERS);

  headers.set("content-type", contentType);

  if (isPasswordProtected) {
    headers.set("cache-control", "private, no-store");
  }

  return headers;
};

const UnlockFormSchema = Schema.Struct({ password: Schema.String });

const decodeUnlockForm = Schema.decodeUnknownEffect(UnlockFormSchema);

const toFilePath = (url: string): string =>
  new URL(url).pathname.split("/").slice(SLUG_PATH_PARTS).join("/");

const serveSite = Effect.fn("Viewer.serve")(function* run(
  slug: string,
  rawPath: string,
  cookieHeader: string | null
) {
  return yield* readSiteFile(slug, rawPath, cookieHeader).pipe(
    Effect.map(
      (site) =>
        new Response(site.object.body, {
          headers: toSiteHeaders(site.contentType, site.isPasswordProtected),
        })
    ),
    withPublic(slug),
    Effect.catchTag("Gone", () =>
      Effect.succeed(toText("This page is no longer available.", GONE))
    ),
    Effect.catchTag("NotFound", () =>
      Effect.succeed(toText("Not found.", NOT_FOUND))
    ),
    Effect.catchTag("Unauthenticated", () => Effect.succeed(toUnlockPage(slug)))
  );
});

const unlockRoute = Effect.fn("Viewer.unlockRoute")(function* run(
  slug: string,
  request: Request,
  ip: string
) {
  const form = yield* Effect.tryPromise(() => request.formData()).pipe(
    Effect.flatMap((body) => decodeUnlockForm(Object.fromEntries(body))),
    Effect.option
  );

  if (Option.isNone(form)) {
    return toText("The form is not valid.", BAD_REQUEST);
  }

  return yield* unlockSite(slug, form.value.password, ip).pipe(
    withPublic(slug),
    Effect.catchTag("NotFound", () =>
      Effect.succeed(toText("Not found.", NOT_FOUND))
    ),
    Effect.catchTag("Gone", () =>
      Effect.succeed(toText("This page is no longer available.", GONE))
    )
  );
});

const mountViewer = (
  app: Hono<{ Bindings: AppEnv }>,
  runtime: ViewerRuntime
): void => {
  app.get("/p/:slug", (context) =>
    runtime.runPromise(
      serveSite(
        context.req.param("slug"),
        "",
        context.req.header("cookie") ?? null
      )
    )
  );

  app.post("/p/:slug/unlock", (context) =>
    runtime.runPromise(
      unlockRoute(
        context.req.param("slug"),
        context.req.raw,
        context.req.header("cf-connecting-ip") ?? "unknown"
      )
    )
  );

  app.get("/p/:slug/*", (context) =>
    runtime.runPromise(
      serveSite(
        context.req.param("slug"),
        toFilePath(context.req.url),
        context.req.header("cookie") ?? null
      )
    )
  );
};

export { mountViewer };
