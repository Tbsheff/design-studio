import type { SelectionContext } from "@design-studio/contracts";
import { useCallback, useRef } from "react";
import type { ReactElement } from "react";

import { AutoLayoutRow } from "./auto-layout-row.js";
import { AutoLayoutSkipNote } from "./auto-layout-skip-note.js";
import type { ElementClasses } from "./element-classes-model.js";
import { FlexControls } from "./flex-controls.js";
import { GridControls } from "./grid-controls.js";
import { isFlexDisplay, isGridDisplay } from "./sizing-model.js";
import { SpaceStackNote } from "./space-stack-note.js";
import { useAutoLayout } from "./use-auto-layout.js";
import type { DirectEdit } from "./use-direct-edit.js";
import { setEdit, useLayoutKeys } from "./use-layout-keys.js";
import { useSpaceStack } from "./use-space-stack.js";

interface Props {
  readonly edit: DirectEdit;
  readonly selection: SelectionContext | null;
  readonly classes: ElementClasses | null;
}

const AutoLayoutBody = ({ edit, selection, classes }: Props): ReactElement => {
  const root = useRef<HTMLDivElement>(null);
  const isFlex = isFlexDisplay(edit.values.display);
  const isGrid = isGridDisplay(edit.values.display);
  const layout = useAutoLayout(edit, selection);
  const { handleAdd: addLayout, isPending, skipNote } = layout;
  const { stack, stackEdit } = useSpaceStack(edit, classes);
  const isStackLocked = stack !== null && !stack.isEditable;

  const handleAdd = useCallback((): void => {
    if (
      !isPending &&
      !isStackLocked &&
      !isFlexDisplay(edit.values.display) &&
      !isGridDisplay(edit.values.display)
    ) {
      addLayout();
    }
  }, [addLayout, edit, isPending, isStackLocked]);

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
        canAdd={!isFlex && !isGrid && !isPending && stack === null}
        onAdd={handleAdd}
      />
      {skipNote !== null && <AutoLayoutSkipNote note={skipNote} />}
      {stack !== null && <SpaceStackNote stack={stack} />}
      {isFlex && <FlexControls edit={edit} />}
      {stackEdit !== null && <FlexControls edit={stackEdit} />}
      {isGrid && <GridControls edit={edit} />}
    </div>
  );
};

export { AutoLayoutBody };
