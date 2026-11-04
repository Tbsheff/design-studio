import { realpath, readFile, stat } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";

import type { Input } from "@design-studio/actions/_core/action";
import type { createDraftPack } from "@design-studio/actions/pack/create-draft";
import type { DraftImage } from "@design-studio/actions/pack/schema";
import { safeFolder } from "../../mcp/folders.js";
import { BadRequestError } from "../../platform/errors/index.js";
import { MAX_TOKENS_FILE_BYTES } from "../extract/draft.js";
import type { ImageInput } from "./library-backing.js";

type DraftInput = Input<typeof createDraftPack>;

interface DraftRaw {
  basePackId?: string;
  brief?: string;
  designMd?: string;
  folderPath?: string;
  mode: string;
  name?: string;
  tokensFile?: TokensText;
  urls: readonly string[];
}

interface TokensText {
  readonly name: string;
  readonly text: string;
}

const MAX_DRAFT_IMAGES = 8;

const BYTES_PER_MB = 1_048_576;

const MAX_DRAFT_IMAGE_MB = 8;

const MAX_DRAFT_IMAGE_BYTES = MAX_DRAFT_IMAGE_MB * BYTES_PER_MB;

const IMAGE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
]);

const TOKEN_FILE = /\.(?:json|css)$/iu;

const toImage = (image: DraftImage): ImageInput => {
  if (!IMAGE_TYPES.has(image.mime)) {
    throw new BadRequestError(
      `${image.name}: use PNG, JPEG, GIF or WebP images`
    );
  }

  const bytes = new Uint8Array(Buffer.from(image.content, "base64"));

  if (bytes.byteLength > MAX_DRAFT_IMAGE_BYTES) {
    throw new BadRequestError(
      `${image.name} is larger than ${String(MAX_DRAFT_IMAGE_MB)} MB`
    );
  }

  return { bytes, mime: image.mime, name: image.name };
};

const toImages = (images: readonly DraftImage[]): ImageInput[] => {
  if (images.length > MAX_DRAFT_IMAGES) {
    throw new BadRequestError(`Add at most ${String(MAX_DRAFT_IMAGES)} images`);
  }

  return images.map((image) => toImage(image));
};

const toAbsolute = (raw: string): string => {
  if (raw.includes("\0")) {
    throw new BadRequestError("tokensFile is not a valid path");
  }

  if (raw.startsWith("~/")) {
    return path.join(homedir(), raw.slice(2));
  }

  if (!path.isAbsolute(raw)) {
    throw new BadRequestError("tokensFile must be an absolute path");
  }

  return raw;
};

const toRealPath = async (target: string): Promise<string | null> => {
  try {
    return await realpath(target);
  } catch {
    return null;
  }
};

const resolveTokensFile = async (
  raw: string,
  dataDir: string
): Promise<string> => {
  const file = await toRealPath(toAbsolute(raw));

  if (file === null) {
    throw new BadRequestError(`tokensFile not found: ${raw}`);
  }

  const info = await stat(file);

  if (!info.isFile() || !TOKEN_FILE.test(file)) {
    throw new BadRequestError(
      "tokensFile must be a .json or .css file (Figma variables, DTCG, Tokens Studio or CSS custom properties)"
    );
  }

  if (info.size > MAX_TOKENS_FILE_BYTES) {
    throw new BadRequestError(`${path.basename(file)} is larger than 2 MB`);
  }

  await safeFolder(path.dirname(file), dataDir);

  return file;
};

const readTokens = async (
  input: DraftInput,
  dataDir: string
): Promise<TokensText | null> => {
  if (input.tokensUpload) {
    if (Buffer.byteLength(input.tokensUpload.text) > MAX_TOKENS_FILE_BYTES) {
      throw new BadRequestError(
        `${input.tokensUpload.name} is larger than 2 MB`
      );
    }

    return {
      name: input.tokensUpload.name || "tokens.json",
      text: input.tokensUpload.text,
    };
  }

  if (!input.tokensFile) {
    return null;
  }

  const file = await resolveTokensFile(input.tokensFile, dataDir);

  return { name: path.basename(file), text: await readFile(file, "utf-8") };
};

const readFolder = (
  input: DraftInput,
  dataDir: string
): Promise<string | null> => {
  if (!input.folderPath) {
    return Promise.resolve(null);
  }

  return safeFolder(input.folderPath, dataDir);
};

const addTexts = (raw: DraftRaw, input: DraftInput): void => {
  if (input.name) {
    raw.name = input.name;
  }

  if (input.basePackId) {
    raw.basePackId = input.basePackId;
  }

  if (input.brief) {
    raw.brief = input.brief;
  }

  if (input.designMd) {
    raw.designMd = input.designMd;
  }
};

const toDraftRaw = async (
  input: DraftInput,
  dataDir: string
): Promise<DraftRaw> => {
  const [tokensFile, folderPath] = await Promise.all([
    readTokens(input, dataDir),
    readFolder(input, dataDir),
  ]);

  const raw: DraftRaw = { mode: input.mode ?? "auto", urls: input.urls ?? [] };

  if (tokensFile) {
    raw.tokensFile = tokensFile;
  }

  if (folderPath) {
    raw.folderPath = folderPath;
  }

  addTexts(raw, input);

  return raw;
};

const toSourceLines = (input: DraftInput): string[] => {
  const lines: string[] = [];

  if (input.urls && input.urls.length > 0) {
    lines.push(`websites ${input.urls.join(", ")}`);
  }

  if (input.folderPath) {
    lines.push(`the code folder ${input.folderPath}`);
  }

  if (input.tokensFile) {
    lines.push(`the tokens file ${input.tokensFile}`);
  }

  if (input.brief || input.designMd) {
    lines.push("a text brief or DESIGN.md");
  }

  return lines;
};

export { MAX_DRAFT_IMAGES, toDraftRaw, toImages, toSourceLines };

export type { DraftInput };
