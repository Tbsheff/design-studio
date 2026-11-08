import { useEffect, useRef } from "react";

import { findElement } from "../../platform/find-element.js";

const INPUT = '.prompt [data-slot="composer-input"]';

const focusIsFree = (): boolean => {
  const active = document.activeElement;

  if (active && active !== document.body && active.isConnected) {
    return false;
  }

  return (
    findElement(
      document.body,
      '[role="dialog"], [aria-modal="true"], .inline-prompt'
    ) === null
  );
};

const focusComposer = (): void => {
  globalThis.requestAnimationFrame(() => {
    if (focusIsFree()) {
      findElement(document.body, INPUT)?.focus({ preventScroll: true });
    }
  });
};

const focusComposerInput = (): number =>
  globalThis.requestAnimationFrame(() =>
    findElement(document.body, INPUT)?.focus()
  );

const focusPromptInput = (): void => findElement(document.body, INPUT)?.focus();

const focusPromptTextarea = (): void =>
  findElement(document.body, ".prompt textarea")?.focus();

const leaveComposer = (input: HTMLElement): void => {
  const stage =
    findElement(document.body, ".stage") ??
    input.closest<HTMLElement>("[tabindex]");

  stage?.focus({ preventScroll: true });
};

const useComposerFocus = (running: boolean, ready: boolean): void => {
  const was = useRef<boolean | null>(null);
  useEffect(() => {
    if (!ready) {
      return;
    }

    if (was.current !== running) {
      focusComposer();
    }

    was.current = running;
  }, [running, ready]);
};

export {
  focusComposerInput,
  focusPromptInput,
  focusPromptTextarea,
  leaveComposer,
  useComposerFocus,
};
