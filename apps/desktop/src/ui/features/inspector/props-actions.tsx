import type { ComponentInstance } from "@design-studio/contracts/props";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import type { PropsStatus } from "./props-model.js";
import { SwapButton } from "./swap-button.js";

interface PropsActionsProps {
  readonly projectId: string;
  readonly directionId: string;
  readonly instance: ComponentInstance;
  readonly hasStyles: boolean;
  readonly isStylesOpen: boolean;
  readonly onStyles: () => void;
  readonly onStatus: (status: PropsStatus) => void;
}

const toStylesLabel = (isOpen: boolean): string => {
  if (isOpen) {
    return copy.hideVariantStyles;
  }

  return copy.editVariantStyles;
};

const PropsActions = ({
  projectId,
  directionId,
  instance,
  hasStyles,
  isStylesOpen,
  onStyles,
  onStatus,
}: PropsActionsProps): ReactElement => (
  <div className="prp-actions">
    <SwapButton
      projectId={projectId}
      directionId={directionId}
      instance={instance}
      onStatus={onStatus}
    />
    {hasStyles && (
      <button
        type="button"
        className="btn small prp-styles-btn"
        aria-expanded={isStylesOpen}
        onClick={onStyles}
      >
        {toStylesLabel(isStylesOpen)}
      </button>
    )}
  </div>
);

export { PropsActions };
