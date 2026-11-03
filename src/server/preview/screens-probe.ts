import { PAGE_LIB } from "./screens-probe.probe.js";

export interface ScreenStep {
  click?: string;
  force?: number;
}

export interface ViewMember {
  index: number;
  label: string;
  visible: boolean;
}

export function screenSignatureExpression(): string {
  return `(() => { ${PAGE_LIB} return { signature: signature(), label: screenLabel() }; })()`;
}

export function viewMembersExpression(): string {
  return `(() => { ${PAGE_LIB} return viewGroup().map((member, index) => ({ index, label: labelOf(member), visible: !isHidden(member) })); })()`;
}

export function clickablesExpression(cap: number): string {
  return `(() => { ${PAGE_LIB} return clickables(${cap}); })()`;
}

export function replayExpression(steps: readonly ScreenStep[]): string {
  return `(async () => { ${PAGE_LIB}
  for (const step of ${JSON.stringify(steps)}) {
    if (typeof step.force === 'number') force(step.force);
    else if (step.click) {
      const el = document.querySelector(step.click);
      if (!el) return false;
      fillForm(el);
      el.click();
    }
    await settle();
  }
  if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  window.scrollTo(0, 0);
  return true;
})()`;
}
