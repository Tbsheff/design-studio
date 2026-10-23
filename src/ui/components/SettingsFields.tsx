import type { ProjectSettings, RunLevel } from '../../shared/contracts';
import { SkillsChecklist } from './SkillsChecklist';

const MODEL_OPTIONS = [
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

interface Props {
  draft: SettingsDraft;
  onChange: (next: SettingsDraft) => void;
}

export function SettingsFields({ draft, onChange }: Props) {
  const set = (patch: Partial<SettingsDraft>) => onChange({ ...draft, ...patch });
  const known = MODEL_OPTIONS.some((m) => m.id === draft.model);
  return (
    <div className="settings-fields">
      <label className="field">
        <span>Model</span>
        <select className="select" aria-label="Model" value={draft.model} onChange={(e) => set({ model: e.target.value })}>
          {MODEL_OPTIONS.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
          {!known && <option value={draft.model}>{draft.model}</option>}
        </select>
      </label>
      <label className="field">
        <span>Spending limit per run</span>
        <input
          aria-label="Spending limit per run"
          type="number"
          min={0.01}
          max={50}
          step={0.01}
          placeholder="No limit"
          value={draft.maxBudgetUsd}
          onChange={(e) => set({ maxBudgetUsd: e.target.value })}
        />
      </label>
      <label className="field">
        <span>Max turns per run</span>
        <input
          aria-label="Max turns"
          type="number"
          min={1}
          max={200}
          step={1}
          value={draft.maxTurns}
          onChange={(e) => set({ maxTurns: e.target.value })}
        />
      </label>
      <label className="check">
        <input
          type="checkbox"
          checked={draft.allowBash}
          onChange={(e) => set({ allowBash: e.target.checked, allowInstall: e.target.checked && draft.allowInstall })}
        />
        <span>Allow agent to run shell commands</span>
      </label>
      <label className={`check ${draft.allowBash ? '' : 'disabled'}`}>
        <input
          type="checkbox"
          checked={draft.allowBash && draft.allowInstall}
          disabled={!draft.allowBash}
          onChange={(e) => set({ allowInstall: e.target.checked })}
        />
        <span>Allow installing packages</span>
      </label>
      <p className="warn-line">
        Shell commands run on this computer in the project folder. Installs download and run third-party code. Turn these on
        only for projects you trust.
      </p>
      <SkillsChecklist disabled={draft.disabledSkills} allowBash={draft.allowBash} onChange={(disabledSkills) => set({ disabledSkills })} />
    </div>
  );
}
