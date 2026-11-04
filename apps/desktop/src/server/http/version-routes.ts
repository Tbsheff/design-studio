import path from "node:path";

import type { Hono } from "hono";

import type { VersionThumbs } from "../../shared/contracts.js";
import type { StudioProjectStore } from "../store/projects.js";
import { bindVersionReadRuntime } from "../store/version-read-core.js";
import {
  clampViewport,
  diffThumbName,
  THUMB_VIEWPORT,
  versionThumbName,
  type ThumbnailService,
} from "../thumbnails.js";

interface VersionRouteDeps {
  projects: StudioProjectStore;
  thumbnails: ThumbnailService;
}

const png = (bytes: Buffer, headers: Record<string, string> = {}): Response =>
  new Response(new Uint8Array(bytes), {
    headers: {
      "content-type": "image/png",
      "cache-control": "private, max-age=31536000, immutable",
      ...headers,
    },
  });

const gone = (error: unknown): Response => {
  if (error instanceof Error && error.name === "AbortError") {
    return new Response(null, { status: 499 });
  }

  throw error;
};

async function versionThumbs(
  deps: VersionRouteDeps,
  projectId: string,
  from: string,
  to: string,
  signal: AbortSignal
): Promise<VersionThumbs> {
  const dir = path.join(deps.projects.projectDir(projectId), "thumbs");

  const shot = (id: string) =>
    deps.thumbnails.version(projectId, id, signal).then(
      () => path.join(dir, versionThumbName(id)),
      () => null
    );

  const [fromPath, toPath] = await Promise.all([shot(from), shot(to)]);
  const viewport = clampViewport(THUMB_VIEWPORT.width, THUMB_VIEWPORT.height);

  const mask = await deps.thumbnails
    .diff(projectId, from, to, viewport, signal)
    .catch(() => null);

  return {
    from: fromPath,
    to: toPath,
    mask: mask ? path.join(dir, diffThumbName(from, to, viewport)) : null,
    changedPct: mask?.changedPct ?? null,
  };
}

export function registerVersionRoutes(app: Hono, deps: VersionRouteDeps): void {
  const { thumbnails } = deps;

  bindVersionReadRuntime({
    thumbs: (project, from, to) =>
      versionThumbs(deps, project.id, from, to, new AbortController().signal),
  });

  app.get("/api/projects/:pid/versions/:vid/thumb", async (c) =>
    thumbnails
      .version(c.req.param("pid"), c.req.param("vid"), c.req.raw.signal)
      .then((bytes) => png(bytes), gone)
  );

  app.get("/api/projects/:pid/versions/:vid/diff/:other", async (c) => {
    const viewport = {
      width: Number(c.req.query("w") ?? 1280),
      height: Number(c.req.query("h") ?? 800),
    };

    return thumbnails
      .diff(
        c.req.param("pid"),
        c.req.param("vid"),
        c.req.param("other"),
        viewport,
        c.req.raw.signal
      )
      .then(
        (result) =>
          png(result.png, { "x-changed-pct": String(result.changedPct) }),
        gone
      );
  });
}
