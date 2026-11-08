import type { RunLevel } from "@design-studio/contracts";

import type { DesignCount } from "./home-model.js";

interface ModelSettings {
  readonly model: string;
  readonly onModel: (model: string) => void;
  readonly level: RunLevel;
  readonly onLevel: (level: RunLevel) => void;
  readonly designs: DesignCount;
  readonly onMore: () => void;
}

export type { ModelSettings };
