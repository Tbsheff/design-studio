export interface Splice {
  start: number;
  end: number;
  text: string;
}

export function applySplices(source: string, splices: Splice[]): string {
  const ordered = [...splices].sort((a, b) => b.start - a.start);
  let output = source;
  for (const splice of ordered) {
    output = output.slice(0, splice.start) + splice.text + output.slice(splice.end);
  }
  return output;
}

export function leadingWhitespaceStart(source: string, offset: number): number {
  let start = offset;
  while (start > 0 && /\s/.test(source[start - 1] ?? '')) start -= 1;
  return start;
}
