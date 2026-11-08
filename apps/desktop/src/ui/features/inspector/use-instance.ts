import type { SelectionContext } from "@design-studio/contracts";
import type {
  ComponentInstance,
  InstanceQuery,
} from "@design-studio/contracts/props";
import {
  startTransition,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import type { Dispatch, SetStateAction } from "react";

import { useProjectEvents } from "../../platform/events.js";
import { propsApi } from "./props-api.js";

interface InstanceState {
  readonly instance: ComponentInstance | null;
  readonly setInstance: Dispatch<SetStateAction<ComponentInstance | null>>;
}

interface InstanceResult {
  readonly instance: ComponentInstance | null;
  readonly isFailed: boolean;
}

interface StableQuery extends InstanceQuery {
  readonly key: string;
}

const toStableQuery = (selection: SelectionContext): StableQuery => ({
  key: JSON.stringify([
    selection.owners?.map((owner) => owner.stack),
    selection.usedAt ?? null,
  ]),
  owners: selection.owners,
  usedAt: selection.usedAt ?? null,
});

const hasTarget = (query: InstanceQuery): boolean =>
  (query.owners?.length ?? 0) > 0 || Boolean(query.usedAt);

const toInstanceResult = async (
  projectId: string,
  directionId: string | null,
  query: InstanceQuery
): Promise<InstanceResult> => {
  if (!directionId) {
    return { instance: null, isFailed: false };
  }

  try {
    const result = await propsApi.instance(projectId, directionId, query);

    return { instance: result.instance, isFailed: false };
  } catch {
    return { instance: null, isFailed: true };
  }
};

const toLoadResult = async (
  projectId: string,
  directionId: string | null,
  query: InstanceQuery
): Promise<InstanceResult> => {
  if (!hasTarget(query)) {
    return { instance: null, isFailed: false };
  }

  const result = await toInstanceResult(projectId, directionId, query);

  return result;
};

const useStableQuery = (selection: SelectionContext): StableQuery => {
  const [stable, setStable] = useState(() => toStableQuery(selection));
  const next = toStableQuery(selection);

  if (stable.key !== next.key) {
    setStable(next);
  }

  return stable;
};

const useInstance = (
  projectId: string,
  directionId: string | null,
  selection: SelectionContext
): InstanceState => {
  const [instance, setInstance] = useState<ComponentInstance | null>(null);
  const query = useStableQuery(selection);
  const live = useRef(0);

  useEffect(() => {
    live.current += 1;
    const ticket = live.current;

    startTransition(async () => {
      const result = await toLoadResult(projectId, directionId, {
        owners: query.owners,
        usedAt: query.usedAt,
      });

      if (ticket === live.current) {
        setInstance(result.instance);
      }
    });
  }, [projectId, directionId, query]);

  const refresh = useCallback(() => {
    if (!directionId || !instance) {
      return;
    }

    live.current += 1;
    const ticket = live.current;

    startTransition(async () => {
      const result = await toInstanceResult(projectId, directionId, {
        use: instance.use,
      });

      if (ticket === live.current && !result.isFailed) {
        setInstance(result.instance);
      }
    });
  }, [projectId, directionId, instance]);

  useProjectEvents(projectId, (event) => {
    if (event.type === "version.created" && event.directionId === directionId) {
      refresh();
    }
  });

  return { instance, setInstance };
};

export { useInstance };
