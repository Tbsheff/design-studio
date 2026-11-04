import { useCallback } from "react";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import type { Interaction } from "./use-link-interaction.js";

interface PickButtonProps {
  readonly interaction: Interaction;
}

const PickButton = ({ interaction }: PickButtonProps): ReactElement => {
  const { handleCancel, handleStart, pending } = interaction;
  const isPicking = pending.kind === "pick";

  const handlePick = useCallback((): void => {
    if (isPicking) {
      handleCancel();

      return;
    }

    handleStart("pick");
  }, [handleCancel, handleStart, isPicking]);

  let label: string = copy.pick;
  let className = "btn small";

  if (isPicking) {
    label = copy.cancel;
    className = "btn small proto-picking";
  }

  return (
    <>
      <button
        aria-pressed={isPicking}
        className={className}
        data-testid="link-pick-target"
        data-tip={copy.pickTip}
        type="button"
        onClick={handlePick}
      >
        {label}
      </button>
      {isPicking && <span className="proto-hint">{copy.pickHint}</span>}
    </>
  );
};

export { PickButton };

export type { PickButtonProps };
