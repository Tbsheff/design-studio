import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import type { Page } from "playwright-core";

import {
  PAGE_IMPORT_DEADLINE_MS,
  PageImportError,
} from "../../page-import/index.js";
import { loadConfig } from "../deps.js";
import { toWithUrlPage } from "./pattern-url-browser.js";
import { CANDIDATES_SCRIPT } from "./pattern-url-script.js";
import { toUnavailable, toUrlTarget } from "./pattern-url-target.js";
import type { UrlFailure } from "./pattern-url-target.js";

const SHOT_FOLDER = "pattern-shots";

const SHOTS_MAX = 24;

const SHOT_HEIGHT_MAX = 2400;

const HASH_CHARS = 12;

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
}

type FoundCandidate = Omit<UrlCandidate, "shotPath">;

type UrlCandidatesResult =
  | { readonly candidates: readonly UrlCandidate[]; readonly ok: true }
  | UrlFailure;

interface InspectRequest {
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

const toShoot = async (
  page: Page,
  folder: string,
  found: FoundCandidate,
  index: number
): Promise<UrlCandidate> => {
  const file = path.join(folder, `${String(index + 1).padStart(2, "0")}.png`);

  const clip = {
    height: Math.max(1, Math.min(found.box.height, SHOT_HEIGHT_MAX)),
    width: Math.max(1, found.box.width),
    x: Math.max(0, found.box.x),
    y: Math.max(0, found.box.y),
  };

  const bytes = await page.screenshot({ clip, fullPage: true, type: "png" });

  await writeFile(file, bytes);

  return { ...found, shotPath: file };
};

const toShootAll = async (
  page: Page,
  folder: string,
  found: readonly FoundCandidate[]
): Promise<UrlCandidate[]> => {
  await mkdir(folder, { recursive: true });

  return Promise.all(
    found
      .slice(0, SHOTS_MAX)
      .map((item, index) => toShoot(page, folder, item, index))
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

        return toShootAll(page, folder, found);
      }
    );

    return { candidates, ok: true };
  } catch (error) {
    if (error instanceof PageImportError) {
      return toUnavailable(error.message);
    }

    return toUnavailable(null);
  }
};

export { toInspectUrl as inspectUrl };

export type { InspectRequest, UrlCandidate, UrlCandidatesResult };
