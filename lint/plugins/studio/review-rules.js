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
import { serverOneRuntime, serverRunEntry, spanNameMatch } from "./runtime-rules.js";
import { noJsonSchema, projectScopeNeeds } from "./scope-rules.js";

const reviewRules = {
  "adapter-import-index": adapterImportIndex,
  "cloud-platform-import": cloudPlatformImport,
  "day-one-frozen": dayOneFrozen,
  "frozen-pin": frozenPin,
  "import-resolves": importResolves,
  "no-action-name-reuse": noActionNameReuse,
  "no-awaited-return-type": noAwaitedReturnType,
  "no-busy-flag": noBusyFlag,
  "no-cloud-async": noCloudAsync,
  "no-current-org-provide": noCurrentOrgProvide,
  "no-feature-fetch": noFeatureFetch,
  "no-feature-interval": noFeatureInterval,
  "no-finally-state-reset": noFinallyStateReset,
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
  "no-service-option": noServiceOption,
  "no-string-coerce": noStringCoerce,
  "no-ui-storage": noUiStorage,
  "no-unused-export": noUnusedExport,
  "project-scope-needs": projectScopeNeeds,
  "read-service-no-stub": readServiceNoStub,
  "relative-import-js": relativeImportJs,
  "server-one-runtime": serverOneRuntime,
  "server-run-entry": serverRunEntry,
  "span-name-match": spanNameMatch,
  "sql-write-org-filter": sqlWriteOrgFilter,
};

export { reviewRules };
