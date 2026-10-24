import { describe, expect, it } from 'vitest';
import type { ToolRow } from '../runState';
import { fileChanges, groupRepeats } from './ToolChips';

const row = (id: string, name: string, input: unknown, extra: Partial<ToolRow> = {}): ToolRow => ({ toolUseId: id, name, input, startedAt: 0, durationMs: 5, isError: false, summary: '', ...extra });

describe('tool rows', () => {
  it('groups 3 reads of the same file into one row Read x3', () => {
    const groups = groupRepeats([row('1', 'Read', { file_path: '/w/index.html' }), row('2', 'Read', { file_path: '/w/index.html' }), row('3', 'Read', { file_path: '/w/index.html' }), row('4', 'Read', { file_path: '/w/app.css' })], '/w');
    expect(groups.map((group) => [group.tool.name, group.count, group.durationMs])).toEqual([
      ['Read', 3, 15],
      ['Read', 1, 5],
    ]);
  });

  it('does not group errors, running tools or writes with diffs', () => {
    const diff = { path: 'a', added: 1, removed: 0, hunks: [], created: false, truncated: false };
    const groups = groupRepeats([row('1', 'Read', { file_path: 'a' }), row('2', 'Read', { file_path: 'a' }, { isError: true }), row('3', 'Edit', { file_path: 'a' }, { diff }), row('4', 'Edit', { file_path: 'a' }, { diff })], null);
    expect(groups).toHaveLength(4);
    expect(fileChanges(groups.map((group) => group.tool))).toEqual([{ path: 'a', added: 2, removed: 0 }]);
  });
});
