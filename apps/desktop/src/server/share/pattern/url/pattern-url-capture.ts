import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  capturePage,
  PAGE_IMPORT_DEADLINE_MS,
} from "../../page-import/index.js";
import type { CompiledTokenEntry } from "../../page-import/index.js";
import { loadConfig } from "../deps.js";
import type { StoredPattern } from "../pattern-model.js";
import { toPatternId } from "../pattern-text.js";
import { toPatternAssets } from "./pattern-url-assets.js";
import type { PatternAssets } from "./pattern-url-assets.js";
import { toWithUrlPage } from "./pattern-url-browser.js";
import { PINS_SCRIPT } from "./pattern-url-script.js";
import { toCaptureSnippet } from "./pattern-url-snippet.js";
import type { Snippet } from "./pattern-url-snippet.js";
import { toUnavailable, toUrlTarget } from "./pattern-url-target.js";
import type { UrlFailure } from "./pattern-url-target.js";

const REFERENCE_FOLDER = "pattern-references";

const VIEWPORT_HEIGHT = 900;

const THUMBNAIL_CHARS_MAX = 190_000;

const THUMBNAIL_QUALITY = 40;

const SHOT_MS = 15_000;

const SOURCE_CHARS_MAX = 1_500_000;

interface UrlCaptureRequest {
  readonly entries: readonly CompiledTokenEntry[];
  readonly name: string;
  readonly projectId: string;
  readonly selector: string;
  readonly url: string;
  readonly width: number;
}

type UrlCaptureResult =
  | { readonly ok: true; readonly pattern: StoredPattern }
  | UrlFailure;

interface SectionShots {
  readonly pins: Readonly<Record<string, string>>;
  readonly png: Buffer;
  readonly thumbnail: string | null;
}

const toShootSection = (
  request: UrlCaptureRequest,
  loopback: boolean,
  address: string
): Promise<SectionShots> =>
  toWithUrlPage(
    {
      allowLoopback: loopback,
      deadline: Date.now() + PAGE_IMPORT_DEADLINE_MS,
      url: address,
      width: request.width,
    },
    async (page) => {
      const section = page.locator(request.selector).first();

      const [png, jpeg, pins] = await Promise.all([
        section.screenshot({ timeout: SHOT_MS, type: "png" }),
        section.screenshot({
          quality: THUMBNAIL_QUALITY,
          timeout: SHOT_MS,
          type: "jpeg",
        }),
        page.evaluate<Record<string, string>>(
          `(${PINS_SCRIPT})(${JSON.stringify(request.selector)})`
        ),
      ]);

      const thumbnail = `data:image/jpeg;base64,${jpeg.toString("base64")}`;

      if (thumbnail.length > THUMBNAIL_CHARS_MAX) {
        return { pins, png, thumbnail: null };
      }

      return { pins, png, thumbnail };
    }
  );

const toWriteReference = async (id: string, png: Buffer): Promise<string> => {
  const folder = path.join(loadConfig().dataDir, REFERENCE_FOLDER);
  const file = path.join(folder, `${id}.png`);

  await mkdir(folder, { recursive: true });
  await writeFile(file, png);

  return file;
};

const TAG_CHARS_MAX = 32;

const toHostOf = (url: string): string => new URL(url).host;

const toHostTag = (host: string): string =>
  host.replace(/^www\./u, "").slice(0, TAG_CHARS_MAX);

interface CapturedParts {
  readonly assets: PatternAssets;
  readonly shots: SectionShots;
  readonly snippet: Snippet | null;
}

const toGatherParts = async (
  request: UrlCaptureRequest,
  target: { readonly allowLoopback: boolean; readonly url: string }
): Promise<CapturedParts> => {
  const until = Date.now() + PAGE_IMPORT_DEADLINE_MS;
  const loopback = target.allowLoopback;

  const [captured, shots] = await Promise.all([
    capturePage({
      allowLoopback: loopback,
      deadline: until,
      height: VIEWPORT_HEIGHT,
      selector: request.selector,
      url: target.url,
      width: request.width,
    }),
    toShootSection(request, loopback, target.url),
  ]);

  const assets = await toPatternAssets(
    { allowLoopback: loopback, capture: captured, deadline: until },
    captured.page.root
  );

  const snippet = toCaptureSnippet({
    capture: captured,
    entries: request.entries,
    local: assets.local,
    pins: shots.pins,
    seed: `${target.url}\u0000${request.selector}`,
  });

  return { assets, shots, snippet };
};

const toStoredPattern = (
  request: UrlCaptureRequest,
  url: string,
  parts: CapturedParts & { readonly snippet: Snippet },
  reference: string
): StoredPattern => {
  const host = toHostOf(url);

  return {
    assets: parts.assets.files,
    helpers: [],
    id: toPatternId(request.name, parts.snippet.source),
    importCount: 0,
    imports: [],
    isClient: false,
    kind: "html",
    name: request.name,
    origin: "url",
    referencePath: reference,
    references: [],
    savedAt: new Date().toISOString(),
    source: parts.snippet.source,
    sourceFile: "",
    sourceName: host,
    sourceProjectId: request.projectId,
    sourceUrl: url,
    tags: ["url", toHostTag(host)],
    thumbnail: parts.shots.thumbnail,
    tokenCount: parts.snippet.tokens.length,
    tokens: parts.snippet.tokens,
  };
};

const toEmptyFailure = (): UrlFailure => ({
  code: "unavailable",
  message: "The section is empty or too large to save as a pattern.",
  ok: false,
});

const toCaptureUrlPattern = async (
  request: UrlCaptureRequest
): Promise<UrlCaptureResult> => {
  const target = toUrlTarget(request.url);

  if (!target.ok) {
    return { code: "bad_url", message: target.message, ok: false };
  }

  try {
    const parts = await toGatherParts(request, target);
    const found = parts.snippet;

    if (found === null || found.source.length > SOURCE_CHARS_MAX) {
      return toEmptyFailure();
    }

    const draft = toStoredPattern(
      request,
      target.url,
      { ...parts, snippet: found },
      ""
    );

    const referencePath = await toWriteReference(draft.id, parts.shots.png);

    return { ok: true, pattern: { ...draft, referencePath } };
  } catch (error) {
    if (error instanceof Error) {
      return toUnavailable(error.message.split("\n")[0] ?? null);
    }

    return toUnavailable(null);
  }
};

export { toCaptureUrlPattern as captureUrlPattern };

export type { UrlCaptureRequest, UrlCaptureResult };
