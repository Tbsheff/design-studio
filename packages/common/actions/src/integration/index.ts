// @generated
import { createIntegration } from "./create.js";
import { deleteIntegration } from "./delete.js";
import { listIntegration } from "./list.js";
import { runIntegration } from "./run.js";
import { updateIntegration } from "./update.js";

const IntegrationActions = {
  createIntegration,
  deleteIntegration,
  listIntegration,
  runIntegration,
  updateIntegration,
} as const;

export { IntegrationActions };
