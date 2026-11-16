import type { RunLevel } from "@design-studio/contracts";
import type { ReactElement, Ref } from "react";
import { createPortal } from "react-dom";

import { useDocumentBody } from "../../platform/document-body.js";
import { pick } from "../../platform/pick.js";
import type { UsePlacedPopoverResult } from "./composer-menu-model.js";
import { copy } from "./copy.js";
import { ModelGroup } from "./model-group.js";

const ModelPopover = ({
  panel,
  pop,
  shown,
  level,
  isLocked,
  onModel,
}: {
  panel: Ref<HTMLDialogElement>;
  pop: UsePlacedPopoverResult;
  shown: string;
  level: RunLevel;
  isLocked: boolean;
  onModel: (id: string) => void;
}): ReactElement | null => {
  const body = useDocumentBody();

  if (!pop.shown || !body) {
    return null;
  }

  const popElement = (
    <dialog
      open
      className="run-settings-pop"
      ref={panel}
      data-closing={pick(pop.closing, "true", null)}
      inert={pop.closing}
      style={pop.style}
      aria-label={copy.model}
      data-testid="run-settings-popover"
    >
      <ModelGroup
        shown={shown}
        level={level}
        isLocked={isLocked}
        onModel={onModel}
      />
    </dialog>
  );

  return <>{createPortal(popElement, body)}</>;
};

export { ModelPopover };
