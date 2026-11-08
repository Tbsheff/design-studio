import { Icon } from "@design-studio/ui";
import { Suspense, useCallback, useMemo } from "react";
import type { ReactElement, RefObject } from "react";

import type { PopState } from "./composer-pop-model.js";
import { copy } from "./copy.js";
import { PlusMenu, loadPops } from "./lazy-parts.js";
import type { PlusMenuActions } from "./plus-menu-model.js";

const PLUS_ICON_SIZE = 16;

interface PlusAnchorProps {
  readonly pops: PopState;
  readonly triggerRef: RefObject<HTMLButtonElement | null>;
  readonly locationLabel: string;
  readonly plusActions: Omit<PlusMenuActions, "onDesignSystem">;
  readonly onDesignSystem: () => void;
}

const PlusAnchor = ({
  pops,
  triggerRef,
  locationLabel,
  plusActions,
  onDesignSystem,
}: PlusAnchorProps): ReactElement => {
  const { toggle, close } = pops;

  const togglePlus = useCallback((): void => {
    toggle("plus");
  }, [toggle]);

  const preload = useCallback((): void => {
    loadPops();
  }, []);

  const actions = useMemo(
    () => ({ ...plusActions, onDesignSystem }),
    [onDesignSystem, plusActions]
  );

  return (
    <div className="home-anchor">
      <button
        ref={triggerRef}
        type="button"
        className="icon-btn bordered home-square"
        aria-label={copy.add}
        aria-haspopup="menu"
        aria-expanded={pops.pop === "plus"}
        data-tip={copy.attachImportAndOptions}
        data-tip-align="start"
        onPointerEnter={preload}
        onClick={togglePlus}
      >
        <Icon name="plus" size={PLUS_ICON_SIZE} />
      </button>
      {pops.shown === "plus" && (
        <Suspense fallback={null}>
          <PlusMenu
            trigger={triggerRef}
            isClosing={pops.isClosing}
            onClose={close}
            locationLabel={locationLabel}
            actions={actions}
          />
        </Suspense>
      )}
    </div>
  );
};

export { PlusAnchor };
