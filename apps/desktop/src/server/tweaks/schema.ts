import { Schema } from "effect";

import {
  TWEAKS_MAX_CONTROLS,
  isSafeCssValue,
  type TweakControl,
  type TweaksFile,
} from "../../shared/tweaks.js";
import { toDecoder } from "../platform/decode/index.js";

const MAX_PROBLEMS = 6;

const cssValue = Schema.Trim.check(
  Schema.makeFilter(
    (value: string) =>
      isSafeCssValue(value) ||
      "must be a plain CSS value (no ; { } < > \\ or comments, at most 200 characters)"
  )
);

const base = {
  cssVar: Schema.String.check(
    Schema.isPattern(/^--[A-Za-z0-9_-]{1,60}$/, {
      message: "must be a CSS custom property like --accent",
    })
  ),
  group: Schema.optional(
    Schema.Trim.check(Schema.isMinLength(1), Schema.isMaxLength(30))
  ),
  id: Schema.String.check(
    Schema.isPattern(/^[A-Za-z0-9][A-Za-z0-9_-]{0,39}$/, {
      message: "must be 1-40 letters, digits, - or _",
    })
  ),
  label: Schema.Trim.check(Schema.isMinLength(1), Schema.isMaxLength(40)),
};

const stepSchema = Schema.Finite.check(Schema.isGreaterThan(0));

const unitSchema = Schema.String.check(
  Schema.isPattern(/^[A-Za-z%]{0,6}$/u, {
    message: "must be a CSS unit like px, rem, % or empty",
  })
);

const rangeSchema = Schema.Struct({
  ...base,
  default: Schema.Finite,
  max: Schema.Finite,
  min: Schema.Finite,
  step: Schema.optional(stepSchema),
  type: Schema.Literal("range"),
  unit: Schema.optional(unitSchema),
});

const colorSchema = Schema.Struct({
  ...base,
  default: cssValue,
  type: Schema.Literal("color"),
});

const toggleSchema = Schema.Struct({
  ...base,
  default: Schema.Boolean,
  off: cssValue,
  on: cssValue,
  type: Schema.Literal("toggle"),
});

const optionSchema = Schema.Struct({
  label: Schema.Trim.check(Schema.isMinLength(1), Schema.isMaxLength(40)),
  value: cssValue,
});

const selectSchema = Schema.Struct({
  ...base,
  default: cssValue,
  options: Schema.Array(optionSchema).check(
    Schema.isMinLength(2),
    Schema.isMaxLength(12)
  ),
  type: Schema.Literal("select"),
});

const tweakControlSchema = Schema.Union([
  rangeSchema,
  colorSchema,
  toggleSchema,
  selectSchema,
]);

const tweakControlsSchema = Schema.Array(tweakControlSchema).check(
  Schema.isMaxLength(TWEAKS_MAX_CONTROLS)
);

const tweaksFileSchema = Schema.Struct({ controls: tweakControlsSchema });

const valuesSchema = Schema.Struct({
  values: Schema.Record(
    Schema.String,
    Schema.Union([Schema.Finite, Schema.String, Schema.Boolean])
  ),
});

const decodeValues = toDecoder(valuesSchema, "error");

const decodeControls = toDecoder(tweakControlsSchema, "error");

const decodeTweaksFile = toDecoder(tweaksFileSchema, "error");

const toControlProblem = (control: TweakControl): string | null => {
  if (control.type === "range") {
    if (control.min >= control.max) {
      return "min must be less than max";
    }

    if (control.default < control.min || control.default > control.max) {
      return "default must be between min and max";
    }
  }

  if (control.type === "toggle" && control.on === control.off) {
    return "on and off must differ";
  }

  if (control.type === "select") {
    const values = control.options.map((option) => option.value);

    if (new Set(values).size !== values.length) {
      return "option values must be unique";
    }

    if (!values.includes(control.default)) {
      return "default must be one of the option values";
    }
  }

  return null;
};

const toListProblems = (controls: readonly TweakControl[]): string[] => {
  const problems = controls.flatMap((control, index) => {
    const problem = toControlProblem(control);

    if (problem === null) {
      return [];
    }

    return [`${index}: ${problem}`];
  });

  if (new Set(controls.map((control) => control.id)).size !== controls.length) {
    problems.push("controls: control ids must be unique");
  }

  if (
    new Set(controls.map((control) => control.cssVar)).size !== controls.length
  ) {
    problems.push("controls: each cssVar may have only one control");
  }

  return problems;
};

export function toSchemaText(failure: {
  readonly failure: { readonly message: string };
}): string {
  return String(failure.failure.message)
    .split("\n")
    .slice(0, MAX_PROBLEMS)
    .join("; ");
}

export function toProblemText(problems: readonly string[]): string {
  return problems.slice(0, MAX_PROBLEMS).join("; ");
}

export function toCommitValues(
  raw: unknown
):
  | { error: string; values: null }
  | { error: null; values: Record<string, number | string | boolean> } {
  const parsed = decodeValues(raw);

  if (parsed._tag === "Failure") {
    return { error: toSchemaText(parsed), values: null };
  }

  return { error: null, values: { ...parsed.success.values } };
}

type ParsedControls =
  | { controls: TweakControl[]; error: null }
  | { controls: null; error: string };

export function parseControls(raw: unknown): ParsedControls {
  const result = decodeControls(raw);

  if (result._tag === "Failure") {
    return { controls: null, error: toSchemaText(result) };
  }

  const controls = result.success as TweakControl[];
  const problems = toListProblems(controls);

  if (problems.length > 0) {
    return { controls: null, error: toProblemText(problems) };
  }

  return { controls, error: null };
}

export function parseTweaksText(text: string): {
  file: TweaksFile | null;
  error: string | null;
} {
  let raw: unknown;

  try {
    raw = JSON.parse(text);
  } catch (error) {
    return {
      file: null,
      error: `tweaks.json is not valid JSON: ${error instanceof Error ? error.message : String(error)}`,
    };
  }

  const result = decodeTweaksFile(raw);

  if (result._tag === "Failure") {
    return {
      file: null,
      error: `tweaks.json is invalid: ${toSchemaText(result)}`,
    };
  }

  const controls = result.success.controls as TweakControl[];
  const problems = toListProblems(controls);

  if (problems.length > 0) {
    return {
      file: null,
      error: `tweaks.json is invalid: ${toProblemText(problems)}`,
    };
  }

  return { file: { controls }, error: null };
}
