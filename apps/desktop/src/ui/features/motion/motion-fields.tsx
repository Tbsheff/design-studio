import type { ReactElement } from "react";

import { copy } from "./copy.js";
import {
  MOTION_DELAY_MAX,
  MOTION_DURATION_MAX,
  MOTION_STAGGER_MAX,
} from "./deps.js";
import { EasingMenu } from "./easing-menu.js";
import type { MotionDraft } from "./motion-model.js";
import { MsField } from "./ms-field.js";
import { PresetChips } from "./preset-chips.js";
import { useFieldHandlers } from "./use-field-handlers.js";

import styles from "./motion.module.css";

interface MotionFieldsProps {
  readonly disabled: boolean;
  readonly draft: MotionDraft;
  readonly hasChildren: boolean;
  readonly onDraft: (next: MotionDraft) => void;
}

const MotionFields = ({
  disabled,
  draft,
  hasChildren,
  onDraft,
}: MotionFieldsProps): ReactElement => {
  const {
    handleDelay,
    handleDuration,
    handleEasing,
    handlePreset,
    handleStagger,
  } = useFieldHandlers(draft, onDraft);

  const entrance = draft.kind === "entrance";

  return (
    <div className={styles.fields}>
      {entrance && (
        <PresetChips
          disabled={disabled}
          value={draft.preset}
          onPick={handlePreset}
        />
      )}
      <MsField
        disabled={disabled}
        label={copy.durationLabel}
        max={MOTION_DURATION_MAX}
        short={copy.duration}
        value={draft.durationMs}
        onValue={handleDuration}
      />
      <MsField
        disabled={disabled}
        label={copy.delayLabel}
        max={MOTION_DELAY_MAX}
        short={copy.delay}
        value={draft.delayMs}
        onValue={handleDelay}
      />
      {draft.kind === "transition" && (
        <EasingMenu
          disabled={disabled}
          value={draft.easing}
          onValue={handleEasing}
        />
      )}
      {entrance && hasChildren && (
        <MsField
          disabled={disabled}
          label={copy.staggerLabel}
          max={MOTION_STAGGER_MAX}
          short={copy.stagger}
          value={draft.staggerMs}
          onValue={handleStagger}
        />
      )}
    </div>
  );
};

export { MotionFields };
