import { useCallback } from "react";
import type { ChangeEvent, ReactElement } from "react";

import { copy } from "./copy.js";
import { EFFECT_KINDS } from "./deps.js";
import type { EffectKind } from "./deps.js";

import styles from "./effect.module.css";

interface EffectAddMenuProps {
  readonly disabled: boolean;
  readonly onAdd: (kind: EffectKind) => void;
}

const EffectAddMenu = ({
  disabled,
  onAdd,
}: EffectAddMenuProps): ReactElement => {
  const handlePick = useCallback(
    (event: ChangeEvent<HTMLSelectElement>): void => {
      const picked = EFFECT_KINDS.find((kind) => kind === event.target.value);

      event.target.value = "";

      if (picked) {
        onAdd(picked);
      }
    },
    [onAdd]
  );

  return (
    <label className="ins-field select" data-tip={copy.addTip}>
      <span className={styles.label}>{copy.add}</span>
      <select
        aria-label={copy.add}
        className="ins-input"
        defaultValue=""
        disabled={disabled}
        onChange={handlePick}
      >
        <option value="">{copy.add}</option>
        {EFFECT_KINDS.map((kind) => (
          <option key={kind} value={kind}>
            {copy.kind[kind]}
          </option>
        ))}
      </select>
    </label>
  );
};

export { EffectAddMenu };
