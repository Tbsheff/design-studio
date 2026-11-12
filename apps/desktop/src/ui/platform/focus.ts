import { findElement } from "./find-element.js";
import { createLiveStore } from "./live-store.js";

const COMPOSER_INPUT = '.prompt [data-slot="composer-input"]';

const NEW_PROJECT_INPUT = '[aria-label="Describe the design"]';

const MOUNT_ROOT = "#root";

const QUIET_FOCUS_ATTR = "data-quiet-focus";

const composerIntent = createLiveStore(false);

const markComposerIntent = (): void => composerIntent.set(true);

const takeComposerIntent = (): boolean => {
  const isWanted = composerIntent.get();
  composerIntent.set(false);

  return isWanted;
};

const focusStageQuietly = (
  stage: HTMLElement | null = findElement(document.body, ".canvas .stage")
): void => {
  if (!stage) {
    return;
  }

  stage.setAttribute(QUIET_FOCUS_ATTR, "");
  stage.focus({ preventScroll: true });
};

const focusComposer = (prompt: string): void => {
  const input = findElement(document.body, COMPOSER_INPUT);

  if (input instanceof HTMLTextAreaElement) {
    input.focus();
    input.setSelectionRange(prompt.length, prompt.length);
  }
};

const focusComposerAtEnd = (): void => {
  const input = findElement(document.body, COMPOSER_INPUT);

  if (input instanceof HTMLTextAreaElement) {
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
  }
};

const focusNewProject = (): void => {
  globalThis.requestAnimationFrame(() =>
    findElement(document.body, NEW_PROJECT_INPUT)?.focus()
  );
};

const toMountRoot = (): HTMLElement | null =>
  findElement(document.body, MOUNT_ROOT);

export {
  QUIET_FOCUS_ATTR,
  focusComposer,
  focusComposerAtEnd,
  focusNewProject,
  focusStageQuietly,
  markComposerIntent,
  takeComposerIntent,
  toMountRoot,
};
