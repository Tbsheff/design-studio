import type { ReactElement } from "react";

export const BrandMark = (): ReactElement => (
  <span className="brand-mark" aria-hidden="true">
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <rect
        x="1.5"
        y="1.5"
        width="8.5"
        height="8.5"
        rx="2"
        fill="currentColor"
      />
      <rect x="6" y="6" width="8.5" height="8.5" rx="2" fill="var(--accent)" />
      <path
        d="M6 8a2 2 0 0 1 2-2h2v2a2 2 0 0 1-2 2H6z"
        fill="color-mix(in oklab, var(--accent) 62%, black)"
      />
    </svg>
  </span>
);
