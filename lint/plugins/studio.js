import { actionVerb, agentOffReason } from "./studio/action-rules.js";
import {
  noDeepAreaImport,
  noLocalErrorBridge,
  noOutputGuess,
  noStubRoute,
} from "./studio/server-rules.js";
import {
  noCacheTtl,
  noDesktopGlobal,
  noPromiseCast,
  noWildcardReexport,
  readNeedsInput,
} from "./studio/ui-rules.js";

const studio = {
  meta: { name: "studio" },
  rules: {
    "action-verb": actionVerb,
    "agent-off-reason": agentOffReason,
    "no-cache-ttl": noCacheTtl,
    "no-deep-area-import": noDeepAreaImport,
    "no-desktop-global": noDesktopGlobal,
    "no-local-error-bridge": noLocalErrorBridge,
    "no-output-guess": noOutputGuess,
    "no-promise-cast": noPromiseCast,
    "no-stub-route": noStubRoute,
    "no-wildcard-reexport": noWildcardReexport,
    "read-needs-input": readNeedsInput,
  },
};

export default studio;
