import { Schema } from "effect";

import type { SourceLoc } from "@design-studio/actions/_core/contracts";
import {
  toOptional,
  toOptionalInt,
  toOptionalText,
  toSdkFieldSet,
  toToolInput,
  toTrimmedText,
} from "../agent-tools/index.js";
import type { ToolArgs, ToolDecoded } from "../agent-tools/index.js";
import {
  IMAGE_ALT_MAX,
  IMAGE_FITS,
  IMAGE_MODES,
  IMAGE_ORIENTATIONS,
  IMAGE_QUERY_MAX,
  IMAGE_SEARCH_LIMIT_MAX,
} from "../image-search/deps.js";
import {
  PLACE_IMAGE_DESCRIPTION,
  SEARCH_IMAGES_DESCRIPTION,
  toPlaceInput,
  toSearchRequest,
} from "../image-search/input.js";
import {
  isPlaceChanged,
  isPlaceError,
  placeFiles,
  planPlaceImage,
  toPlaceResult,
  writePlacePlan,
} from "../image-search/place.js";
import { searchImages } from "../image-search/search.js";
import { elementTarget, sourceTarget } from "../image-search/target.js";
import type { PlaceTarget } from "../image-search/target.js";
import { describeElements, probeOwners } from "../page-probe/index.js";
import { refusal, writeProblem } from "./direct-tools.js";
import type { DirectToolDeps } from "./direct-tools.js";
import { editPageUrl } from "./run-target.js";

interface ToolContent {
  text: string;
  type: "text";
}

interface ToolText {
  [key: string]: boolean | ToolContent[] | undefined;
  content: ToolContent[];
  isError?: boolean;
}

const SELECTOR_MAX = 2000;
const SOURCE_MAX = 1100;
const PATH_MAX = 300;
const FOCAL_MAX = 40;
const IMAGE_ID_MAX = 64;

const LOC = /^(?<file>.+):(?<line>\d+):(?<col>\d+)$/u;

const RUN_NOTE =
  "The run saves this change in its version, like your file edits.";

const ONE_TARGET = "Pass targetSelector or targetSource, not both.";

const NO_PREVIEW =
  "Preview is not running for this direction. Pass targetSource instead.";

const searchImagesFieldSet = {
  limit: toOptionalInt(
    1,
    IMAGE_SEARCH_LIMIT_MAX,
    `Number of results, 1 to ${IMAGE_SEARCH_LIMIT_MAX}.`
  ),
  orientation: toOptional(
    Schema.Literals(IMAGE_ORIENTATIONS),
    "any (default), wide, tall or square."
  ),
  query: toTrimmedText(1, IMAGE_QUERY_MAX).annotate({
    description: 'Search words only, for example "mountain lake sunrise".',
  }),
};

const placeImageFieldSet = {
  alt: Schema.String.check(Schema.isMaxLength(IMAGE_ALT_MAX)).annotate({
    description: 'Alt text of the photo. "" marks it as decorative.',
  }),
  fit: toOptional(
    Schema.Literals(IMAGE_FITS),
    "cover crops to fill, contain shows all of it, fill stretches."
  ),
  focal: toOptionalText(
    0,
    FOCAL_MAX,
    'Focal point as "x% y%", for example "50% 30%".'
  ),
  imageId: toTrimmedText(1, IMAGE_ID_MAX).annotate({
    description: "The id of one search_images result.",
  }),
  mode: toOptional(
    Schema.Literals(IMAGE_MODES),
    "auto (default): img for an <img>, background for an element with a background image, insert for others. background sets a background image on any element."
  ),
  path: toOptionalText(
    0,
    PATH_MAX,
    "Page path. Leave out for the page of the frame in <canvas-context> (or the entry page)."
  ),
  position: toOptional(
    Schema.Literals(["inside", "after"]),
    "For insert: inside the element (default) or after it."
  ),
  targetSelector: toOptionalText(
    1,
    SELECTOR_MAX,
    "CSS selector or layer id of the layer on the live page."
  ),
  targetSource: toOptionalText(
    0,
    SOURCE_MAX,
    'Or the layer as file:line:col, for example "src/App.tsx:12:7".'
  ),
};

const searchImagesInput = toSdkFieldSet(searchImagesFieldSet);

const placeImageInput = toSdkFieldSet(placeImageFieldSet);

const searchSchema = toToolInput(searchImagesFieldSet);
const placeSchema = toToolInput(placeImageFieldSet);

type PlaceArgs = ToolDecoded<typeof placeSchema>;

type Located =
  | { message: string; ok: false }
  | { ok: true; target: PlaceTarget };

const searchImagesDescription = SEARCH_IMAGES_DESCRIPTION;

const placeImageDescription = PLACE_IMAGE_DESCRIPTION;

const reply = (message: string): ToolText => ({
  content: [{ text: message, type: "text" }],
});

const refuse = (message: string): ToolText => ({
  content: [{ text: message, type: "text" }],
  isError: true,
});

const issues = (tool: string, error: string): ToolText =>
  refuse(`${tool}: ${error}`);

const caught = (tool: string, error: Error | null): ToolText => {
  if (error instanceof Error && isPlaceError(error)) {
    return refuse(`${tool}: ${error.message}`);
  }

  if (error instanceof Error) {
    return refuse(`${tool} failed: ${error.message}`);
  }

  return refuse(`${tool} failed: ${String(error)}`);
};

const runSearchImages = async (
  deps: DirectToolDeps,
  args: ToolArgs<typeof searchSchema>
): Promise<ToolText> => {
  const parsed = searchSchema.safeParse(args);

  if (!parsed.success) {
    return issues("search_images", parsed.error);
  }

  try {
    const result = await searchImages(
      deps.ctx.project,
      toSearchRequest(parsed.data)
    );

    return reply(JSON.stringify(result, null, 2));
  } catch (error) {
    return caught("search_images", error as Error | null);
  }
};

const locOf = (raw: string): SourceLoc | null => {
  const groups = LOC.exec(raw)?.groups;

  if (!groups) {
    return null;
  }

  return {
    col: Number(groups.col),
    file: groups.file ?? "",
    line: Number(groups.line),
  };
};

const refused = (message: string): Located => ({ message, ok: false });

const found = (target: PlaceTarget): Located => ({ ok: true, target });

const ownersOf = async (
  deps: DirectToolDeps,
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
  deps: DirectToolDeps,
  input: PlaceArgs,
  sel: string
): Promise<Located> => {
  if (!deps.ctx.previewUrl) {
    return refused(NO_PREVIEW);
  }

  const url = editPageUrl(deps.ctx, input.path);
  const [element] = await describeElements(deps.preview, url, [sel]);

  if (!element) {
    return refused(`No element matches ${sel} on the page.`);
  }

  const probed = await ownersOf(deps, url, sel);

  if (!element.source && !probed?.owners.length) {
    return refused(
      `${sel} has no source location. Pass targetSource (file:line:col).`
    );
  }

  return found(elementTarget(element, sel, probed));
};

const targetOf = async (
  deps: DirectToolDeps,
  input: PlaceArgs
): Promise<Located> => {
  if (input.targetSelector) {
    return selectorTarget(deps, input, input.targetSelector);
  }

  const source = locOf(input.targetSource ?? "");

  if (source === null) {
    return refused("targetSource must be file:line:col.");
  }

  return found(await sourceTarget(deps.ctx.direction.workTree, source));
};

const previewOriginOf = (deps: DirectToolDeps): string | null => {
  const { previewUrl, project } = deps.ctx;

  if (!previewUrl || project.kind !== "react") {
    return null;
  }

  return new URL(previewUrl).origin;
};

const placeWith = async (
  deps: DirectToolDeps,
  input: PlaceArgs
): Promise<ToolText> => {
  const located = await targetOf(deps, input);

  if (!located.ok) {
    return refuse(located.message);
  }

  const plan = await planPlaceImage(
    {
      previewOrigin: previewOriginOf(deps),
      project: deps.ctx.project,
      workTree: deps.ctx.direction.workTree,
    },
    toPlaceInput(input),
    located.target
  );

  const problem = placeFiles(plan)
    .map((relative) => writeProblem(deps.ctx, relative))
    .find((entry) => entry !== null);

  if (problem) {
    return refuse(problem);
  }

  if (!isPlaceChanged(plan)) {
    return reply(`${plan.image.title}: the file already has this photo.`);
  }

  await writePlacePlan(plan);

  const result = JSON.stringify(toPlaceResult(plan, null));

  return reply(`${plan.image.title}. ${RUN_NOTE} ${result}`);
};

const runPlaceImage = async (
  deps: DirectToolDeps,
  args: ToolArgs<typeof placeSchema>
): Promise<ToolText> => {
  const blocked = refusal(deps.ctx, "place_image");

  if (blocked) {
    return refuse(blocked);
  }

  const parsed = placeSchema.safeParse(args);

  if (!parsed.success) {
    return issues("place_image", parsed.error);
  }

  if (
    Boolean(parsed.data.targetSelector) === Boolean(parsed.data.targetSource)
  ) {
    return refuse(ONE_TARGET);
  }

  try {
    return await placeWith(deps, parsed.data);
  } catch (error) {
    return caught("place_image", error as Error | null);
  }
};

export {
  placeImageDescription,
  placeImageInput,
  runPlaceImage,
  runSearchImages,
  searchImagesDescription,
  searchImagesInput,
};
