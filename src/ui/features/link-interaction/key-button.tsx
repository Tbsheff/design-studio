import { useCallback } from "react";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import type { PrototypeLink } from "./deps.js";
import { keyOf } from "./interaction-model.js";
import { useKeyCapture } from "./use-key-capture.js";
import type { Interaction } from "./use-link-interaction.js";

interface KeyButtonProps {
  readonly interaction: Interaction;
  readonly link: PrototypeLink;
}

const KeyButton = ({ interaction, link }: KeyButtonProps): ReactElement => {
  const { handleCancel, handleKey, handleStart, pending } = interaction;
  const isCapturing = pending.kind === "key";

  useKeyCapture(isCapturing, handleKey, handleCancel);

  const handleCapture = useCallback((): void => {
    handleStart("key");
  }, [handleStart]);

  let label = keyOf(link) ?? copy.capture;

  if (isCapturing) {
    label = copy.capturing;
  }

  return (
    <button
      aria-label={copy.key}
      aria-pressed={isCapturing}
      className="btn small proto-key"
      data-testid="link-key-capture"
      type="button"
      onClick={handleCapture}
    >
      <kbd>{label}</kbd>
    </button>
  );
};

export { KeyButton };

export type { KeyButtonProps };
