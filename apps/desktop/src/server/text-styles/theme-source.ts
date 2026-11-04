import { blocksOf, varsOf } from "./css-vars.js";
import type { TextStyle, TextStyleProp, TextStyleVars } from "./deps.js";
import { cssFiles } from "./files.js";
import type { SourceFile } from "./files.js";
import { makeStyle } from "./style.js";

const TEXT_VAR = /^--text-(?<key>[a-z0-9]+(?:-[a-z0-9]+)*)$/u;
const FONT_VAR = /^--font-(?<key>[a-z0-9]+(?:-[a-z0-9]+)*)$/u;
const WEIGHT_PREFIX = "--font-weight-";

const PAIRS: [TextStyleProp, string][] = [
  ["lineHeight", "--line-height"],
  ["weight", "--font-weight"],
  ["letterSpacing", "--letter-spacing"],
];

const sizeStyle = (
  source: SourceFile,
  vars: Map<string, string>,
  key: string
): TextStyle => {
  const sizeVar = `--text-${key}`;

  const sizeValues: Partial<Record<TextStyleProp, string>> = {
    size: vars.get(sizeVar) ?? "",
  };

  const names: TextStyleVars = { size: sizeVar };

  for (const [prop, suffix] of PAIRS) {
    const name = `${sizeVar}${suffix}`;
    const value = vars.get(name);

    if (value) {
      sizeValues[prop] = value;
      names[prop] = name;
    }
  }

  return makeStyle({
    file: source.relative,
    name: key,
    source: "tailwind-theme",
    values: sizeValues,
    vars: names,
  });
};

const familyStyle = (
  source: SourceFile,
  vars: Map<string, string>,
  key: string
): TextStyle =>
  makeStyle({
    file: source.relative,
    name: `font-${key}`,
    source: "tailwind-theme",
    values: { family: vars.get(`--font-${key}`) ?? "" },
    vars: { family: `--font-${key}` },
  });

const styleOfVar = (
  source: SourceFile,
  vars: Map<string, string>,
  name: string
): TextStyle | null => {
  const size = TEXT_VAR.exec(name)?.groups?.["key"];

  if (size) {
    return sizeStyle(source, vars, size);
  }

  const font = FONT_VAR.exec(name)?.groups?.["key"];

  if (font && !name.startsWith(WEIGHT_PREFIX)) {
    return familyStyle(source, vars, font);
  }

  return null;
};

const fileStyles = (source: SourceFile): TextStyle[] => {
  const vars = varsOf(blocksOf(source.text, "theme"));
  const styles: TextStyle[] = [];

  for (const name of vars.keys()) {
    const style = styleOfVar(source, vars, name);

    if (style) {
      styles.push(style);
    }
  }

  return styles;
};

const themeStyles = async (workTree: string): Promise<TextStyle[]> => {
  const files = await cssFiles(workTree);

  return files.flatMap((file) => fileStyles(file));
};

export { themeStyles };
