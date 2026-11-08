import { Effect, Schema } from "effect";

import { toParser } from "../parse-schema.js";
import { toBounded, toTrimmed } from "../schema-fields.js";

const DEFAULT_BASE_PACK = "modern-minimal";

const MAX_URLS = 3;

const KIBIBYTE = 1024;

const MAX_TOKENS_FILE_BYTES = 2 * KIBIBYTE * KIBIBYTE;

const DESIGN_MD_KIBIBYTES = 512;

const MAX_DESIGN_MD_BYTES = DESIGN_MD_KIBIBYTES * KIBIBYTE;

const BASE_PACK_MAX = 64;

const BRIEF_MAX = 4000;

const FOLDER_PATH_MAX = 4096;

const NAME_MAX = 80;

const FILE_NAME_MAX = 200;

const URL_MAX = 2000;

const BasePackSchema = toTrimmed(1, BASE_PACK_MAX).pipe(
  Schema.withDecodingDefaultKey(Effect.succeed(DEFAULT_BASE_PACK))
);

const ModeSchema = Schema.Literals(["light", "dark", "auto"]).pipe(
  Schema.withDecodingDefaultKey(Effect.succeed("auto" as const))
);

const TokensFileSchema = Schema.Struct({
  name: toTrimmed(1, FILE_NAME_MAX),
  text: toBounded(MAX_TOKENS_FILE_BYTES),
});

const UrlListSchema = Schema.Array(toTrimmed(1, URL_MAX))
  .check(Schema.isMaxLength(MAX_URLS))
  .pipe(Schema.withDecodingDefaultKey(Effect.succeed([])));

const draftRequestSchema = Schema.Struct({
  basePackId: BasePackSchema,
  brief: Schema.optionalKey(toBounded(BRIEF_MAX)),
  designMd: Schema.optionalKey(toBounded(MAX_DESIGN_MD_BYTES)),
  folderPath: Schema.optionalKey(toTrimmed(0, FOLDER_PATH_MAX)),
  mode: ModeSchema,
  name: Schema.optionalKey(toTrimmed(0, NAME_MAX)),
  tokensFile: Schema.optionalKey(TokensFileSchema),
  urls: UrlListSchema,
});

type DraftRequest = typeof draftRequestSchema.Type;

const parseDraftFields = toParser(draftRequestSchema, "error");

export {
  DEFAULT_BASE_PACK,
  MAX_TOKENS_FILE_BYTES,
  MAX_URLS,
  draftRequestSchema,
  parseDraftFields,
};

export type { DraftRequest };
