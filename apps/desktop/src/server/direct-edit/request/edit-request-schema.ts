import {
  DIRECT_STYLE_PROPERTIES,
  INSERT_KINDS,
  STRUCTURE_OPS,
} from "@design-studio/contracts";
import { Schema } from "effect";

import { normalizeVariant } from "../../../shared/variants.js";
import { toDecoder } from "../../platform/decode/index.js";
import {
  CLASS_NAME,
  MAX_CLASS_NAME,
  MAX_CLASS_NAMES,
} from "../engine/classes.js";
import { LocSchema, OwnersSchema, toText } from "./request-fields.js";

const MAX_VALUE = 200;
const MAX_TEXT = 5000;
const MAX_NAME = 60;
const MAX_BATCH = 50;
const MAX_TAG = 100;
const MAX_SELECTOR = 2000;
const MAX_VARIANT = 60;
const UNSAFE_VALUE_CHARS = /[;{}<>\\]/u;
const SCRIPT_URL = /javascript\s*:|expression\s*\(/iu;
const UNSAFE_NAME_CHARS = /["'`<>{}&\\]/u;
const COMPONENT_NAME = /^[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*$/u;
const TAG_NAME = /^[a-z][a-z0-9-]*$/u;
const LAST_CONTROL = 31;
const DELETE_CHAR = 127;

const hasControlChar = (value: string): boolean =>
  [...value].some((char) => {
    const code = char.codePointAt(0) ?? 0;

    return code <= LAST_CONTROL || code === DELETE_CHAR;
  });

const STYLE_PROPERTIES: readonly string[] = DIRECT_STYLE_PROPERTIES;

type StyleRecord = Readonly<Record<string, string | null>>;

const StyleValueSchema = Schema.NullOr(
  toText(0, MAX_VALUE).check(
    Schema.makeFilter((value: string) => {
      if (value.trim() === "") {
        return "value must not be empty";
      }

      if (UNSAFE_VALUE_CHARS.test(value) || hasControlChar(value)) {
        return "value has a character that is not allowed";
      }

      return !SCRIPT_URL.test(value) || "value has a script URL";
    })
  )
);

const StyleSchema = Schema.Record(Schema.String, StyleValueSchema).check(
  Schema.makeFilter(
    (style: StyleRecord) =>
      Object.keys(style).every((key) => STYLE_PROPERTIES.includes(key)) ||
      "style has a property that is not allowed"
  )
);

const NameSchema = toText(1, MAX_NAME).check(
  Schema.makeFilter((value: string) => {
    if (value.trim() !== value) {
      return "name must not start or end with a space";
    }

    return (
      !(UNSAFE_NAME_CHARS.test(value) || hasControlChar(value)) ||
      "name has a character that is not allowed"
    );
  })
);

const ClassListSchema = Schema.Array(
  toText(1, MAX_CLASS_NAME).check(
    Schema.isPattern(CLASS_NAME, {
      message: "class name has a character that is not allowed",
    })
  )
).check(Schema.isMaxLength(MAX_CLASS_NAMES));

const ClassesSchema = Schema.Struct({
  add: Schema.optional(ClassListSchema),
  remove: Schema.optional(ClassListSchema),
});

const HintsSchema = Schema.Struct({
  owners: Schema.optional(OwnersSchema),
  text: toText(0, MAX_TEXT),
  usedAt: Schema.optional(Schema.NullOr(LocSchema)),
});

const TagSchema = toText(0, MAX_TAG).check(
  Schema.isPattern(TAG_NAME, { message: "tag must be a lowercase tag name" })
);

const ComponentSchema = toText(0, MAX_TAG).check(
  Schema.isPattern(COMPONENT_NAME, {
    message: "component must be a component name such as Button",
  })
);

const VariantSchema = toText(0, MAX_VARIANT).check(
  Schema.makeFilter(
    (value: string) =>
      normalizeVariant(value) !== null ||
      'variant must be a breakpoint, dark and hover, focus or active, for example "md:hover:"'
  )
);

const RequestSchema = Schema.Struct({
  classes: Schema.optional(ClassesSchema),
  component: Schema.optional(ComponentSchema),
  hints: Schema.optional(HintsSchema),
  insert: Schema.optional(Schema.Literals(INSERT_KINDS)),
  move: Schema.optional(Schema.Literals(["up", "down"])),
  name: Schema.optional(Schema.NullOr(NameSchema)),
  selector: toText(0, MAX_SELECTOR),
  source: LocSchema,
  style: Schema.optional(StyleSchema),
  tag: Schema.optional(TagSchema),
  text: Schema.optional(toText(0, MAX_TEXT)),
  variant: Schema.optional(VariantSchema),
});

const TargetSchema = Schema.Struct({
  selector: Schema.optional(toText(0, MAX_SELECTOR)),
  source: LocSchema,
  tag: Schema.optional(TagSchema),
});

const TargetListSchema = Schema.Array(TargetSchema).check(
  Schema.isMinLength(1),
  Schema.isMaxLength(MAX_BATCH)
);

const StructureSchema = Schema.Struct({
  after: Schema.optional(TargetSchema),
  before: Schema.optional(TargetSchema),
  into: Schema.optional(TargetSchema),
  op: Schema.Literals(STRUCTURE_OPS),
  replace: Schema.optional(TargetListSchema),
  style: Schema.optional(StyleSchema),
  targets: TargetListSchema,
});

const BatchSchema = Schema.Struct({
  edits: Schema.Array(Schema.Unknown).check(
    Schema.isMinLength(1),
    Schema.isMaxLength(MAX_BATCH)
  ),
});

type DecodedEditRequest = typeof RequestSchema.Type;

type DecodedStructureEdit = typeof StructureSchema.Type;

const decodeEditRequest = toDecoder(RequestSchema, "error");

const decodeStructureEdit = toDecoder(StructureSchema, "error");

const decodeEditBatch = toDecoder(BatchSchema, "error");

export { MAX_BATCH, decodeEditBatch, decodeEditRequest, decodeStructureEdit };

export type { DecodedEditRequest, DecodedStructureEdit };
