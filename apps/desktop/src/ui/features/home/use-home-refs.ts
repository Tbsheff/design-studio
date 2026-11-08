import { useCallback, useRef } from "react";
import type { KeyboardEvent, MutableRefObject, RefObject } from "react";

import type { FocusRequest } from "./focus-bus-model.js";
import { useFocusRequest } from "./use-focus-request.js";

interface HomeRefs {
  readonly chipTriggerRef: RefObject<HTMLButtonElement | null>;
  readonly clarifyRef: RefObject<HTMLDivElement | null>;
  readonly composerRef: RefObject<HTMLFormElement | null>;
  readonly homeRef: RefObject<HTMLDivElement | null>;
  readonly promptRef: RefObject<HTMLTextAreaElement | null>;
  readonly slashKeys: MutableRefObject<
    ((keyboardEvent: KeyboardEvent<HTMLElement>) => boolean) | null
  >;
}

const useHomeRefs = (): HomeRefs => {
  const homeElement = useRef<HTMLDivElement>(null);

  const scrollHome = useCallback((request: FocusRequest): void => {
    if (request.isHomeScrolled) {
      homeElement.current?.scrollTo({ behavior: "smooth", top: 0 });
    }
  }, []);

  useFocusRequest("prompt", scrollHome);

  return {
    chipTriggerRef: useRef<HTMLButtonElement>(null),
    clarifyRef: useRef<HTMLDivElement>(null),
    composerRef: useRef<HTMLFormElement>(null),
    homeRef: homeElement,
    promptRef: useRef<HTMLTextAreaElement>(null),
    slashKeys: useRef<
      ((keyboardEvent: KeyboardEvent<HTMLElement>) => boolean) | null
    >(null),
  };
};

export { useHomeRefs };

export type { HomeRefs };
