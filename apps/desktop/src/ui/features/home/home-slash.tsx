import type { RunLevel } from "@design-studio/contracts";
import { useCallback, useEffect, useLayoutEffect } from "react";
import type {
  KeyboardEvent,
  MutableRefObject,
  ReactElement,
  RefObject,
} from "react";

import { useSlashMenu } from "../chat/index.js";
import { levelGroup, modelGroup } from "../chat/slash-groups.js";
import { SlashMenu } from "../chat/slash-menu.js";

const INPUT_ATTRS = [
  "aria-controls",
  "aria-autocomplete",
  "aria-activedescendant",
] as const;

type SlashKeys = (event: KeyboardEvent<HTMLElement>) => boolean;

const setSlashKeys = (
  target: MutableRefObject<SlashKeys | null>,
  handler: SlashKeys
): void => {
  target.current = handler;
};

interface Props {
  readonly prompt: string;
  readonly setPrompt: (value: string) => void;
  readonly level: RunLevel;
  readonly onLevel: (level: RunLevel) => void;
  readonly model: string;
  readonly onModel: (model: string) => void;
  readonly keys: MutableRefObject<SlashKeys | null>;
  readonly promptRef: RefObject<HTMLElement | null>;
  readonly composerRef: RefObject<HTMLElement | null>;
}

const HomeSlashMenu = ({
  prompt,
  setPrompt,
  level,
  onLevel,
  model,
  onModel,
  keys,
  promptRef,
  composerRef,
}: Props): ReactElement | null => {
  const slash = useSlashMenu({
    draft: prompt,
    groups: [levelGroup(level, onLevel), modelGroup(model, null, onModel)],
    label: "Settings",
    setDraft: setPrompt,
  });

  const { close, inputProps, onKeyDown } = slash;
  useEffect(() => {
    setSlashKeys(keys, onKeyDown);
  }, [keys, onKeyDown]);

  const readInput = useCallback(
    (): HTMLElement | null => promptRef.current,
    [promptRef]
  );

  const readAnchor = useCallback(
    (): HTMLElement | null => composerRef.current,
    [composerRef]
  );

  useLayoutEffect(() => {
    const area = promptRef.current;

    if (!area) {
      return;
    }

    for (const name of INPUT_ATTRS) {
      const value = inputProps[name];

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
      anchor={readAnchor}
      input={readInput}
      onClose={close}
    />
  );
};

export { HomeSlashMenu };

export type { SlashKeys };
