const ARROW_STEPS = new Map<string, number>([
  ["ArrowDown", 1],
  ["ArrowLeft", -1],
  ["ArrowRight", 1],
  ["ArrowUp", -1],
]);

const toStepIndex = (step: number, at: number, count: number): number => {
  if (at === -1 && step > 0) {
    return 0;
  }

  if (at === -1) {
    return count - 1;
  }

  return (at + step + count) % count;
};

const nextRadioOption = <Option>(
  options: readonly Option[],
  current: Option,
  key: string,
  isDisabled: (option: Option) => boolean = () => false
): Option | null => {
  const enabled = options.filter((option) => !isDisabled(option));

  if (enabled.length === 0) {
    return null;
  }

  if (key === "Home") {
    return enabled[0] ?? null;
  }

  if (key === "End") {
    return enabled.at(-1) ?? null;
  }

  if (!ARROW_STEPS.has(key)) {
    return null;
  }

  const step = ARROW_STEPS.get(key) ?? 0;

  const at = enabled.indexOf(current);

  return enabled[toStepIndex(step, at, enabled.length)] ?? null;
};

export { nextRadioOption };
