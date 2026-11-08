import { useCallback, useLayoutEffect } from "react";
import type { RefObject } from "react";

import type { FocusRequest } from "./focus-bus-model.js";
import { useFocusRequest } from "./use-focus-request.js";

const MAX_PROMPT_HEIGHT = 320;

const setPromptHeight = (el: HTMLTextAreaElement, text: string): void => {
  el.style.height = "auto";

  if (text === "") {
    return;
  }

  el.style.height = `${Math.min(MAX_PROMPT_HEIGHT, el.scrollHeight)}px`;
};

const usePromptElement = (
  ref: RefObject<HTMLTextAreaElement | null>,
  value: string,
  describedBy: string | null
): void => {
  useLayoutEffect(() => {
    if (ref.current) {
      setPromptHeight(ref.current, value);
    }
  }, [ref, value]);

  useLayoutEffect(() => {
    const el = ref.current;

    if (!el) {
      return;
    }

    if (describedBy) {
      el.setAttribute("aria-describedby", describedBy);
    } else {
      el.removeAttribute("aria-describedby");
    }
  }, [describedBy, ref]);

  const applyFocus = useCallback(
    (request: FocusRequest): void => {
      globalThis.requestAnimationFrame(() => {
        const area = ref.current;

        area?.focus();

        if (request.isAtEnd && area) {
          area.setSelectionRange(area.value.length, area.value.length);
        }
      });
    },
    [ref]
  );

  useFocusRequest("prompt", applyFocus);
};

export { usePromptElement };
