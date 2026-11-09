import { LINK_SWIPE_TRIGGERS } from "@design-studio/contracts/link-interaction";
import {
  LINK_VARIABLE_NAME_RE,
  LINK_VARIABLE_OPS,
  LINK_VARIABLE_TEXT_MAX,
} from "@design-studio/contracts/link-variable";
import { Schema } from "effect";

const LinkVariableNameSchema = Schema.String.check(
  Schema.isPattern(LINK_VARIABLE_NAME_RE)
);

const LinkVariableValueSchema = Schema.Union([
  Schema.String.check(Schema.isMaxLength(LINK_VARIABLE_TEXT_MAX)),
  Schema.Number,
]);

const NullableValueSchema = Schema.NullOr(LinkVariableValueSchema);

const NullableNameSchema = Schema.NullOr(LinkVariableNameSchema);

const LinkVariableFields = {
  variableName: Schema.optionalKey(
    LinkVariableNameSchema.annotate({
      description:
        "Variable name for set-variable: a letter, then letters and digits, 1 to 32 chars, for example signedIn.",
    })
  ),
  variableOp: Schema.optionalKey(
    Schema.Literals(LINK_VARIABLE_OPS).annotate({
      description:
        "For set-variable: set (default) stores variableValue, toggle flips true and false, add adds the number variableValue.",
    })
  ),
  variableValue: Schema.optionalKey(
    NullableValueSchema.annotate({
      description:
        'Value for set-variable set and add: a string or a number. Leave out for toggle. Booleans are the strings "true" and "false".',
    })
  ),
  whenEquals: Schema.optionalKey(
    NullableValueSchema.annotate({
      description:
        "Value that the variable whenName must equal. The link fires only then, in Play.",
    })
  ),
  whenName: Schema.optionalKey(
    NullableNameSchema.annotate({
      description:
        "Only-when condition: the link fires in Play only when this variable equals whenEquals. null clears the condition.",
    })
  ),
} as const;

const ShownVisibilitySchema = Schema.Literals(["show", "hide"]);

const LinkVariableTargetSchema = Schema.Struct({
  variable: Schema.Struct({
    name: Schema.String,
    op: Schema.Literals(LINK_VARIABLE_OPS),
    value: NullableValueSchema,
  }),
});

const LinkWhenSchema = Schema.Struct({
  equals: Schema.Union([Schema.String, Schema.Number]),
  name: Schema.String,
});

const LinkTargetSchema = Schema.Union([
  Schema.Struct({ frame: Schema.String }),
  Schema.Struct({ back: Schema.Literal(true) }),
  Schema.Struct({
    selector: Schema.String,
    visibility: Schema.optionalKey(ShownVisibilitySchema),
  }),
  Schema.Struct({ url: Schema.String }),
  Schema.Struct({ close: Schema.Literal(true) }),
  LinkVariableTargetSchema,
]);

const LinkTriggerSchema = Schema.Union([
  Schema.Struct({ kind: Schema.Literal("hover") }),
  Schema.Struct({ kind: Schema.Literal("press") }),
  Schema.Struct({ kind: Schema.Literals(LINK_SWIPE_TRIGGERS) }),
  Schema.Struct({ kind: Schema.Literal("delay"), ms: Schema.Number }),
  Schema.Struct({ key: Schema.String, kind: Schema.Literal("key") }),
]);

export {
  LinkTargetSchema,
  LinkTriggerSchema,
  LinkVariableFields,
  LinkWhenSchema,
};
