// @generated
import type { CloudActions } from "../../../shared/actions/cloud/index.js";
import type { Entries } from "../_core/handler.js";
import { handle as deleteCloudHandle } from "./delete.js";
import { handle as getCloudHandle } from "./get.js";
import { handle as setCloudHandle } from "./set.js";

const CloudEntries = {
  deleteCloud: { handle: deleteCloudHandle },
  getCloud: { handle: getCloudHandle },
  setCloud: { handle: setCloudHandle },
} satisfies Entries<typeof CloudActions>;

export { CloudEntries };
