import type { ImageSearchRequest, ImageSearchResult, Project } from "./deps.js";
import { ImageSearchError } from "./errors.js";
import { requireImageSearch } from "./gate.js";
import { searchOpenverse } from "./openverse.js";

const SPACES = /\s+/gu;

const searchImages = async (
  project: Project | null,
  request: ImageSearchRequest
): Promise<ImageSearchResult> => {
  requireImageSearch(project);

  const query = request.query.replaceAll(SPACES, " ").trim();

  if (query === "") {
    throw new ImageSearchError("Pass the search words in query.");
  }

  return await searchOpenverse({ ...request, query });
};

export { searchImages };
