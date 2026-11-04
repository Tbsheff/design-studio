import { useCallback, useEffect, useState, useTransition } from "react";

import { routes as cloudRoutes } from "../../../shared/actions/cloud/routes.js";
import { useAction } from "../../platform/query.js";
import { copy } from "./copy.js";
import { readDesktopKeys, toActive, toPerms } from "./keys-model.js";
import type { CreatedKey, KeyView } from "./keys-model.js";

interface KeysState {
  readonly error: string | null;
  readonly handleCreate: (name: string, canWrite: boolean) => void;
  readonly handleDismiss: () => void;
  readonly handleRevoke: (keyId: string) => void;
  readonly isAvailable: boolean;
  readonly isPending: boolean;
  readonly isSignedIn: boolean;
  readonly keys: readonly KeyView[];
  readonly secret: CreatedKey | null;
}

interface KeyTask {
  readonly isPending: boolean;
  readonly run: (task: () => Promise<void>) => void;
}

const useKeyTask = (
  reload: () => Promise<void>,
  setError: (error: string | null) => void
): KeyTask => {
  const [isPending, startTransition] = useTransition();

  const run = useCallback(
    (task: () => Promise<void>): void => {
      startTransition(async () => {
        try {
          await task();
          await reload();
          setError(null);
        } catch {
          setError(copy.failed);
        }
      });
    },
    [reload, setError]
  );

  return { isPending, run };
};

const useKeys = (): KeysState => {
  const cloud = useAction(cloudRoutes.getCloud, {});
  const orgId = cloud.data?.orgs[0]?.id ?? null;
  const host = readDesktopKeys();
  const [keys, setKeys] = useState<readonly KeyView[]>([]);
  const [secret, setSecret] = useState<CreatedKey | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async (): Promise<void> => {
    if (host === null || orgId === null) {
      return;
    }

    setKeys(toActive(await host.list(orgId)));
  }, [host, orgId]);

  const isAvailable = host !== null;
  const isSignedIn = orgId !== null;
  const { isPending, run } = useKeyTask(reload, setError);

  useEffect(() => {
    run(async () => {
      await Promise.resolve();
    });
  }, [run]);

  const handleCreate = useCallback(
    (name: string, canWrite: boolean): void => {
      if (host === null || orgId === null) {
        return;
      }

      run(async () => {
        setSecret(await host.create({ name, orgId, perms: toPerms(canWrite) }));
      });
    },
    [host, orgId, run]
  );

  const handleRevoke = useCallback(
    (keyId: string): void => {
      if (host === null || orgId === null) {
        return;
      }

      run(async () => {
        await host.revoke(orgId, keyId);
      });
    },
    [host, orgId, run]
  );

  const handleDismiss = useCallback((): void => {
    setSecret(null);
  }, []);

  return {
    error,
    handleCreate,
    handleDismiss,
    handleRevoke,
    isAvailable,
    isPending,
    isSignedIn,
    keys,
    secret,
  };
};

export { useKeys };

export type { KeysState };
