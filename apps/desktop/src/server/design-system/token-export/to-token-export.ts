import { toCss } from "./engine/to-css.js";
import { toDtcg } from "./engine/to-dtcg.js";
import { toFigma } from "./engine/to-figma.js";
import { toTailwind } from "./engine/to-tailwind.js";
import { toPortableTokens } from "./engine/token-model.js";
import type {
  ExportModes,
  FormatOutput,
  PortableToken,
  SkippedToken,
} from "./engine/token-model.js";
import { toViewTokens } from "./read-view-tokens.js";

type ExportFormat = "css" | "dtcg" | "figma" | "tailwind";

interface TokenExportOptions {
  readonly format: ExportFormat;
  readonly groups: readonly string[] | null;
  readonly modes: ExportModes;
}

interface TokenExportResult {
  readonly aliasCount: number;
  readonly fileName: string;
  readonly format: ExportFormat;
  readonly skipped: readonly SkippedToken[];
  readonly text: string;
  readonly tokenCount: number;
}

const FILE_NAMES: Readonly<Record<ExportFormat, string>> = {
  css: "tokens.css",
  dtcg: "tokens.json",
  figma: "figma-variables.json",
  tailwind: "theme.css",
};

const toFormatOutput = (
  tokens: readonly PortableToken[],
  options: TokenExportOptions
): FormatOutput => {
  if (options.format === "dtcg") {
    return toDtcg(tokens);
  }

  if (options.format === "figma") {
    return toFigma(tokens, options.modes);
  }

  if (options.format === "tailwind") {
    return toTailwind(tokens);
  }

  return toCss(tokens);
};

const toTokenExport = (
  entries: readonly unknown[],
  options: TokenExportOptions
): TokenExportResult => {
  const portable = toPortableTokens(toViewTokens(entries), options);
  const output = toFormatOutput(portable, options);

  return {
    ...output,
    fileName: FILE_NAMES[options.format],
    format: options.format,
  };
};

export { toTokenExport };

export type { ExportFormat, TokenExportOptions, TokenExportResult };
