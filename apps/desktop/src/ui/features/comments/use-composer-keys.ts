import { useCallback } from "react";
import type { KeyboardEvent, PointerEvent, RefObject } from "react";

import { mentionKey } from "./deps.js";
import { trapTab } from "./focus-trap-model.js";
import type { ComposerImages } from "./use-composer-images.js";
import type { Mentions } from "./use-composer-mentions.js";

interface KeyInput {
  area: RefObject<HTMLTextAreaElement | null>;
  card: RefObject<HTMLElement | null>;
  closeWith: (finish: () => void) => void;
  images: ComposerImages;
  mentions: Mentions;
  onCancel: () => void;
  setToClaude: (isOn: boolean) => void;
  submit: (now: boolean) => void;
  toClaude: boolean;
  trap: boolean;
}

interface ComposerKeys {
  focusField: (event: PointerEvent<HTMLDivElement>) => void;
  onAreaKey: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
  onCardKey: (event: KeyboardEvent<HTMLDialogElement>) => void;
}

const useRemoveLast = (input: KeyInput): (() => boolean) => {
  const { images, mentions, setToClaude, toClaude } = input;

  return useCallback((): boolean => {
    const lastImage = images.images.at(-1);

    if (lastImage) {
      images.remove(lastImage.key);

      return true;
    }

    const lastMention = mentions.mentions.at(-1);

    if (lastMention) {
      mentions.remove(mentionKey(lastMention));

      return true;
    }

    if (toClaude) {
      setToClaude(false);

      return true;
    }

    return false;
  }, [images, mentions, setToClaude, toClaude]);
};

const useComposerKeys = (input: KeyInput): ComposerKeys => {
  const { area, card, closeWith, mentions, onCancel, submit, trap } = input;
  const removeLast = useRemoveLast(input);

  const onCardKey = useCallback(
    (event: KeyboardEvent<HTMLDialogElement>): void => {
      if (mentions.onKeyDown(event)) {
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        closeWith(onCancel);

        return;
      }

      if (trap) {
        trapTab(event, card.current);
      }
    },
    [card, closeWith, mentions, onCancel, trap]
  );

  const onAreaKey = useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>): void => {
      if (event.nativeEvent.isComposing || mentions.onKeyDown(event)) {
        return;
      }

      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        submit(event.metaKey || event.ctrlKey);

        return;
      }

      const { selectionEnd, selectionStart } = event.currentTarget;
      const isCaretAtStart = selectionStart === 0 && selectionEnd === 0;

      if (event.key === "Backspace" && isCaretAtStart && removeLast()) {
        event.preventDefault();
      }
    },
    [mentions, removeLast, submit]
  );

  const focusField = useCallback(
    (event: PointerEvent<HTMLDivElement>): void => {
      if (event.target !== event.currentTarget) {
        return;
      }

      event.preventDefault();
      area.current?.focus();
    },
    [area]
  );

  return { focusField, onAreaKey, onCardKey };
};

export { useComposerKeys };
