import type { OutlineItem } from "./design-md-outline.js";

const DEFAULT_LINE_HEIGHT = 20;
const SCROLL_PADDING = 8;

const HEADING_TAGS = new Set(["H1", "H2", "H3"]);

const collectHeadings = (
  root: Element,
  found: HTMLElement[]
): HTMLElement[] => {
  for (const child of root.children) {
    if (HEADING_TAGS.has(child.tagName) && child instanceof HTMLElement) {
      found.push(child);
    }

    collectHeadings(child, found);
  }

  return found;
};

const toPreviewHeading = (
  preview: HTMLDivElement | null,
  index: number
): HTMLElement | null => {
  if (!preview) {
    return null;
  }

  return collectHeadings(preview, [])[index] ?? null;
};

const jumpTo = (
  editor: HTMLTextAreaElement | null,
  preview: HTMLDivElement | null,
  item: OutlineItem,
  index: number
): void => {
  if (editor) {
    editor.focus();
    editor.setSelectionRange(item.offset, item.offset);

    const lineHeight =
      Number(getComputedStyle(editor).lineHeight) || DEFAULT_LINE_HEIGHT;

    editor.scrollTop = Math.max(0, item.line * lineHeight - lineHeight);
  }

  const heading = toPreviewHeading(preview, index);

  if (heading && preview) {
    preview.scrollTop = heading.offsetTop - preview.offsetTop - SCROLL_PADDING;
  }
};

const toSaveLabel = (isSaving: boolean): string => {
  if (isSaving) {
    return "Saving…";
  }

  return "Save";
};

export { jumpTo, toSaveLabel };
