import type { ReactElement, RefObject } from "react";

import type { PopState } from "./composer-pop-model.js";
import { DraftsAnchor } from "./drafts-anchor.js";
import { LevelAnchor } from "./level-anchor.js";
import { ModelAnchor } from "./model-anchor.js";
import type { ModelSettings } from "./model-settings-model.js";

interface ModelAnchorsProps {
  readonly pops: PopState;
  readonly levelRef: RefObject<HTMLButtonElement | null>;
  readonly modelRef: RefObject<HTMLButtonElement | null>;
  readonly draftsRef: RefObject<HTMLButtonElement | null>;
  readonly modelValue: string;
  readonly modelSizes: string[];
  readonly modelSettings: ModelSettings;
}

const ModelAnchors = ({
  pops,
  levelRef,
  modelRef,
  draftsRef,
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
    <DraftsAnchor
      pops={pops}
      triggerRef={draftsRef}
      designs={modelSettings.designs}
    />
  </>
);

export { ModelAnchors };

export type { ModelAnchorsProps };
