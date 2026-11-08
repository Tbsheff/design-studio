import type { SelectionContext } from "@design-studio/contracts";
import type {
  InsertPosition,
  InsertableComponent,
} from "@design-studio/contracts/insert";
import { useCallback } from "react";
import type { MutableRefObject } from "react";

import { insertApi, insertError } from "./component-insert-api.js";
import { newSelector, targetOf } from "./component-insert-model.js";
import type { Options } from "./component-insert-model.js";

const MESSAGE_PAUSED =
  "Edits are paused here. Wait for the run to finish, or open the latest version.";

const MESSAGE_SELECT =
  "Select an element first, then insert the component inside or after it.";

interface RunContext {
  readonly busy: MutableRefObject<boolean>;
  readonly live: MutableRefObject<Options>;
  readonly noSource: string;
  readonly startReselect: (
    selector: string,
    name: string,
    target: string
  ) => void;
}

interface RunRequest {
  readonly component: InsertableComponent;
  readonly position: InsertPosition;
  readonly selection: SelectionContext | null;
}

type InsertRun = (
  component: InsertableComponent,
  position: InsertPosition,
  selection: SelectionContext | null
) => Promise<void>;

const runInsert = async (
  context: RunContext,
  request: RunRequest
): Promise<void> => {
  const { busy, live, noSource, startReselect } = context;
  const { component, position, selection } = request;
  const cur = live.current;

  if (!cur.enabled || !cur.directionId) {
    cur.notify(MESSAGE_PAUSED);

    return;
  }

  if (!selection) {
    cur.notify(MESSAGE_SELECT);

    return;
  }

  const target = targetOf(selection);

  if (!target) {
    cur.notify(noSource);

    return;
  }

  if (busy.current) {
    return;
  }

  busy.current = true;

  try {
    await insertApi.insert(cur.projectId, cur.directionId, {
      component: { file: component.file, name: component.name },
      position,
      target,
    });
    startReselect(
      newSelector(selection.selector, position),
      component.name,
      selection.selector
    );
  } catch (error) {
    live.current.notify(insertError(error));
  }

  busy.current = false;
};

const useInsertRun = (context: RunContext): InsertRun =>
  useCallback(
    (component, position, selection): Promise<void> =>
      runInsert(context, { component, position, selection }),
    [context]
  );

export { runInsert, useInsertRun };

export type { InsertRun, RunContext };
