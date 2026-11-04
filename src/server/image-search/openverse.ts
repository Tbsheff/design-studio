import { Schema } from "effect";

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
  results: Schema.Array(Schema.Unknown),
});

type RawImage = typeof rawImageSchema.Type;

type Page = typeof pageSchema.Type;

const decodeRawImage = Schema.decodeUnknownResult(rawImageSchema);

const textOf = (value: string | null | undefined): string | null => {
  const trimmed = (value ?? "").trim();

  if (trimmed === "") {
    return null;
  }

  return trimmed;
};

const httpsOf = (value: string | null | undefined): string | null => {
  const trimmed = textOf(value);

  if (trimmed?.startsWith("https://")) {
    return trimmed;
  }

  return null;
};

const licenseOf = (raw: RawImage): string => {
  const code = (textOf(raw.license) ?? "unknown").toUpperCase();
  const version = textOf(raw.license_version);

  if (code === "CC0" || code === "PDM") {
    return code;
  }

  if (version !== null) {
    return `CC ${code} ${version}`;
  }

  return `CC ${code}`;
};

const toHit = (raw: RawImage): ImageSearchHit => ({
  author: textOf(raw.creator),
  authorUrl: httpsOf(raw.creator_url),
  fullUrl: raw.url,
  height: raw.height ?? null,
  id: raw.id,
  license: licenseOf(raw),
  licenseUrl: httpsOf(raw.license_url),
  provider: textOf(raw.provider) ?? textOf(raw.source),
  sourceUrl: httpsOf(raw.foreign_landing_url),
  thumbnailUrl: httpsOf(raw.thumbnail),
  title: textOf(raw.title),
  width: raw.width ?? null,
});

const fetchOnce = async (url: URL): Promise<Response> => {
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

const fetchWithRetry = async (url: URL): Promise<Response> => {
  const first = await fetchOnce(url);

  if (first.status < SERVER_ERROR) {
    return first;
  }

  return fetchOnce(url);
};

const getJson = async <Output>(
  url: URL,
  schema: Schema.Decoder<Output>
): Promise<Output> => {
  const response = await fetchWithRetry(url);

  if (response.status === NOT_FOUND) {
    throw new ImageSearchError("The image service has no image with this id.");
  }

  if (!response.ok) {
    throw new ImageSearchError(
      `The image service returned status ${response.status}. Try again later.`
    );
  }

  const parsed = Schema.decodeUnknownResult(schema)(await response.json());

  if (parsed._tag === "Failure") {
    throw new ImageSearchError(
      "The image service sent an answer that is not valid."
    );
  }

  return parsed.success;
};

const pageUrl = (request: ImageSearchRequest, page: number): URL => {
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

const hitsOf = (pages: readonly Page[], limit: number): ImageSearchHit[] => {
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
    numbers.map((page) => getJson(pageUrl(request, page), pageSchema))
  );

  const results = hitsOf(pages, request.limit);

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
