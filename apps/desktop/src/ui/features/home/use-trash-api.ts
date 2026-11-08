import type { TrashItem } from "@design-studio/contracts";

import { json } from "../../api.js";

interface TrashDeleted {
  readonly deleted: number;
}

const trashApi = {
  empty: (): Promise<TrashDeleted> =>
    json<TrashDeleted>("DELETE", "/api/trash"),
  list: (): Promise<TrashItem[]> => json<TrashItem[]>("GET", "/api/trash"),
  remove: (trashId: string): Promise<TrashDeleted> =>
    json<TrashDeleted>("DELETE", `/api/trash/${encodeURIComponent(trashId)}`),
};

export { trashApi };
