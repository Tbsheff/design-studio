import { Effect, Schema } from "effect";

import { toDecoder } from "../platform/decode/index.js";
import type { ExcessProperty } from "../platform/decode/index.js";
import { toSdkFieldSet } from "./sdk-shape.js";
import type { SdkFieldSet } from "./sdk-shape.js";

type ToolField = Schema.Struct.Fields[string] & {
  readonly DecodingServices: never;
};

type ToolFields = Readonly<Record<string, ToolField>>;

type ToolArgValue =
  | boolean
  | number
  | string
  | readonly ToolArgValue[]
  | { readonly [key: string]: ToolArgValue }
  | null
  | undefined;

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

interface LooseTool<Fields extends ToolFields> {
  readonly input: ToolInput<Fields>;
  readonly sdkFields: SdkFieldSet<Fields>;
}

type AnyToolInput = ToolInput<ToolFields>;

type ToolArgs<Input extends AnyToolInput> = Schema.Struct.Encoded<
  Input["fields"]
>;

type ToolDecoded<Input extends AnyToolInput> = Schema.Struct.Type<
  Input["fields"]
>;

const toTrimmedText = (min: number, max: number): Schema.Trim =>
  Schema.Trim.check(Schema.isMinLength(min), Schema.isMaxLength(max));

const toOptional = <Field extends Schema.Top>(
  schema: Field,
  description: string
): Schema.optionalKey<Field["Rebuild"]> =>
  Schema.optionalKey(schema.annotate({ description }));

const toDefaulted = <Field extends Schema.Top>(
  schema: Field,
  value: Field["Encoded"],
  description: string
): Schema.withDecodingDefaultKey<Field> =>
  (schema.annotate({ default: value, description }) as Field).pipe(
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

const toCheckedInput = <Fields extends ToolFields>(
  fields: Fields,
  excess: ExcessProperty,
  refine: (data: Schema.Struct.Type<Fields>) => string | null
): ToolInput<Fields> => {
  const decode = toDecoder(Schema.Struct(fields), excess);

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

const toRefinedToolInput = <Fields extends ToolFields>(
  fields: Fields,
  refine: (data: Schema.Struct.Type<Fields>) => string | null
): ToolInput<Fields> => toCheckedInput(fields, "error", refine);

const toToolInput = <Fields extends ToolFields>(
  fields: Fields
): ToolInput<Fields> => toCheckedInput(fields, "error", () => null);

const toLooseToolInput = <Fields extends ToolFields>(
  fields: Fields
): ToolInput<Fields> => toCheckedInput(fields, "ignore", () => null);

const toLooseTool = <Fields extends ToolFields>(
  fields: Fields
): LooseTool<Fields> => ({
  input: toLooseToolInput(fields),
  sdkFields: toSdkFieldSet(fields),
});

const toErrorText = <Failure>(error: Failure): string => {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
};

const toToolRun =
  <Fields extends ToolFields, Refusal, Reply>(
    input: ToolInput<Fields>,
    refuse: (message: string) => Refusal,
    run: (data: Schema.Struct.Type<Fields>) => Promise<Reply>
  ) =>
  (args: RawToolArgs): Promise<Refusal | Reply> => {
    const parsed = input.safeParse(args);

    if (!parsed.success) {
      return Promise.resolve(refuse(parsed.error));
    }

    return run(parsed.data);
  };

export {
  toDefaulted,
  toErrorText,
  toLooseTool,
  toOptional,
  toOptionalFlag,
  toOptionalInt,
  toOptionalText,
  toRefinedToolInput,
  toToolInput,
  toToolRun,
  toTrimmedText,
};

export type {
  AnyToolInput,
  ToolArgs,
  ToolDecoded,
  LooseTool,
  ToolFields,
  ToolInput,
  ToolParse,
};
