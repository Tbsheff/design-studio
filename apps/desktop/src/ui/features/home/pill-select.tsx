import type { ComponentProps, ReactElement, RefObject } from "react";

import { StableText } from "../chat/stable-text.js";
import { loadPops } from "./lazy-parts-model.js";

const NO_SIZES: readonly string[] = [];
const CARET_OPEN = "M3.5 10L8 5.5l4.5 4.5";
const CARET_CLOSED = "M3.5 6L8 10.5 12.5 6";

const runPopsPreload = (): void => {
  loadPops();
};

const toCaretPath = (isOpen: boolean): string => {
  if (isOpen) {
    return CARET_OPEN;
  }

  return CARET_CLOSED;
};

const toSizeEntries = (
  sizes: readonly string[]
): ComponentProps<typeof StableText>["sizes"] =>
  sizes.map((size) => ({ key: size, node: size }));

const PillSelect = ({
  label,
  value,
  sizes = NO_SIZES,
  isOpen,
  triggerRef,
  onOpen,
  ariaLabel,
}: {
  readonly label: string;
  readonly value: string;
  readonly sizes?: readonly string[];
  readonly isOpen: boolean;
  readonly triggerRef: RefObject<HTMLButtonElement | null>;
  readonly onOpen: () => void;
  readonly ariaLabel: string;
}): ReactElement => (
  <button
    ref={triggerRef}
    type="button"
    className="ui-pill-select inline"
    aria-haspopup="dialog"
    aria-expanded={isOpen}
    aria-label={`${ariaLabel}: ${value}`}
    data-tip={label}
    data-tip-side="top"
    onPointerEnter={runPopsPreload}
    onFocus={runPopsPreload}
    onClick={onOpen}
  >
    <span className="ui-pill-select-label">{label}</span>
    <span className="ui-pill-select-value truncate">
      <StableText sizes={toSizeEntries(sizes)}>{value}</StableText>
    </span>
    <svg
      className="ui-pill-select-caret"
      width="10"
      height="10"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      aria-hidden="true"
    >
      <path d={toCaretPath(isOpen)} />
    </svg>
  </button>
);

export { PillSelect };
