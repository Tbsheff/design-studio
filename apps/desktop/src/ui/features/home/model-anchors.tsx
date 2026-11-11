import type { ReactElement } from "react";

import type { PopState } from "./composer-pop-model.js";
import { DraftsAnchor } from "./drafts-anchor.js";
import { LevelAnchor } from "./level-anchor.js";
import { ModelAnchor } from "./model-anchor.js";
import type { ModelSettings } from "./model-settings-model.js";
import type { PopRefs } from "./use-composer-pops.js";

interface ModelAnchorsProps {
  readonly pops: PopState;
  readonly refs: PopRefs;
  readonly modelValue: string;
  readonly modelSizes: string[];
  readonly modelSettings: ModelSettings;
}

const ModelAnchors = ({
  pops,
  refs,
  modelValue,
  modelSizes,
  modelSettings,
}: ModelAnchorsProps): ReactElement => (
  <>
    <LevelAnchor
      pops={pops}
      triggerRef={refs.level}
      modelSettings={modelSettings}
    />
    <ModelAnchor
      pops={pops}
      triggerRef={refs.model}
      modelValue={modelValue}
      modelSizes={modelSizes}
      modelSettings={modelSettings}
    />
    <DraftsAnchor
      pops={pops}
      triggerRef={refs.drafts}
      designs={modelSettings.designs}
    />
  </>
);

export { ModelAnchors };

export type { ModelAnchorsProps };
