import { Icon, UiSelect } from "@design-studio/ui";
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

const PLUS_SIZE = 12;

const PLUS_ICON = <Icon name="plus" size={PLUS_SIZE} />;

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
    <div className={styles.addRow}>
      <UiSelect
        aria-label={copy.add}
        disabled={disabled}
        icon={PLUS_ICON}
        id={ADD_ID}
        options={KIND_OPTIONS}
        placeholder={copy.add}
        size="sm"
        tip={copy.addTip}
        value=""
        onChange={addKind}
      />
    </div>
  );
};

export { EffectAddMenu };
