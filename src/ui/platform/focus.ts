import { findElement } from "./find-element.js";

const COMPOSER_INPUT = '.prompt [data-slot="composer-input"]';

const NEW_PROJECT_INPUT = '[aria-label="Describe the design"]';

const MOUNT_ROOT = "#root";

const focusComposer = (prompt: string): void => {
  const input = findElement(document.body, COMPOSER_INPUT);

  if (input instanceof HTMLTextAreaElement) {
    input.focus();
    input.setSelectionRange(prompt.length, prompt.length);
  }
};

const focusNewProject = (): void => {
  globalThis.requestAnimationFrame(() =>
    findElement(document.body, NEW_PROJECT_INPUT)?.focus()
  );
};

const toMountRoot = (): HTMLElement | null =>
  findElement(document.body, MOUNT_ROOT);

export { focusComposer, focusNewProject, toMountRoot };
