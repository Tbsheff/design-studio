import { AsyncLocalStorage } from "node:async_hooks";

import type { VersionMeta } from "@design-studio/actions/_core/contracts";

interface EditOrigin {
  client: string;
}

const store = new AsyncLocalStorage<EditOrigin>();

const withCallOrigin = <Result>(
  client: string,
  task: () => Promise<Result>
): Promise<Result> => store.run({ client }, task);

const isOutsideRequest = (): boolean => Boolean(store.getStore());

const stampOrigin = <Meta extends VersionMeta>(meta: Meta): Meta => {
  const origin = store.getStore();

  if (!origin || meta.origin) {
    return meta;
  }

  return { ...meta, client: origin.client, origin: "mcp" };
};

const isOwnEdit = (meta: VersionMeta): boolean =>
  meta.kind === "manual" && !meta.origin;

const isOutsideEdit = (meta: VersionMeta): boolean =>
  meta.origin === "mcp" || meta.kind === "run";

export {
  isOutsideEdit,
  isOutsideRequest,
  isOwnEdit,
  stampOrigin,
  withCallOrigin,
};
