import {
  actionDomainName,
  actionVerb,
  agentOffReason,
  writeNeedsWritePermission,
} from "./studio/action-rules.js";
import { handlerSatisfies, readYieldsReadService } from "./studio/handler-rules.js";
import { noStudioOverride } from "./studio/lint-rules.js";
import {
  noDeepAreaImport,
  noLocalErrorBridge,
  noOutputGuess,
  noStubRoute,
} from "./studio/server-rules.js";
import {
  enginePure,
  noAsyncInService,
  noRuntimeMap,
  serviceTagArea,
} from "./studio/service-rules.js";
import {
  noCacheTtl,
  noDesktopGlobal,
  noPromiseCast,
  noThen,
  noWildcardReexport,
  noWireCast,
  readNeedsInput,
} from "./studio/ui-rules.js";

const studio = {
  meta: { name: "studio" },
  rules: {
    "action-domain-name": actionDomainName,
    "action-verb": actionVerb,
    "agent-off-reason": agentOffReason,
    "engine-pure": enginePure,
    "handler-satisfies": handlerSatisfies,
    "no-async-in-service": noAsyncInService,
    "no-cache-ttl": noCacheTtl,
    "no-deep-area-import": noDeepAreaImport,
    "no-desktop-global": noDesktopGlobal,
    "no-local-error-bridge": noLocalErrorBridge,
    "no-output-guess": noOutputGuess,
    "no-promise-cast": noPromiseCast,
    "no-runtime-map": noRuntimeMap,
    "no-stub-route": noStubRoute,
    "no-studio-override": noStudioOverride,
    "no-then": noThen,
    "no-wildcard-reexport": noWildcardReexport,
    "no-wire-cast": noWireCast,
    "read-needs-input": readNeedsInput,
    "read-yields-read-service": readYieldsReadService,
    "service-tag-area": serviceTagArea,
    "write-needs-write-permission": writeNeedsWritePermission,
  },
};

export default studio;
