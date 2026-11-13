import { AsyncLocalStorage } from "node:async_hooks";

import type { VersionMeta } from "@design-studio/contracts";

interface EditOrigin {
  client: string;
}

const store = new AsyncLocalStorage<EditOrigin>();

const withCallOrigin = <Result>(
  client: string,
  task: () => Promise<Result>
): Promise<Result> => store.run({ client }, task);

interface AgentRunScope {
  directionId: string;
  projectId: string;
}

const runStore = new AsyncLocalStorage<AgentRunScope>();

const runAsAgent = <Result>(
  scope: AgentRunScope,
  task: () => Promise<Result>
): Promise<Result> => runStore.run(scope, task);

const isOwnAgentRun = (projectId: string, directionId: string): boolean => {
  const scope = runStore.getStore() ?? null;

  return (
    scope !== null &&
    scope.projectId === projectId &&
    scope.directionId === directionId
  );
};

const isOutsideRequest = (): boolean => Boolean(store.getStore());

const isAgentRequest = (): boolean => Boolean(runStore.getStore());

const isPersonRequest = (): boolean => !isOutsideRequest() && !isAgentRequest();

const toCallClient = (): string | null => store.getStore()?.client ?? null;

const stampOrigin = <Meta extends VersionMeta>(meta: Meta): Meta => {
  const origin = store.getStore() ?? null;

  if (meta.origin) {
    return meta;
  }

  if (origin !== null) {
    return { ...meta, client: origin.client, origin: "mcp" };
  }

  if (isAgentRequest() && meta.kind !== "run") {
    return { ...meta, origin: "agent" };
  }

  return meta;
};

const isOwnEdit = (meta: VersionMeta): boolean =>
  meta.kind === "manual" && !meta.origin;

const isOutsideEdit = (meta: VersionMeta): boolean =>
  Boolean(meta.origin) || meta.kind === "run";

export {
  isAgentRequest,
  isOutsideEdit,
  isOutsideRequest,
  isPersonRequest,
  isOwnAgentRun,
  isOwnEdit,
  stampOrigin,
  runAsAgent,
  toCallClient,
  withCallOrigin,
};
