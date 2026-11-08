import { useCallback } from "react";
import type { ReactElement } from "react";

import { AddShortcutButton } from "./add-shortcut-button.js";
import { DISPLAYS } from "./auto-layout-model.js";
import { SelectField } from "./select-field.js";
import type { DirectEdit } from "./use-direct-edit.js";
import { setEdit } from "./use-layout-keys.js";

interface Props {
  readonly edit: DirectEdit;
  readonly canAdd: boolean;
}

const AutoLayoutRow = ({ edit, canAdd }: Props): ReactElement => {
  const handleAdd = useCallback((): void => {
    setEdit(edit, { display: "flex" });
  }, [edit]);

  return (
    <div className="ins-layout-row">
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
          onClick={handleAdd}
        />
      )}
    </div>
  );
};

export { AutoLayoutRow };
