import type { SelectionContext } from "@design-studio/contracts";
import type { ReactElement } from "react";

import { UseInMenu } from "./use-in-menu.js";
import { useVariationActions } from "./use-variation-actions.js";
import { shortRejection, STATUS_TEXT, stop } from "./variation-model.js";
import type { FrameVariation, Sibling } from "./variation-model.js";

interface VariationControlsProps {
  readonly variation: FrameVariation;
  readonly active: boolean;
  readonly element: SelectionContext | null;
  readonly onMixed: () => void;
}

const toKeepTip = (variation: FrameVariation): string | undefined => {
  if (variation.keepBlocked) {
    return variation.keepBlocked;
  }

  if (variation.scoped) {
    return "Put this version of the element into the design";
  }
};

const toAriaDisabled = (variation: FrameVariation): true | undefined => {
  if (variation.keepBlocked) {
    return true;
  }
};

const toKeepLabel = (isKeeping: boolean): string => {
  if (isKeeping) {
    return "Keeping…";
  }

  return "Keep this one";
};

const canUseElsewhere = (
  variation: FrameVariation,
  isActive: boolean,
  element: SelectionContext | null
): boolean =>
  isActive &&
  Boolean(element) &&
  !variation.scoped &&
  variation.siblings.length > 0;

const toStatusText = (status: FrameVariation["status"]): string => {
  if (status) {
    return STATUS_TEXT[status];
  }

  return "No run";
};

const toStatusNode = (variation: FrameVariation): ReactElement | null => {
  if (variation.error) {
    return null;
  }

  const { status } = variation;

  return (
    <span
      className={`variation-status ${status ?? "idle"}`}
      data-testid="variation-status"
      data-tip={variation.costText}
    >
      {toStatusText(status)}
    </span>
  );
};

const toRejectionNode = (variation: FrameVariation): ReactElement | null => {
  if (!variation.error) {
    return null;
  }

  return (
    <output
      className="frame-error scope"
      aria-label={variation.error}
      data-testid="variation-error"
      data-tip={variation.error}
    >
      {shortRejection(variation.error)}
    </output>
  );
};

const VariationControls = ({
  variation,
  active,
  element,
  onMixed,
}: VariationControlsProps): ReactElement => {
  const { isKeeping, isMixing, notice, onKeep, onMix } = useVariationActions(
    variation,
    element,
    onMixed
  );

  return (
    <>
      {toStatusNode(variation)}
      {canUseElsewhere(variation, active, element) && (
        <UseInMenu
          siblings={variation.siblings}
          isBusy={isMixing}
          onPick={onMix}
        />
      )}
      <button
        type="button"
        className="frame-chip keep"
        aria-disabled={toAriaDisabled(variation)}
        data-tip={toKeepTip(variation)}
        data-testid="variation-keep"
        onPointerDown={stop}
        onClick={onKeep}
      >
        {toKeepLabel(isKeeping)}
      </button>
      {toRejectionNode(variation)}
      {notice && (
        <span className="frame-error" role="alert">
          {notice}
        </span>
      )}
    </>
  );
};

export { VariationControls };

export type { FrameVariation, Sibling };
