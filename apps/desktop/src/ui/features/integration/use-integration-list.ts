import { useMemo } from "react";

import { integrationRoutes, useAction } from "./deps.js";
import type { IntegrationItem } from "./integration-model.js";

interface IntegrationList {
  readonly error: string | null;
  readonly isLoading: boolean;
  readonly items: readonly IntegrationItem[];
  readonly refetch: () => Promise<void>;
}

const LIST_LIMIT = 200;

const useIntegrationList = (): IntegrationList => {
  const input = useMemo(() => ({ limit: LIST_LIMIT }), []);
  const read = useAction(integrationRoutes.listIntegration, input);
  const items = useMemo(() => read.data?.items ?? [], [read.data]);
  const error = read.error?.message ?? null;
  const { loading: isLoading, refetch } = read;

  return { error, isLoading, items, refetch };
};

export { useIntegrationList };

export type { IntegrationList };
