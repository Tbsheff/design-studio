import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { DataFillDialog } from "./data-fill-dialog.js";
import { PresetChips } from "./preset-chips.js";
import { RepeatStepper } from "./repeat-stepper.js";
import { StressChips } from "./stress-chips.js";
import { useContent } from "./use-content.js";
import type { ContentOptions } from "./use-content.js";

import styles from "./content.module.css";

const ContentPanel = (props: ContentOptions): ReactElement => {
  const content = useContent(props);

  return (
    <fieldset aria-label={copy.groupLabel} className={styles.section}>
      <span className={styles.title}>{copy.title}</span>
      <PresetChips
        mode={content.mode}
        onPick={content.handlePreset}
        preset={content.preset}
      />
      <span className={styles.label}>{copy.stressLabel}</span>
      <StressChips mode={content.mode} onPick={content.handleMode} />
      <RepeatStepper onStep={content.handleStep} repeat={content.repeat} />
      <div className={styles.actions}>
        <button
          aria-label={copy.applyLabel}
          className={styles.primary}
          disabled={!content.canApply || content.isBusy}
          onClick={content.handleApply}
          type="button"
        >
          {copy.apply}
        </button>
        <button
          className={styles.secondary}
          disabled={!content.canReset || content.isBusy}
          onClick={content.handleReset}
          type="button"
        >
          {copy.reset}
        </button>
      </div>
      <DataFillDialog
        directionId={props.directionId}
        projectId={props.projectId}
        target={props.target}
      />
      <span className={styles.error} role="alert">
        {content.error}
      </span>
    </fieldset>
  );
};

export { ContentPanel };
