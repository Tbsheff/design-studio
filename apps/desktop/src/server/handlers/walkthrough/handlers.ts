// @generated
import type { WalkthroughActions } from "@design-studio/actions/walkthrough/index";

import type { Entries } from "../_core/handler.js";
import { handle as getWalkthroughHandle } from "./get.js";
import { handle as runWalkthroughHandle } from "./run.js";

const WalkthroughEntries = {
  getWalkthrough: { handle: getWalkthroughHandle },
  runWalkthrough: { handle: runWalkthroughHandle },
} satisfies Entries<typeof WalkthroughActions>;

export { WalkthroughEntries };
