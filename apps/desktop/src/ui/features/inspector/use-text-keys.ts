import type { BridgeToParent } from "@design-studio/contracts";
import { useEffect } from "react";
import type { RefObject } from "react";

import { isTextKeyId, toTextKeyId } from "../../../shared/text-keys.js";
import type { TextKeyId } from "../../../shared/text-keys.js";
import { api, errorText } from "../../api.js";
import { IS_MAC } from "../../inspector-slots.js";
import { canvasHasKeys, isTypingTarget } from "../../platform/typing-target.js";
import { applyCommit } from "./edit-request-model.js";
import { startOptimistic } from "./optimistic-edit-model.js";
import {
  toChangeBack,
  toChangeStyle,
  toTextBlock,
  toTextChanges,
} from "./text-keys-model.js";
import type { TextChange } from "./text-keys-model.js";
import { createCurrentEditRequest } from "./use-current-edit-request.js";
import type { NudgeOptions } from "./use-element-nudge-core.js";
import { useLatestRef } from "./use-latest-ref.js";

interface TextSave {
  readonly change: TextChange;
  readonly edit: NonNullable<ReturnType<typeof createCurrentEditRequest>>;
}

type LiveOptions = RefObject<NudgeOptions>;

const toTextSaves = (changes: readonly TextChange[]): TextSave[] =>
  changes.flatMap((change) => {
    const edit = createCurrentEditRequest(change.target, toChangeStyle(change));

    if (!edit) {
      return [];
    }

    return [{ change, edit }];
  });

const runTextRestore = (
  live: LiveOptions,
  list: readonly TextSave[],
  message: string
): void => {
  const cur = live.current;
  cur.post({ type: "preview-reset" });

  for (const one of list) {
    cur.setSelection((prev) =>
      applyCommit(prev, {
        selector: one.change.target.selector,
        style: toChangeBack(one.change),
      })
    );
  }

  cur.onError(message);
};

const runTextSave = async (
  live: LiveOptions,
  directionId: string,
  list: readonly TextSave[]
): Promise<void> => {
  const cur = live.current;

  for (const one of list) {
    cur.setSelection((prev) =>
      applyCommit(prev, {
        selector: one.change.target.selector,
        style: toChangeStyle(one.change),
      })
    );
  }

  const port = { post: cur.post, refreshRects: cur.refreshRects };

  const optimistic = list.map((one) =>
    startOptimistic(port, one.edit, (message) => live.current.onError(message))
  );

  try {
    const result = await api.directEditBatch(cur.projectId, directionId, {
      edits: list.map((one) => one.edit),
    });

    for (const [index, one] of optimistic.entries()) {
      one.saved(result.applied[index]?.tailwind ?? null);
    }

    live.current.refreshRects();
  } catch (error) {
    for (const one of optimistic) {
      one.failed(errorText(error));
    }

    runTextRestore(live, list, errorText(error));
  }
};

const runTextKey = (live: LiveOptions, id: TextKeyId): void => {
  const cur = live.current;

  if (!cur.isEnabled || !cur.directionId || cur.selection.length === 0) {
    return;
  }

  const reason = toTextBlock(cur.selection);

  if (reason) {
    cur.onError(reason);

    return;
  }

  const list = toTextSaves(toTextChanges(cur.selection, id));

  if (list.length > 0) {
    void runTextSave(live, cur.directionId, list);
  }
};

const runTextKeyDown = (live: LiveOptions, event: KeyboardEvent): void => {
  const id = toTextKeyId(event, IS_MAC);
  const cur = live.current;

  if (!id || !cur.isEnabled || cur.selection.length === 0) {
    return;
  }

  if (isTypingTarget(event.target) || !canvasHasKeys()) {
    return;
  }

  event.preventDefault();

  if (!event.repeat) {
    runTextKey(live, id);
  }
};

const runTextMessage = (live: LiveOptions, message: BridgeToParent): void => {
  if (message.type === "arrange-key" && isTextKeyId(message.key)) {
    runTextKey(live, message.key);
  }
};

const useTextKeys = (options: NudgeOptions): void => {
  const live = useLatestRef(options);
  const { listen } = options;

  useEffect(() => {
    const stop = listen((message) => runTextMessage(live, message));
    const onKey = (event: KeyboardEvent): void => runTextKeyDown(live, event);
    globalThis.addEventListener("keydown", onKey, true);

    return (): void => {
      stop();
      globalThis.removeEventListener("keydown", onKey, true);
    };
  }, [live, listen]);
};

export { useTextKeys };
