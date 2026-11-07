// @generated
import type { IntegrationActions } from "@design-studio/actions/integration/index";

import type { Entries } from "../_core/handler.js";
import { handle as createIntegrationHandle } from "./create.js";
import {
  handle as deleteIntegrationHandle,
  preview as deleteIntegrationPreview,
} from "./delete.js";
import { handle as listIntegrationHandle } from "./list.js";
import { handle as runIntegrationHandle } from "./run.js";
import { handle as updateIntegrationHandle } from "./update.js";

const IntegrationEntries = {
  createIntegration: { handle: createIntegrationHandle },
  deleteIntegration: {
    handle: deleteIntegrationHandle,
    preview: deleteIntegrationPreview,
  },
  listIntegration: { handle: listIntegrationHandle },
  runIntegration: { handle: runIntegrationHandle },
  updateIntegration: { handle: updateIntegrationHandle },
} satisfies Entries<typeof IntegrationActions>;

export { IntegrationEntries };
