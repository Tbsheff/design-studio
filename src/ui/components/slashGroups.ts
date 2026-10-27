import { RUN_EFFORTS, RUN_LEVELS, type RunEffort, type RunLevel } from '../../shared/contracts';
import { LEVEL_PRESETS } from '../../shared/run-levels';
import { MODEL_OPTIONS, modelLabel } from '../settingsDraft';
import { levelGist, levelHint, levelLabel } from './LevelControl';
import type { SlashGroup } from './SlashMenu';

export function effectiveModel(model: string, level: RunLevel): string {
  const preset = LEVEL_PRESETS[level].model;
  return preset === 'project' ? model : preset;
}

export function shortModel(id: string): string {
  return modelLabel(id).replace(/^Claude /, '');
}

const MODEL_HINT: Record<string, string> = {
  'claude-haiku-5-5': 'Fast and cheap',
  'claude-sonnet-5-5': 'Balanced',
  'claude-opus-5-5': 'Most capable',
};

const EFFORT_SHORT: Record<RunEffort | 'auto', string> = { auto: 'Model decides', low: 'Fastest', medium: 'Balanced', high: 'Thinks longest' };
const EFFORT_NAME: Record<RunEffort | 'auto', string> = { auto: 'Auto', low: 'Low', medium: 'Medium', high: 'High' };

export function levelGroup(level: RunLevel, onLevel: (level: RunLevel) => void): SlashGroup {
  return {
    id: 'level',
    label: 'Level',
    icon: 'layers',
    value: levelLabel(level),
    choices: RUN_LEVELS.map((item) => ({ id: item, label: levelLabel(item), icon: 'layers', hint: levelGist(item).hint, meta: levelGist(item).cost, tip: levelHint(item), checked: item === level, pick: () => onLevel(item) })),
  };
}

export function modelGroup(model: string, level: RunLevel | null, onModel: (model: string) => void): SlashGroup {
  const shown = level ? effectiveModel(model, level) : model;
  const locked = shown !== model;
  const reason = locked && level ? `${levelLabel(level)} runs always use ${shortModel(shown)}` : null;
  return {
    id: 'model',
    label: 'Model',
    icon: 'sparkle',
    value: shortModel(shown),
    choices: MODEL_OPTIONS.map((option) => ({ id: option.id, label: shortModel(option.id), icon: 'sparkle', hint: MODEL_HINT[option.id], checked: option.id === shown, disabledReason: reason, pick: () => onModel(option.id) })),
  };
}

export function effortGroup(effort: RunEffort | null, onEffort: (effort: RunEffort | null) => void): SlashGroup {
  const choices = ['auto' as const, ...RUN_EFFORTS];
  const now = effort ?? 'auto';
  return {
    id: 'effort',
    label: 'Effort',
    icon: 'sliders',
    value: EFFORT_NAME[now],
    choices: choices.map((item) => ({ id: item, label: EFFORT_NAME[item], icon: 'sliders', hint: EFFORT_SHORT[item], checked: item === now, pick: () => onEffort(item === 'auto' ? null : item) })),
  };
}
