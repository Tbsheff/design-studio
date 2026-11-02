import type { PackSummary } from "../../../shared/contracts.js";
import { EditError, studioCall } from "../edit-deps.js";
import type { EditDeps } from "../edit-deps.js";

const packOf = async (deps: EditDeps, packId: string): Promise<PackSummary> => {
  const packs = await studioCall<{ items: PackSummary[] }>(
    deps,
    "GET",
    "/api/packs?limit=200"
  );

  const pack = packs.items.find((item) => item.id === packId);

  if (!pack) {
    throw new EditError(`unknown design system ${packId}`);
  }

  return pack;
};

export { packOf };
