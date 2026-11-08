import { UiSelect } from "@design-studio/ui";
import type { UiSelectOption } from "@design-studio/ui";
import { useCallback } from "react";
import type { ReactElement } from "react";

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

const BLEND_OPTIONS: readonly UiSelectOption<BlendMode>[] = BLEND_MODES.map(
  (mode) => ({ label: blendLabel(mode), value: mode })
);

const BlendSelect = ({
  disabled,
  draft,
  onDraft,
}: BlendSelectProps): ReactElement => {
  const value = draft.blend ?? NORMAL;

  const pickBlend = useCallback(
    (mode: BlendMode): void => {
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
      <UiSelect
        aria-label={`${copy.blendLabel}: ${blendLabel(value)}`}
        disabled={disabled}
        id={BLEND_ID}
        options={BLEND_OPTIONS}
        size="sm"
        value={value}
        onChange={pickBlend}
      />
    </div>
  );
};

export { BlendSelect };
