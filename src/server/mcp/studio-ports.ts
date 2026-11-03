import { cleanLockKeys } from "../../shared/layer-locks.js";
import type { LayerLocksView } from "../../shared/layer-locks.js";
import { applyDelta } from "../layers/lock-probe.js";
import type { LayerLockStore } from "../store/layer-locks.js";
import { EditError } from "./edit-guards.js";
import type { EditDeps } from "./edit-guards.js";

interface LockDelta {
  readonly add: string[];
  readonly remove: string[];
}

type LockDeps = Pick<EditDeps, "layerLocks">;

const locksOf = (deps: LockDeps): LayerLockStore => {
  const store = deps.layerLocks;

  if (store === null) {
    throw new EditError("Layer locks are not ready. Restart Design Studio.");
  }

  return store;
};

const readLocks = (
  deps: LockDeps,
  projectId: string,
  directionId: string
): Promise<LayerLocksView> => locksOf(deps).read(projectId, directionId);

const changeLocks = (
  deps: LockDeps,
  projectId: string,
  directionId: string,
  delta: LockDelta
): Promise<LayerLocksView> =>
  locksOf(deps).update(projectId, directionId, (before) =>
    applyDelta(before, {
      add: cleanLockKeys(delta.add),
      remove: cleanLockKeys(delta.remove),
    })
  );

export { changeLocks, readLocks };

export type { LockDelta };
