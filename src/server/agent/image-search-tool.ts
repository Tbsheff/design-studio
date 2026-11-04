import { z } from "zod";

import type { SourceLoc } from "../../shared/contracts.js";
import {
  PLACE_IMAGE_DESCRIPTION,
  placeImageFields,
  SEARCH_IMAGES_DESCRIPTION,
  searchImagesFields,
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
import { describeElements } from "../mcp/element.js";
import { probeOwners } from "../page-probe/owner-probe.js";
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

const LOC = /^(?<file>.+):(?<line>\d+):(?<col>\d+)$/u;

const RUN_NOTE =
  "The run saves this change in its version, like your file edits.";

const ONE_TARGET = "Pass targetSelector or targetSource, not both.";

const NO_PREVIEW =
  "Preview is not running for this direction. Pass targetSource instead.";

const searchImagesInput = { ...searchImagesFields };

const placeImageInput = {
  path: z
    .string()
    .trim()
    .max(PATH_MAX)
    .optional()
    .describe(
      "Page path. Leave out for the page of the frame in <canvas-context> (or the entry page)."
    ),
  targetSelector: z
    .string()
    .trim()
    .min(1)
    .max(SELECTOR_MAX)
    .optional()
    .describe("CSS selector or layer id of the layer on the live page."),
  targetSource: z
    .string()
    .trim()
    .max(SOURCE_MAX)
    .optional()
    .describe('Or the layer as file:line:col, for example "src/App.tsx:12:7".'),
  ...placeImageFields,
};

const searchSchema = z.strictObject(searchImagesInput);
const placeSchema = z.strictObject(placeImageInput);

type PlaceArgs = z.output<typeof placeSchema>;

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

const issues = (tool: string, error: z.ZodError): ToolText => {
  const lines = error.issues.map(
    (issue) => `${issue.path.join(".") || "input"}: ${issue.message}`
  );

  return refuse(`${tool}: ${lines.join("; ")}`);
};

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
  args: z.input<typeof searchSchema>
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
  args: z.input<typeof placeSchema>
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
