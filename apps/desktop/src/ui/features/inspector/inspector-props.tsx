import type { SelectionContext } from "@design-studio/contracts";
import type { ComponentSchema } from "@design-studio/contracts/props";
import type { ReactElement } from "react";

import { ComponentPreviewThumb } from "../design-system/component-preview-thumb.js";
import { AuthorSheet } from "./author-sheet.js";
import { copy } from "./copy.js";
import { InspectorSection } from "./inspector-fields.js";
import { PropRows } from "./prop-rows.js";
import { PropsChip } from "./props-chip.js";
import { PropsFooter } from "./props-footer.js";
import { usePropsPanel } from "./use-props-panel.js";

interface InspectorPropsPanelProps {
  readonly projectId: string;
  readonly directionId: string | null;
  readonly selection: SelectionContext;
  readonly isEditable: boolean;
}

const toPropsAside = (component: ComponentSchema): ReactElement => (
  <PropsChip component={component} />
);

const InspectorPropsPanel = ({
  projectId,
  directionId,
  selection,
  isEditable,
}: InspectorPropsPanelProps): ReactElement | null => {
  const panel = usePropsPanel({
    directionId,
    isEditable,
    projectId,
    selection,
  });

  const { instance, status, sheet, isStylesOpen, onChange, setStatus } = panel;
  const { onToggleStyles, onOpenSheet: handleOpenSheet } = panel;
  const { onCloseSheet: handleCloseSheet } = panel;
  const component = instance?.component;

  if (!instance || !component || !directionId) {
    return null;
  }

  return (
    <InspectorSection
      title={copy.component}
      modifier="prp"
      aside={toPropsAside(component)}
    >
      <p className="prp-where">
        {`${copy.usedAt}${instance.use.file}:${instance.use.line}`}
      </p>
      {component.file.startsWith("packages/") && (
        <div className="prp-kit" data-testid="kit-preview">
          <ComponentPreviewThumb
            projectId={projectId}
            directionId={directionId}
            id={`${component.file}#${component.name}`}
            version="0"
            active
          />
          <p
            className="prp-where"
            data-tip={`${component.file}:${component.line}`}
          >
            {copy.kitComponentDefaultProps}
          </p>
        </div>
      )}
      {component.props.length === 0 && (
        <p className="ins-note">{copy.noPropsToEditHere}</p>
      )}
      <PropRows
        instance={instance}
        component={component}
        isDisabled={!isEditable || status.kind === "saving"}
        onChange={onChange}
        onAuthor={handleOpenSheet}
      />
      <AuthorSheet
        projectId={projectId}
        directionId={directionId}
        instance={instance}
        sheet={sheet}
        onClose={handleCloseSheet}
        onUse={onChange}
        onStatus={setStatus}
      />
      <PropsFooter
        projectId={projectId}
        directionId={directionId}
        instance={instance}
        component={component}
        status={status}
        isEditable={isEditable}
        isStylesOpen={isStylesOpen}
        onToggleStyles={onToggleStyles}
        onStatus={setStatus}
      />
    </InspectorSection>
  );
};

export { InspectorPropsPanel };
