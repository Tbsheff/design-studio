import { useMemo } from "react";
import type { ReactElement } from "react";

import { AccessibilityBody } from "./accessibility-body.js";
import { AccessibilityNote } from "./accessibility-note.js";
import { copy } from "./copy.js";
import type { SelectionContext } from "./deps.js";
import { useAccessibilityHandlers } from "./use-accessibility-handlers.js";
import { useAccessibility } from "./use-accessibility.js";

interface AccessibilitySectionProps {
  readonly directionId: string;
  readonly projectId: string;
  readonly target: SelectionContext;
}

const AccessibilitySection = ({
  directionId,
  projectId,
  target,
}: AccessibilitySectionProps): ReactElement => {
  const ids = useMemo(
    () => ({ directionId, projectId }),
    [directionId, projectId]
  );

  const accessibility = useAccessibility(ids, target);
  const handlers = useAccessibilityHandlers(accessibility);

  return (
    <>
      {target.source === null && (
        <AccessibilityNote isError={false} text={copy.noSource} />
      )}
      <AccessibilityBody
        accessibility={accessibility}
        handlers={handlers}
        target={target}
      />
      <AccessibilityNote isError text={accessibility.error} />
    </>
  );
};

export { AccessibilitySection };

export type { AccessibilitySectionProps };
