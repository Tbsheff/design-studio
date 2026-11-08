import { Schema } from "effect";

import { toParser } from "./parse-schema.js";
import { toBounded, toTrimmed } from "./schema-fields.js";

const PACK_ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,63}$/u;

const GOOGLE_FONTS_URL_PATTERN =
  /^https:\/\/fonts\.googleapis\.com\/[^"'<>\s]*$/u;

const FONT_NAME_MAX = 120;

const TAG_MAX = 40;

const TAGS_MAX = 20;

const URL_MAX = 2000;

const DESCRIPTION_MAX = 400;

const LICENSE_MAX = 40;

const NAME_MAX = 80;

const GOOGLE_FONTS_URL_TEXT = "must be an https://fonts.googleapis.com/ URL";

const PackIdTextSchema = Schema.String.check(Schema.isPattern(PACK_ID_PATTERN));

const FontNameSchema = toTrimmed(1, FONT_NAME_MAX);

const TagSchema = Schema.String.check(
  Schema.isMinLength(1),
  Schema.isMaxLength(TAG_MAX)
);

const GoogleFontsUrlSchema = toBounded(URL_MAX).check(
  Schema.isPattern(GOOGLE_FONTS_URL_PATTERN, { message: GOOGLE_FONTS_URL_TEXT })
);

const FontsSchema = Schema.Struct({
  body: FontNameSchema,
  display: FontNameSchema,
  googleFontsUrl: Schema.optionalKey(GoogleFontsUrlSchema),
  mono: FontNameSchema,
});

const ModeSchema = Schema.Literals(["light", "dark"]);

const ProvenanceSchema = Schema.Literals(["original", "imported", "extracted"]);

const TagsSchema = Schema.Array(TagSchema).check(Schema.isMaxLength(TAGS_MAX));

const LicenseSchema = toTrimmed(1, LICENSE_MAX);

const manifestSchema = Schema.Struct({
  copiedFrom: Schema.optionalKey(PackIdTextSchema),
  description: toTrimmed(1, DESCRIPTION_MAX),
  draft: Schema.optionalKey(Schema.Literal(true)),
  fonts: FontsSchema,
  id: PackIdTextSchema,
  license: LicenseSchema,
  mode: ModeSchema,
  name: toTrimmed(1, NAME_MAX),
  provenance: ProvenanceSchema,
  tags: TagsSchema,
});

const parseManifestFields = toParser(manifestSchema, "error");

export { manifestSchema, parseManifestFields };
