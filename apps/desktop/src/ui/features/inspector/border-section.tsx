import type { SelectionContext } from "@design-studio/contracts";
import { Icon } from "@design-studio/ui";
import { useCallback, useMemo } from "react";
import type { ReactElement } from "react";

import { AddButton } from "./add-button.js";
import { BorderGrid } from "./border-grid.js";
import { NO_BORDER } from "./border-side-model.js";
import { copy } from "./copy.js";
import type { DirectEdit } from "./deps.js";
import type { ElementClasses } from "./element-classes-model.js";
import { InspectorSection } from "./inspector-fields.js";
import { NEW_BORDER, applyEdit, hasBorder } from "./simple-model.js";
import { useStrokePosition } from "./use-stroke-position.js";

interface BorderSectionProps {
  readonly edit: DirectEdit;
  readonly selection: SelectionContext | null;
  readonly classes: ElementClasses | null;
}

const BorderSection = ({
  edit,
  selection,
  classes,
}: BorderSectionProps): ReactElement => {
  const stroke = useStrokePosition(edit, selection, classes);
  const isBorder = hasBorder(edit);
  const isOn = isBorder || stroke.hasStroke;
  const { handleRemove } = stroke;

  const addBorder = useCallback(() => applyEdit(edit, NEW_BORDER), [edit]);

  const removeBorder = useCallback(() => {
    if (isBorder) {
      applyEdit(edit, NO_BORDER);
    }

    if (stroke.hasStroke) {
      handleRemove();
    }
  }, [edit, handleRemove, isBorder, stroke.hasStroke]);

  const removeButton = useMemo(
    () => (
      <button
        type="button"
        className="icon-btn small"
        aria-label={copy.removeBorder}
        data-tip={copy.removeBorder}
        data-tip-align="end"
        onClick={removeBorder}
      >
        <Icon name="close" size={12} />
      </button>
    ),
    [removeBorder]
  );

  return (
    <InspectorSection title={copy.border} aside={isOn && removeButton}>
      {!isOn && (
        <div className="ins-add-row">
          <AddButton label={copy.border} tip={null} onClick={addBorder} />
        </div>
      )}
      {isOn && <BorderGrid edit={edit} stroke={stroke} />}
    </InspectorSection>
  );
};

export { BorderSection };
