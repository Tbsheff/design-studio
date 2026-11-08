import { createHash } from "node:crypto";

import type {
  DocNode,
  NodeRole,
  SourcePosition,
  StructureDoc,
} from "./deps.js";

const ID_SLUG_MAX = 48;

const ID_HEX = 8;

const toDedented = (code: string, start: number, end: number): string => {
  const lineStart = code.lastIndexOf("\n", start - 1) + 1;
  const lead = /^[ \t]*/u.exec(code.slice(lineStart, start))?.[0] ?? "";

  return code
    .slice(start, end)
    .split("\n")
    .map((line, index) => {
      if (index > 0 && line.startsWith(lead)) {
        return line.slice(lead.length);
      }

      return line;
    })
    .join("\n");
};

const toTrimmed = (text: string, char: string): string => {
  let from = 0;
  let to = text.length;

  while (from < to && text.charAt(from) === char) {
    from += 1;
  }

  while (to > from && text.charAt(to - 1) === char) {
    to -= 1;
  }

  return text.slice(from, to);
};

const toPatternId = (name: string, source: string): string => {
  const slug = toTrimmed(
    name.toLowerCase().replaceAll(/[^a-z0-9]+/gu, "-"),
    "-"
  ).slice(0, ID_SLUG_MAX);

  const stem = toTrimmed(slug, "-");

  const suffix = createHash("sha256")
    .update(`${name}\u0000${source}`)
    .digest("hex")
    .slice(0, ID_HEX);

  if (stem === "") {
    return `pattern-${suffix}`;
  }

  return `${stem}-${suffix}`;
};

const toTags = (tags: readonly string[]): readonly string[] => [
  ...new Set(
    tags.flatMap((tag) => {
      const clean = tag.trim().toLowerCase();

      if (clean === "") {
        return [];
      }

      return [clean];
    })
  ),
];

const toNode = (
  doc: StructureDoc,
  loc: SourcePosition,
  role: NodeRole,
  tag: string | null
): DocNode => {
  if (tag === null) {
    return doc.node(loc, role);
  }

  return doc.node(loc, role, tag);
};

export { toDedented, toNode, toPatternId, toTags, toTrimmed };
