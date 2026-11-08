import type { ReactElement } from "react";

type ChevronScope = "action" | "cot" | "reasoning";

interface DisclosureChevronProps {
  readonly scope: ChevronScope;
}

const SCOPE_CLASS: Readonly<Record<ChevronScope, string>> = {
  action:
    "size-4 shrink-0 transition-transform duration-200 group-data-open/action:rotate-90",
  cot: "size-4 shrink-0 transition-transform duration-200 group-data-open/cot:rotate-90",
  reasoning:
    "size-4 shrink-0 transition-transform duration-200 group-data-open:rotate-90",
};

const DisclosureChevron = ({ scope }: DisclosureChevronProps): ReactElement => (
  <svg
    aria-hidden
    className={SCOPE_CLASS[scope]}
    fill="none"
    height="24"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth="2"
    viewBox="0 0 24 24"
    width="24"
  >
    <path d="m9 18 6-6-6-6" />
  </svg>
);

export { DisclosureChevron };

export type { ChevronScope };
