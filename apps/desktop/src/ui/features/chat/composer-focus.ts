import { useEffect, useRef } from "react";

const INPUT = '.prompt [data-slot="composer-input"]';

const focusIsFree = (): boolean => {
  const active = document.activeElement;

  if (active && active !== document.body && active.isConnected) {
    return false;
  }

  return !document.querySelector(
    '[role="dialog"], [aria-modal="true"], .inline-prompt'
  );
};

const focusComposer = (): void => {
  globalThis.requestAnimationFrame(() => {
    if (focusIsFree()) {
      document
        .querySelector<HTMLTextAreaElement>(INPUT)
        ?.focus({ preventScroll: true });
    }
  });
};

const focusComposerInput = (): number =>
  globalThis.requestAnimationFrame(() =>
    document.querySelector<HTMLTextAreaElement>(INPUT)?.focus()
  );

const focusPromptTextarea = (): void =>
  document.querySelector<HTMLTextAreaElement>(".prompt textarea")?.focus();

const leaveComposer = (input: HTMLElement): void => {
  const stage = document.querySelector<HTMLElement>(".stage");

  if (stage) {
    stage.focus({ preventScroll: true });
  } else {
    input.blur();
  }
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
  focusPromptTextarea,
  leaveComposer,
  useComposerFocus,
};
