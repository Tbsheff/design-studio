import type { ProjectSettings, RunLevel } from '../shared/contracts';

export const MODEL_OPTIONS = [
  { id: 'claude-haiku-5-5', label: 'Claude Haiku 5.5' },
  { id: 'claude-sonnet-5-5', label: 'Claude Sonnet 5.5' },
  { id: 'claude-opus-5-5', label: 'Claude Opus 5.5' },
];

export interface SettingsDraft {
  model: string;
  maxBudgetUsd: string;
  maxTurns: string;
  allowBash: boolean;
  allowInstall: boolean;
  disabledSkills: string[];
  defaultLevel: RunLevel;
}

export function toDraft(settings: ProjectSettings): SettingsDraft {
  return {
    model: settings.model,
    maxBudgetUsd: settings.maxBudgetUsd === null ? '' : String(settings.maxBudgetUsd),
    maxTurns: String(settings.maxTurns),
    allowBash: settings.allowBash,
    allowInstall: settings.allowInstall,
    disabledSkills: [...(settings.disabledSkills ?? [])],
    defaultLevel: settings.defaultLevel ?? 'prototype',
  };
}

export function parseDraft(draft: SettingsDraft): { settings: ProjectSettings } | { error: string } {
  const rawBudget = draft.maxBudgetUsd.trim();
  const budget = rawBudget === '' ? null : Number(rawBudget);
  if (budget !== null && (!Number.isFinite(budget) || budget < 0.01 || budget > 50)) return { error: 'Enter a spending limit per run from $0.01 to $50, or leave it empty for no limit.' };
  const turns = Number(draft.maxTurns);
  if (!Number.isInteger(turns) || turns < 1 || turns > 200) return { error: 'Enter a whole number of max turns from 1 to 200.' };
  return {
    settings: {
      model: draft.model,
      maxBudgetUsd: budget,
      maxTurns: turns,
      allowBash: draft.allowBash,
      allowInstall: draft.allowBash && draft.allowInstall,
      disabledSkills: [...draft.disabledSkills],
      defaultLevel: draft.defaultLevel,
    },
  };
}

export function modelLabel(id: string): string {
  return MODEL_OPTIONS.find((m) => m.id === id)?.label ?? id;
}
