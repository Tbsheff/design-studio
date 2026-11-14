import { toClassTokens } from "./class-names.js";
import { toDriftId } from "./to-drift-id.js";
import { toPlace } from "./to-markup-drift.js";
import type { MarkupDrift } from "./to-markup-drift.js";

interface ScriptDriftInput {
  readonly file: string;
  readonly locAttribute: string;
  readonly rendered: readonly MarkupDrift[];
  readonly renderedHtml: string;
  readonly staticHtml: string;
}

const OPEN_TAG_PATTERN = /^<[^>]*>/u;

const CLASS_PATTERN =
  /\sclass\s*=\s*(?:"(?<double>[^"]*)"|'(?<single>[^']*)')/iu;

const SCRIPT_PATTERN = /<script\b/iu;
const SCRIPT_FILE_SUFFIX = "#script";

const toOffset = (html: string, line: number, column: number): number => {
  let start = 0;

  for (let index = 1; index < line; index += 1) {
    const next = html.indexOf("\n", start);

    if (next === -1) {
      return html.length;
    }

    start = next + 1;
  }

  return start + column - 1;
};

const toOpenTag = (html: string, drift: MarkupDrift): string => {
  const offset = toOffset(html, drift.line, drift.column);

  return OPEN_TAG_PATTERN.exec(html.slice(offset))?.[0] ?? "";
};

const isStaticTag = (openTag: string, locAttribute: string): boolean =>
  openTag === "" || openTag.includes(` ${locAttribute}=`);

const toClassText = (openTag: string): string => {
  const groups = CLASS_PATTERN.exec(openTag)?.groups;

  return groups?.double ?? groups?.single ?? "";
};

const toWindows = (tokens: readonly string[]): string[] => {
  const found: string[] = [];

  for (let size = tokens.length; size > 0; size -= 1) {
    for (let start = 0; start + size <= tokens.length; start += 1) {
      found.push(tokens.slice(start, start + size).join(" "));
    }
  }

  return found;
};

const toScriptText = (openTag: string, staticHtml: string): string | null =>
  toWindows(toClassTokens(toClassText(openTag))).find((text) =>
    staticHtml.includes(text)
  ) ?? null;

const toScriptOffset = (staticHtml: string, text: string | null): number => {
  const scriptAt = Math.max(staticHtml.search(SCRIPT_PATTERN), 0);

  if (text === null) {
    return scriptAt;
  }

  const found = staticHtml.indexOf(text, scriptAt);

  if (found === -1) {
    return Math.max(staticHtml.indexOf(text), 0);
  }

  return found;
};

const toScriptItem = (
  input: ScriptDriftInput,
  drift: MarkupDrift,
  openTag: string
): MarkupDrift => {
  const scriptText = toScriptText(openTag, input.staticHtml);
  const offset = toScriptOffset(input.staticHtml, scriptText);
  const { column, line } = toPlace(input.staticHtml, offset);

  const id = toDriftId(
    `${input.file}${SCRIPT_FILE_SUFFIX}`,
    drift.line,
    drift.column
  );

  return {
    ...drift,
    column,
    file: input.file,
    id,
    isScriptBuilt: true,
    line,
    scriptText,
  };
};

const toScriptDrift = (input: ScriptDriftInput): MarkupDrift[] =>
  input.rendered.flatMap((drift) => {
    const openTag = toOpenTag(input.renderedHtml, drift);

    if (isStaticTag(openTag, input.locAttribute)) {
      return [];
    }

    return [toScriptItem(input, drift, openTag)];
  });

export { toScriptDrift };

export type { ScriptDriftInput };
