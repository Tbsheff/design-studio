import { cleanLockKeys } from "../../shared/layer-locks.js";
import type { LayerLocksView } from "../../shared/layer-locks.js";
import { applyDelta } from "../layers/lock-probe.js";
import type { LayerLockStore } from "../store/layer-locks.js";
import { EditError } from "./edit-guards.js";

interface KeptVariant {
  readonly directionId: string;
  readonly label: string;
  readonly versionId: string;
}

type KeepVariant = (
  projectId: string,
  groupId: string,
  directionId: string
) => Promise<KeptVariant>;

interface LockDelta {
  readonly add: string[];
  readonly remove: string[];
}

interface StudioPorts {
  readonly keepVariant?: KeepVariant;
  readonly layerLocks?: LayerLockStore;
}

const PORTS = { current: {} as StudioPorts };

const bindStudioPorts = (ports: StudioPorts): void => {
  PORTS.current = { ...PORTS.current, ...ports };
};

const locksOf = (): LayerLockStore => {
  const store = PORTS.current.layerLocks;

  if (!store) {
    throw new EditError("Layer locks are not ready. Restart Design Studio.");
  }

  return store;
};

const readLocks = (
  projectId: string,
  directionId: string
): Promise<LayerLocksView> => locksOf().read(projectId, directionId);

const changeLocks = (
  projectId: string,
  directionId: string,
  delta: LockDelta
): Promise<LayerLocksView> =>
  locksOf().update(projectId, directionId, (before) =>
    applyDelta(before, {
      add: cleanLockKeys(delta.add),
      remove: cleanLockKeys(delta.remove),
    })
  );

const keepVariant: KeepVariant = (projectId, groupId, directionId) => {
  const keep = PORTS.current.keepVariant;

  if (!keep) {
    throw new EditError("Variants are not ready. Restart Design Studio.");
  }

  return keep(projectId, groupId, directionId);
};

export { bindStudioPorts, changeLocks, keepVariant, readLocks };

export type { KeepVariant, KeptVariant, LockDelta, StudioPorts };
