const FENCE = /^\s{0,3}(```|~~~)/;

export function splitMarkdownBlocks(source: string): string[] {
  const lines = source.split('\n');
  const blocks: string[] = [];
  let current: string[] = [];
  let fence: string | null = null;
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? '';
    const marker = FENCE.exec(line)?.[1] ?? null;
    if (marker && (fence === null || marker === fence)) fence = fence === null ? marker : null;
    current.push(line);
    if (fence !== null || line.trim() !== '') continue;
    const next = lines.slice(index + 1).find((candidate) => candidate.trim() !== '');
    if (next === undefined || /^[\s>]/.test(next) || /^\s*([-*+]|\d+[.)])\s/.test(next)) continue;
    const block = current.join('\n').trim();
    if (block) blocks.push(block);
    current = [];
  }
  const tail = current.join('\n').trim();
  if (tail) blocks.push(tail);
  return blocks;
}
