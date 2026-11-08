import { useCallback } from "react";
import type { MouseEvent, ReactElement, ReactNode } from "react";

import { toButtonClass, toButtonTip } from "./button-model.js";
import type { ButtonSize, ButtonVariant } from "./button-model.js";
import { toOptionalAttr } from "./optional-attr.js";

interface ButtonProps {
  readonly children: ReactNode;
  readonly disabledReason: string | null;
  readonly isLoading: boolean;
  readonly label: string | null;
  readonly onClick: (event: MouseEvent<HTMLButtonElement>) => void;
  readonly size: ButtonSize;
  readonly tip: string | null;
  readonly variant: ButtonVariant;
}

const Button = ({
  children,
  disabledReason,
  isLoading,
  label,
  onClick,
  size,
  tip,
  variant,
}: ButtonProps): ReactElement => {
  const isBlocked = disabledReason !== null || isLoading;

  const clickUnlessBlocked = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      if (isBlocked) {
        event.preventDefault();

        return;
      }

      onClick(event);
    },
    [isBlocked, onClick]
  );

  const tipText = toButtonTip(disabledReason, tip);

  return (
    <button
      aria-busy={isLoading}
      aria-disabled={disabledReason !== null}
      aria-label={toOptionalAttr(label !== null, label ?? "")}
      className={toButtonClass(variant, size)}
      data-tip={toOptionalAttr(tipText !== null, tipText ?? "")}
      onClick={clickUnlessBlocked}
      type="button"
    >
      {children}
    </button>
  );
};

export { Button };

export type { ButtonProps };
