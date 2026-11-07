import { useCallback, useTransition } from "react";

import { integrationRoutes, useAction } from "./deps.js";
import { toCreateInput, toUpdateInput } from "./integration-model.js";
import type { IntegrationDraft } from "./integration-model.js";

interface IntegrationActions {
  readonly error: string | null;
  readonly handleAllow: (id: string, tools: readonly string[]) => void;
  readonly handleCreate: (draft: IntegrationDraft, onDone: () => void) => void;
  readonly handleDelete: (id: string) => void;
  readonly handleEnabled: (id: string, isEnabled: boolean) => void;
  readonly handleTest: (id: string) => void;
  readonly isBusy: boolean;
}

const toFirstError = (errors: readonly (Error | null)[]): string | null => {
  const found = errors.find((item) => item !== null) ?? null;

  if (found === null) {
    return null;
  }

  return found.message;
};

const useIntegrationActions = (): IntegrationActions => {
  const [isBusy, startWork] = useTransition();
  const creator = useAction(integrationRoutes.createIntegration);
  const updater = useAction(integrationRoutes.updateIntegration);
  const tester = useAction(integrationRoutes.runIntegration);
  const deleter = useAction(integrationRoutes.deleteIntegration);
  const { run: runCreate } = creator;
  const { run: runUpdate } = updater;
  const { run: runTest } = tester;
  const { run: runDelete } = deleter;

  const handleCreate = useCallback(
    (draft: IntegrationDraft, onDone: () => void): void => {
      startWork(async () => {
        const saved = await runCreate(toCreateInput(draft));

        if (saved !== null) {
          onDone();
        }
      });
    },
    [runCreate]
  );

  const handleAllow = useCallback(
    (id: string, tools: readonly string[]): void => {
      startWork(async () => {
        await runUpdate(
          toUpdateInput(id, { allowedTools: tools, isEnabled: null })
        );
      });
    },
    [runUpdate]
  );

  const handleEnabled = useCallback(
    (id: string, isEnabled: boolean): void => {
      startWork(async () => {
        await runUpdate(toUpdateInput(id, { allowedTools: null, isEnabled }));
      });
    },
    [runUpdate]
  );

  const handleTest = useCallback(
    (id: string): void => {
      startWork(async () => {
        await runTest({ integrationId: id });
      });
    },
    [runTest]
  );

  const handleDelete = useCallback(
    (id: string): void => {
      startWork(async () => {
        await runDelete({ integrationId: id });
      });
    },
    [runDelete]
  );

  const error = toFirstError([
    creator.error,
    updater.error,
    tester.error,
    deleter.error,
  ]);

  return {
    error,
    handleAllow,
    handleCreate,
    handleDelete,
    handleEnabled,
    handleTest,
    isBusy,
  };
};

export { useIntegrationActions };

export type { IntegrationActions };
