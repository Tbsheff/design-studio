import { useEffect, useRef, useState, useTransition } from "react";
import type { MutableRefObject } from "react";

import { ARRANGE_SHORTCUTS } from "../../../shared/arrange.js";
import type { ArrangeAction } from "../../../shared/arrange.js";
import { arrange as arrangeRequest, errorText } from "../../api.js";
import { isTypingTarget } from "../../platform/typing-target.js";
import { PREVIEW_ARRANGE_KEY_EVENT } from "../canvas/use-preview-frames.js";
import {
  OK_MS,
  successText,
  commitWrites,
  frameRequest,
} from "./arrange-model.js";
import type { Props, Message } from "./arrange-model.js";
import { useLatestRef } from "./use-latest-ref.js";

interface UseArrangeResult {
  readonly isBusy: boolean;
  readonly message: Message | null;
  readonly run: (action: ArrangeAction) => Promise<void>;
}

interface KeyedMessage {
  readonly key: string;
  readonly message: Message | null;
}

const NO_MESSAGE: KeyedMessage = { key: "", message: null };

const toResultMessage = (
  result: Awaited<ReturnType<typeof arrangeRequest>>
): Message => {
  if (result.changed) {
    return { kind: "ok", text: successText(result) };
  }

  return { kind: "note", text: result.note ?? "Already aligned." };
};

const runArrange = async (
  cur: Props,
  action: ArrangeAction,
  setMessage: (message: Message | null) => void
): Promise<void> => {
  const { directionId } = cur;

  if (!directionId) {
    return;
  }

  try {
    await cur.control.current?.settle();

    const targets = cur.selection.map((selectionContextValue) => ({
      selector: selectionContextValue.selector,
    }));

    const result = await arrangeRequest(cur.projectId, directionId, {
      action,
      targets,
      ...frameRequest(cur.projectId),
    });

    commitWrites(cur, result);
    setMessage(toResultMessage(result));
  } catch (error) {
    setMessage({ kind: "error", text: errorText(error) });
  }
};

const toVisibleMessage = (entry: KeyedMessage, key: string): Message | null => {
  if (entry.key === key) {
    return entry.message;
  }

  return null;
};

const useArrange = (props: Props): UseArrangeResult => {
  const latest = useLatestRef(props);
  const [isBusy, startTransition] = useTransition();
  const [entry, setEntry] = useState<KeyedMessage>(NO_MESSAGE);
  const inflight = useRef(false);

  const key = props.selection
    .map((selectionContext) => selectionContext.selector)
    .join("\n");

  const message = toVisibleMessage(entry, key);

  useEffect(() => {
    if (message?.kind !== "ok") {
      return;
    }

    const timer = globalThis.setTimeout(() => setEntry(NO_MESSAGE), OK_MS);

    return (): void => globalThis.clearTimeout(timer);
  }, [message]);

  const run = async (action: ArrangeAction): Promise<void> => {
    const { current: cur } = latest;

    if (!cur.directionId || inflight.current || cur.selection.length === 0) {
      return;
    }

    inflight.current = true;
    setEntry(NO_MESSAGE);

    const job = runArrange(cur, action, (next) =>
      setEntry({ key, message: next })
    );

    startTransition(async () => {
      await job;
    });
    await job;
    inflight.current = false;
  };

  return { isBusy, message, run };
};

const toChord = (event: KeyboardEvent): string | null => {
  if (event.metaKey || event.repeat || !event.altKey) {
    return null;
  }

  let chord = "";

  if (event.ctrlKey) {
    chord += "Ctrl+";
  }

  chord += "Alt+";

  if (event.shiftKey) {
    chord += "Shift+";
  }

  return `${chord}${event.code}`;
};

const toShortcutAction = (chord: string | null): ArrangeAction | null => {
  if (!chord) {
    return null;
  }

  return ARRANGE_SHORTCUTS[chord] ?? null;
};

const useArrangeKeys = (
  root: MutableRefObject<HTMLElement | null>,
  active: boolean,
  run: (action: ArrangeAction) => void
): void => {
  const latest = useLatestRef({ active, run });

  useEffect(() => {
    const ready = (): boolean =>
      latest.current.active &&
      Boolean(root.current && !root.current.closest("[inert]"));

    const fire = (chord: string | null, event: Event | null): void => {
      const action = toShortcutAction(chord);

      if (!action || !ready()) {
        return;
      }

      event?.preventDefault();
      latest.current.run(action);
    };

    const onKey = (event: KeyboardEvent): void => {
      if (!isTypingTarget(event.target)) {
        fire(toChord(event), event);
      }
    };

    const onForwarded = (event: Event): void =>
      fire(
        (event as CustomEvent<{ readonly key: string | null }>).detail?.key ??
          null,
        null
      );

    globalThis.addEventListener("keydown", onKey);
    globalThis.addEventListener(PREVIEW_ARRANGE_KEY_EVENT, onForwarded);

    return (): void => {
      globalThis.removeEventListener("keydown", onKey);
      globalThis.removeEventListener(PREVIEW_ARRANGE_KEY_EVENT, onForwarded);
    };
  }, [root, latest]);
};

export { useArrange, useArrangeKeys };
