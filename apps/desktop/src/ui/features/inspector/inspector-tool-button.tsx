import type { ReactElement, ReactNode } from "react";

import type { ToolAlign } from "./tools-model.js";

interface Props {
  readonly label: string;
  readonly isPressed: boolean;
  readonly isDisabled: boolean;
  readonly tip: string | null;
  readonly align: ToolAlign | null;
  readonly onClick: () => void;
  readonly children: ReactNode;
}

const InspectorToolButton = ({
  label,
  isPressed,
  isDisabled,
  tip,
  align,
  onClick,
  children,
}: Props): ReactElement => (
  <button
    type="button"
    className="ins-tool"
    aria-label={label}
    aria-pressed={isPressed}
    disabled={isDisabled}
    data-tip={tip ?? label}
    data-tip-align={align}
    onClick={onClick}
  >
    {children}
  </button>
);

export { InspectorToolButton };
