import { PNG } from "pngjs";

import { BadRequestError } from "./deps.js";
import type { ImageBytes } from "./deps.js";
import { toEditText } from "./edit-mode.js";
import type { EditMode } from "./edit-mode.js";
import { toStyledPrompt } from "./engine/sizes.js";
import type { Aspect, Style } from "./engine/sizes.js";
import { SIDE_LIMIT, toExpandedPng, toExpandedSize } from "./expand-pad.js";
import type { ExpandTarget } from "./expand-pad.js";
import { generateGemini, updateGemini } from "./gemini.js";
import { toMockEdit, toSourcePng } from "./mock-edit.js";
import { toMockImage } from "./mock-image.js";
import { generateOpenai, updateOpenai } from "./openai.js";
import { messageOf, readChoice } from "./provider-env.js";
import type { ImageProviderName } from "./provider-env.js";

interface GenerateRequest {
  readonly aspect: Aspect;
  readonly prompt: string;
  readonly seed: number;
  readonly style: Style;
}

interface Generated {
  readonly image: ImageBytes;
  readonly provider: ImageProviderName;
}

const STEM_MAX = 32;

const stemOf = (prompt: string): string => {
  const words = prompt.toLowerCase().match(/[a-z0-9]+/gu) ?? [];
  const slug = words.join("-").slice(0, STEM_MAX);

  return `gen-${slug || "image"}`;
};

const generateImage = async (request: GenerateRequest): Promise<Generated> => {
  const choice = readChoice();
  const stem = stemOf(request.prompt);
  const problem = messageOf(choice);

  if (problem !== null) {
    throw new BadRequestError(problem);
  }

  if (choice.name === "openai") {
    const prompt = toStyledPrompt(request.prompt, request.style);

    return {
      image: await generateOpenai(choice.key, prompt, request.aspect, stem),
      provider: "openai",
    };
  }

  if (choice.name === "gemini") {
    const prompt = toStyledPrompt(request.prompt, request.style);

    return {
      image: await generateGemini(choice.key, prompt, stem),
      provider: "gemini",
    };
  }

  const svg = toMockImage(request);

  return {
    image: { bytes: Buffer.from(svg, "utf-8"), ext: "svg", stem },
    provider: "mock",
  };
};

interface UpdateRequest {
  readonly aspect: string | null;
  readonly box: { readonly height: number; readonly width: number } | null;
  readonly mode: EditMode;
  readonly prompt: string;
  readonly source: ImageBytes;
}

const NO_EDIT_PROMPT = "Describe the change to make with the prompt mode.";

const NO_ASPECT = "Pick a shape to expand the image to.";

const NO_BOX = "The fill shape needs the layer box.";

const EXPAND_PNG = "Expand works on PNG and SVG images only.";

const EXPAND_LARGE = "The expanded image is too large. Pick a smaller shape.";

const toExpandTarget = (request: UpdateRequest): ExpandTarget | null => {
  if (request.mode !== "expand") {
    return null;
  }

  if (request.aspect === null) {
    throw new BadRequestError(NO_ASPECT);
  }

  if (request.aspect === "fill" && request.box === null) {
    throw new BadRequestError(NO_BOX);
  }

  return { aspect: request.aspect, box: request.box };
};

const toPaddedSource = (
  source: ImageBytes,
  target: ExpandTarget
): ImageBytes => {
  const png = toSourcePng(source.bytes, source.ext);

  if (png === null) {
    throw new BadRequestError(EXPAND_PNG);
  }

  const size = toExpandedSize(png, target);

  if (size === null || Math.max(size.height, size.width) > SIDE_LIMIT) {
    throw new BadRequestError(EXPAND_LARGE);
  }

  return {
    bytes: PNG.sync.write(toExpandedPng(png, target, false)),
    ext: "png",
    stem: source.stem,
  };
};

const toInputSource = (
  source: ImageBytes,
  expand: ExpandTarget | null
): ImageBytes => {
  if (expand === null) {
    return source;
  }

  return toPaddedSource(source, expand);
};

const updateImageBytes = async (request: UpdateRequest): Promise<Generated> => {
  const { mode, source } = request;
  const prompt = request.prompt.trim();
  const choice = readChoice();
  const problem = messageOf(choice);
  const stem = `edit-${mode}`;
  const text = toEditText(mode, prompt);
  const expand = toExpandTarget(request);

  if (mode === "prompt" && prompt === "") {
    throw new BadRequestError(NO_EDIT_PROMPT);
  }

  if (problem !== null) {
    throw new BadRequestError(problem);
  }

  if (choice.name === "openai") {
    const input = toInputSource(source, expand);

    return {
      image: await updateOpenai(choice.key, input, text, stem),
      provider: "openai",
    };
  }

  if (choice.name === "gemini") {
    const input = toInputSource(source, expand);

    return {
      image: await updateGemini(choice.key, input, text, stem),
      provider: "gemini",
    };
  }

  const { ext } = source;

  const edited = toMockEdit({
    expand,
    ext,
    mode,
    prompt,
    source: source.bytes,
  });

  if (edited.bytes === null) {
    throw new BadRequestError(edited.message ?? "The mock edit failed.");
  }

  return {
    image: { bytes: edited.bytes, ext: "png", stem },
    provider: "mock",
  };
};

export { generateImage, stemOf, updateImageBytes };

export type { GenerateRequest, Generated, UpdateRequest };
