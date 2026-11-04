import { BRIDGE_CHANGES_PATH } from "../shared/actions/_core/contracts.js";

interface ChangesReply {
  readonly changedAt: number | null;
}

const reloadIfChanged = async (): Promise<boolean> => {
  const loadStartedAt = performance.timeOrigin;

  try {
    const res = await fetch(BRIDGE_CHANGES_PATH, { cache: "no-store" });

    if (!res.ok) {
      return false;
    }

    const body = (await res.json()) as ChangesReply;
    const changedAt = Number(body.changedAt);

    if (Number.isFinite(changedAt) && changedAt >= loadStartedAt) {
      globalThis.location.reload();

      return true;
    }

    return false;
  } catch {
    return false;
  }
};

const reloadIfChangedDuringLoad = (): void => {
  if (!document.querySelector('script[src="/@vite/client"]')) {
    return;
  }

  void reloadIfChanged();
};

export { reloadIfChangedDuringLoad };
