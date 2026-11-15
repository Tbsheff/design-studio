import type { KeyboardEvent } from "react";

type StepRadio = (index: number, count: number) => number;

const stepForward: StepRadio = (index, count) => (index + 1) % count;
const stepBack: StepRadio = (index, count) => (index - 1 + count) % count;

const RADIO_STEP = new Map<string, StepRadio>([
  ["ArrowDown", stepForward],
  ["ArrowLeft", stepBack],
  ["ArrowRight", stepForward],
  ["ArrowUp", stepBack],
]);

const moveRadioFocus = (event: KeyboardEvent<HTMLDivElement>): void => {
  const step = RADIO_STEP.get(event.key);

  if (!step) {
    return;
  }

  const radios = [...event.currentTarget.children].filter(
    (child): child is HTMLButtonElement =>
      child instanceof HTMLButtonElement &&
      !child.disabled &&
      child.getAttribute("aria-disabled") !== "true"
  );

  const index = radios.indexOf(document.activeElement as HTMLButtonElement);

  if (index === -1) {
    return;
  }

  event.preventDefault();
  const next = radios[step(index, radios.length)];
  next?.focus();
  next?.click();
};

export { moveRadioFocus };
