import { BadRequestError } from "./deps.js";
import type { ImageBytes } from "./deps.js";
import { toEditText } from "./edit-mode.js";
import type { EditMode } from "./edit-mode.js";
import { toStyledPrompt } from "./engine/sizes.js";
import type { Aspect, Style } from "./engine/sizes.js";
import { generateGemini, updateGemini } from "./gemini.js";
import { toMockEdit } from "./mock-edit.js";
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
  readonly mode: EditMode;
  readonly prompt: string;
  readonly source: ImageBytes;
}

const NO_EDIT_PROMPT = "Describe the change to make with the prompt mode.";

const updateImageBytes = async (request: UpdateRequest): Promise<Generated> => {
  const { mode, source } = request;
  const prompt = request.prompt.trim();
  const choice = readChoice();
  const problem = messageOf(choice);
  const stem = `edit-${mode}`;
  const text = toEditText(mode, prompt);

  if (mode === "prompt" && prompt === "") {
    throw new BadRequestError(NO_EDIT_PROMPT);
  }

  if (problem !== null) {
    throw new BadRequestError(problem);
  }

  if (choice.name === "openai") {
    return {
      image: await updateOpenai(choice.key, source, text, stem),
      provider: "openai",
    };
  }

  if (choice.name === "gemini") {
    return {
      image: await updateGemini(choice.key, source, text, stem),
      provider: "gemini",
    };
  }

  const edited = toMockEdit(source.bytes, source.ext, mode, prompt);

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
