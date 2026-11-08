import { TOKEN_NAME_PATTERN } from "@design-studio/contracts";
import type {
  CompiledTokenEntry,
  TokenGroupName,
} from "@design-studio/contracts";

import { cssVarFor } from "../../../shared/token-match.js";
import { COPY } from "./copy.js";
import type {
  CreateTokenSubmit,
  TokenFailure,
  TokenProblems,
} from "./create-token-types.js";

const SUGGEST_LIMIT = 1000;
const FIRST_ALT = 0;
const TEXT_OFFSET = 5;

const toSeriesName = (group: TokenGroupName, step: number): string => {
  const next = step + 1;

  switch (group) {
    case "color": {
      return `brand-${next}`;
    }

    case "font": {
      if (step === FIRST_ALT) {
        return "alt";
      }

      return `alt-${next}`;
    }

    case "radius":
    case "shadow": {
      if (step === FIRST_ALT) {
        return "xl";
      }

      return `xl-${next}`;
    }

    case "space": {
      return String(next);
    }

    default: {
      return `${step + TEXT_OFFSET}xl`;
    }
  }
};

const suggestName = (
  group: TokenGroupName,
  entries: CompiledTokenEntry[]
): string => {
  const taken = new Set(entries.map((entry) => entry.cssVar));

  for (let step = 0; step < SUGGEST_LIMIT; step += 1) {
    const name = toSeriesName(group, step);

    if (!taken.has(cssVarFor(group, name))) {
      return name;
    }
  }

  return "";
};

const toNameError = (
  group: TokenGroupName,
  name: string,
  entries: CompiledTokenEntry[]
): string | null => {
  if (!name) {
    return COPY.tokenEnterName;
  }

  if (!TOKEN_NAME_PATTERN.test(name)) {
    return COPY.tokenNameRule;
  }

  const cssVar = cssVarFor(group, name);

  if (entries.some((entry) => entry.cssVar === cssVar)) {
    return `${cssVar}${COPY.tokenExistsSuffix}`;
  }

  return null;
};

const toValueError = (
  group: TokenGroupName,
  value: string,
  isOptional: boolean,
  isColor: (value: string) => boolean
): string | null => {
  if (!value.trim()) {
    if (isOptional) {
      return null;
    }

    return COPY.tokenEnterValue;
  }

  if (group === "color" && !isColor(value)) {
    return COPY.tokenValidColor;
  }

  return null;
};

interface ProblemInput {
  readonly dark: string;
  readonly entries: CompiledTokenEntry[];
  readonly failure: TokenFailure | null;
  readonly group: TokenGroupName;
  readonly isColor: (value: string) => boolean;
  readonly name: string;
  readonly value: string;
}

const toProblems = (input: ProblemInput): TokenProblems => {
  const { dark, entries, failure, group, isColor, name, value } = input;
  let serverName: string | null = null;

  if (failure?.field === "name") {
    serverName = failure.message;
  }

  const nameProblem = toNameError(group, name, entries) ?? serverName;
  const valueProblem = toValueError(group, value, false, isColor);
  let darkProblem: string | null = null;

  if (group === "color") {
    darkProblem = toValueError(group, dark, true, isColor);
  }

  const isInvalid = Boolean(nameProblem || valueProblem || darkProblem);

  return { darkProblem, isInvalid, nameProblem, valueProblem };
};

interface SubmitFields {
  readonly apply: boolean;
  readonly dark: string;
  readonly group: TokenGroupName;
  readonly name: string;
  readonly value: string;
}

const toSubmitInput = (fields: SubmitFields): CreateTokenSubmit => {
  const darkValue = fields.dark.trim();

  const base = {
    apply: fields.apply,
    group: fields.group,
    name: fields.name,
    value: fields.value.trim(),
  };

  if (darkValue) {
    return { ...base, darkValue };
  }

  return base;
};

export { suggestName, toProblems, toSubmitInput };
