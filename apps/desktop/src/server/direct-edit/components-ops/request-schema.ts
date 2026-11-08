import { SourceUseFields } from "@design-studio/actions/direct-edit/schema";
import {
  INSERT_POSITIONS,
  INSERT_TEXT_MAX,
} from "@design-studio/contracts/insert";
import {
  OWNERS_MAX,
  OWNER_STACK_MAX,
  PROP_NAME,
  PROP_TEXT_MAX,
  PROPS_MAX,
} from "@design-studio/contracts/props";
import { Schema } from "effect";

import {
  COMPONENT_NAME,
  CREATE_TARGETS_MAX,
} from "../../../shared/component-create.js";
import { toDecoder } from "../../platform/decode/index.js";
import type { DecodableSchema } from "../../platform/decode/index.js";
import { DirectEditError } from "../engine/errors.js";

const OWNER_NAME_MAX = 64;

const TAG_MAX = 100;

const SELECTOR_MAX = 2000;

const FILE_MAX = 1000;

const FOLDER_MAX = 500;

const COMPONENT_IDENTIFIER = /^[A-Z][A-Za-z0-9_$]{0,63}$/u;

const toMaxText = (max: number): Schema.String =>
  Schema.String.check(Schema.isMaxLength(max));

const FileTextSchema = Schema.String.check(
  Schema.isMinLength(1),
  Schema.isMaxLength(FILE_MAX)
);

const SourceLocationSchema = Schema.Struct(SourceUseFields);

const OwnerSchema = Schema.Struct({
  name: toMaxText(OWNER_NAME_MAX),
  stack: toMaxText(OWNER_STACK_MAX),
});

const OwnerListSchema = Schema.Array(OwnerSchema).check(
  Schema.isMaxLength(OWNERS_MAX)
);

const RequestTargetSchema = Schema.Struct({
  owners: Schema.optionalKey(OwnerListSchema),
  selector: Schema.optionalKey(toMaxText(SELECTOR_MAX)),
  source: Schema.NullOr(SourceLocationSchema),
  tag: Schema.optionalKey(toMaxText(TAG_MAX)),
});

const ComponentRefSchema = Schema.Struct({
  file: Schema.optionalKey(FileTextSchema),
  name: Schema.String.check(Schema.isPattern(COMPONENT_IDENTIFIER)),
});

const PropValueSchema = Schema.Union([
  toMaxText(PROP_TEXT_MAX),
  Schema.Number,
  Schema.Boolean,
]);

const PropNameSchema = Schema.String.check(Schema.isPattern(PROP_NAME));

const InsertPropsSchema = Schema.Record(PropNameSchema, PropValueSchema).check(
  Schema.isMaxProperties(PROPS_MAX)
);

const InsertRequestSchema = Schema.Struct({
  component: ComponentRefSchema,
  position: Schema.Literals(INSERT_POSITIONS),
  props: Schema.optionalKey(InsertPropsSchema),
  target: RequestTargetSchema,
  text: Schema.optionalKey(toMaxText(INSERT_TEXT_MAX)),
});

const SwapRequestSchema = Schema.Struct({
  component: ComponentRefSchema,
  use: SourceLocationSchema,
});

const CreateTargetListSchema = Schema.Array(RequestTargetSchema).check(
  Schema.isMinLength(1),
  Schema.isMaxLength(CREATE_TARGETS_MAX)
);

const CreateRequestSchema = Schema.Struct({
  folder: Schema.Trim.check(
    Schema.isMinLength(1),
    Schema.isMaxLength(FOLDER_MAX)
  ),
  name: Schema.String.check(Schema.isPattern(COMPONENT_NAME)),
  targets: CreateTargetListSchema,
});

const toRequestDecoder = <Item extends DecodableSchema>(
  schema: Item,
  fallback: string
): ((raw: Schema.Json) => Item["Type"]) => {
  const decode = toDecoder(schema, "error");

  return (raw) => {
    const result = decode(raw);

    if (result._tag === "Failure") {
      const message = String(result.failure.message).replaceAll("\n", "; ");

      throw new DirectEditError("invalid_request", message || fallback);
    }

    return result.success;
  };
};

const decodeInsertRequest = toRequestDecoder(
  InsertRequestSchema,
  "The insert request is not valid"
);

const decodeSwapRequest = toRequestDecoder(
  SwapRequestSchema,
  "The swap request is not valid"
);

const decodeCreateRequest = toRequestDecoder(
  CreateRequestSchema,
  "The create component request is not valid"
);

export { decodeCreateRequest, decodeInsertRequest, decodeSwapRequest };
