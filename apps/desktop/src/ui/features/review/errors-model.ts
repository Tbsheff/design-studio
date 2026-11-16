import { pick } from "../../platform/pick.js";
import { copy } from "./copy.js";

interface ErrorLike {
  readonly source: string;
  readonly message: string;
  readonly file?: string | null;
  readonly line?: number | null;
}

const DEV_NOISE = [
  /\bduring prerender/iu,
  /\bprerender(?:ing)?\b.*\b(?:URL|searchParams|params|headers|cookies)\b/iu,
  /should be awaited before using its properties/iu,
  /\[Fast Refresh\]/u,
  /\[HMR\]/u,
  /Download the React DevTools/iu,
  /\bnext-dev-overlay\b|\b__nextjs_original-stack-frame/u,
];

const isDevNoiseError = (entry: ErrorLike): boolean =>
  entry.source === "console" &&
  DEV_NOISE.some((pattern) => pattern.test(entry.message));

const toCountText = (count: number): string =>
  pick(count === 1, copy.oneError, `${count} ${copy.errorsSuffix}`);

const toLocationText = (entry: ErrorLike): string => {
  if (!entry.file) {
    return "";
  }

  if (entry.line) {
    return `${entry.file}:${entry.line}`;
  }

  return entry.file;
};

const toFixPrompt = (entry: ErrorLike): string => {
  const location = toLocationText(entry);
  const where = pick(Boolean(location), ` ${copy.inWord} ${location}`, "");

  const what = pick(
    entry.source === "build",
    copy.buildError,
    `${entry.source} ${copy.errorWord}`
  );

  return `${copy.fixThis} ${what}${where}:\n\n${entry.message}`;
};

export { isDevNoiseError, toCountText, toFixPrompt, toLocationText };

export type { ErrorLike };
