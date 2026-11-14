import type { SelectionContext } from "@design-studio/contracts";
import type { ReactElement } from "react";

import { textListCopy } from "./copy.js";
import type { DirectEdit } from "./deps.js";
import type { ElementClasses } from "./element-classes-model.js";
import { ListStyleField } from "./list-style-field.js";
import { useListStyle } from "./use-list-style.js";

interface ListStyleRowProps {
  readonly classes: ElementClasses | null;
  readonly edit: DirectEdit;
  readonly selection: SelectionContext | null;
}

const ListStyleRow = ({
  classes,
  edit,
  selection,
}: ListStyleRowProps): ReactElement | null => {
  const {
    error,
    isReadOnly,
    isReady,
    isShown,
    onPickType,
    onToggleInside,
    style,
  } = useListStyle(edit, selection, classes);

  if (!isShown) {
    return null;
  }

  return (
    <div className="ins-grid">
      <div className="wide">
        <ListStyleField
          isDisabled={isReadOnly || !isReady}
          onPickType={onPickType}
          onToggleInside={onToggleInside}
          listStyle={style}
        />
        {isReadOnly && <p className="ins-note">{textListCopy.readOnly}</p>}
        {error && (
          <p className="ins-note" role="alert">
            {error}
          </p>
        )}
      </div>
    </div>
  );
};

export { ListStyleRow };
