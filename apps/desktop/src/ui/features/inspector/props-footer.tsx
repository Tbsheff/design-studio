import type {
  ComponentInstance,
  ComponentSchema,
} from "@design-studio/contracts/props";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { PropsActions } from "./props-actions.js";
import type { PropsStatus } from "./props-model.js";
import { StatusLine } from "./status-line.js";
import { VariantStyles } from "./variant-styles.js";

interface PropsFooterProps {
  readonly projectId: string;
  readonly directionId: string;
  readonly instance: ComponentInstance;
  readonly component: ComponentSchema;
  readonly status: PropsStatus;
  readonly isEditable: boolean;
  readonly isStylesOpen: boolean;
  readonly onToggleStyles: () => void;
  readonly onStatus: (status: PropsStatus) => void;
}

const PropsFooter = ({
  projectId,
  directionId,
  instance,
  component,
  status,
  isEditable,
  isStylesOpen,
  onToggleStyles,
  onStatus,
}: PropsFooterProps): ReactElement => (
  <>
    {instance.spread && (
      <p className="ins-note">{copy.thisElementAlsoSpreads}</p>
    )}
    {component.note && <p className="ins-note">{component.note}</p>}
    <StatusLine status={status} />
    {isEditable && (
      <PropsActions
        projectId={projectId}
        directionId={directionId}
        instance={instance}
        hasStyles={Boolean(component.cva)}
        isStylesOpen={isStylesOpen}
        onStyles={onToggleStyles}
        onStatus={onStatus}
      />
    )}
    {isStylesOpen && (
      <VariantStyles
        projectId={projectId}
        directionId={directionId}
        instance={instance}
        onStatus={onStatus}
      />
    )}
  </>
);

export { PropsFooter };
