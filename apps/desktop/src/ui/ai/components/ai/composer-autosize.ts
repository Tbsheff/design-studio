const DEFAULT_LINE_HEIGHT = 20;
const PIXEL_SUFFIX = /px$/u;

const toPixels = (value: string): number =>
  Number(value.replace(PIXEL_SUFFIX, ""));

const autosize = (field: HTMLTextAreaElement, maxRows: number): void => {
  field.style.height = "auto";
  const styles = globalThis.getComputedStyle(field);
  const lineHeight = toPixels(styles.lineHeight) || DEFAULT_LINE_HEIGHT;
  const paddingTop = toPixels(styles.paddingTop) || 0;
  const paddingBottom = toPixels(styles.paddingBottom) || 0;
  const maxHeight = lineHeight * maxRows + paddingTop + paddingBottom;
  const next = Math.min(field.scrollHeight, maxHeight);
  field.style.height = `${next}px`;
  field.style.overflowY = "hidden";

  if (field.scrollHeight > maxHeight) {
    field.style.overflowY = "auto";
  }
};

export { autosize };
