import {
  actionDomainName,
  actionVerb,
  agentOffReason,
  writeNeedsWritePermission,
} from "./studio/action-rules.js";
import { handlerSatisfies, readYieldsReadService } from "./studio/handler-rules.js";
import { noFixableOff, noStudioOverride } from "./studio/lint-rules.js";
import {
  booleanName,
  moduleFunctionVerb,
  noShortName,
  predicateName,
} from "./studio/naming-rules.js";
import {
  liveLayerDomain,
  noDeepAreaImport,
  noLocalErrorBridge,
  noOutputGuess,
  noStubRoute,
  serviceImportIndex,
} from "./studio/server-rules.js";
import {
  functionVerb,
  noAdapterService,
  serviceApiEffect,
  serviceEffectOnly,
  serviceFileExports,
  serviceFileName,
  serviceRole,
} from "./studio/service-file-rules.js";
import {
  enginePure,
  noAsyncInService,
  noRuntimeMap,
  serviceTagArea,
} from "./studio/service-rules.js";
import {
  areaImportIndex,
  exportBlocks,
  noSyncFs,
  noUndefinedType,
  noZodImport,
  readonlyField,
} from "./studio/shape-rules.js";
import { noOptionalNull } from "./studio/type-rules.js";
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
    "area-import-index": areaImportIndex,
    "boolean-name": booleanName,
    "engine-pure": enginePure,
    "export-blocks": exportBlocks,
    "function-verb": functionVerb,
    "handler-satisfies": handlerSatisfies,
    "live-layer-domain": liveLayerDomain,
    "module-function-verb": moduleFunctionVerb,
    "no-adapter-service": noAdapterService,
    "no-async-in-service": noAsyncInService,
    "no-cache-ttl": noCacheTtl,
    "no-deep-area-import": noDeepAreaImport,
    "no-desktop-global": noDesktopGlobal,
    "no-fixable-off": noFixableOff,
    "no-local-error-bridge": noLocalErrorBridge,
    "no-optional-null": noOptionalNull,
    "no-output-guess": noOutputGuess,
    "no-promise-cast": noPromiseCast,
    "no-runtime-map": noRuntimeMap,
    "no-short-name": noShortName,
    "no-stub-route": noStubRoute,
    "no-studio-override": noStudioOverride,
    "no-sync-fs": noSyncFs,
    "no-then": noThen,
    "no-undefined-type": noUndefinedType,
    "no-wildcard-reexport": noWildcardReexport,
    "no-wire-cast": noWireCast,
    "no-zod-import": noZodImport,
    "predicate-name": predicateName,
    "read-needs-input": readNeedsInput,
    "read-yields-read-service": readYieldsReadService,
    "readonly-field": readonlyField,
    "service-api-effect": serviceApiEffect,
    "service-effect-only": serviceEffectOnly,
    "service-file-exports": serviceFileExports,
    "service-file-name": serviceFileName,
    "service-import-index": serviceImportIndex,
    "service-role": serviceRole,
    "service-tag-area": serviceTagArea,
    "write-needs-write-permission": writeNeedsWritePermission,
  },
};

export default studio;
