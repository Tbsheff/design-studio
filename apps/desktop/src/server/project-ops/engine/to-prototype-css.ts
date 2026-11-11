type PrototypeCssScope = "theme" | "root" | "dark";

interface PrototypeCssDeclaration {
  readonly name: string;
  readonly scope: PrototypeCssScope;
  readonly value: string;
}

interface PrototypeFonts {
  readonly googleFontsUrl: string | null;
  readonly mono: string | null;
  readonly sans: string | null;
}

interface PrototypeCssSource {
  readonly appName: string;
  readonly declarations: readonly PrototypeCssDeclaration[];
  readonly file: string | null;
  readonly fonts: PrototypeFonts;
}

const UNSAFE_VALUE = /[;{}<>]|\/\*|\*\//u;
const VAR_REFERENCE = /var\(\s*(?<name>--[A-Za-z0-9_-]+)/gu;
const FONT_VARIABLE = /^--font-/u;
const MONO_NAME = /mono|code/iu;
const FIRST_PRINTABLE = 32;
const DELETE_CODE = 127;
const DARK_SELECTOR = '.dark, [data-theme="dark"]';
const SYSTEM_SANS = "ui-sans-serif, system-ui, sans-serif";
const SYSTEM_MONO = "ui-monospace, monospace";
const SAFE_URL = /^https:\/\/fonts\.googleapis\.com\/[^\s"'()<>]+$/u;

const hasControlChar = (value: string): boolean =>
  [...value].some((char) => {
    const code = char.codePointAt(0) ?? 0;

    return code < FIRST_PRINTABLE || code === DELETE_CODE;
  });

const isSafeDeclaration = (declaration: PrototypeCssDeclaration): boolean =>
  declaration.value.trim() !== "" &&
  !UNSAFE_VALUE.test(declaration.value) &&
  !hasControlChar(declaration.value.trim());

const toLine = (declaration: PrototypeCssDeclaration): string =>
  `  ${declaration.name}: ${declaration.value.trim()};`;

const toLastByName = (
  declarations: readonly PrototypeCssDeclaration[]
): PrototypeCssDeclaration[] => {
  const byName = new Map<string, PrototypeCssDeclaration>();

  for (const declaration of declarations) {
    byName.delete(declaration.name);
    byName.set(declaration.name, declaration);
  }

  return [...byName.values()];
};

const toFontStack = (name: string, fonts: PrototypeFonts): string => {
  if (MONO_NAME.test(name)) {
    return fonts.mono ?? SYSTEM_MONO;
  }

  return fonts.sans ?? SYSTEM_SANS;
};

const toMissingFontLines = (
  declarations: readonly PrototypeCssDeclaration[],
  fonts: PrototypeFonts
): string[] => {
  const declared = new Set(declarations.map((entry) => entry.name));
  const missing = new Set<string>();

  for (const declaration of declarations) {
    for (const match of declaration.value.matchAll(VAR_REFERENCE)) {
      const name = match.groups?.["name"] ?? "";

      if (FONT_VARIABLE.test(name) && !declared.has(name)) {
        missing.add(name);
      }
    }
  }

  return [...missing].map((name) => `  ${name}: ${toFontStack(name, fonts)};`);
};

const toBlock = (selector: string, lines: readonly string[]): string[] => {
  if (lines.length === 0) {
    return [];
  }

  return [`${selector} {`, ...lines, "}", ""];
};

const toImportLines = (fonts: PrototypeFonts): string[] => {
  if (fonts.googleFontsUrl === null || !SAFE_URL.test(fonts.googleFontsUrl)) {
    return [];
  }

  return [`@import url("${fonts.googleFontsUrl}");`, ""];
};

const toBodyLines = (
  declared: ReadonlySet<string>,
  fonts: PrototypeFonts
): string[] => {
  const lines: string[] = [];
  let family = fonts.sans ?? SYSTEM_SANS;

  if (declared.has("--font-sans")) {
    family = `var(--font-sans, ${family})`;
  }

  lines.push(`  font-family: ${family};`);

  if (declared.has("--background")) {
    lines.push("  background-color: var(--background);");
  }

  if (declared.has("--foreground")) {
    lines.push("  color: var(--foreground);");
  }

  return lines;
};

const toHeaderLines = (source: PrototypeCssSource): string[] => {
  const from = source.file ?? "no token file found";

  return [
    `/* Design tokens of ${source.appName.replaceAll("*/", "")} (${from.replaceAll("*/", "")}). Design Studio writes this file. */`,
    "",
  ];
};

const toPrototypeCss = (source: PrototypeCssSource): string => {
  const safe = source.declarations.filter((entry) => isSafeDeclaration(entry));
  const light = toLastByName(safe.filter((entry) => entry.scope !== "dark"));
  const dark = toLastByName(safe.filter((entry) => entry.scope === "dark"));
  const declared = new Set(safe.map((entry) => entry.name));

  const rootLines = [
    ...toMissingFontLines(safe, source.fonts),
    ...light.map((entry) => toLine(entry)),
  ];

  return [
    ...toImportLines(source.fonts),
    ...toHeaderLines(source),
    ...toBlock(":root", rootLines),
    ...toBlock(
      DARK_SELECTOR,
      dark.map((entry) => toLine(entry))
    ),
    ...toBlock("body", toBodyLines(declared, source.fonts)),
  ].join("\n");
};

export { toPrototypeCss };

export type { PrototypeCssDeclaration, PrototypeCssSource, PrototypeFonts };
