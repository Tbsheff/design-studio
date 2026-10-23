import { mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { afterEach, describe, expect, it } from 'vitest';
import type { Project } from '../../shared/contracts.js';
import { buildSystemPrompt, buildTasteBlock } from './prompt.js';
import { loadTasteRules, tasteHome } from './taste.js';

const dirs: string[] = [];

function library(rows: Array<{ id: string; scope: string; data: unknown; retired?: boolean }>): string {
  const home = mkdtempSync(path.join(os.tmpdir(), 'taste-'));
  dirs.push(home);
  const db = new DatabaseSync(path.join(home, 'library.sqlite3'));
  db.exec(`CREATE TABLE preferences (id TEXT PRIMARY KEY, created_at TEXT NOT NULL, scope TEXT NOT NULL, project TEXT, data TEXT NOT NULL);
    CREATE TABLE retired (preference_id TEXT PRIMARY KEY, data TEXT NOT NULL);`);
  rows.forEach((row, index) => {
    const data = typeof row.data === 'string' ? row.data : JSON.stringify(row.data);
    db.prepare('INSERT INTO preferences VALUES (?,?,?,?,?)').run(row.id, `2026-10-0${index + 1}`, row.scope, null, data);
    if (row.retired) db.prepare('INSERT INTO retired VALUES (?,?)').run(row.id, '{}');
  });
  db.close();
  return home;
}

afterEach(() => {
  delete process.env.STUDIO_TASTE;
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe('loadTasteRules', () => {
  it('returns active global rules only, without statements or ids', () => {
    const home = library([
      { id: 'a', scope: 'global', data: { kind: 'prefer', area: 'layout', rule: 'Group with space', statement: 'private quote' } },
      { id: 'b', scope: 'global', data: { kind: 'avoid', area: 'surfaces', rule: 'Heavy borders' }, retired: true },
      { id: 'c', scope: 'project', data: { kind: 'prefer', area: 'type', rule: 'Project only' } },
      { id: 'd', scope: 'global', data: { kind: 'avoid', rule: 'Bounce easing' } },
      { id: 'e', scope: 'global', data: { kind: 'maybe', rule: 'Ignored' } },
    ]);
    expect(loadTasteRules(home)).toEqual([
      { kind: 'prefer', area: 'layout', rule: 'Group with space' },
      { kind: 'avoid', area: 'general', rule: 'Bounce easing' },
    ]);
  });

  it('returns nothing when the library is missing, broken, or turned off', () => {
    expect(loadTasteRules(path.join(os.tmpdir(), 'no-such-taste-home'))).toEqual([]);
    expect(loadTasteRules(library([{ id: 'x', scope: 'global', data: '{not json' }]))).toEqual([]);
    process.env.STUDIO_TASTE = '0';
    expect(loadTasteRules(library([{ id: 'y', scope: 'global', data: { kind: 'prefer', rule: 'R' } }]))).toEqual([]);
  });

  it('resolves the home from DESIGN_MEMORY_HOME', () => {
    expect(tasteHome({ DESIGN_MEMORY_HOME: '~/x' })).toBe(path.join(os.homedir(), 'x'));
    expect(tasteHome({})).toBe(path.join(os.homedir(), '.design-memory'));
  });
});

describe('taste prompt block', () => {
  const project = { kind: 'html', entry: 'index.html', settings: { allowBash: false, allowInstall: false } } as unknown as Project;
  const rules = [{ kind: 'prefer' as const, area: 'layout', rule: 'Group with space' }];

  it('adds the block in edit and critique, and leaves it out with no rules', () => {
    const edit = buildSystemPrompt(project, 'edit', null, 0, rules);
    expect(edit).toContain('<taste>\n- Prefer (layout): Group with space\n</taste>');
    expect(buildSystemPrompt(project, 'critique', null, 0, rules)).toContain('In a critique, name each place');
    expect(buildSystemPrompt(project, 'edit')).not.toContain('<taste>');
    expect(buildTasteBlock(rules, 'edit')).not.toContain('In a critique');
  });
});
