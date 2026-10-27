import { useLayoutEffect, type KeyboardEvent, type RefObject } from 'react';
import type { RunLevel } from '../../shared/contracts';
import { SlashMenu, useSlashMenu } from './SlashMenu';
import { levelGroup, modelGroup } from './slashGroups';

const INPUT_ATTRS = ['aria-controls', 'aria-autocomplete', 'aria-activedescendant'] as const;

interface Props {
  prompt: string;
  setPrompt: (value: string) => void;
  level: RunLevel;
  onLevel: (level: RunLevel) => void;
  model: string;
  onModel: (model: string) => void;
  keys: { current: ((event: KeyboardEvent<HTMLElement>) => boolean) | null };
  home: RefObject<HTMLElement | null>;
}

export function HomeSlashMenu({ prompt, setPrompt, level, onLevel, model, onModel, keys, home }: Props) {
  const slash = useSlashMenu({ draft: prompt, setDraft: setPrompt, groups: [levelGroup(level, onLevel), modelGroup(model, null, onModel)], label: 'Settings' });
  keys.current = slash.onKeyDown;
  const input = () => home.current?.querySelector<HTMLElement>('[aria-label="Describe the design"]') ?? null;
  const attrs: Record<string, string | undefined> = slash.inputProps;
  useLayoutEffect(() => {
    const area = input();
    if (!area) return;
    for (const name of INPUT_ATTRS) {
      const value = attrs[name];
      if (value) area.setAttribute(name, value);
      else area.removeAttribute(name);
    }
  });
  if (!slash.open) return null;
  return <SlashMenu view={slash.view} anchor={() => home.current?.querySelector<HTMLElement>('.home-composer') ?? null} input={input} onClose={slash.close} />;
}
