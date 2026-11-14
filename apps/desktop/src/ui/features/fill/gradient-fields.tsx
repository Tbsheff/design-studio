import { useCallback } from "react";
import type { ReactElement } from "react";

import { AngleSelect } from "./angle-select.js";
import { copy } from "./copy.js";
import type { DirectEdit } from "./deps.js";
import { colorStop, selectedStop } from "./fill-model.js";
import type { FillDraft } from "./fill-model.js";
import { FormSelect } from "./form-select.js";
import { PaintField } from "./paint-field.js";
import { StopBar } from "./stop-bar.js";

import styles from "./fill.module.css";

interface GradientFieldsProps {
  readonly disabled: boolean;
  readonly draft: FillDraft;
  readonly edit: DirectEdit;
  readonly onDraft: (next: FillDraft) => void;
  readonly onEnter: () => void;
}

const GradientFields = ({
  disabled,
  draft,
  edit,
  onDraft,
  onEnter,
}: GradientFieldsProps): ReactElement => {
  const stop = selectedStop(draft);
  const index = draft.stops.findIndex((item) => item.id === draft.selected);

  const handleColor = useCallback(
    (color: string): void => {
      onDraft(colorStop(draft, draft.selected, color));
    },
    [draft, onDraft]
  );

  return (
    <div className={styles.gradient}>
      <StopBar disabled={disabled} draft={draft} onDraft={onDraft} />
      <p className={styles.hint}>{copy.addHint}</p>
      {stop && (
        <PaintField
          color={stop.color}
          edit={edit}
          label={`${copy.stopColorLabel} ${index + 1}`}
          short={`${copy.stopColor} ${index + 1}`}
          onColor={handleColor}
          onEnter={onEnter}
        />
      )}
      {draft.type === "linear" && (
        <AngleSelect disabled={disabled} draft={draft} onDraft={onDraft} />
      )}
      {draft.type === "radial" && (
        <FormSelect disabled={disabled} draft={draft} onDraft={onDraft} />
      )}
    </div>
  );
};

export { GradientFields };
