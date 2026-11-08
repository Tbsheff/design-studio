import type { SelectionContext } from "@design-studio/contracts";
import { useCallback, useState, useTransition } from "react";
import type { ChangeEvent, FormEvent } from "react";

import { COMPONENT_NAME } from "../../../shared/component-create.js";
import { apiMessage, componentCreateApi } from "./component-create-api.js";
import {
  fileHint,
  suggestName,
  targetOf,
  toCreatedMessage,
} from "./create-component-model.js";
import { useComponentFolders } from "./use-component-folders.js";
import type { ComponentFolders } from "./use-component-folders.js";

const NAME_PROBLEM = "Use a PascalCase name such as StatRow";

interface CreateComponentIds {
  readonly directionId: string;
  readonly projectId: string;
}

interface CreateComponent extends ComponentFolders {
  readonly changeName: (event: ChangeEvent<HTMLInputElement>) => void;
  readonly canSubmit: boolean;
  readonly failure: string | null;
  readonly hint: string;
  readonly isPending: boolean;
  readonly name: string;
  readonly nameProblem: string | null;
  readonly requestClose: () => false | undefined;
  readonly submit: (event: FormEvent) => void;
}

const toNameProblem = (name: string): string | null => {
  if (COMPONENT_NAME.test(name)) {
    return null;
  }

  return NAME_PROBLEM;
};

const useCreateComponent = (
  ids: CreateComponentIds,
  selection: SelectionContext[],
  onDone: (message: string) => void,
  onClose: () => void
): CreateComponent => {
  const [name, setName] = useState(() => suggestName(selection));
  const folderState = useComponentFolders(ids.projectId, ids.directionId);
  const { folder, folders } = folderState;
  const [isPending, startTransition] = useTransition();
  const [failure, setFailure] = useState<string | null>(null);
  const nameProblem = toNameProblem(name);
  const canSubmit = nameProblem === null && !isPending && Boolean(folder);

  const requestClose = useCallback((): false | undefined => {
    if (isPending) {
      return false;
    }

    onClose();
  }, [isPending, onClose]);

  const changeName = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setName(event.target.value.trim());
  }, []);

  const submit = useCallback(
    (event: FormEvent): void => {
      event.preventDefault();

      if (!canSubmit) {
        return;
      }

      setFailure(null);
      startTransition(async () => {
        try {
          const result = await componentCreateApi.create(
            ids.projectId,
            ids.directionId,
            { folder, name, targets: selection.map((item) => targetOf(item)) }
          );

          const props = result.props.map((prop) => prop.name).join(", ");

          onDone(
            toCreatedMessage(
              result.name,
              result.file,
              props,
              result.select.length
            )
          );
          onClose();
        } catch (error) {
          setFailure(apiMessage(error));
        }
      });
    },
    [canSubmit, folder, ids, name, onClose, onDone, selection]
  );

  return {
    ...folderState,
    canSubmit,
    changeName,
    failure,
    hint: fileHint(
      folder || "…",
      name,
      folders?.find((item) => item.folder === folder) ?? null
    ),
    isPending,
    name,
    nameProblem,
    requestClose,
    submit,
  };
};

export { useCreateComponent };

export type { CreateComponent, CreateComponentIds };
