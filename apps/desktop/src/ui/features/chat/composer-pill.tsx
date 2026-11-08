import type { ReactElement, ReactNode, Ref } from "react";

import { PillCaret } from "./pill-caret.js";
import { StableText } from "./stable-text.js";
import type { StableSize } from "./stable-text.js";

const PILL_VARIANT = {
  level: {
    buttonClass: "ui-pill-select inline composer-pill",
    buttonTestId: "level-pill",
    popup: "menu",
    valueClass: "ui-pill-select-value",
    valueTestId: null,
  },
  model: {
    buttonClass: "ui-pill-select inline composer-pill model-pill",
    buttonTestId: "run-settings",
    popup: "dialog",
    valueClass: "ui-pill-select-value model-pill-name",
    valueTestId: "active-model",
  },
} as const;

const ComposerPill = ({
  trigger,
  variant,
  label,
  ariaLabel,
  isOpen,
  sizes,
  children,
  onToggle,
}: {
  trigger: Ref<HTMLButtonElement>;
  variant: keyof typeof PILL_VARIANT;
  label: string;
  ariaLabel: string;
  isOpen: boolean;
  sizes: readonly StableSize[];
  children: ReactNode;
  onToggle: () => void;
}): ReactElement => {
  const look = PILL_VARIANT[variant];

  return (
    <button
      ref={trigger}
      type="button"
      className={look.buttonClass}
      data-testid={look.buttonTestId}
      aria-haspopup={look.popup}
      aria-expanded={isOpen}
      aria-label={ariaLabel}
      onClick={onToggle}
    >
      <span className="ui-pill-select-label">{label}</span>
      <span className={look.valueClass} data-testid={look.valueTestId}>
        <StableText sizes={sizes}>{children}</StableText>
      </span>
      <PillCaret />
    </button>
  );
};

export { ComposerPill };
