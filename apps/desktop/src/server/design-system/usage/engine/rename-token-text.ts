import { toNamespaceEntry } from "./count-token-uses.js";

interface RenamePlan {
  readonly newName: string;
  readonly oldName: string;
  readonly pairs: readonly (readonly [string, string])[];
  readonly reason: string | null;
}

interface RenameResult {
  readonly count: number;
  readonly text: string;
}

const NAME_PATTERN = /^--[a-z][\w-]*$/u;

const ESCAPE_PATTERN = /[.*+?^${}()|[\]\\]/gu;

const toEscaped = (text: string): string =>
  text.replaceAll(ESCAPE_PATTERN, String.raw`\$&`);

const toWordPattern = (word: string): RegExp =>
  new RegExp(`(?<![\\w-])${toEscaped(word)}(?![\\w-])`, "gu");

const toPrefixesText = (prefixes: readonly string[]): string =>
  prefixes.toSorted().join(",");

const toRenamePlan = (from: string, to: string): RenamePlan => {
  const none = { newName: to, oldName: from, pairs: [] };

  if (!NAME_PATTERN.test(to)) {
    return {
      ...none,
      reason: "The new name must be a CSS variable such as --color-accent.",
    };
  }

  const oldEntry = toNamespaceEntry(from);

  if (oldEntry === null) {
    return { ...none, reason: null };
  }

  const newEntry = toNamespaceEntry(to);

  if (
    newEntry === null ||
    toPrefixesText(newEntry.prefixes) !== toPrefixesText(oldEntry.prefixes)
  ) {
    const lead = from.slice(0, from.length - oldEntry.key.length);

    return {
      ...none,
      reason: `The new name must keep the ${lead} prefix, so the Tailwind classes still work.`,
    };
  }

  return {
    ...none,
    pairs: oldEntry.prefixes.map((prefix): readonly [string, string] => [
      `${prefix}-${oldEntry.key}`,
      `${prefix}-${newEntry.key}`,
    ]),
    reason: null,
  };
};

const toReplaced = (
  text: string,
  word: string,
  value: string
): RenameResult => {
  let count = 0;

  const replaced = text.replaceAll(toWordPattern(word), () => {
    count += 1;

    return value;
  });

  return { count, text: replaced };
};

const toRenamedText = (text: string, plan: RenamePlan): RenameResult => {
  let current = toReplaced(text, plan.oldName, plan.newName);
  let { count } = current;

  for (const [oldClass, newClass] of plan.pairs) {
    current = toReplaced(current.text, oldClass, newClass);
    count += current.count;
  }

  return { count, text: current.text };
};

const toDeletedText = (text: string, name: string): RenameResult => {
  const pattern = new RegExp(
    `^[ \\t]*${toEscaped(name)}[ \\t]*:[^;\\n]*;?[ \\t]*\\n?`,
    "gmu"
  );

  let count = 0;

  const stripped = text.replaceAll(pattern, () => {
    count += 1;

    return "";
  });

  return { count, text: stripped };
};

export { toDeletedText, toRenamePlan, toRenamedText };

export type { RenamePlan, RenameResult };
