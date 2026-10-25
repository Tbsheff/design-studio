import { randomBytes } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { RULE_MAX_CHARS } from '../../shared/permissionRules.js';
import { createKeyedMutex } from './mutex.js';

export const COMMAND_RULES_MAX = 200;

export interface CommandRuleStore {
  list(projectId: string): Promise<string[]>;
  add(projectId: string, rule: string): Promise<string[]>;
  remove(projectId: string, rule: string): Promise<string[]>;
}

const lock = createKeyedMutex();

export function createCommandRuleStore(projectDir: (projectId: string) => string): CommandRuleStore {
  const fileOf = (projectId: string): string => path.join(projectDir(projectId), 'command-rules.json');

  const read = async (file: string): Promise<string[]> => {
    if (!existsSync(file)) return [];
    try {
      const parsed: unknown = JSON.parse(await readFile(file, 'utf8'));
      const rules = (parsed as { rules?: unknown } | null)?.rules;
      return Array.isArray(rules) ? rules.filter((rule): rule is string => typeof rule === 'string') : [];
    } catch (error) {
      console.error('[command-rules] unreadable file', file, error);
      return [];
    }
  };

  const write = async (file: string, rules: string[]): Promise<void> => {
    await mkdir(path.dirname(file), { recursive: true });
    const temp = `${file}.${randomBytes(4).toString('hex')}.tmp`;
    await writeFile(temp, JSON.stringify({ rules }, null, 2));
    await rename(temp, file);
  };

  const mutate = (projectId: string, change: (rules: string[]) => string[]): Promise<string[]> => {
    const file = fileOf(projectId);
    return lock(file, async () => {
      const before = await read(file);
      const after = change(before);
      if (after !== before) await write(file, after);
      return after;
    });
  };

  return {
    list: (projectId) => read(fileOf(projectId)),
    add: (projectId, rule) =>
      mutate(projectId, (rules) => {
        if (!rule || rule.length > RULE_MAX_CHARS || rules.includes(rule)) return rules;
        return [...rules, rule].slice(-COMMAND_RULES_MAX);
      }),
    remove: (projectId, rule) => mutate(projectId, (rules) => (rules.includes(rule) ? rules.filter((item) => item !== rule) : rules)),
  };
}
