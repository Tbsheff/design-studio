import { Suspense, useCallback } from "react";
import type { ReactElement, RefObject } from "react";

import type { PopState } from "./composer-pop-model.js";
import { copy } from "./copy.js";
import type { ModelSettings } from "./home-popovers.js";
import { ModelPopover } from "./lazy-parts.js";
import { PillSelect } from "./pill-select.js";

interface ModelAnchorProps {
  readonly pops: PopState;
  readonly triggerRef: RefObject<HTMLButtonElement | null>;
  readonly modelValue: string;
  readonly modelSizes: string[];
  readonly modelSettings: ModelSettings;
}

const ModelAnchor = ({
  pops,
  triggerRef,
  modelValue,
  modelSizes,
  modelSettings,
}: ModelAnchorProps): ReactElement => {
  const { toggle, close } = pops;

  const open = useCallback((): void => {
    toggle("model");
  }, [toggle]);

  return (
    <div className="home-anchor end">
      <PillSelect
        label={copy.modelLabel}
        ariaLabel={copy.modelAndRunSettings}
        value={modelValue}
        sizes={modelSizes}
        isOpen={pops.pop === "model"}
        triggerRef={triggerRef}
        onOpen={open}
      />
      {pops.shown === "model" && (
        <Suspense fallback={null}>
          <ModelPopover
            trigger={triggerRef}
            isClosing={pops.isClosing}
            onClose={close}
            settings={modelSettings}
          />
        </Suspense>
      )}
    </div>
  );
};

export { ModelAnchor };
