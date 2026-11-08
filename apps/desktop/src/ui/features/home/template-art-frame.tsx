import type { ReactElement, ReactNode } from "react";

const Art = ({ children }: { readonly children: ReactNode }): ReactElement => (
  <svg
    width="56"
    height="48"
    viewBox="0 0 56 48"
    aria-hidden="true"
    fill="none"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth={1.5}
  >
    {children}
  </svg>
);

export { Art };
