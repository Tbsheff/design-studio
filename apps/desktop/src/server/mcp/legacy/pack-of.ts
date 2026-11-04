import { listPack } from "../../../shared/actions/pack/list.js";
import type { PackSummary } from "../../../shared/actions/_core/contracts.js";
import { callAction } from "../action-call.js";
import { EditError } from "../edit-guards.js";
import type { EditDeps } from "../edit-guards.js";

const packOf = async (deps: EditDeps, packId: string): Promise<PackSummary> => {
  const packs = await callAction<{ items: PackSummary[] }>(deps, listPack, {
    cursor: null,
    limit: 200,
  });

  const pack = packs.items.find((item) => item.id === packId);

  if (!pack) {
    throw new EditError(`unknown design system ${packId}`);
  }

  return pack;
};

export { packOf };
