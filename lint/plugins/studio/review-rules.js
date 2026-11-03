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

const reviewRules = {
  "cloud-platform-import": cloudPlatformImport,
  "day-one-frozen": dayOneFrozen,
  "import-resolves": importResolves,
  "no-busy-flag": noBusyFlag,
  "no-cloud-async": noCloudAsync,
  "no-current-org-provide": noCurrentOrgProvide,
  "no-finally-state-reset": noFinallyStateReset,
  "no-hook-component-import": noHookComponentImport,
  "no-identity-map": noIdentityMap,
  "no-inline-copy": noInlineCopy,
  "no-inline-decode": noInlineDecode,
  "no-json-cast": noJsonCast,
  "no-optional-flag": noOptionalFlag,
  "no-param-field-write": noParamFieldWrite,
  "no-query-in-loop": noQueryInLoop,
  "no-raw-prepare": noRawPrepare,
  "no-service-option": noServiceOption,
  "no-string-coerce": noStringCoerce,
  "no-ui-storage": noUiStorage,
  "no-unused-export": noUnusedExport,
  "read-service-no-stub": readServiceNoStub,
  "relative-import-js": relativeImportJs,
  "sql-write-org-filter": sqlWriteOrgFilter,
};

export { reviewRules };
