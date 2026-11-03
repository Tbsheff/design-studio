import { BadRequestError } from "./deps.js";
import type { ImageBytes } from "./deps.js";
import { toStyledPrompt } from "./engine/sizes.js";
import type { Aspect, Style } from "./engine/sizes.js";
import { generateGemini } from "./gemini.js";
import { toMockImage } from "./mock-image.js";
import { generateOpenai } from "./openai.js";
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

export { generateImage, stemOf };

export type { GenerateRequest, Generated };
