import type { PortFlowPlan } from "@design-studio/contracts/port";
import { useEffect, useState } from "react";

import { errorText } from "../../api.js";
import { portApi } from "./port-api.js";

const PLAN_DELAY_MS = 250;

type PlanRequest = Parameters<typeof portApi.flowPlan>[0];

interface PlanInput {
  sourceProjectId: string;
  sourceDirectionId: string | null;
  path: string;
  targetProjectId: string;
  route: string | null;
}

interface FlowState {
  flow: PortFlowPlan | null;
  error: string | null;
  loading: boolean;
}

interface PlanResult {
  key: string;
  flow: PortFlowPlan | null;
  error: string | null;
}

const toPlanRequest = (input: PlanInput): PlanRequest => {
  const request: PlanRequest = {
    path: input.path,
    sourceProjectId: input.sourceProjectId,
    targetProjectId: input.targetProjectId,
  };

  if (input.route !== null) {
    request.route = input.route;
  }

  if (input.sourceDirectionId !== null) {
    request.sourceDirectionId = input.sourceDirectionId;
  }

  return request;
};

const readPlan = async (
  request: PlanRequest,
  key: string,
  isAlive: () => boolean,
  apply: (next: PlanResult) => void
): Promise<void> => {
  try {
    const flow = await portApi.flowPlan(request);

    if (isAlive()) {
      apply({ error: null, flow, key });
    }
  } catch (error: unknown) {
    if (isAlive()) {
      apply({ error: errorText(error), flow: null, key });
    }
  }
};

const usePlan = (input: PlanInput): FlowState => {
  const [result, setResult] = useState<PlanResult | null>(null);

  const { sourceProjectId, sourceDirectionId, path, targetProjectId, route } =
    input;

  const key = JSON.stringify([
    sourceProjectId,
    sourceDirectionId,
    path,
    targetProjectId,
    route,
  ]);

  useEffect(() => {
    if (!targetProjectId) {
      return;
    }

    let isAlive = true;

    const timer = globalThis.setTimeout(() => {
      const request = toPlanRequest({
        path,
        route,
        sourceDirectionId,
        sourceProjectId,
        targetProjectId,
      });

      readPlan(request, key, () => isAlive, setResult);
    }, PLAN_DELAY_MS);

    return (): void => {
      isAlive = false;
      globalThis.clearTimeout(timer);
    };
  }, [key, path, route, sourceDirectionId, sourceProjectId, targetProjectId]);

  return {
    error: result?.error ?? null,
    flow: result?.flow ?? null,
    loading: Boolean(targetProjectId) && result?.key !== key,
  };
};

export { usePlan };

export type { FlowState, PlanInput };
