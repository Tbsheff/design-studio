import type { ComponentType } from "react";

import type { LinkInteractionEditorProps } from "./features/link-interaction/index.js";
import {
  bridgeTrigger,
  readPlayVars,
  resetPlayVars,
  runLink,
} from "./features/link-interaction/play-runtime.js";
import type { PlayHandlers } from "./features/link-interaction/play-runtime.js";
import { usePlayTriggers } from "./features/link-interaction/use-play-triggers.js";

interface LinkInteractionLoaded {
  readonly LinkInteractionEditor: ComponentType<LinkInteractionEditorProps>;
}

const loadLinkInteraction = async (): Promise<LinkInteractionLoaded> => {
  const mod = await import("./features/link-interaction/index.js");

  return { LinkInteractionEditor: mod.LinkInteractionEditor };
};

export {
  bridgeTrigger,
  loadLinkInteraction,
  readPlayVars,
  resetPlayVars,
  runLink,
  usePlayTriggers,
};

export type { PlayHandlers };
