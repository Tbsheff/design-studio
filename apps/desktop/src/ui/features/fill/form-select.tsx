import { UiSelect } from "@design-studio/ui";
import type { UiSelectOption } from "@design-studio/ui";
import { useCallback } from "react";
import type { ReactElement } from "react";

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

const FORM_OPTIONS: readonly UiSelectOption<RadialForm>[] = RADIAL_FORMS.map(
  (form) => ({ label: FORM_LABELS[form], value: form })
);

const FormSelect = ({
  disabled,
  draft,
  onDraft,
}: FormSelectProps): ReactElement => {
  const pickForm = useCallback(
    (form: RadialForm): void => {
      onDraft({ ...draft, form });
    },
    [draft, onDraft]
  );

  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={FORM_ID}>
        {copy.form}
      </label>
      <UiSelect
        aria-label={`${copy.formLabel}: ${FORM_LABELS[draft.form]}`}
        disabled={disabled}
        id={FORM_ID}
        options={FORM_OPTIONS}
        size="sm"
        value={draft.form}
        onChange={pickForm}
      />
    </div>
  );
};

export { FormSelect };
