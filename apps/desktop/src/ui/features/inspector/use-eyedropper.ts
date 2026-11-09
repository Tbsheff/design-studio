import { useAnchoredPopover } from "@design-studio/ui";
import { useCallback, useMemo, useState } from "react";
import type { CSSProperties, KeyboardEvent, RefObject } from "react";

import { toNearestTokens, toTokenValue } from "./eyedropper-model.js";
import type { NearToken } from "./eyedropper-model.js";
import { useEyedropperKeys } from "./use-eyedropper-keys.js";
import { useEyedropperPick } from "./use-eyedropper-pick.js";
import type { FieldProps } from "./use-same-field.js";
import { useTokenUi } from "./use-token-snap.js";

type View = "near";

interface EyedropperState {
  readonly activeIndex: number;
  readonly hex: string | null;
  readonly isOpen: boolean;
  readonly near: readonly NearToken[];
  readonly panel: RefObject<HTMLDialogElement | null>;
  readonly popStyle: CSSProperties;
  readonly trigger: RefObject<HTMLSpanElement | null>;
  readonly handleChoose: (cssVar: string) => void;
  readonly handleHover: (index: number) => void;
  readonly handleKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
  readonly handlePick: () => void;
  readonly handleUseHex: () => void;
}

const toFieldAnchor = (trigger: HTMLElement): HTMLElement =>
  trigger.closest<HTMLElement>(".ins-field, .side-cell") ?? trigger;

const useEyedropper = ({
  prop,
  edit,
}: Pick<FieldProps, "edit" | "prop">): EyedropperState => {
  const ui = useTokenUi();
  const pop = useAnchoredPopover<View, HTMLDialogElement>(toFieldAnchor);
  const { close, open } = pop;
  const [hex, setHex] = useState<string | null>(null);

  const near = useMemo(() => {
    if (!hex || !ui) {
      return [];
    }

    return toNearestTokens(hex, ui.entries, ui.mode);
  }, [hex, ui]);

  const write = useCallback(
    (value: string): void => {
      edit.preview({ [prop]: value });
      edit.commit();
    },
    [edit, prop]
  );

  const finish = useCallback(
    (value: string): void => {
      write(value);
      close(true);
      setHex(null);
    },
    [write, close]
  );

  const handleChoose = useCallback(
    (cssVar: string): void => finish(toTokenValue(cssVar)),
    [finish]
  );

  const keys = useEyedropperKeys(near, handleChoose);
  const { resetIndex } = keys;

  const handlePick = useEyedropperPick({ open, resetIndex, setHex, ui, write });

  const handleUseHex = useCallback((): void => {
    if (hex) {
      ui?.keepRaw({ [prop]: hex });
      finish(hex);
    }
  }, [hex, ui, prop, finish]);

  const { activeIndex, handleKeyDown, setActiveIndex: handleHover } = keys;
  const { panel, trigger, style: popStyle } = pop;
  const isOpen = pop.view !== null;

  return {
    activeIndex,
    handleChoose,
    handleHover,
    handleKeyDown,
    handlePick,
    handleUseHex,
    hex,
    isOpen,
    near,
    panel,
    popStyle,
    trigger,
  };
};

export { useEyedropper };

export type { EyedropperState };
