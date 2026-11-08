import { BadRequestError } from "./deps.js";
import type { ImageBytes } from "./deps.js";
import { toSize } from "./engine/sizes.js";
import type { Aspect } from "./engine/sizes.js";
import {
  createFormCall,
  FAILED,
  postJson,
  toBytes,
  toMimeType,
} from "./remote.js";

const URL = "https://api.openai.com/v1/images/generations";

const EDIT_URL = "https://api.openai.com/v1/images/edits";

const MODEL = "gpt-image-1";

const SQUARE = "1024x1024";

const WIDE = "1536x1024";

const TALL = "1024x1536";

const sizeOf = (aspect: Aspect): string => {
  const { height, width } = toSize(aspect);

  if (width === height) {
    return SQUARE;
  }

  if (width > height) {
    return WIDE;
  }

  return TALL;
};

interface OpenaiReply {
  readonly data?: readonly { readonly b64_json?: string }[];
}

const firstImage = (reply: OpenaiReply | null): string | null =>
  reply?.data?.[0]?.b64_json || null;

const generateOpenai = async (
  key: string,
  text: string,
  aspect: Aspect,
  stem: string
): Promise<ImageBytes> => {
  const reply = await postJson<OpenaiReply | null>({
    body: { model: MODEL, n: 1, prompt: text, size: sizeOf(aspect) },
    headers: { authorization: `Bearer ${key}` },
    url: URL,
  });

  const encoded = firstImage(reply);

  if (encoded === null) {
    throw new BadRequestError(FAILED);
  }

  return toBytes(encoded, "png", stem);
};

const updateOpenai = async (
  key: string,
  source: ImageBytes,
  text: string,
  stem: string
): Promise<ImageBytes> => {
  const form = new FormData();

  form.set("model", MODEL);
  form.set("prompt", text);
  form.set(
    "image",
    new Blob([new Uint8Array(source.bytes)], { type: toMimeType(source.ext) }),
    `source.${source.ext}`
  );

  const reply = await createFormCall<OpenaiReply | null>(
    { body: null, headers: { authorization: `Bearer ${key}` }, url: EDIT_URL },
    form
  );

  const encoded = firstImage(reply);

  if (encoded === null) {
    throw new BadRequestError(FAILED);
  }

  return toBytes(encoded, "png", stem);
};

export { generateOpenai, updateOpenai };
