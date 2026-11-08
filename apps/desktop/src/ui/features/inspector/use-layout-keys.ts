import { useEffect, useRef } from "react";
import type { RefObject } from "react";

import {
  PREVIEW_ARRANGE_KEY_EVENT,
  PREVIEW_LAYOUT_KEY_EVENT,
} from "../../platform/preview-key-events.js";
import { isTypingTarget } from "../../platform/typing-target.js";
import type { DirectEdit } from "./use-direct-edit.js";

type Patch = Parameters<DirectEdit["preview"]>[0];

const setEdit = (edit: DirectEdit, patch: Patch): void => {
  edit.preview(patch);
  edit.commit();
};

const isKeyAChord = (event: KeyboardEvent): boolean =>
  event.code === "KeyA" && event.shiftKey && !event.repeat;

const hasNoCommandKey = (event: KeyboardEvent): boolean =>
  !event.metaKey && !event.ctrlKey;

const isLayoutShortcut = (event: KeyboardEvent): boolean =>
  isKeyAChord(event) && hasNoCommandKey(event) && !event.altKey;

const REMOVE_LAYOUT_CHORD = "Alt+Shift+KeyA";

const isRemoveShortcut = (event: KeyboardEvent): boolean =>
  isKeyAChord(event) && hasNoCommandKey(event) && event.altKey;

const useLayoutKeys = (
  root: RefObject<HTMLElement | null>,
  onAdd: () => void,
  onRemove: () => void
): void => {
  const latest = useRef({ onAdd, onRemove });

  useEffect(() => {
    latest.current = { onAdd, onRemove };
  }, [onAdd, onRemove]);

  useEffect(() => {
    const visible = (): boolean =>
      Boolean(root.current && !root.current.closest("[inert]"));

    const onKey = (event: KeyboardEvent): void => {
      const add = isLayoutShortcut(event);

      if (
        (!add && !isRemoveShortcut(event)) ||
        isTypingTarget(event.target) ||
        !visible()
      ) {
        return;
      }

      event.preventDefault();

      if (add) {
        latest.current.onAdd();
      } else {
        latest.current.onRemove();
      }
    };

    const onForwarded = (): void => {
      if (visible()) {
        latest.current.onAdd();
      }
    };

    const onArrangeKey = (event: Event): void => {
      if (
        (event as CustomEvent<{ readonly key?: string }>).detail?.key ===
          REMOVE_LAYOUT_CHORD &&
        visible()
      ) {
        latest.current.onRemove();
      }
    };

    globalThis.addEventListener("keydown", onKey);
    globalThis.addEventListener(PREVIEW_LAYOUT_KEY_EVENT, onForwarded);
    globalThis.addEventListener(PREVIEW_ARRANGE_KEY_EVENT, onArrangeKey);

    return (): void => {
      globalThis.removeEventListener("keydown", onKey);
      globalThis.removeEventListener(PREVIEW_LAYOUT_KEY_EVENT, onForwarded);
      globalThis.removeEventListener(PREVIEW_ARRANGE_KEY_EVENT, onArrangeKey);
    };
  }, [root]);
};

export { setEdit, useLayoutKeys };
