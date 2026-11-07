import { readFile } from "node:fs/promises";
import path from "node:path";

import { EffectStackSchema } from "@design-studio/actions/effect/schema";
import { Result, Schema } from "effect";

import { toDecoder } from "./deps.js";
import type { EffectItem } from "./deps.js";
import { fromSheetText } from "./engine/index.js";
import type { RawRule } from "./engine/index.js";

interface SheetFile {
  readonly file: string;
  readonly isNew: boolean;
  readonly relative: string;
  readonly text: string;
}

interface SheetRule {
  readonly className: string;
  readonly effects: readonly EffectItem[];
  readonly name: string | null;
  readonly raw: RawRule;
}

const OWN_SHEET = "effects.css";

const CSS_CANDIDATES = [
  OWN_SHEET,
  "src/index.css",
  "src/App.css",
  "src/app.css",
  "src/main.css",
  "src/styles.css",
  "src/style.css",
  "src/globals.css",
  "src/styles/globals.css",
  "src/app/globals.css",
  "app/globals.css",
  "styles/globals.css",
  "src/tailwind.css",
  "app/tailwind.css",
  "index.css",
  "styles.css",
  "style.css",
] as const;

const PayloadSchema = Schema.fromJsonString(
  Schema.Struct({
    effects: EffectStackSchema,
    name: Schema.NullOr(Schema.String),
  })
);

const toPayload = toDecoder(PayloadSchema, "ignore");

const getTextOrNull = async (file: string): Promise<string | null> => {
  try {
    return await readFile(file, "utf-8");
  } catch {
    return null;
  }
};

const getSheetCandidate = async (
  workTree: string,
  candidate: string
): Promise<SheetFile | null> => {
  const filePath = path.join(workTree, candidate);
  const content = await getTextOrNull(filePath);

  if (content === null) {
    return null;
  }

  return { file: filePath, isNew: false, relative: candidate, text: content };
};

const toNewSheet = (workTree: string): SheetFile => ({
  file: path.join(workTree, OWN_SHEET),
  isNew: true,
  relative: OWN_SHEET,
  text: "",
});

const getSheet = async (workTree: string): Promise<SheetFile | null> => {
  const found = await Promise.all(
    CSS_CANDIDATES.map((relative) => getSheetCandidate(workTree, relative))
  );

  return found.find((entry) => entry !== null) ?? null;
};

const toSheetRules = (text: string): SheetRule[] =>
  fromSheetText(text).flatMap((raw): SheetRule[] => {
    const payload = toPayload(raw.json);

    if (Result.isFailure(payload)) {
      return [];
    }

    return [
      {
        className: raw.className,
        effects: payload.success.effects,
        name: payload.success.name,
        raw,
      },
    ];
  });

const getRule = (
  rules: readonly SheetRule[],
  className: string
): SheetRule | null =>
  rules.find((rule) => rule.className === className) ?? null;

export { getRule, getSheet, getTextOrNull, toNewSheet, toSheetRules };

export type { SheetFile, SheetRule };
