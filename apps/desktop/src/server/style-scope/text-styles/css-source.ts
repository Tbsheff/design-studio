import { blocksOf, varsOf } from "./css-vars.js";
import type { TextStyle, TextStyleProp, TextStyleVars } from "./deps.js";
import { cssFiles } from "./files.js";
import type { SourceFile } from "./files.js";
import { hasText, makeStyle } from "./style.js";

const PATTERNS: [RegExp, TextStyleProp][] = [
  [/^--(?:font-size|text-size|fs)-(?<key>[\w-]+)$/u, "size"],
  [/^--text-(?<key>[\w-]+)-size$/u, "size"],
  [/^--(?<key>[\w-]+)-font-size$/u, "size"],
  [/^--(?:line-height|leading|lh)-(?<key>[\w-]+)$/u, "lineHeight"],
  [/^--(?<key>[\w-]+)-line-height$/u, "lineHeight"],
  [/^--(?:font-weight|fw)-(?<key>[\w-]+)$/u, "weight"],
  [/^--(?<key>[\w-]+)-font-weight$/u, "weight"],
  [/^--(?:letter-spacing|tracking)-(?<key>[\w-]+)$/u, "letterSpacing"],
  [/^--(?<key>[\w-]+)-letter-spacing$/u, "letterSpacing"],
  [/^--(?<key>[\w-]+)-font-family$/u, "family"],
  [/^--font-family-(?<key>[\w-]+)$/u, "family"],
];

interface Group {
  values: Partial<Record<TextStyleProp, string>>;
  vars: TextStyleVars;
}

const toMatchVar = (name: string): [string, TextStyleProp] | null => {
  for (const [pattern, prop] of PATTERNS) {
    const key = pattern.exec(name)?.groups?.["key"];

    if (key) {
      return [key, prop];
    }
  }

  return null;
};

const toAddToGroup = (
  groups: Map<string, Group>,
  hit: [string, TextStyleProp],
  name: string,
  value: string
): void => {
  const [key, prop] = hit;
  const group = groups.get(key) ?? { values: {}, vars: {} };

  group.values[prop] ??= value;
  group.vars[prop] ??= name;
  groups.set(key, group);
};

const toGroupVars = (vars: Map<string, string>): Map<string, Group> => {
  const groups = new Map<string, Group>();

  for (const [name, value] of vars) {
    const hit = toMatchVar(name);

    if (hit) {
      toAddToGroup(groups, hit, name, value);
    }
  }

  return groups;
};

const toFileStyles = (source: SourceFile): TextStyle[] => {
  const groups = toGroupVars(varsOf(blocksOf(source.text, "root")));
  const styles: TextStyle[] = [];

  for (const [key, group] of groups) {
    const style = makeStyle({
      file: source.relative,
      name: key,
      source: "css-var",
      values: group.values,
      vars: group.vars,
    });

    if (hasText(style)) {
      styles.push(style);
    }
  }

  return styles;
};

const toCssVarStyles = async (workTree: string): Promise<TextStyle[]> => {
  const files = await cssFiles(workTree);

  return files.flatMap((file) => toFileStyles(file));
};

export { toCssVarStyles as cssVarStyles };
