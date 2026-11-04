import type { ReactElement } from "react";

import { CheckRow } from "./check-row.js";
import { ClassField } from "./class-field.js";
import { copy } from "./copy.js";
import type { VariantGroup } from "./deps.js";
import { FromField } from "./from-field.js";
import { NameField } from "./name-field.js";
import type { VariantDraftState } from "./use-variant-draft.js";
import { optionOf } from "./variant-model.js";
import type { SheetMode } from "./variant-model.js";

import styles from "./component-variant.module.css";

interface SheetFieldsProps {
  readonly group: VariantGroup;
  readonly known: readonly string[];
  readonly mode: SheetMode;
  readonly state: VariantDraftState;
}

const SheetFields = (props: SheetFieldsProps): ReactElement => {
  const { group, mode, state } = props;
  const { draft, isPending } = state;
  const option = optionOf(group, draft.from);
  const locked = mode === "edit" && option !== null && !option.editable;

  return (
    <div className={styles.fields}>
      <FromField
        disabled={isPending}
        group={group}
        mode={mode}
        value={draft.from}
        onChange={state.handlePick}
      />
      <NameField
        disabled={isPending || locked}
        state={state.nameState}
        value={draft.name}
        onChange={state.handleNameEdit}
      />
      {locked && <p className={styles.note}>{copy.notEditable}</p>}
      <ClassField
        disabled={isPending || locked}
        known={props.known}
        value={draft.classes}
        onChange={state.handleClassesEdit}
      />
      <CheckRow
        checked={draft.setDefault}
        disabled={isPending}
        label={copy.setDefault}
        onToggle={state.handleDefaultToggle}
      />
      <CheckRow
        checked={draft.shouldUseOnSelected}
        disabled={isPending}
        label={copy.applyToSelected}
        onToggle={state.handleUseToggle}
      />
    </div>
  );
};

export { SheetFields };
