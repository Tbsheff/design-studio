import type { RunLevel } from '../../shared/contracts';
import { LEVEL_PRESETS } from '../../shared/run-levels';
import type { ComposerMode } from '../components/RunSettings';
import { collectCommands, type Command } from './registry';

const MODE_ORDER: ComposerMode[] = ['edit', 'plan', 'critique'];
const MODE_TITLES: Record<ComposerMode, string> = { edit: 'Edit mode: the agent changes files', plan: 'Plan mode: the agent writes a plan first', critique: 'Critique mode: the agent reviews only' };

export function nextMode(mode: ComposerMode, step: 1 | -1 = 1): ComposerMode {
  const at = MODE_ORDER.indexOf(mode);
  return MODE_ORDER[(at + step + MODE_ORDER.length) % MODE_ORDER.length] ?? 'edit';
}

export function isModeCycleKey(event: { key: string; shiftKey: boolean; metaKey: boolean; ctrlKey: boolean; altKey: boolean }): boolean {
  return event.key === 'Tab' && event.shiftKey && !event.metaKey && !event.ctrlKey && !event.altKey;
}

export interface ComposerActions {
  mode: ComposerMode;
  setMode: (mode: ComposerMode) => void;
  level: RunLevel;
  setLevel: (level: RunLevel) => void;
  variations: { count: number; max: number; onCount: (count: number) => void } | undefined;
  focus: () => void;
}

export function composerCommands(a: ComposerActions): Command[] {
  const modes = MODE_ORDER.map((mode) => ({
    id: `composer.mode-${mode}`,
    title: MODE_TITLES[mode],
    group: 'Run',
    icon: 'chat' as const,
    slash: mode,
    keywords: 'mode composer',
    run: () => {
      a.setMode(mode);
      a.focus();
    },
    ...(a.mode === mode ? { disabled: 'Already on' } : {}),
  }));
  const levels = (Object.keys(LEVEL_PRESETS) as RunLevel[]).map((level) => ({
    id: `composer.level-${level}`,
    title: `Level: ${LEVEL_PRESETS[level].label}`,
    group: 'Run',
    icon: 'sliders' as const,
    slash: `level ${level}`,
    keywords: 'quality speed cost',
    run: () => {
      a.setLevel(level);
      a.focus();
    },
    ...(a.level === level ? { disabled: 'Already on' } : {}),
  }));
  const v = a.variations;
  const variations: Command[] = v
    ? [
        {
          id: 'composer.variations',
          title: `Make ${Math.min(3, v.max)} variations of the next prompt`,
          group: 'Run',
          icon: 'compare',
          slash: 'variations',
          keywords: 'directions options alternatives',
          run: () => {
            v.onCount(Math.min(3, v.max));
            a.focus();
          },
        },
      ]
    : [];
  return [...modes, ...levels, ...variations];
}

const SLASH_OF: Record<string, string> = {
  'version.export': 'export',
  'project.settings': 'model',
  'run.polish': 'polish',
  'edit.undo': 'undo',
  'panel.versions': 'versions',
  'panel.comments': 'comments',
  'project.design-md': 'design-md',
};

export function slashCommands(): Command[] {
  return collectCommands()
    .map((c) => (c.slash || !SLASH_OF[c.id] ? c : { ...c, slash: SLASH_OF[c.id] }))
    .filter((c) => c.slash);
}
