import type { ReactElement } from "react";

import { AddShortcutButton } from "./add-shortcut-button.js";
import { DISPLAYS } from "./auto-layout-model.js";
import { SelectField } from "./select-field.js";
import type { DirectEdit } from "./use-direct-edit.js";

interface Props {
  readonly edit: DirectEdit;
  readonly canAdd: boolean;
  readonly onAdd: () => void;
}

const AutoLayoutRow = ({ edit, canAdd, onAdd }: Props): ReactElement => (
  <div className="ins-layout-row ins-display-row">
    <SelectField
      prop="display"
      label="Display"
      short="Display"
      edit={edit}
      options={DISPLAYS}
    />
    {canAdd && (
      <AddShortcutButton
        label="Auto layout"
        tip="Add auto layout ⇧A"
        shortcut="Shift+A"
        onClick={onAdd}
      />
    )}
  </div>
);

export { AutoLayoutRow };
