import type { ResolvedSource } from "./deps.js";

interface PatternPlan {
  readonly addedImports: readonly string[];
  readonly code: string;
  readonly isNew: boolean;
  readonly original: string;
  readonly route: string | null;
  readonly target: ResolvedSource;
  readonly title: string;
  readonly unresolved: readonly string[];
}

const toUnresolved = (
  references: readonly string[],
  code: string | null
): readonly string[] => {
  if (code === null) {
    return references;
  }

  return references.filter((name) => {
    const escaped = name.replaceAll("$", String.raw`\$`);

    return !new RegExp(String.raw`\b${escaped}\b`, "u").test(code);
  });
};

export { toUnresolved };

export type { PatternPlan };
