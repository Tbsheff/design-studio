import { readFile } from "node:fs/promises";
import path from "node:path";

import { Schema } from "effect";

import { BadRequestError, loadKitNames, toDecoder } from "./deps.js";
import type { Project } from "./deps.js";
import {
  setTokenNames,
  toConvertedSnippet,
  toImportMapping,
  toSameProjectMapping,
  toTokenOutcomes,
} from "./engine/index.js";
import type { ImportMapping, TargetKit, TokenOutcome } from "./engine/index.js";
import type { PatternInserted, StoredPattern } from "./pattern-model.js";
import { getProjectTokens } from "./pattern-tokens.js";
import { toFragment, toWrapped } from "./snippet-parse.js";

interface PrepareScope {
  readonly project: Project;
  readonly workTree: string;
}

interface Prepared {
  readonly dropped: readonly string[];
  readonly helpers: readonly string[];
  readonly mapping: ImportMapping;
  readonly mappedTokens: PatternInserted["mappedTokens"];
  readonly text: string;
  readonly unmappedTokens: PatternInserted["unmappedTokens"];
}

interface TokenText {
  readonly mappedTokens: PatternInserted["mappedTokens"];
  readonly text: string;
  readonly unmappedTokens: PatternInserted["unmappedTokens"];
}

const PackageSchema = Schema.Struct({
  dependencies: Schema.optionalKey(Schema.Record(Schema.String, Schema.String)),
  devDependencies: Schema.optionalKey(
    Schema.Record(Schema.String, Schema.String)
  ),
  peerDependencies: Schema.optionalKey(
    Schema.Record(Schema.String, Schema.String)
  ),
});

const decodePackage = toDecoder(Schema.fromJsonString(PackageSchema), "ignore");

const getText = async (file: string): Promise<string> => {
  try {
    return await readFile(file, "utf-8");
  } catch {
    return "";
  }
};

const toDependencyNames = (text: string): readonly string[] => {
  const decoded = decodePackage(text);

  if (decoded._tag === "Failure") {
    return [];
  }

  const found = decoded.success;

  return [
    ...Object.keys(found.dependencies ?? {}),
    ...Object.keys(found.devDependencies ?? {}),
    ...Object.keys(found.peerDependencies ?? {}),
  ];
};

const getPackageNames = async (
  scope: PrepareScope
): Promise<ReadonlySet<string>> => {
  const appDir = scope.project.app?.appDir ?? ".";

  const texts = await Promise.all([
    getText(path.join(scope.workTree, appDir, "package.json")),
    getText(path.join(scope.workTree, "package.json")),
  ]);

  return new Set(texts.flatMap((text) => toDependencyNames(text)));
};

const getTargetKit = async (scope: PrepareScope): Promise<TargetKit | null> => {
  const names = await loadKitNames(scope.project, scope.workTree);

  if (names === null) {
    return null;
  }

  const entries = new Map(
    [...names].map(([name, entry]) => [
      name,
      { absolute: entry.absolute, file: entry.file, kind: entry.kind },
    ])
  );

  return { entries, packages: await getPackageNames(scope) };
};

const isRename = (outcome: TokenOutcome): boolean =>
  outcome.to !== null && outcome.to !== outcome.from;

const getTokenText = async (
  scope: PrepareScope,
  stored: StoredPattern
): Promise<TokenText> => {
  if (stored.tokens.length === 0) {
    return { mappedTokens: [], text: stored.source, unmappedTokens: [] };
  }

  const outcomes = toTokenOutcomes(
    stored.tokens,
    await getProjectTokens(scope.workTree)
  );

  const renames = new Map<string, string>();
  const mappedTokens: PatternInserted["mappedTokens"][number][] = [];

  for (const outcome of outcomes) {
    if (isRename(outcome) && outcome.to !== null) {
      renames.set(outcome.from, outcome.to);
      mappedTokens.push({
        from: outcome.from,
        note: outcome.note,
        to: outcome.to,
      });
    }
  }

  return {
    mappedTokens,
    text: setTokenNames(stored.source, renames),
    unmappedTokens: outcomes.flatMap((outcome) => {
      if (outcome.to === null) {
        return [{ name: outcome.from, reason: outcome.note }];
      }

      return [];
    }),
  };
};

const toTargetHelpers = (
  isHtmlTarget: boolean,
  stored: StoredPattern
): readonly string[] => {
  if (isHtmlTarget) {
    return [];
  }

  return stored.helpers;
};

const toPreparedMapping = (
  scope: PrepareScope,
  stored: StoredPattern,
  kit: TargetKit | null
): ImportMapping => {
  if (stored.sourceProjectId === scope.project.id) {
    return toSameProjectMapping(
      stored.imports,
      path.dirname(path.join(scope.workTree, stored.sourceFile))
    );
  }

  return toImportMapping(stored.imports, kit);
};

const toPrepared = async (
  scope: PrepareScope,
  stored: StoredPattern
): Promise<Prepared> => {
  const isHtmlTarget = scope.project.kind !== "react";

  if (stored.kind === "html" && !isHtmlTarget) {
    throw new BadRequestError(
      "This pattern was saved from a static HTML page. A React project cannot take it. Save a pattern from a React layer, or insert this one into a static HTML project."
    );
  }

  const [tokens, kit] = await Promise.all([
    getTokenText(scope, stored),
    getTargetKit(scope),
  ]);

  const mapping = toPreparedMapping(scope, stored, kit);
  const helpers = toTargetHelpers(isHtmlTarget, stored);

  if (stored.kind === "html") {
    return { ...tokens, dropped: [], helpers, mapping };
  }

  const wrapped = toWrapped(tokens.text);
  const fragment = toFragment(wrapped, true);

  if (fragment === null) {
    throw new BadRequestError("The pattern source cannot be read as JSX.");
  }

  if (!isHtmlTarget && mapping.unmapped.length === 0) {
    return { ...tokens, dropped: [], helpers, mapping };
  }

  const converted = toConvertedSnippet(wrapped, fragment, {
    isHtml: isHtmlTarget,
    unmapped: new Set(mapping.unmapped.map((item) => item.name)),
  });

  return {
    ...tokens,
    dropped: converted.dropped,
    helpers,
    mapping,
    text: converted.text,
  };
};

export { toPrepared };

export type { PrepareScope, Prepared };
