import { useCallback, useEffect, useState } from 'react';
import type { SkillCatalog, SkillInfo } from '../shared/contracts';
import { api, errorText } from './api';

let request: Promise<SkillCatalog> | null = null;
let lastCatalog: SkillCatalog | null = null;

function fetchSkillCatalog(fresh = false): Promise<SkillCatalog> {
  if (fresh || !request) {
    request = api.listSkills().then(
      (catalog) => {
        lastCatalog = catalog;
        return catalog;
      },
      (error: unknown) => {
        request = null;
        throw error;
      },
    );
  }
  return request;
}

export function useSkillCatalog(): { catalog: SkillCatalog | null; error: string | null; reload: () => void } {
  const [catalog, setCatalog] = useState<SkillCatalog | null>(() => lastCatalog);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback((fresh: boolean) => {
    let live = true;
    fetchSkillCatalog(fresh).then(
      (result) => {
        if (!live) return;
        setCatalog(result);
        setError(null);
      },
      (err: unknown) => live && setError(errorText(err)),
    );
    return () => {
      live = false;
    };
  }, []);
  useEffect(() => load(false), [load]);
  return { catalog, error, reload: () => void load(true) };
}

export function skillDisplayName(id: string): string {
  return id.startsWith('personal:') ? id.slice('personal:'.length) : id;
}

export function originText(origin: SkillInfo['origin']): string {
  return origin === 'personal' ? 'personal' : origin.slice('plugin:'.length);
}

export function enabledSkills(catalog: SkillCatalog | null, disabled: readonly string[]): SkillInfo[] {
  return (catalog?.skills ?? []).filter((skill) => !disabled.includes(skill.id));
}

export function skillInstruction(ids: readonly string[]): string {
  return ids.map((id) => `Use the ${id} skill.`).join('\n');
}

export function skillsFromPrompt(prompt: string): string[] {
  return [...prompt.matchAll(/^Use the (\S+:\S+) skill\.$/gm)].map((match) => match[1] ?? '');
}

export function withoutSkillLines(prompt: string): string {
  return prompt.replace(/^Use the \S+:\S+ skill\.$/gm, '').trim();
}

export function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? '' : 's'}`;
}

export const NO_SKILLS_TEXT = 'No skills found. Add a folder with a SKILL.md to ~/.claude/skills, or enable a Claude Code plugin that has skills.';
