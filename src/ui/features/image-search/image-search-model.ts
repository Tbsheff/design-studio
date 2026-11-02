import { copy } from "./copy.js";
import { imageKindOf } from "./deps.js";
import type { ImageSearchHit, SelectionContext } from "./deps.js";

const altOf = (hit: ImageSearchHit, query: string): string => {
  const title = hit.title?.trim() ?? "";

  if (title !== "") {
    return title;
  }

  return query.trim();
};

const authorOf = (hit: ImageSearchHit): string => {
  const author = hit.author?.trim() ?? "";

  if (author === "") {
    return copy.unknownAuthor;
  }

  return author;
};

const licenseOf = (hit: ImageSearchHit): string =>
  hit.license.toUpperCase().replace(/^(?!CC|PDM)/u, "CC ");

const thumbOf = (hit: ImageSearchHit): string =>
  hit.thumbnailUrl ?? hit.fullUrl;

const isImageLayer = (target: SelectionContext): boolean =>
  imageKindOf(target) !== null;

const placeHintOf = (target: SelectionContext): string => {
  if (isImageLayer(target)) {
    return copy.replaceHint;
  }

  return copy.insertHint;
};

export { altOf, authorOf, isImageLayer, licenseOf, placeHintOf, thumbOf };
