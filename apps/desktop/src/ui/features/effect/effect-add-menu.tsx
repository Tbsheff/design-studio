import { UiSelect } from "@design-studio/ui";
import type { UiSelectOption } from "@design-studio/ui";
import { useCallback } from "react";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { EFFECT_KINDS } from "./deps.js";
import type { EffectKind } from "./deps.js";

import styles from "./effect.module.css";

interface EffectAddMenuProps {
  readonly disabled: boolean;
  readonly onAdd: (kind: EffectKind) => void;
}

const ADD_ID = "effect-add";

const KIND_OPTIONS: readonly UiSelectOption[] = EFFECT_KINDS.map((kind) => ({
  label: copy.kind[kind],
  value: kind,
}));

const EffectAddMenu = ({
  disabled,
  onAdd,
}: EffectAddMenuProps): ReactElement => {
  const addKind = useCallback(
    (next: string): void => {
      const picked = EFFECT_KINDS.find((kind) => kind === next);

      if (picked) {
        onAdd(picked);
      }
    },
    [onAdd]
  );

  return (
    <div className="ins-field select">
      <label className={styles.label} htmlFor={ADD_ID}>
        {copy.add}
      </label>
      <UiSelect
        aria-label={copy.add}
        disabled={disabled}
        id={ADD_ID}
        options={KIND_OPTIONS}
        placeholder={copy.add}
        tip={copy.addTip}
        value=""
        onChange={addKind}
      />
    </div>
  );
};

export { EffectAddMenu };
