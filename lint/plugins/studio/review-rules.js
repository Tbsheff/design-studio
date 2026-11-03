import { noInlineDecode, noServiceOption, noStringCoerce } from "./adapter-rules.js";
import {
  noCloudAsync,
  noCurrentOrgProvide,
  noIdentityMap,
  noQueryInLoop,
  noRawPrepare,
  readServiceNoStub,
  sqlWriteOrgFilter,
} from "./cloud-effect-rules.js";
import { dayOneFrozen } from "./day-one-rules.js";
import { noUnusedExport } from "./dead-code-rules.js";
import { cloudPlatformImport, importResolves, noHookComponentImport, relativeImportJs } from "./import-rules.js";
import {
  noFinallyStateReset,
  noInlineCopy,
  noJsonCast,
  noOptionalFlag,
  noParamFieldWrite,
  noUiStorage,
} from "./ui-shape-rules.js";
import { noBusyFlag } from "./ui-state-rules.js";
import { adapterImportIndex, noActionNameReuse, noAwaitedReturnType } from "./boundary-rules.js";
import { noFeatureFetch, noFeatureInterval } from "./feature-rules.js";
import { frozenPin } from "./freeze-rules.js";
import { bridgeTypeImport, noCatchAllUnion, noDynamicAppImport, noFloatingAsync } from "./bridge-rules.js";
import { featureFileLayout, featureIndexImport, noReexportShim } from "./feature-layout-rules.js";
import { noStyleOff, oneOverridePerFiles } from "./override-rules.js";
import { domProjectWired, probeHasFunction, rendererHasFunction, serializedFnNameShim } from "./probe-rules.js";
import { serverOneRuntime, serverRunEntry, spanNameMatch } from "./runtime-rules.js";
import { noJsonSchema, projectScopeNeeds } from "./scope-rules.js";
import { catchupRules } from "./catchup-rules.js";

const reviewRules = {
  ...catchupRules,
  "adapter-import-index": adapterImportIndex,
  "bridge-type-import": bridgeTypeImport,
  "cloud-platform-import": cloudPlatformImport,
  "day-one-frozen": dayOneFrozen,
  "dom-project-wired": domProjectWired,
  "feature-file-layout": featureFileLayout,
  "feature-index-import": featureIndexImport,
  "frozen-pin": frozenPin,
  "import-resolves": importResolves,
  "no-action-name-reuse": noActionNameReuse,
  "no-awaited-return-type": noAwaitedReturnType,
  "no-busy-flag": noBusyFlag,
  "no-catch-all-union": noCatchAllUnion,
  "no-cloud-async": noCloudAsync,
  "no-current-org-provide": noCurrentOrgProvide,
  "no-dynamic-app-import": noDynamicAppImport,
  "no-feature-fetch": noFeatureFetch,
  "no-feature-interval": noFeatureInterval,
  "no-finally-state-reset": noFinallyStateReset,
  "no-floating-async": noFloatingAsync,
  "no-hook-component-import": noHookComponentImport,
  "no-identity-map": noIdentityMap,
  "no-inline-copy": noInlineCopy,
  "no-inline-decode": noInlineDecode,
  "no-json-cast": noJsonCast,
  "no-json-schema": noJsonSchema,
  "no-optional-flag": noOptionalFlag,
  "no-param-field-write": noParamFieldWrite,
  "no-query-in-loop": noQueryInLoop,
  "no-raw-prepare": noRawPrepare,
  "no-reexport-shim": noReexportShim,
  "no-service-option": noServiceOption,
  "no-string-coerce": noStringCoerce,
  "no-style-off": noStyleOff,
  "no-ui-storage": noUiStorage,
  "no-unused-export": noUnusedExport,
  "one-override-per-files": oneOverridePerFiles,
  "probe-has-function": probeHasFunction,
  "project-scope-needs": projectScopeNeeds,
  "read-service-no-stub": readServiceNoStub,
  "relative-import-js": relativeImportJs,
  "renderer-has-function": rendererHasFunction,
  "serialized-fn-name-shim": serializedFnNameShim,
  "server-one-runtime": serverOneRuntime,
  "server-run-entry": serverRunEntry,
  "span-name-match": spanNameMatch,
  "sql-write-org-filter": sqlWriteOrgFilter,
};

export { reviewRules };
