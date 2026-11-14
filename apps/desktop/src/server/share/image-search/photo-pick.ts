import { readFile } from "node:fs/promises";
import path from "node:path";

import { ASSETS_FILE, planAsset } from "./deps.js";
import type { Direction, ImageBytes, ImageSearchHit, Project } from "./deps.js";
import { searchOpenverse } from "./openverse.js";
import type { PhotoSlot } from "./photo-slots.js";
import { toFetchImage } from "./place.js";

interface PhotoFillScope {
  readonly direction: Direction;
  readonly project: Project;
  readonly workTree: string;
}

interface PhotoPage {
  readonly file: string;
  readonly relative: string;
  readonly source: string;
}

interface PhotoAsset {
  readonly bytes: Buffer;
  readonly exists: boolean;
  readonly file: string;
  readonly relative: string;
  readonly src: string;
}

interface PhotoPick {
  readonly asset: PhotoAsset;
  readonly hit: ImageSearchHit;
  readonly slot: PhotoSlot;
}

interface PhotoFetch {
  readonly bytes: ImageBytes;
  readonly hit: ImageSearchHit;
}

const SEARCH_LIMIT = 8;

const TRIES_MAX = 3;

const CREDIT_ASSET = /^- `(?<asset>[^`]+)`:/u;

const CREDIT_ID = /\(openverse (?<id>[^)\s]+)\)$/u;

const NAME_BREAK = /[\s"'()/=,;`]+/u;

const toReadCredits = async (workTree: string): Promise<string> => {
  try {
    return await readFile(path.join(workTree, ASSETS_FILE), "utf-8");
  } catch {
    return "";
  }
};

const toCreditId = (line: string, names: Set<string>): readonly string[] => {
  const asset = CREDIT_ASSET.exec(line)?.groups?.asset ?? "";
  const id = CREDIT_ID.exec(line)?.groups?.id ?? "";

  if (asset === "" || id === "" || !names.has(path.posix.basename(asset))) {
    return [];
  }

  return [id];
};

const toUsedIds = (source: string, credits: string): Set<string> => {
  const names = new Set(source.split(NAME_BREAK));

  return new Set(
    credits.split("\n").flatMap((line) => toCreditId(line.trim(), names))
  );
};

const toSearchHits = async (
  slot: PhotoSlot
): Promise<readonly ImageSearchHit[]> => {
  try {
    const found = await searchOpenverse({
      limit: SEARCH_LIMIT,
      orientation: slot.orientation,
      query: slot.query,
    });

    return found.results;
  } catch {
    return [];
  }
};

const toFetchHit = async (hit: ImageSearchHit): Promise<ImageBytes | null> => {
  try {
    return await toFetchImage(hit);
  } catch {
    return null;
  }
};

const toFirstFetch = async (
  hits: readonly ImageSearchHit[]
): Promise<PhotoFetch | null> => {
  const [hit, ...rest] = hits;

  if (!hit) {
    return null;
  }

  const bytes = await toFetchHit(hit);

  if (bytes !== null) {
    return { bytes, hit };
  }

  return toFirstFetch(rest);
};

const toCandidates = (
  found: readonly (readonly ImageSearchHit[])[],
  used: Set<string>
): readonly (readonly ImageSearchHit[])[] =>
  found.map((hits) => {
    const fresh = hits.filter((hit) => !used.has(hit.id)).slice(0, TRIES_MAX);

    for (const hit of fresh) {
      used.add(hit.id);
    }

    return fresh;
  });

const toPick = async (
  scope: PhotoFillScope,
  page: PhotoPage,
  slot: PhotoSlot,
  hits: readonly ImageSearchHit[]
): Promise<PhotoPick | null> => {
  const fetched = await toFirstFetch(hits);

  if (fetched === null) {
    return null;
  }

  const asset = await planAsset(
    scope.project,
    scope.workTree,
    page.relative,
    fetched.bytes
  );

  const { hit } = fetched;

  return { asset, hit, slot };
};

const toPicks = async (
  scope: PhotoFillScope,
  page: PhotoPage,
  slots: readonly PhotoSlot[]
): Promise<readonly PhotoPick[]> => {
  const [credits, found] = await Promise.all([
    toReadCredits(scope.workTree),
    Promise.all(slots.map((slot) => toSearchHits(slot))),
  ]);

  const candidates = toCandidates(found, toUsedIds(page.source, credits));

  const picks = await Promise.all(
    slots.map((slot, index) =>
      toPick(scope, page, slot, candidates[index] ?? [])
    )
  );

  return picks.filter((pick): pick is PhotoPick => pick !== null);
};

export { toPicks };

export type { PhotoFillScope, PhotoPage, PhotoPick };
