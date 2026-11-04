import { useCallback, useState, useTransition } from "react";

import { copy } from "./copy.js";
import { propRoutes, useAction } from "./deps.js";
import type { MakeKind, PropLayer, PropTarget } from "./prop-model.js";

interface PropEdit {
  readonly error: string | null;
  readonly handleCreate: (kind: MakeKind, name: string) => void;
  readonly handleDelete: (name: string) => void;
  readonly handleRename: (name: string, newName: string) => void;
  readonly isBusy: boolean;
  readonly message: string | null;
}

interface EditSetup {
  readonly layer: PropLayer | null;
  readonly onDone: (message: string) => void;
  readonly target: PropTarget;
}

const usePropEdit = (setup: EditSetup): PropEdit => {
  const { layer, onDone, target } = setup;
  const [message, setMessage] = useState<string | null>(null);
  const [isWorking, startWork] = useTransition();
  const creator = useAction(propRoutes.createProp);
  const renamer = useAction(propRoutes.renameProp);
  const deleter = useAction(propRoutes.deleteProp);
  const { run: runCreate } = creator;
  const { run: runRename } = renamer;
  const { run: runDelete } = deleter;

  const finish = useCallback(
    (done: { readonly title: string } | null): void => {
      if (done !== null) {
        setMessage(copy.saved);
        onDone(done.title);
      }
    },
    [onDone]
  );

  const handleCreate = useCallback(
    (kind: MakeKind, name: string): void => {
      if (layer === null) {
        return;
      }

      startWork(async () => {
        finish(
          await runCreate({
            ...target,
            kind,
            layerCol: layer.col,
            layerLine: layer.line,
            name,
          })
        );
      });
    },
    [finish, layer, runCreate, target]
  );

  const handleRename = useCallback(
    (name: string, newName: string): void => {
      startWork(async () => {
        finish(await runRename({ ...target, name, newName }));
      });
    },
    [finish, runRename, target]
  );

  const handleDelete = useCallback(
    (name: string): void => {
      startWork(async () => {
        finish(await runDelete({ ...target, name }));
      });
    },
    [finish, runDelete, target]
  );

  const error =
    creator.error?.message ??
    renamer.error?.message ??
    deleter.error?.message ??
    null;

  const isBusy = isWorking;

  return {
    error,
    handleCreate,
    handleDelete,
    handleRename,
    isBusy,
    message,
  };
};

export { usePropEdit };

export type { EditSetup, PropEdit };
