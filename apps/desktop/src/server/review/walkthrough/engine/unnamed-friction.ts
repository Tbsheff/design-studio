import type { FrictionRecord, PageElement } from "./page-element.js";

const toUnnamedFrictions = (
  stepIndex: number,
  elements: readonly PageElement[],
  seen: ReadonlySet<string>
): FrictionRecord[] =>
  elements.flatMap((element) => {
    if (element.hasName || seen.has(element.selector)) {
      return [];
    }

    return [
      {
        fix: `Give the ${element.role} at ${element.selector} a visible label or an aria-label.`,
        severity: "high" as const,
        step: stepIndex,
        text: `A ${element.role} has no name (${element.selector}). A user and a screen reader cannot tell what it does.`,
      },
    ];
  });

export { toUnnamedFrictions };
