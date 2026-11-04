import type { Project } from "../../shared/actions/_core/contracts.js";
import {
  PLACE_IMAGE_DESCRIPTION,
  SEARCH_IMAGES_DESCRIPTION,
  toPlaceInput,
  toSearchRequest,
} from "../image-search/input.js";
import { isPlaceError, placeImage } from "../image-search/place.js";
import type { PlaceScope } from "../image-search/place.js";
import { searchImages } from "../image-search/search.js";
import { elementTarget, sourceTarget } from "../image-search/target.js";
import type { PlaceTarget } from "../image-search/target.js";
import {
  placeImageFields,
  searchImagesFields,
} from "../image-search/tool-fields.js";
import {
  describeElement,
  probeOwners,
  resolveSourceLoc,
  scopeOf as layerScopeOf,
} from "../page-probe/index.js";
import { z } from "../platform/zod-bridge/index.js";
import { EditError, loadTarget, refuseWhileRunning } from "./edit-guards.js";
import type { EditDeps } from "./edit-guards.js";
import {
  defineTool,
  directionId as directionIdSchema,
  ok,
  pagePath,
  pageUrl,
  plain,
  projectId as projectIdSchema,
  selector,
  versionActivity,
} from "./edit-kit.js";
import type { Done } from "./edit-kit.js";

const SOURCE_MAX = 1100;

const TARGET_RULE = "pass targetSelector or targetSource, not both";

const searchSchema = z.strictObject({
  projectId: projectIdSchema
    .optional()
    .describe("Project id. Its imageSearch setting can turn the search on."),
  ...searchImagesFields,
});

const placeSchema = z
  .strictObject({
    directionId: directionIdSchema,
    path: pagePath,
    projectId: projectIdSchema,
    targetSelector: selector
      .optional()
      .describe("CSS selector or layer id of the layer, for example img.hero."),
    targetSource: z
      .string()
      .trim()
      .max(SOURCE_MAX)
      .optional()
      .describe("Or the layer as file:line:col of its tag."),
    ...placeImageFields,
  })
  .refine(
    (input) => Boolean(input.targetSelector) !== Boolean(input.targetSource),
    TARGET_RULE
  );

type SearchInput = z.output<typeof searchSchema>;

type PlaceInput = z.output<typeof placeSchema>;

const guarded = async <Result>(
  work: () => Promise<Result>
): Promise<Result> => {
  try {
    return await work();
  } catch (error) {
    if (isPlaceError(error as Error | null)) {
      throw new EditError((error as Error).message);
    }

    throw error;
  }
};

const projectOf = async (
  deps: EditDeps,
  projectId: string | undefined
): Promise<Project | null> => {
  if (!projectId) {
    return null;
  }

  const found = await loadTarget(deps, projectId);

  return found.project;
};

const runSearch = async (deps: EditDeps, input: SearchInput): Promise<Done> => {
  const project = await projectOf(deps, input.projectId);

  const result = await guarded(() =>
    searchImages(project, toSearchRequest(input))
  );

  return plain(ok(result));
};

const previewOriginOf = async (
  deps: EditDeps,
  found: { direction: PlaceScope["direction"]; project: Project },
  page: string | undefined
): Promise<string | null> => {
  if (found.project.kind !== "react") {
    return null;
  }

  try {
    const url = await pageUrl(deps, found.project, found.direction, page);

    return new URL(url).origin;
  } catch {
    return null;
  }
};

const ownersOf = async (
  deps: EditDeps,
  url: string,
  sel: string
): Promise<Awaited<ReturnType<typeof probeOwners>> | null> => {
  try {
    return await probeOwners(deps.preview, url, sel);
  } catch {
    return null;
  }
};

const selectorTarget = async (
  deps: EditDeps,
  scope: PlaceScope,
  input: PlaceInput
): Promise<PlaceTarget> => {
  const sel = input.targetSelector ?? "";
  const url = await pageUrl(deps, scope.project, scope.direction, input.path);
  const element = await describeElement(deps.preview, url, sel);

  if (!element) {
    throw new EditError(`No element matches ${sel} on the page.`);
  }

  const probed = await ownersOf(deps, url, sel);

  if (!element.source && !probed?.owners.length) {
    throw new EditError(
      `${sel} has no source location. Pass targetSource with the file:line:col of its tag.`
    );
  }

  return elementTarget(element, sel, probed);
};

const targetOf = async (
  deps: EditDeps,
  scope: PlaceScope,
  input: PlaceInput
): Promise<PlaceTarget> => {
  if (!input.targetSource) {
    return selectorTarget(deps, scope, input);
  }

  const source = await resolveSourceLoc(
    scope.workTree,
    layerScopeOf(scope.project.id, scope.direction.id),
    input.targetSource
  );

  return sourceTarget(scope.workTree, source);
};

const placeScopeOf = async (
  deps: EditDeps,
  input: PlaceInput
): Promise<PlaceScope> => {
  const found = await loadTarget(deps, input.projectId, input.directionId);

  return {
    direction: found.direction,
    previewOrigin: await previewOriginOf(deps, found, input.path),
    project: found.project,
    workTree: found.direction.workTree,
  };
};

const runPlace = async (deps: EditDeps, input: PlaceInput): Promise<Done> => {
  const scope = await placeScopeOf(deps, input);

  refuseWhileRunning(deps, scope.project, scope.direction);

  const target = await targetOf(deps, scope, input);

  const { result, version } = await guarded(() =>
    placeImage(deps, scope, toPlaceInput(input), target)
  );

  if (version === null) {
    return plain(ok(result));
  }

  return {
    activity: versionActivity(
      scope.project,
      scope.direction,
      result.title,
      version
    ),
    result: ok(result),
  };
};

const searchImagesTool = defineTool(
  "search_images",
  searchSchema,
  {
    description: SEARCH_IMAGES_DESCRIPTION,
    idempotent: true,
    readOnly: true,
    title: "Search images",
  },
  runSearch
);

const placeImageTool = defineTool(
  "place_image",
  placeSchema,
  {
    description: PLACE_IMAGE_DESCRIPTION,
    title: "Place image",
  },
  runPlace
);

const IMAGE_SEARCH_TOOLS = [searchImagesTool, placeImageTool];

export { IMAGE_SEARCH_TOOLS };
