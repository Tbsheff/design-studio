interface StackGaps {
  readonly "stack-gap-x": string;
  readonly "stack-gap-y": string;
}

const PX_SUFFIX = /px$/u;

const toPx = (value: string): number => {
  const amount = Number(value.replace(PX_SUFFIX, ""));

  if (Number.isFinite(amount)) {
    return amount;
  }

  return 0;
};

const toStackGaps = (element: Element): StackGaps | null => {
  const first = element.firstElementChild;
  const second = first?.nextElementSibling ?? null;

  if (first === null || second === null) {
    return null;
  }

  const before = globalThis.getComputedStyle(first);
  const after = globalThis.getComputedStyle(second);
  const y = Math.max(toPx(before.marginBottom), toPx(after.marginTop));
  const x = toPx(before.marginRight) + toPx(after.marginLeft);

  return { "stack-gap-x": `${x}px`, "stack-gap-y": `${y}px` };
};

export { toStackGaps };

export type { StackGaps };
