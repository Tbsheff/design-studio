import type { PackSummary } from "@design-studio/contracts";
import { Suspense, useCallback } from "react";
import type { ReactElement, RefObject } from "react";

import { uiStore } from "../../platform/storage.js";
import type { PopState } from "./composer-pop-model.js";
import { copy } from "./copy.js";
import { PackPopover } from "./lazy-parts-model.js";
import { PillSelect } from "./pill-select.js";

interface PackAnchorProps {
  readonly pops: PopState;
  readonly triggerRef: RefObject<HTMLButtonElement | null>;
  readonly pack: PackSummary | null;
  readonly state: Parameters<typeof PackPopover>[0]["state"];
}

const pickPack = (id: string | null): void => {
  uiStore.set({ lastPackId: id });
};

const startNewSystem = (): void => {
  uiStore.set({ returnTo: "home", screen: "new-design-system" });
};

const PackAnchor = ({
  pops,
  triggerRef,
  pack,
  state,
}: PackAnchorProps): ReactElement => {
  const { toggle, close } = pops;

  const open = useCallback((): void => {
    toggle("pack");
  }, [toggle]);

  return (
    <div className="home-anchor end">
      <PillSelect
        label={copy.designSystemLabel}
        ariaLabel={copy.designSystemLabel}
        value={pack?.name ?? copy.noDesignSystemLabel}
        isOpen={pops.pop === "pack"}
        triggerRef={triggerRef}
        onOpen={open}
      />
      {pops.shown === "pack" && (
        <Suspense fallback={null}>
          <PackPopover
            trigger={triggerRef}
            isClosing={pops.isClosing}
            onClose={close}
            state={state}
            value={pack?.id ?? null}
            onChange={pickPack}
            onNew={startNewSystem}
          />
        </Suspense>
      )}
    </div>
  );
};

export { PackAnchor };
