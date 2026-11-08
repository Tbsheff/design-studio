import type { SelectionContext } from "@design-studio/contracts";

const GAP_CRUMB_PX = 28;
const HTML_PREFIX_LENGTH = 4000;

const toElementLabel = (selection: SelectionContext): string => {
  const firstClass = /^<[^>]*\bclass="(?<name>[^"\s]+)/u.exec(
    selection.outerHTML.slice(0, HTML_PREFIX_LENGTH)
  )?.groups?.name;

  if (firstClass) {
    return `${selection.tag}.${firstClass}`;
  }

  return selection.tag;
};

const toFitCount = (el: HTMLOListElement, total: number): number => {
  const items = [...el.children] as HTMLElement[];
  const [first] = items;

  if (!first || el.scrollWidth <= el.clientWidth + 1) {
    return total;
  }

  const gap = GAP_CRUMB_PX + (items[1]?.offsetWidth ?? 0);

  for (let cut = 1; cut <= total; cut += 1) {
    const start = items[cut * 2]?.offsetLeft ?? el.scrollWidth;

    if (
      el.scrollWidth - (start - first.offsetLeft) + gap <=
      el.clientWidth + 1
    ) {
      return total - cut;
    }
  }

  return 0;
};

const toNextShown = (
  shown: number,
  total: number,
  el: HTMLOListElement
): number => {
  if (shown === total) {
    return toFitCount(el, total);
  }

  return shown - 1;
};

export { toElementLabel, toNextShown };
