import { existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

export interface TasteRule {
  kind: 'prefer' | 'avoid';
  area: string;
  rule: string;
}

const ACTIVE_GLOBAL = `SELECT p.data FROM preferences p LEFT JOIN retired r ON r.preference_id = p.id
  WHERE r.preference_id IS NULL AND p.scope = 'global' ORDER BY p.created_at, p.id`;

export function tasteHome(env: NodeJS.ProcessEnv = process.env): string {
  const raw = env.DESIGN_MEMORY_HOME ?? '~/.design-memory';
  if (raw === '~') return os.homedir();
  return raw.startsWith('~/') ? path.join(os.homedir(), raw.slice(2)) : path.resolve(raw);
}

function toRule(data: string): TasteRule | null {
  const parsed = JSON.parse(data) as Partial<TasteRule>;
  const rule = typeof parsed.rule === 'string' ? parsed.rule.trim() : '';
  if (!rule || (parsed.kind !== 'prefer' && parsed.kind !== 'avoid')) return null;
  return { kind: parsed.kind, area: typeof parsed.area === 'string' && parsed.area ? parsed.area : 'general', rule };
}

export function loadTasteRules(home: string = tasteHome()): TasteRule[] {
  if (process.env.STUDIO_TASTE === '0') return [];
  const file = path.join(home, 'library.sqlite3');
  if (!existsSync(file)) return [];
  let db: DatabaseSync | null = null;
  try {
    db = new DatabaseSync(file, { readOnly: true });
    const rows = db.prepare(ACTIVE_GLOBAL).all() as Array<{ data: string }>;
    return rows.map((row) => toRule(row.data)).filter((rule): rule is TasteRule => rule !== null);
  } catch (error) {
    console.warn(`[agent] taste library not loaded: ${error instanceof Error ? error.message : String(error)}`);
    return [];
  } finally {
    db?.close();
  }
}
