import type { RunLevel } from "@design-studio/contracts";
import { useLayoutEffect } from "react";
import type {
  KeyboardEvent,
  MutableRefObject,
  ReactElement,
  RefObject,
} from "react";

import { levelGroup, modelGroup } from "../chat/slash-groups.js";
import { SlashMenu, useSlashMenu } from "../chat/slash-menu.js";

const INPUT_ATTRS = [
  "aria-controls",
  "aria-autocomplete",
  "aria-activedescendant",
] as const;

interface Props {
  readonly prompt: string;
  readonly setPrompt: (value: string) => void;
  readonly level: RunLevel;
  readonly onLevel: (level: RunLevel) => void;
  readonly model: string;
  readonly onModel: (model: string) => void;
  readonly keys: MutableRefObject<
    ((event: KeyboardEvent<HTMLElement>) => boolean) | null
  >;
  readonly home: RefObject<HTMLElement | null>;
}

const HomeSlashMenu = ({
  prompt,
  setPrompt,
  level,
  onLevel,
  model,
  onModel,
  keys,
  home,
}: Props): ReactElement | null => {
  const slash = useSlashMenu({
    draft: prompt,
    groups: [levelGroup(level, onLevel), modelGroup(model, null, onModel)],
    label: "Settings",
    setDraft: setPrompt,
  });

  keys.current = slash.onKeyDown;

  const input = (): HTMLElement | null =>
    home.current?.querySelector<HTMLElement>(
      '[aria-label="Describe the design"]'
    ) ?? null;

  const attrs: Record<string, string | undefined> = slash.inputProps;
  useLayoutEffect(() => {
    const area = input();

    if (!area) {
      return;
    }

    for (const name of INPUT_ATTRS) {
      const value = attrs[name];

      if (value) {
        area.setAttribute(name, value);
      } else {
        area.removeAttribute(name);
      }
    }
  });

  if (!slash.open) {
    return null;
  }

  return (
    <SlashMenu
      view={slash.view}
      anchor={() =>
        home.current?.querySelector<HTMLElement>(".home-composer") ?? null
      }
      input={input}
      onClose={slash.close}
    />
  );
};

export { HomeSlashMenu };
