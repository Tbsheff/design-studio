import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { rm, stat } from "node:fs/promises";
import path from "node:path";

import type { Direction, Project } from "@design-studio/contracts";
import type { ShareFrame } from "@design-studio/contracts/share";

import {
  PUBLISH_MAX_BYTES,
  PUBLISH_MAX_FILES,
  PUBLISH_MAX_FRAMES,
  type PublishKind,
  type PublishPlanInput,
} from "../../shared/publish.js";
import type { ExportDeps, ExportSource } from "../export/source.js";
import { BadRequestError } from "../platform/errors/index.js";
import { framesOf } from "../share/frames.js";
import { captureShare } from "../share/snapshot.js";
import type { CommentStore } from "../store/comments.js";
import { buildSiteBundle, BundleError, rootRefPages } from "./bundle.js";
import type { BundleResult } from "./bundle.js";
import { createPlayViewer } from "./play-viewer.js";
import type { PlayViewerFiles } from "./play-viewer.js";
import type { PublicationRecord } from "./store.js";
import { viewerComments, writeViewer } from "./viewer.js";

export interface BuildDeps extends ExportDeps {
  comments: CommentStore;
  secrets: string[];
  uiDir: string;
}

export interface Built {
  kind: PublishKind;
  pages: string[];
  files: string[];
  bytes: number;
  comments: number;
  frames: PublicationRecord["frames"];
  frameIds: string[] | null;
  warnings: string[];
}

export interface StagedFile {
  path: string;
  abs: string;
  sha256: string;
  size: number;
}

export function titleOf(raw: unknown, fallback: string): string {
  const text =
    typeof raw === "string"
      ? raw
          .replaceAll(/[\p{Cc}\s]+/gu, " ")
          .trim()
          .slice(0, 120)
      : "";

  return text || fallback;
}

export function kindOf(project: Project): PublishKind {
  return project.kind === "html" && !project.app ? "site" : "viewer";
}

interface ViewerArgs {
  source: ExportSource;
  direction: Direction;
  input: PublishPlanInput;
  prior: PublicationRecord | null;
  assets: string;
  stage: string;
  viewerComments: boolean;
}

export async function buildViewer(
  deps: BuildDeps,
  a: ViewerArgs
): Promise<Built> {
  const given = a.input.frames ?? a.prior?.frames ?? undefined;
  const ids = a.input.frameIds ?? a.prior?.frameIds ?? undefined;

  const { frames, ids: frameIds } = await framesOf(
    { deps, direction: a.direction, project: a.source.project },
    given,
    ids
  );

  if (frames.length > PUBLISH_MAX_FRAMES) {
    throw new BadRequestError(`publish at most ${PUBLISH_MAX_FRAMES} frames`);
  }

  const shotsDir = path.join(a.stage, "shots");

  const shots: ShareFrame[] = await captureShare(
    deps.preview,
    a.source,
    frames,
    shotsDir,
    frameIds
  );

  const withComments = a.input.comments ?? a.prior?.withComments ?? false;

  const comments = withComments
    ? viewerComments(
        await deps.comments.list(a.source.project.id, a.direction.id),
        shots
      )
    : [];

  const page = {
    title: titleOf(a.input.title, a.prior?.title ?? a.source.project.name),
    versionLabel:
      a.source.version.title?.slice(0, 60) ||
      `Version ${a.source.version.id.slice(0, 7)}`,
    publishedAt: Date.now(),
    frames: shots,
    comments,
    ...(a.viewerComments ? { commentsHref: "~/comments" } : {}),
  };

  const out = await writeViewer(a.assets, shotsDir, page);
  await rm(shotsDir, { recursive: true, force: true });
  const pages = shots.map((s) => `${s.name}${s.path ? ` (${s.path})` : ""}`);

  return {
    kind: "viewer",
    pages,
    files: out.files,
    bytes: out.bytes,
    comments: comments.length,
    frames,
    frameIds: frameIds.map((id) => id ?? "").filter(Boolean),
    warnings: [],
  };
}

const NO_VIEWER =
  "The live viewer was not added: this version has no canvas frames, or the Design Studio UI build is missing. The link opens the first page.";

const TOO_LARGE_VIEWER =
  "The live viewer was not added: with it, this version is over the publish limit of files or bytes. The link opens the first page.";

interface ViewerFit {
  readonly viewer: PlayViewerFiles | null;
  readonly warnings: readonly string[];
}

const toViewerFit = (
  out: BundleResult,
  viewer: PlayViewerFiles | null
): ViewerFit => {
  if (viewer === null) {
    return { viewer: null, warnings: [NO_VIEWER] };
  }

  const isTooLarge =
    out.files.length + viewer.files.length > PUBLISH_MAX_FILES ||
    out.bytes + viewer.bytes > PUBLISH_MAX_BYTES;

  if (isTooLarge) {
    return { viewer: null, warnings: [TOO_LARGE_VIEWER] };
  }

  return { viewer, warnings: [] };
};

const toViewerFiles = (viewer: PlayViewerFiles | null): string[] => {
  if (viewer === null) {
    return [];
  }

  return [...viewer.files];
};

export async function buildSite(
  deps: BuildDeps,
  source: ExportSource,
  direction: Direction,
  assets: string
): Promise<Built> {
  const root = await deps.versions.snapshot(source.project, source.version.id);

  const out = await buildSiteBundle(root, assets, deps.secrets).catch(
    (error: unknown) => {
      throw error instanceof BundleError
        ? new BadRequestError(error.message)
        : error;
    }
  );

  const [absolute, viewer] = await Promise.all([
    rootRefPages(assets, out.files),
    createPlayViewer({
      assets,
      direction,
      project: source.project,
      projectDir: (projectId) => deps.projects.projectDir(projectId),
      secrets: deps.secrets,
      uiDir: deps.uiDir,
    }),
  ]);

  const fit = toViewerFit(out, viewer);

  const warnings =
    absolute.length > 0
      ? [
          `${absolute.slice(0, 3).join(", ")}${absolute.length > 3 ? ` and ${absolute.length - 3} more` : ""} link to paths that start with /. Those links break under the published address; use relative paths.`,
        ]
      : [];

  return {
    kind: "site",
    pages: out.pages,
    files: [...out.files, ...toViewerFiles(fit.viewer)],
    bytes: out.bytes + (fit.viewer?.bytes ?? 0),
    comments: 0,
    frames: null,
    frameIds: null,
    warnings: [...warnings, ...fit.warnings],
  };
}

function hashFile(file: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash("sha256");
    createReadStream(file)
      .on("data", (chunk) => hash.update(chunk))
      .on("error", reject)
      .on("end", () => resolve(hash.digest("hex")));
  });
}

export async function stageManifest(
  assets: string,
  files: string[]
): Promise<StagedFile[]> {
  const out: StagedFile[] = [];

  for (const relative of files) {
    const abs = path.join(assets, relative);
    out.push({
      path: relative,
      abs,
      sha256: await hashFile(abs),
      size: (await stat(abs)).size,
    });
  }

  return out;
}
