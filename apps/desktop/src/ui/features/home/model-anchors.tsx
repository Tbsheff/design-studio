import type { ReactElement, RefObject } from "react";

import type { PopState } from "./composer-pop-model.js";
import { LevelAnchor } from "./level-anchor.js";
import { ModelAnchor } from "./model-anchor.js";
import type { ModelSettings } from "./model-settings-model.js";

interface ModelAnchorsProps {
  readonly pops: PopState;
  readonly levelRef: RefObject<HTMLButtonElement | null>;
  readonly modelRef: RefObject<HTMLButtonElement | null>;
  readonly modelValue: string;
  readonly modelSizes: string[];
  readonly modelSettings: ModelSettings;
}

const ModelAnchors = ({
  pops,
  levelRef,
  modelRef,
  modelValue,
  modelSizes,
  modelSettings,
}: ModelAnchorsProps): ReactElement => (
  <>
    <LevelAnchor
      pops={pops}
      triggerRef={levelRef}
      modelSettings={modelSettings}
    />
    <ModelAnchor
      pops={pops}
      triggerRef={modelRef}
      modelValue={modelValue}
      modelSizes={modelSizes}
      modelSettings={modelSettings}
    />
  </>
);

export { ModelAnchors };

export type { ModelAnchorsProps };
