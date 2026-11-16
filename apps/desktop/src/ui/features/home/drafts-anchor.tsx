import { Suspense, useCallback } from "react";
import type { ReactElement, RefObject } from "react";

import { toDraftsLabel } from "../../domain/draft-counts.js";
import type { PopState } from "./composer-pop-model.js";
import { copy } from "./copy.js";
import type { DesignCount } from "./home-model.js";
import { DraftsPopover } from "./lazy-parts-model.js";
import { PillSelect } from "./pill-select.js";

interface DraftsAnchorProps {
  readonly pops: PopState;
  readonly triggerRef: RefObject<HTMLButtonElement | null>;
  readonly designs: DesignCount;
}

const DraftsAnchor = ({
  pops,
  triggerRef,
  designs,
}: DraftsAnchorProps): ReactElement => {
  const { toggle, close } = pops;

  const open = useCallback((): void => {
    toggle("drafts");
  }, [toggle]);

  return (
    <div className="home-anchor end">
      <PillSelect
        label={copy.drafts}
        ariaLabel={copy.drafts}
        value={toDraftsLabel(designs.value)}
        isOpen={pops.pop === "drafts"}
        triggerRef={triggerRef}
        onOpen={open}
      />
      {pops.shown === "drafts" && (
        <Suspense fallback={null}>
          <DraftsPopover
            trigger={triggerRef}
            isClosing={pops.isClosing}
            onClose={close}
            designs={designs}
          />
        </Suspense>
      )}
    </div>
  );
};

export { DraftsAnchor };
