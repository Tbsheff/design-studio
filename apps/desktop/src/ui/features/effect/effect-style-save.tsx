import { useCallback, useState } from "react";
import type { ChangeEvent, FormEvent, ReactElement } from "react";

import { copy } from "./copy.js";
import { EFFECT_NAME_PATTERN } from "./deps.js";

import styles from "./effect.module.css";

interface EffectStyleSaveProps {
  readonly canSave: boolean;
  readonly disabled: boolean;
  readonly onSave: (name: string) => void;
}

const EffectStyleSave = ({
  canSave,
  disabled,
  onSave,
}: EffectStyleSaveProps): ReactElement => {
  const [name, setName] = useState("");
  const isValid = EFFECT_NAME_PATTERN.test(name);

  const handleName = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      setName(event.target.value.trim().toLowerCase());
    },
    []
  );

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>): void => {
      event.preventDefault();

      if (isValid && canSave) {
        onSave(name);
        setName("");
      }
    },
    [canSave, isValid, name, onSave]
  );

  return (
    <form className={styles.saveRow} onSubmit={handleSubmit}>
      <input
        aria-label={copy.styleName}
        className="ins-input"
        disabled={disabled}
        placeholder={copy.styleName}
        spellCheck={false}
        type="text"
        value={name}
        onChange={handleName}
      />
      <button
        className={styles.save}
        data-tip={copy.saveTip}
        disabled={disabled || !canSave || !isValid}
        type="submit"
      >
        {copy.saveStyle}
      </button>
    </form>
  );
};

export { EffectStyleSave };

export type { EffectStyleSaveProps };
