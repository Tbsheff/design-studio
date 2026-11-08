import { commitOne, guardEdit } from "./commit.js";
import type { TextStyleEditScope } from "./commit.js";
import type {
  DirectEditDeps,
  TextStyleSource,
  TextStyleValues,
  Version,
  WrittenFile,
} from "./deps.js";
import { allTextStyles, TextStyleError } from "./list.js";
import { slug } from "./style.js";
import { planTokenWrite } from "./token-write.js";

interface TextStyleCreateRequest {
  name: string;
  values: TextStyleValues;
}

interface TextStyleCreatePlan {
  name: string;
  source: TextStyleSource;
  title: string;
  values: TextStyleValues;
  written: WrittenFile;
}

interface TextStyleCreateDone {
  plan: TextStyleCreatePlan;
  version: Version;
}

const NO_VALUE = new Set(["", "normal", "auto", "initial", "inherit"]);

const toComputedPart = (
  styles: Record<string, string>,
  key: string
): string | null => {
  const value = styles[key]?.trim() ?? "";

  if (NO_VALUE.has(value)) {
    return null;
  }

  return value;
};

const toComputedTextValues = (
  styles: Record<string, string>
): TextStyleValues => ({
  family: toComputedPart(styles, "font-family"),
  letterSpacing: toComputedPart(styles, "letter-spacing"),
  lineHeight: toComputedPart(styles, "line-height"),
  size: toComputedPart(styles, "font-size"),
  weight: toComputedPart(styles, "font-weight"),
});

const toPlanTextStyleCreate = async (
  workTree: string,
  request: TextStyleCreateRequest
): Promise<TextStyleCreatePlan> => {
  const name = slug(request.name);

  if (!name || request.values.size === null) {
    throw new TextStyleError("A text style needs a name and a font size.");
  }

  const known = await allTextStyles(workTree);

  if (known.some((style) => style.name === name)) {
    throw new TextStyleError(
      `Text style ${name} exists. Pick a new name or use apply_text_style.`
    );
  }

  const write = await planTokenWrite(workTree, name, request.values);

  if (!write) {
    throw new TextStyleError(
      "The project has no token source: no Tailwind @theme block, tokens.json typography group or :root block in a CSS file."
    );
  }

  return {
    name,
    source: write.source,
    title: `New text style ${name}`,
    values: request.values,
    written: {
      code: write.code,
      original: write.file.text,
      target: { file: write.file.file, relative: write.file.relative },
    },
  };
};

const createTextStyleToken = async (
  deps: DirectEditDeps,
  scope: TextStyleEditScope,
  request: TextStyleCreateRequest
): Promise<TextStyleCreateDone> => {
  guardEdit(deps, scope);
  const plan = await toPlanTextStyleCreate(scope.workTree, request);
  const version = await commitOne(deps, scope, plan.written, plan.title);

  return { plan, version };
};

export {
  toComputedTextValues as computedTextValues,
  createTextStyleToken,
  toPlanTextStyleCreate as planTextStyleCreate,
};

export type {
  TextStyleCreateDone,
  TextStyleCreatePlan,
  TextStyleCreateRequest,
};
