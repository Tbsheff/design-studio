import { useCallback } from "react";
import type { ChangeEvent, ReactElement } from "react";

import { blendLabel, copy } from "./copy.js";
import { BLEND_MODES } from "./deps.js";
import type { BlendMode } from "./deps.js";
import type { FillDraft } from "./fill-model.js";

import styles from "./fill.module.css";

interface BlendSelectProps {
  readonly disabled: boolean;
  readonly draft: FillDraft;
  readonly onDraft: (next: FillDraft) => void;
}

const BLEND_ID = "fill-blend";
const NORMAL: BlendMode = "normal";

const BlendSelect = ({
  disabled,
  draft,
  onDraft,
}: BlendSelectProps): ReactElement => {
  const value = draft.blend ?? NORMAL;

  const handlePick = useCallback(
    (event: ChangeEvent<HTMLSelectElement>): void => {
      const mode = event.target.value as BlendMode;

      if (mode === NORMAL && draft.blend === null) {
        return;
      }

      onDraft({ ...draft, blend: mode });
    },
    [draft, onDraft]
  );

  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={BLEND_ID}>
        {copy.blend}
      </label>
      <select
        aria-label={`${copy.blendLabel}: ${blendLabel(value)}`}
        className={styles.select}
        disabled={disabled}
        id={BLEND_ID}
        value={value}
        onChange={handlePick}
      >
        {BLEND_MODES.map((mode) => (
          <option key={mode} value={mode}>
            {blendLabel(mode)}
          </option>
        ))}
      </select>
    </div>
  );
};

export { BlendSelect };
