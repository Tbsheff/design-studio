import { useCallback } from "react";
import type { ChangeEvent, ReactElement } from "react";

import { copy, FORM_LABELS } from "./copy.js";
import { RADIAL_FORMS } from "./deps.js";
import type { RadialForm } from "./deps.js";
import type { FillDraft } from "./fill-model.js";

import styles from "./fill.module.css";

interface FormSelectProps {
  readonly disabled: boolean;
  readonly draft: FillDraft;
  readonly onDraft: (next: FillDraft) => void;
}

const FORM_ID = "fill-form";

const FormSelect = ({
  disabled,
  draft,
  onDraft,
}: FormSelectProps): ReactElement => {
  const handlePick = useCallback(
    (event: ChangeEvent<HTMLSelectElement>): void => {
      onDraft({ ...draft, form: event.target.value as RadialForm });
    },
    [draft, onDraft]
  );

  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={FORM_ID}>
        {copy.form}
      </label>
      <select
        aria-label={`${copy.formLabel}: ${FORM_LABELS[draft.form]}`}
        className={styles.select}
        disabled={disabled}
        id={FORM_ID}
        value={draft.form}
        onChange={handlePick}
      >
        {RADIAL_FORMS.map((form) => (
          <option key={form} value={form}>
            {FORM_LABELS[form]}
          </option>
        ))}
      </select>
    </div>
  );
};

export { FormSelect };
