const FENCE = /^\s{0,3}(?<marker>```|~~~)/u;
const CONTINUES_BLOCK = /^[\s>]/u;
const LIST_ITEM = /^\s*(?<marker>[-*+]|\d+[.)])\s/u;

const toFence = (line: string, fence: string | null): string | null => {
  const marker = FENCE.exec(line)?.[1] ?? null;

  if (marker && fence === null) {
    return marker;
  }

  if (marker && marker === fence) {
    return null;
  }

  return fence;
};

const isBlockEnd = (
  lines: string[],
  index: number,
  fence: string | null
): boolean => {
  if (fence !== null || (lines[index] ?? "").trim() !== "") {
    return false;
  }

  const next =
    lines.slice(index + 1).find((candidate) => candidate.trim() !== "") ?? null;

  return next !== null && !CONTINUES_BLOCK.test(next) && !LIST_ITEM.test(next);
};

const splitMarkdownBlocks = (source: string): string[] => {
  const lines = source.split("\n");
  const blocks: string[] = [];
  let current: string[] = [];
  let fence: string | null = null;

  for (const [index, line] of lines.entries()) {
    fence = toFence(line, fence);
    current.push(line);

    if (isBlockEnd(lines, index, fence)) {
      const block = current.join("\n").trim();

      if (block) {
        blocks.push(block);
      }

      current = [];
    }
  }

  const tail = current.join("\n").trim();

  if (tail) {
    blocks.push(tail);
  }

  return blocks;
};

export { splitMarkdownBlocks };
