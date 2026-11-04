// @generated
import type { ScenarioActions } from "@design-studio/actions/scenario/index";

import type { Entries } from "../_core/handler.js";
import { handle as applyScenarioHandle } from "./apply.js";
import { handle as createScenarioHandle } from "./create.js";
import { handle as listScenarioHandle } from "./list.js";
import { handle as runScenarioHandle } from "./run.js";

const ScenarioEntries = {
  applyScenario: { handle: applyScenarioHandle },
  createScenario: { handle: createScenarioHandle },
  listScenario: { handle: listScenarioHandle },
  runScenario: { handle: runScenarioHandle },
} satisfies Entries<typeof ScenarioActions>;

export { ScenarioEntries };
