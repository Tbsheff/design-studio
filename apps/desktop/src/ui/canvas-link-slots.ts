import {
  bridgeTrigger,
  runLink,
} from "./features/link-interaction/play-runtime.js";
import type { PlayHandlers } from "./features/link-interaction/play-runtime.js";
import { usePlayTriggers } from "./features/link-interaction/use-play-triggers.js";

const loadLinkInteraction = () =>
  import("./features/link-interaction/index.js");

export { bridgeTrigger, loadLinkInteraction, runLink, usePlayTriggers };

export type { PlayHandlers };
