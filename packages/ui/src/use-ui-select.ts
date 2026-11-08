import { useCallback, useId, useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent, RefObject } from "react";

import { toStartIndex } from "./ui-select-model.js";
import type { UiSelectProps } from "./ui-select-model.js";
import { useOutsideClose } from "./use-outside-close.js";
import { usePickOption } from "./use-pick-option.js";
import { useSelectKeys } from "./use-select-keys.js";
import { useSelectPlacement } from "./use-select-placement.js";

interface UiSelectState {
  readonly active: number;
  readonly attach: (node: HTMLDivElement | null) => void;
  readonly button: RefObject<HTMLButtonElement | null>;
  readonly close: () => void;
  readonly current: number;
  readonly host: Element | null;
  readonly isOpen: boolean;
  readonly listId: string;
  readonly onHover: (index: number) => void;
  readonly onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void;
  readonly onPick: (index: number) => void;
  readonly onToggle: () => void;
  readonly panel: RefObject<HTMLDivElement | null>;
  readonly root: RefObject<HTMLSpanElement | null>;
  readonly style: CSSProperties;
}

const useUiSelect = <OptionValue extends string>(
  props: UiSelectProps<OptionValue>
): UiSelectState => {
  const { options, value, onChange } = props;
  const [isOpen, setIsOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [host, setHost] = useState<Element | null>(null);
  const root = useRef<HTMLSpanElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const listId = useId();
  const { attach, hide, panel, style } = useSelectPlacement(button);
  const current = options.findIndex((option) => option.value === value);

  const close = useCallback(() => {
    setIsOpen(false);
    hide();
  }, [hide]);

  useOutsideClose(isOpen, close, root, panel);

  const show = useCallback(() => {
    setActive(toStartIndex(options, current));
    setHost(button.current?.closest("dialog") ?? document.body);
    setIsOpen(true);
  }, [options, current]);

  const onToggle = useCallback(() => {
    if (isOpen) {
      close();

      return;
    }

    show();
  }, [isOpen, close, show]);

  const onPick = usePickOption({ button, close, onChange, options, value });

  const onHover = setActive;

  const onKeyDown = useSelectKeys({
    active,
    close,
    isOpen,
    onChange,
    onPick,
    options,
    setActive,
    show,
  });

  return {
    active,
    attach,
    button,
    close,
    current,
    host,
    isOpen,
    listId,
    onHover,
    onKeyDown,
    onPick,
    onToggle,
    panel,
    root,
    style,
  };
};

export { useUiSelect };

export type { UiSelectState };
