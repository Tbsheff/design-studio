import { toNumber } from "./to-number.js";
import { toRgba } from "./to-rgba.js";
import { toAliasCount } from "./token-model.js";
import type {
  FormatOutput,
  PortableToken,
  PortableValue,
  SkippedToken,
} from "./token-model.js";

type FigmaKind = "COLOR" | "FLOAT" | "STRING";

type FigmaColor = Readonly<Record<"a" | "b" | "g" | "r", number>>;

interface FigmaAlias {
  readonly id: string;
  readonly type: "VARIABLE_ALIAS";
}

type FigmaLiteral = FigmaColor | number | string;

type FigmaValue = FigmaAlias | FigmaLiteral;

interface Converted {
  readonly dark: FigmaLiteral | null;
  readonly kind: FigmaKind;
  readonly light: FigmaLiteral;
}

interface Convertible {
  readonly converted: Converted;
  readonly token: PortableToken;
}

interface Split {
  readonly kept: Convertible[];
  readonly skipped: SkippedToken[];
}

interface FigmaVariable {
  readonly codeSyntax: { readonly WEB: string };
  readonly description: string;
  readonly hiddenFromPublishing: boolean;
  readonly id: string;
  readonly name: string;
  readonly remote: boolean;
  readonly resolvedType: FigmaKind;
  readonly scopes: readonly string[];
  readonly valuesByMode: Readonly<Record<string, FigmaValue>>;
  readonly variableCollectionId: string;
}

const ALPHA_KEY = "a";
const BLUE_KEY = "b";
const GREEN_KEY = "g";
const RED_KEY = "r";
const JSON_INDENT = 2;
const COLLECTION_ID = "VariableCollectionId:1:0";
const COLLECTION_NAME = "Design Studio";

const toKind = (type: string): FigmaKind | null => {
  if (type === "color") {
    return "COLOR";
  }

  if (type === "fontFamily") {
    return "STRING";
  }

  if (["dimension", "duration", "fontWeight", "number"].includes(type)) {
    return "FLOAT";
  }

  return null;
};

const toFloatScope = (group: string): string => {
  if (group === "radius") {
    return "CORNER_RADIUS";
  }

  if (group === "space") {
    return "GAP";
  }

  if (group === "text") {
    return "FONT_SIZE";
  }

  return "ALL_SCOPES";
};

const toScopes = (token: PortableToken, kind: FigmaKind): readonly string[] => {
  if (kind === "COLOR") {
    return ["ALL_SCOPES"];
  }

  if (token.type === "fontWeight") {
    return ["FONT_WEIGHT"];
  }

  if (kind === "STRING") {
    return ["FONT_FAMILY"];
  }

  return [toFloatScope(token.group)];
};

const toLiteral = (
  kind: FigmaKind,
  type: string,
  text: string
): FigmaLiteral | null => {
  if (kind === "STRING") {
    return text;
  }

  if (kind === "FLOAT") {
    return toNumber(text, type);
  }

  const rgba = toRgba(text);

  if (!rgba) {
    return null;
  }

  return {
    [ALPHA_KEY]: rgba.alpha,
    [BLUE_KEY]: rgba.blue,
    [GREEN_KEY]: rgba.green,
    [RED_KEY]: rgba.red,
  };
};

const toDarkLiteral = (
  kind: FigmaKind,
  type: string,
  value: PortableValue | null
): FigmaLiteral | null => {
  if (value === null) {
    return null;
  }

  return toLiteral(kind, type, value.text);
};

const toConverted = (token: PortableToken): Convertible | SkippedToken => {
  const kind = toKind(token.type);

  if (kind === null) {
    return {
      name: token.path,
      reason: `Figma Variables cannot hold type ${token.type}`,
    };
  }

  const light = toLiteral(kind, token.type, token.light.text);
  const dark = toDarkLiteral(kind, token.type, token.dark);

  if (light === null || (token.dark !== null && dark === null)) {
    return {
      name: token.path,
      reason: `Figma cannot hold the ${kind.toLowerCase()} value ${token.light.text}`,
    };
  }

  return { converted: { dark, kind, light }, token };
};

const toModeValue = (
  ids: ReadonlyMap<string, string>,
  alias: string | null,
  literal: FigmaLiteral
): FigmaValue => {
  const target = ids.get(alias ?? "");

  if (target) {
    return { id: target, type: "VARIABLE_ALIAS" };
  }

  return literal;
};

const toValues = (
  ids: ReadonlyMap<string, string>,
  modeIds: readonly string[],
  entry: Convertible
): Readonly<Record<string, FigmaValue>> => {
  const { converted, token } = entry;
  const light = toModeValue(ids, token.light.aliasPath, converted.light);

  const dark = toModeValue(
    ids,
    token.dark?.aliasPath ?? token.light.aliasPath,
    converted.dark ?? converted.light
  );

  const values = modeIds.map((modeId, index) => {
    if (index === 0) {
      return [modeId, light];
    }

    return [modeId, dark];
  });

  return Object.fromEntries(values);
};

const toVariable = (
  ids: ReadonlyMap<string, string>,
  modeIds: readonly string[],
  entry: Convertible
): FigmaVariable => ({
  codeSyntax: { WEB: `var(${entry.token.cssVar})` },
  description: "",
  hiddenFromPublishing: false,
  id: ids.get(entry.token.path) ?? "",
  name: entry.token.segments.join("/"),
  remote: false,
  resolvedType: entry.converted.kind,
  scopes: toScopes(entry.token, entry.converted.kind),
  valuesByMode: toValues(ids, modeIds, entry),
  variableCollectionId: COLLECTION_ID,
});

const toModeNames = (modes: string): readonly string[] => {
  if (modes === "light-dark") {
    return ["Light", "Dark"];
  }

  if (modes === "dark") {
    return ["Dark"];
  }

  return ["Light"];
};

const toConvertibles = (tokens: readonly PortableToken[]): Split => {
  const skipped: SkippedToken[] = [];
  const kept: Convertible[] = [];

  for (const token of tokens) {
    const converted = toConverted(token);

    if ("reason" in converted) {
      skipped.push(converted);
    } else {
      kept.push(converted);
    }
  }

  return { kept, skipped };
};

const toFigma = (
  tokens: readonly PortableToken[],
  modes: string
): FormatOutput => {
  const { kept, skipped } = toConvertibles(tokens);

  const ids = new Map(
    kept.map((entry, index) => [
      entry.token.path,
      `VariableID:1:${String(index + 1)}`,
    ])
  );

  const names = toModeNames(modes);
  const modeIds = names.map((_name, index) => `1:${String(index)}`);

  const variables = Object.fromEntries(
    kept.map((entry) => [
      ids.get(entry.token.path) ?? "",
      toVariable(ids, modeIds, entry),
    ])
  );

  const collections = {
    [COLLECTION_ID]: {
      defaultModeId: modeIds[0] ?? "",
      hiddenFromPublishing: false,
      id: COLLECTION_ID,
      modes: names.map((name, index) => ({
        modeId: modeIds[index] ?? "",
        name,
      })),
      name: COLLECTION_NAME,
      remote: false,
      variableIds: [...ids.values()],
    },
  };

  const file = { meta: { variableCollections: collections, variables } };

  const aliasCount = toAliasCount(
    (value) => ids.has(value.aliasPath ?? ""),
    kept.map((entry) => entry.token)
  );

  return {
    aliasCount,
    skipped,
    text: `${JSON.stringify(file, null, JSON_INDENT)}\n`,
    tokenCount: kept.length,
  };
};

export { toFigma };
