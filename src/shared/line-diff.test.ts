import { describe, expect, it } from 'vitest';
import { diffLines } from './line-diff';

const lines = (count: number, prefix = 'line') => Array.from({ length: count }, (_, index) => `${prefix} ${index + 1}`);

describe('diffLines', () => {
  it('shows a one-line edit as +1 −1 with the exact old and new line and 3 lines of context', () => {
    const before = lines(20).join('\n');
    const afterLines = lines(20);
    afterLines[9] = 'changed 10';
    const diff = diffLines(before, afterLines.join('\n'));
    expect(diff).toMatchObject({ added: 1, removed: 1, truncated: false });
    expect(diff.hunks).toHaveLength(1);
    const hunk = diff.hunks[0]!;
    expect(hunk.oldStart).toBe(7);
    expect(hunk.lines.filter((line) => line.kind !== 'same')).toEqual([
      { kind: 'del', text: 'line 10' },
      { kind: 'add', text: 'changed 10' },
    ]);
    expect(hunk.lines).toHaveLength(8);
  });

  it('counts a new file as all added', () => {
    expect(diffLines('', 'a\nb\n')).toMatchObject({ added: 2, removed: 0 });
  });

  it('splits far apart changes into two hunks', () => {
    const afterLines = lines(40);
    afterLines[2] = 'x';
    afterLines[35] = 'y';
    expect(diffLines(lines(40).join('\n'), afterLines.join('\n')).hunks).toHaveLength(2);
  });

  it('gives counts only when the change is too large to diff', () => {
    const diff = diffLines(lines(3000, 'a').join('\n'), lines(3000, 'b').join('\n'));
    expect(diff).toMatchObject({ added: 3000, removed: 3000, truncated: true, hunks: [] });
  });
});
