import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import type { Page } from "playwright-core";

import { PAGE_IMPORT_DEADLINE_MS } from "../../page-import/index.js";
import { loadConfig } from "../deps.js";
import { toWithUrlPage } from "./pattern-url-browser.js";
import { CANDIDATES_SCRIPT } from "./pattern-url-script.js";
import { toUnavailable, toUrlTarget } from "./pattern-url-target.js";
import type { UrlFailure } from "./pattern-url-target.js";

const SHOT_FOLDER = "pattern-shots";

const SHOTS_MAX = 24;

const SHOT_HEIGHT_MAX = 2400;

const HASH_CHARS = 12;

const THUMBNAIL_HEIGHT_MAX = 640;

const THUMBNAIL_QUALITY = 35;

interface UrlCandidate {
  readonly box: {
    readonly height: number;
    readonly width: number;
    readonly x: number;
    readonly y: number;
  };
  readonly label: string;
  readonly selector: string;
  readonly shotPath: string;
  readonly textSample: string;
  readonly thumbnail: string | null;
}

type FoundCandidate = Omit<UrlCandidate, "shotPath" | "thumbnail">;

type UrlCandidatesResult =
  | { readonly candidates: readonly UrlCandidate[]; readonly ok: true }
  | UrlFailure;

interface InspectRequest {
  readonly hasThumbnails: boolean;
  readonly url: string;
  readonly width: number;
}

const toShotFolder = (request: InspectRequest): string => {
  const key = createHash("sha256")
    .update(`${request.url}\u0000${request.width}`)
    .digest("hex")
    .slice(0, HASH_CHARS);

  return path.join(loadConfig().dataDir, SHOT_FOLDER, key);
};

interface ShotJob {
  readonly folder: string;
  readonly hasThumbnails: boolean;
}

interface ClipBox {
  readonly height: number;
  readonly width: number;
  readonly x: number;
  readonly y: number;
}

const toClipOf = (found: FoundCandidate, heightMax: number): ClipBox => ({
  height: Math.max(1, Math.min(found.box.height, heightMax)),
  width: Math.max(1, found.box.width),
  x: Math.max(0, found.box.x),
  y: Math.max(0, found.box.y),
});

const toThumbnail = async (
  page: Page,
  found: FoundCandidate
): Promise<string | null> => {
  const bytes = await page.screenshot({
    clip: toClipOf(found, THUMBNAIL_HEIGHT_MAX),
    fullPage: true,
    quality: THUMBNAIL_QUALITY,
    type: "jpeg",
  });

  return `data:image/jpeg;base64,${bytes.toString("base64")}`;
};

const toShoot = async (
  page: Page,
  job: ShotJob,
  found: FoundCandidate,
  index: number
): Promise<UrlCandidate> => {
  const name = `${String(index + 1).padStart(2, "0")}.png`;
  const file = path.join(job.folder, name);

  const bytes = await page.screenshot({
    clip: toClipOf(found, SHOT_HEIGHT_MAX),
    fullPage: true,
    type: "png",
  });

  await writeFile(file, bytes);

  let thumbnail: string | null = null;

  if (job.hasThumbnails) {
    thumbnail = await toThumbnail(page, found);
  }

  return { ...found, shotPath: file, thumbnail };
};

const toShootAll = async (
  page: Page,
  job: ShotJob,
  found: readonly FoundCandidate[]
): Promise<UrlCandidate[]> => {
  await mkdir(job.folder, { recursive: true });

  return Promise.all(
    found
      .slice(0, SHOTS_MAX)
      .map((item, index) => toShoot(page, job, item, index))
  );
};

const toInspectUrl = async (
  request: InspectRequest
): Promise<UrlCandidatesResult> => {
  const target = toUrlTarget(request.url);

  if (!target.ok) {
    return { code: "bad_url", message: target.message, ok: false };
  }

  const folder = toShotFolder(request);

  try {
    const candidates = await toWithUrlPage(
      {
        allowLoopback: target.allowLoopback,
        deadline: Date.now() + PAGE_IMPORT_DEADLINE_MS,
        url: target.url,
        width: request.width,
      },
      async (page) => {
        const found = await page.evaluate<FoundCandidate[]>(CANDIDATES_SCRIPT);

        return toShootAll(
          page,
          { folder, hasThumbnails: request.hasThumbnails },
          found
        );
      }
    );

    return { candidates, ok: true };
  } catch (error) {
    if (error instanceof Error) {
      return toUnavailable(error.message.split("\n")[0] ?? null);
    }

    return toUnavailable(null);
  }
};

export { toInspectUrl as inspectUrl };

export type { InspectRequest, UrlCandidate, UrlCandidatesResult };
