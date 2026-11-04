import { useCallback, useState } from "react";
import type { ChangeEvent, FormEvent, ReactElement } from "react";

import { copy } from "./copy.js";
import { PropKindChip } from "./prop-kind-chip.js";
import { isPropName, KINDS, toSuggestedName } from "./prop-model.js";
import type { MakeKind, PropLayer } from "./prop-model.js";

import styles from "./prop.module.css";

interface PropMakeFormProps {
  readonly isBusy: boolean;
  readonly layer: PropLayer;
  readonly onCreate: (kind: MakeKind, name: string) => void;
}

const PropMakeForm = ({
  isBusy,
  layer,
  onCreate,
}: PropMakeFormProps): ReactElement => {
  const [kind, setKind] = useState<MakeKind>("text");
  const [name, setName] = useState(() => toSuggestedName("text", layer.tag));

  const handleKind = useCallback(
    (next: MakeKind): void => {
      setKind(next);
      setName(toSuggestedName(next, layer.tag));
    },
    [layer.tag]
  );

  const handleName = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => setName(event.target.value),
    []
  );

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>): void => {
      event.preventDefault();
      onCreate(kind, name);
    },
    [kind, name, onCreate]
  );

  const isValid = isPropName(name);
  let submitLabel: string = copy.create;

  if (isBusy) {
    submitLabel = copy.creating;
  }

  return (
    <form className={styles.form} noValidate onSubmit={handleSubmit}>
      <p className={styles.note}>{copy.layerHint}</p>
      <fieldset className={styles.chips}>
        <legend className={styles.note}>{copy.kindLabel}</legend>
        {KINDS.map((option) => (
          <PropKindChip
            isSelected={option.id === kind}
            key={option.id}
            onSelect={handleKind}
            option={option}
          />
        ))}
      </fieldset>
      <label className={styles.field}>
        {copy.nameLabel}
        <input
          aria-invalid={!isValid}
          className={styles.input}
          name="name"
          onChange={handleName}
          placeholder={copy.namePlaceholder}
          value={name}
        />
      </label>
      {!isValid && <span className={styles.error}>{copy.nameProblem}</span>}
      <div className={styles.rowActions}>
        <button
          className={styles.primary}
          disabled={isBusy || !isValid}
          type="submit"
        >
          {submitLabel}
        </button>
      </div>
    </form>
  );
};

export { PropMakeForm };
