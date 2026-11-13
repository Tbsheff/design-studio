import type { ReactElement } from "react";

import { layoutGridCopy } from "./copy.js";
import { LayoutGridField } from "./layout-grid-field.js";
import type { LayoutGridDraft } from "./layout-grid-model.js";

interface LayoutGridFieldsProps {
  readonly draft: LayoutGridDraft;
  readonly onChange: (field: keyof LayoutGridDraft, value: string) => void;
  readonly onCommit: () => void;
}

const LayoutGridFields = ({
  draft,
  onChange,
  onCommit,
}: LayoutGridFieldsProps): ReactElement => (
  <div className="layout-grid-fields">
    <LayoutGridField
      field="columns"
      label={layoutGridCopy.columns}
      onChange={onChange}
      onCommit={onCommit}
      placeholder={layoutGridCopy.columns}
      value={draft.columns}
    />
    <LayoutGridField
      field="gutter"
      label={layoutGridCopy.gutter}
      onChange={onChange}
      onCommit={onCommit}
      placeholder={layoutGridCopy.gutter}
      value={draft.gutter}
    />
    <LayoutGridField
      field="margin"
      label={layoutGridCopy.margin}
      onChange={onChange}
      onCommit={onCommit}
      placeholder={layoutGridCopy.margin}
      value={draft.margin}
    />
    <LayoutGridField
      field="rowStep"
      label={layoutGridCopy.rowStep}
      onChange={onChange}
      onCommit={onCommit}
      placeholder={layoutGridCopy.rowStepNone}
      value={draft.rowStep}
    />
  </div>
);

export { LayoutGridFields };
