import { Icon } from "@design-studio/ui";
import { useCallback, useMemo } from "react";
import type { ReactElement } from "react";

import { BorderGrid } from "./border-grid.js";
import { copy } from "./copy.js";
import type { DirectEdit } from "./deps.js";
import { InspectorSection } from "./inspector-section.js";
import { AddButton } from "./inspector-shared.js";
import { NEW_BORDER, applyEdit, hasBorder } from "./simple-model.js";

interface BorderSectionProps {
  readonly edit: DirectEdit;
}

const BorderSection = ({ edit }: BorderSectionProps): ReactElement => {
  const isOn = hasBorder(edit);

  const addBorder = useCallback(() => applyEdit(edit, NEW_BORDER), [edit]);

  const removeBorder = useCallback(
    () => applyEdit(edit, { "border-style": "none", "border-width": "0px" }),
    [edit]
  );

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
          <AddButton label={copy.border} onClick={addBorder} />
        </div>
      )}
      {isOn && <BorderGrid edit={edit} />}
    </InspectorSection>
  );
};

export { BorderSection };
