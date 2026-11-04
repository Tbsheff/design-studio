import { BadRequestError } from "./deps.js";
import type { ImageBytes } from "./deps.js";
import { FAILED, postJson, toBytes } from "./remote.js";

const URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent";

interface Part {
  readonly inlineData?: { readonly data?: string; readonly mimeType?: string };
}

interface GeminiReply {
  readonly candidates?: readonly {
    readonly content?: { readonly parts?: readonly Part[] };
  }[];
}

const extOf = (mime: string | undefined): string => {
  if (mime === "image/jpeg") {
    return "jpg";
  }

  if (mime === "image/webp") {
    return "webp";
  }

  return "png";
};

const partsOf = (reply: GeminiReply | null): readonly Part[] =>
  reply?.candidates?.[0]?.content?.parts ?? [];

const generateGemini = async (
  key: string,
  prompt: string,
  stem: string
): Promise<ImageBytes> => {
  const reply = await postJson<GeminiReply | null>({
    body: { contents: [{ parts: [{ text: prompt }] }] },
    headers: { "x-goog-api-key": key },
    url: URL,
  });

  const found = partsOf(reply).find((part) => Boolean(part.inlineData?.data));

  if (!found?.inlineData?.data) {
    throw new BadRequestError(FAILED);
  }

  return toBytes(found.inlineData.data, extOf(found.inlineData.mimeType), stem);
};

export { generateGemini };
