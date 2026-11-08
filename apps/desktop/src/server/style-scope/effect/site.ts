import { readFile } from "node:fs/promises";

import { resolveSource } from "./deps.js";
import { toEffectTokens, toOpeningTag } from "./engine/index.js";
import type { TagLoc } from "./engine/index.js";

interface EffectSite {
  readonly code: string;
  readonly file: string;
  readonly isHtml: boolean;
  readonly relative: string;
  readonly tag: string;
  readonly tokens: readonly string[];
}

const HTML_PATTERN = /\.html?$/iu;

const getEffectSite = async (
  workTree: string,
  loc: TagLoc & { readonly file: string }
): Promise<EffectSite> => {
  const resolved = await resolveSource(workTree, loc.file);
  const content = await readFile(resolved.file, "utf-8");
  const opening = toOpeningTag(content, loc);

  return {
    code: content,
    file: resolved.file,
    isHtml: HTML_PATTERN.test(resolved.relative),
    relative: resolved.relative,
    tag: opening,
    tokens: toEffectTokens(opening),
  };
};

export { getEffectSite };

export type { EffectSite };
