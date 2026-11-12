import { useEffect, useRef } from "react";

import { findElement } from "../../platform/find-element.js";
import { focusStageQuietly, takeComposerIntent } from "../../platform/focus.js";

const INPUT = '.prompt [data-slot="composer-input"]';

const focusIsFree = (): boolean => {
  const active = document.activeElement;

  if (active && active !== document.body && active.isConnected) {
    return false;
  }

  return (
    findElement(document.body, '[role="dialog"], [aria-modal="true"]') === null
  );
};

const focusComposer = (): void => {
  globalThis.requestAnimationFrame(() => {
    if (focusIsFree()) {
      findElement(document.body, INPUT)?.focus({ preventScroll: true });
    }
  });
};

const STAGE_WAIT_MS = 4000;

const STAGE = ".canvas .stage";

const focusStageWhenMounted = (): void => {
  const until = performance.now() + STAGE_WAIT_MS;

  const attempt = (): void => {
    if (!focusIsFree()) {
      return;
    }

    const stage = findElement(document.body, STAGE);

    if (stage) {
      focusStageQuietly(stage);

      return;
    }

    if (performance.now() < until) {
      globalThis.requestAnimationFrame(attempt);
    }
  };

  globalThis.requestAnimationFrame(attempt);
};

const focusOpenTarget = (): void => {
  if (takeComposerIntent()) {
    focusComposer();

    return;
  }

  focusStageWhenMounted();
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

    const previous = was.current;
    was.current = running;

    if (previous === null) {
      focusOpenTarget();

      return;
    }

    if (previous !== running) {
      focusComposer();
    }
  }, [running, ready]);
};

export {
  focusComposerInput,
  focusPromptInput,
  focusPromptTextarea,
  leaveComposer,
  useComposerFocus,
};
