import type { RefObject } from "react";

import { StableText } from "../../components/StableText.js";
import { loadPops } from "./lazy-parts.js";

function PillSelect({
  label,
  value,
  sizes = [],
  open,
  triggerRef,
  onOpen,
  ariaLabel,
}: {
  label: string;
  value: string;
  sizes?: readonly string[];
  open: boolean;
  triggerRef: RefObject<HTMLButtonElement | null>;
  onOpen: () => void;
  ariaLabel: string;
}) {
  return (
    <button
      ref={triggerRef}
      type="button"
      className="ui-pill-select inline"
      aria-haspopup="dialog"
      aria-expanded={open}
      aria-label={`${ariaLabel}: ${value}`}
      data-tip={label}
      data-tip-side="top"
      onPointerEnter={() => void loadPops()}
      onFocus={() => void loadPops()}
      onClick={onOpen}
    >
      <span className="ui-pill-select-label">{label}</span>
      <span className="ui-pill-select-value truncate">
        <StableText sizes={sizes}>{value}</StableText>
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
        <path d={open ? "M3.5 10L8 5.5l4.5 4.5" : "M3.5 6L8 10.5 12.5 6"} />
      </svg>
    </button>
  );
}

export { PillSelect };
