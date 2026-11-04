import { Effect, Schema } from "effect";

type ToolFields = Schema.Struct.Fields;

type ToolArgValue =
  | boolean
  | number
  | string
  | readonly ToolArgValue[]
  | { readonly [key: string]: ToolArgValue }
  | null;

type RawToolArgs = Readonly<Record<string, ToolArgValue>>;

type ToolParse<Data> =
  | { readonly data: Data; readonly success: true }
  | { readonly error: string; readonly success: false };

interface ToolInput<Fields extends ToolFields> {
  readonly fields: Fields;
  readonly safeParse: (
    args: RawToolArgs
  ) => ToolParse<Schema.Struct.Type<Fields>>;
}

type AnyToolInput = ToolInput<ToolFields>;

type ToolArgs<Input extends AnyToolInput> = Schema.Struct.Encoded<
  Input["fields"]
>;

type ToolData<Input extends AnyToolInput> = Schema.Struct.Type<Input["fields"]>;

const toTrimmedText = (min: number, max: number): Schema.Trim =>
  Schema.Trim.check(Schema.isMinLength(min), Schema.isMaxLength(max));

const toOptional = <Field extends Schema.Top>(
  schema: Field,
  description: string
): Schema.optionalKey<Field> =>
  Schema.optionalKey(schema.annotate({ description }) as Field);

const toDefaulted = <Field extends Schema.Top>(
  schema: Field,
  value: Field["Encoded"],
  description: string
): Schema.withDecodingDefaultKey<Field> =>
  (schema.annotate({ description }) as Field).pipe(
    Schema.withDecodingDefaultKey(Effect.succeed(value))
  );

const toOptionalText = (
  min: number,
  max: number,
  description: string
): Schema.optionalKey<Schema.Trim> =>
  Schema.optionalKey(toTrimmedText(min, max).annotate({ description }));

const toOptionalFlag = (
  description: string
): Schema.optionalKey<Schema.Boolean> =>
  Schema.optionalKey(Schema.Boolean.annotate({ description }));

const toOptionalInt = (
  min: number,
  max: number,
  description: string
): Schema.optionalKey<Schema.Int> =>
  Schema.optionalKey(
    Schema.Int.check(Schema.isBetween({ maximum: max, minimum: min })).annotate(
      { description }
    )
  );

const toRefinedToolInput = <Fields extends ToolFields>(
  fields: Fields,
  refine: (data: Schema.Struct.Type<Fields>) => string | null
): ToolInput<Fields> => {
  const decode = Schema.decodeUnknownResult(Schema.Struct(fields), {
    errors: "all",
    onExcessProperty: "error",
  });

  const safeParse = (
    args: RawToolArgs
  ): ToolParse<Schema.Struct.Type<Fields>> => {
    const result = decode(args);

    if (result._tag === "Failure") {
      return {
        error: String(result.failure.message).replaceAll("\n", "; "),
        success: false,
      };
    }

    const problem = refine(result.success);

    if (problem) {
      return { error: problem, success: false };
    }

    return { data: result.success, success: true };
  };

  return { fields, safeParse };
};

const toToolInput = <Fields extends ToolFields>(
  fields: Fields
): ToolInput<Fields> => toRefinedToolInput(fields, () => null);

export {
  toDefaulted,
  toOptional,
  toOptionalFlag,
  toOptionalInt,
  toOptionalText,
  toRefinedToolInput,
  toToolInput,
  toTrimmedText,
};

export type {
  AnyToolInput,
  ToolArgs,
  ToolData,
  ToolFields,
  ToolInput,
  ToolParse,
};
