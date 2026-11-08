import { Schema } from "effect";

import { toDecoder } from "./deps.js";
import type {
  ImageSearchHit,
  ImageSearchRequest,
  ImageSearchResult,
} from "./deps.js";
import { ImageSearchError } from "./errors.js";

const API_ROOT = "https://api.openverse.org/v1/images/";

const PAGE_SIZE_MAX = 20;

const TIMEOUT_MS = 45_000;

const SERVER_ERROR = 500;

const NOT_FOUND = 404;

const ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;

const HEADERS = {
  accept: "application/json",
  "user-agent": "design-studio (https://openverse.org/)",
};

const text = Schema.NullishOr(Schema.String);

const rawImageSchema = Schema.Struct({
  creator: text,
  creator_url: text,
  foreign_landing_url: text,
  height: Schema.NullishOr(Schema.Number),
  id: Schema.Trim.check(Schema.isMinLength(1)),
  license: text,
  license_url: text,
  license_version: text,
  provider: text,
  source: text,
  thumbnail: text,
  title: text,
  url: Schema.Trim.check(Schema.isMinLength(1)),
  width: Schema.NullishOr(Schema.Number),
});

const pageSchema = Schema.Struct({
  results: Schema.Array(Schema.Json),
});

type RawImage = typeof rawImageSchema.Type;

type Page = typeof pageSchema.Type;

const decodeRawImage = toDecoder(rawImageSchema, "ignore");

const toTextOf = (value: string | null | undefined): string | null => {
  const trimmed = (value ?? "").trim();

  if (trimmed === "") {
    return null;
  }

  return trimmed;
};

const toHttpsOf = (value: string | null | undefined): string | null => {
  const trimmed = toTextOf(value);

  if (trimmed?.startsWith("https://")) {
    return trimmed;
  }

  return null;
};

const toLicenseOf = (raw: RawImage): string => {
  const code = (toTextOf(raw.license) ?? "unknown").toUpperCase();
  const version = toTextOf(raw.license_version);

  if (code === "CC0" || code === "PDM") {
    return code;
  }

  if (version !== null) {
    return `CC ${code} ${version}`;
  }

  return `CC ${code}`;
};

const toHit = (raw: RawImage): ImageSearchHit => ({
  author: toTextOf(raw.creator),
  authorUrl: toHttpsOf(raw.creator_url),
  fullUrl: raw.url,
  height: raw.height ?? null,
  id: raw.id,
  license: toLicenseOf(raw),
  licenseUrl: toHttpsOf(raw.license_url),
  provider: toTextOf(raw.provider) ?? toTextOf(raw.source),
  sourceUrl: toHttpsOf(raw.foreign_landing_url),
  thumbnailUrl: toHttpsOf(raw.thumbnail),
  title: toTextOf(raw.title),
  width: raw.width ?? null,
});

const toFetchOnce = async (url: URL): Promise<Response> => {
  try {
    return await fetch(url, {
      headers: HEADERS,
      redirect: "follow",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (error) {
    throw new ImageSearchError(
      `The image service did not answer: ${(error as Error).message}`
    );
  }
};

const toFetchWithRetry = async (url: URL): Promise<Response> => {
  const first = await toFetchOnce(url);

  if (first.status < SERVER_ERROR) {
    return first;
  }

  return toFetchOnce(url);
};

const getJson = async <Output>(
  url: URL,
  schema: Schema.Decoder<Output>
): Promise<Output> => {
  const response = await toFetchWithRetry(url);

  if (response.status === NOT_FOUND) {
    throw new ImageSearchError("The image service has no image with this id.");
  }

  if (!response.ok) {
    throw new ImageSearchError(
      `The image service returned status ${response.status}. Try again later.`
    );
  }

  const parsed = toDecoder(schema, "ignore")(await response.json());

  if (parsed._tag === "Failure") {
    throw new ImageSearchError(
      "The image service sent an answer that is not valid."
    );
  }

  return parsed.success;
};

const toPageUrl = (request: ImageSearchRequest, page: number): URL => {
  const url = new URL(API_ROOT);

  url.searchParams.set("q", request.query);
  url.searchParams.set(
    "page_size",
    String(Math.min(request.limit, PAGE_SIZE_MAX))
  );
  url.searchParams.set("page", String(page));
  url.searchParams.set("mature", "false");

  if (request.orientation !== "any") {
    url.searchParams.set("aspect_ratio", request.orientation);
  }

  return url;
};

const toHitsOf = (pages: readonly Page[], limit: number): ImageSearchHit[] => {
  const hits: ImageSearchHit[] = [];

  for (const entry of pages.flatMap((page) => page.results)) {
    const parsed = decodeRawImage(entry);

    if (parsed._tag === "Success" && hits.length < limit) {
      hits.push(toHit(parsed.success));
    }
  }

  return hits;
};

const searchOpenverse = async (
  request: ImageSearchRequest
): Promise<ImageSearchResult> => {
  const count = Math.ceil(request.limit / PAGE_SIZE_MAX);
  const numbers: number[] = [];

  for (let page = 1; page <= count; page += 1) {
    numbers.push(page);
  }

  const pages = await Promise.all(
    numbers.map((page) => getJson(toPageUrl(request, page), pageSchema))
  );

  const results = toHitsOf(pages, request.limit);

  return {
    count: results.length,
    orientation: request.orientation,
    query: request.query,
    results,
  };
};

const getOpenverseImage = async (id: string): Promise<ImageSearchHit> => {
  if (!ID_PATTERN.test(id)) {
    throw new ImageSearchError(
      "imageId must be the id of a search_images result."
    );
  }

  const raw = await getJson(new URL(`${id}/`, API_ROOT), rawImageSchema);

  return toHit(raw);
};

export { getOpenverseImage, searchOpenverse };
