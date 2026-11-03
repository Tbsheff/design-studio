import {
  actionDomainName,
  actionVerb,
  agentOffReason,
  writeNeedsWritePermission,
} from "./studio/action-rules.js";
import { frozenExemption, narrowOverride } from "./studio/config-rules.js";
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
  noFeatureAsync,
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
import {
  actionDomainObject,
  actionSchemaTyped,
  derivedToolName,
  editInvalidates,
  mcpOffReason,
  readVerbAccess,
} from "./studio/spec-rules.js";
import { awaitWrite, noAppImport, noDomQuery } from "./studio/surface-rules.js";
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
import {
  errorNameUnique,
  noAdapterRuntimeCall,
  noInputDefault,
  notReadyUnavailable,
  readServiceIo,
  serviceWired,
} from "./studio/wiring-rules.js";

const studio = {
  meta: { name: "studio" },
  rules: {
    "action-domain-name": actionDomainName,
    "action-domain-object": actionDomainObject,
    "action-schema-typed": actionSchemaTyped,
    "action-verb": actionVerb,
    "agent-off-reason": agentOffReason,
    "area-import-index": areaImportIndex,
    "await-write": awaitWrite,
    "boolean-name": booleanName,
    "derived-tool-name": derivedToolName,
    "edit-invalidates": editInvalidates,
    "engine-pure": enginePure,
    "error-name-unique": errorNameUnique,
    "export-blocks": exportBlocks,
    "frozen-exemption": frozenExemption,
    "function-verb": functionVerb,
    "handler-satisfies": handlerSatisfies,
    "live-layer-domain": liveLayerDomain,
    "mcp-off-reason": mcpOffReason,
    "module-function-verb": moduleFunctionVerb,
    "narrow-override": narrowOverride,
    "no-adapter-runtime-call": noAdapterRuntimeCall,
    "no-adapter-service": noAdapterService,
    "no-app-import": noAppImport,
    "no-async-in-service": noAsyncInService,
    "no-cache-ttl": noCacheTtl,
    "no-deep-area-import": noDeepAreaImport,
    "no-desktop-global": noDesktopGlobal,
    "no-dom-query": noDomQuery,
    "no-feature-async": noFeatureAsync,
    "no-fixable-off": noFixableOff,
    "no-input-default": noInputDefault,
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
    "not-ready-unavailable": notReadyUnavailable,
    "predicate-name": predicateName,
    "read-needs-input": readNeedsInput,
    "read-service-io": readServiceIo,
    "read-verb-access": readVerbAccess,
    "read-yields-read-service": readYieldsReadService,
    "readonly-field": readonlyField,
    "service-api-effect": serviceApiEffect,
    "service-effect-only": serviceEffectOnly,
    "service-file-exports": serviceFileExports,
    "service-file-name": serviceFileName,
    "service-import-index": serviceImportIndex,
    "service-role": serviceRole,
    "service-tag-area": serviceTagArea,
    "service-wired": serviceWired,
    "write-needs-write-permission": writeNeedsWritePermission,
  },
};

export default studio;
