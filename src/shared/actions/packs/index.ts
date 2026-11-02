// @generated
import { getDraftPacks } from "./get-draft.js";
import { getPackPacks } from "./get-pack.js";
import { inspectDraftPacks } from "./inspect-draft.js";
import { inspectPackPacks } from "./inspect-pack.js";
import { listPacks } from "./list.js";

const PacksActions = {
  getDraftPacks,
  getPackPacks,
  inspectDraftPacks,
  inspectPackPacks,
  listPacks,
} as const;

export { PacksActions };
