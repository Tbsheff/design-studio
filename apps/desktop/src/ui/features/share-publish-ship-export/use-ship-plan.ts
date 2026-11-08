import type { ShipPrepare } from "@design-studio/contracts/ship";
import { useCallback, useEffect, useState } from "react";

import { errorText } from "../../api.js";
import { settle } from "./settle.js";
import { shipApi } from "./ship-api.js";
import { freshDraft, shippable } from "./ship-model.js";
import type { Draft } from "./ship-model.js";

interface ShipPlan {
  readonly plan: ShipPrepare | null;
  readonly draft: Draft | null;
  readonly focus: string | null;
  readonly loadError: string | null;
  readonly selectBase: (id: string) => void;
  readonly setFocus: (path: string) => void;
  readonly patchDraft: (next: Partial<Draft>) => void;
  readonly toggleFile: (path: string) => void;
}

const toFirstPath = (plan: ShipPrepare): string | null =>
  plan.files.find(shippable)?.path ?? plan.files[0]?.path ?? null;

const useShipPlan = (projectId: string): ShipPlan => {
  const [baseId, setBaseId] = useState<string | null>(null);
  const [plan, setPlan] = useState<ShipPrepare | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [focus, setFocus] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let isLive = true;
    void settle(
      shipApi.prepare(projectId, baseId),
      (next) => {
        if (!isLive) {
          return;
        }

        setPlan(next);
        setDraft((previous) => freshDraft(next, previous?.mode ?? "branch"));
        setFocus(toFirstPath(next));
      },
      (failure) => {
        if (isLive) {
          setLoadError(errorText(failure));
        }
      }
    );

    return (): void => {
      isLive = false;
    };
  }, [projectId, baseId]);

  const selectBase = useCallback((id: string): void => {
    setPlan(null);
    setLoadError(null);
    setBaseId(id);
  }, []);

  const patchDraft = useCallback((next: Partial<Draft>): void => {
    setDraft((previous) => {
      if (!previous) {
        return previous;
      }

      return { ...previous, ...next };
    });
  }, []);

  const toggleFile = useCallback((path: string): void => {
    setDraft((previous) => {
      if (!previous) {
        return previous;
      }

      const files = new Set(previous.files);

      if (!files.delete(path)) {
        files.add(path);
      }

      return { ...previous, files };
    });
  }, []);

  return {
    draft,
    focus,
    loadError,
    patchDraft,
    plan,
    selectBase,
    setFocus,
    toggleFile,
  };
};

export { useShipPlan };
