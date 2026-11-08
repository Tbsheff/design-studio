import { BadRequestError } from "./deps.js";
import type { ImageBytes } from "./deps.js";

const TIMEOUT_MS = 90_000;

const FAILED = "The image provider could not make an image. Try again.";

interface RemoteCall {
  readonly body: unknown;
  readonly headers: Readonly<Record<string, string>>;
  readonly url: string;
}

const postJson = async <Reply>(call: RemoteCall): Promise<Reply> => {
  let response: Response | null = null;

  try {
    response = await fetch(call.url, {
      body: JSON.stringify(call.body),
      headers: { "content-type": "application/json", ...call.headers },
      method: "POST",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    throw new BadRequestError(FAILED);
  }

  if (!response.ok) {
    throw new BadRequestError(
      `${FAILED} The provider answered ${response.status}.`
    );
  }

  return (await response.json()) as Reply;
};

const toMimeType = (ext: string): string => {
  if (ext === "jpg") {
    return "image/jpeg";
  }

  if (ext === "svg") {
    return "image/svg+xml";
  }

  return `image/${ext}`;
};

const createFormCall = async <Reply>(
  call: RemoteCall,
  form: FormData
): Promise<Reply> => {
  let response: Response | null = null;

  try {
    response = await fetch(call.url, {
      body: form,
      headers: call.headers,
      method: "POST",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    throw new BadRequestError(FAILED);
  }

  if (!response.ok) {
    throw new BadRequestError(
      `${FAILED} The provider answered ${response.status}.`
    );
  }

  return (await response.json()) as Reply;
};

const toBytes = (base64: string, ext: string, stem: string): ImageBytes => ({
  bytes: Buffer.from(base64, "base64"),
  ext,
  stem,
});

export { createFormCall, FAILED, postJson, toBytes, toMimeType };

export type { RemoteCall };
