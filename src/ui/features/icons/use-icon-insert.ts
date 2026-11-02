import { useCallback, useState } from "react";

import { api, insertError } from "./deps.js";
import type { IconInsertBody, SelectionContext } from "./deps.js";
import { iconPosition, iconTarget } from "./icon-target.js";
import type { IconMode } from "./icon-target.js";
import type { SearchIds } from "./use-icon-search.js";

interface InsertChoice {
  readonly color: string;
  readonly library: IconInsertBody["library"];
  readonly name: string;
  readonly size: number;
}

interface InsertSetup {
  readonly ids: SearchIds;
  readonly mode: IconMode;
  readonly onClose: () => void;
  readonly onDone: (message: string) => void;
  readonly target: SelectionContext;
}

interface InsertState {
  readonly busy: boolean;
  readonly failure: string | null;
  readonly run: (choice: InsertChoice) => Promise<void>;
}

const bodyOf = (setup: InsertSetup, choice: InsertChoice): IconInsertBody => {
  const body: IconInsertBody = {
    library: choice.library,
    name: choice.name,
    position: iconPosition(setup.target, setup.mode),
    size: choice.size,
    target: iconTarget(setup.target),
  };

  if (choice.color) {
    body.color = choice.color;
  }

  return body;
};

const useIconInsert = (setup: InsertSetup): InsertState => {
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  const run = useCallback(
    async (choice: InsertChoice): Promise<void> => {
      setBusy(true);
      setFailure(null);

      try {
        const done = await api.insertIcon(
          setup.ids.projectId,
          setup.ids.directionId,
          bodyOf(setup, choice)
        );

        setBusy(false);
        setup.onDone(`${done.title}.`);
        setup.onClose();
      } catch (error) {
        setBusy(false);
        setFailure(insertError(error));
      }
    },
    [setup]
  );

  return { busy, failure, run };
};

export { useIconInsert };

export type { InsertChoice, InsertSetup, InsertState };
