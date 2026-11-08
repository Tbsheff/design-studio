import { useCallback } from "react";
import type { ReactElement } from "react";

import { isReferenceName } from "../../../shared/reference.js";
import { cn } from "../../ai/lib/utils.js";
import type { PendingAttachment } from "../../domain/pending-attachment.js";

interface ReferenceToggleProps {
  readonly file: PendingAttachment;
  readonly isBusy: boolean;
  readonly onToggle: (file: PendingAttachment) => void;
}

const toToggleLabel = (isOn: boolean, name: string): string => {
  if (isOn) {
    return `Stop using ${name} as the reference`;
  }

  return `Use ${name} as reference`;
};

const toToggleTip = (isOn: boolean): string => {
  if (isOn) {
    return "Reference: the studio scores the frame against this picture. Click to stop.";
  }

  return "Use as reference: the agent rebuilds this picture and the studio scores the match";
};

const toToggleText = (isBusy: boolean): string => {
  if (isBusy) {
    return "…";
  }

  return "Ref";
};

const ReferenceToggle = ({
  file,
  isBusy,
  onToggle,
}: ReferenceToggleProps): ReactElement | null => {
  const onClick = useCallback((): void => {
    onToggle(file);
  }, [file, onToggle]);

  if (!file.attachment || file.error) {
    return null;
  }

  const isOn = isReferenceName(file.attachment.name);

  return (
    <button
      type="button"
      className={cn("thumb-ref", isOn && "on")}
      aria-pressed={isOn}
      aria-label={toToggleLabel(isOn, file.name)}
      data-tip={toToggleTip(isOn)}
      data-tip-side="top"
      disabled={isBusy}
      onClick={onClick}
    >
      {toToggleText(isBusy)}
    </button>
  );
};

export { ReferenceToggle };
