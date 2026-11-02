// @generated
import type { PacksActions } from "../../../shared/actions/packs/index.js";
import type { Entries } from "../_core/handler.js";
import { handle as getDraftPacksHandle } from "./get-draft.js";
import { handle as getPackPacksHandle } from "./get-pack.js";
import { handle as inspectDraftPacksHandle } from "./inspect-draft.js";
import { handle as inspectPackPacksHandle } from "./inspect-pack.js";
import { handle as listPacksHandle } from "./list.js";

const PacksEntries = {
  getDraftPacks: { handle: getDraftPacksHandle },
  getPackPacks: { handle: getPackPacksHandle },
  inspectDraftPacks: { handle: inspectDraftPacksHandle },
  inspectPackPacks: { handle: inspectPackPacksHandle },
  listPacks: { handle: listPacksHandle },
} satisfies Entries<typeof PacksActions>;

export { PacksEntries };
