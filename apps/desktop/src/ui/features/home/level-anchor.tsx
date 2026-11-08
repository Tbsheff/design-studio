import { Suspense, useCallback } from "react";
import type { ReactElement, RefObject } from "react";

import type { PopState } from "./composer-pop-model.js";
import { copy } from "./copy.js";
import { LEVEL_LABEL } from "./home-model.js";
import { LevelPopover } from "./lazy-parts-model.js";
import type { ModelSettings } from "./model-settings-model.js";
import { PillSelect } from "./pill-select.js";

interface LevelAnchorProps {
  readonly pops: PopState;
  readonly triggerRef: RefObject<HTMLButtonElement | null>;
  readonly modelSettings: ModelSettings;
}

const LevelAnchor = ({
  pops,
  triggerRef,
  modelSettings,
}: LevelAnchorProps): ReactElement => {
  const { toggle, close } = pops;
  const { level, onLevel } = modelSettings;

  const open = useCallback((): void => {
    toggle("level");
  }, [toggle]);

  return (
    <div className="home-anchor end">
      <PillSelect
        label={copy.levelLabel}
        ariaLabel={copy.levelLabel}
        value={LEVEL_LABEL[modelSettings.level]}
        sizes={Object.values(LEVEL_LABEL)}
        isOpen={pops.pop === "level"}
        triggerRef={triggerRef}
        onOpen={open}
      />
      {pops.shown === "level" && (
        <Suspense fallback={null}>
          <LevelPopover
            trigger={triggerRef}
            isClosing={pops.isClosing}
            onClose={close}
            level={level}
            onLevel={onLevel}
          />
        </Suspense>
      )}
    </div>
  );
};

export { LevelAnchor };
