import type { SelectionContext } from "@design-studio/contracts";
import { useCallback, useRef } from "react";
import type { ReactElement } from "react";

import { AutoLayoutRow } from "./auto-layout-row.js";
import { FlexControls } from "./flex-controls.js";
import { GridControls } from "./grid-controls.js";
import { isFlexDisplay, isGridDisplay } from "./sizing-model.js";
import { useAutoLayout } from "./use-auto-layout.js";
import type { DirectEdit } from "./use-direct-edit.js";
import { setEdit, useLayoutKeys } from "./use-layout-keys.js";

interface Props {
  readonly edit: DirectEdit;
  readonly selection: SelectionContext | null;
}

const AutoLayoutBody = ({ edit, selection }: Props): ReactElement => {
  const root = useRef<HTMLDivElement>(null);
  const isFlex = isFlexDisplay(edit.values.display);
  const isGrid = isGridDisplay(edit.values.display);
  const layout = useAutoLayout(edit, selection);
  const { handleAdd: addLayout, isPending } = layout;

  const handleAdd = useCallback((): void => {
    if (
      !isPending &&
      !isFlexDisplay(edit.values.display) &&
      !isGridDisplay(edit.values.display)
    ) {
      addLayout();
    }
  }, [addLayout, edit, isPending]);

  const handleRemove = useCallback((): void => {
    if (isFlexDisplay(edit.values.display)) {
      setEdit(edit, { display: "block" });
    }
  }, [edit]);

  useLayoutKeys(root, handleAdd, handleRemove);

  return (
    <div ref={root} className="ins-layout">
      <AutoLayoutRow
        edit={edit}
        canAdd={!isFlex && !isGrid && !isPending}
        onAdd={handleAdd}
      />
      {isFlex && <FlexControls edit={edit} />}
      {isGrid && <GridControls edit={edit} />}
    </div>
  );
};

export { AutoLayoutBody };
