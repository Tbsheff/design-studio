import { useEffect, useRef, useState } from "react";
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

const useArrange = (
  props: Props
): {
  readonly isBusy: boolean;
  readonly message: Message | null;
  readonly run: (action: ArrangeAction) => Promise<void>;
} => {
  const latest = useRef(props);
  latest.current = props;
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);
  const busyRef = useRef(false);
  useEffect(() => {
    if (message?.kind !== "ok") {
      return;
    }

    const timer = globalThis.setTimeout(() => setMessage(null), OK_MS);

    return (): void => globalThis.clearTimeout(timer);
  }, [message]);

  const key = props.selection
    .map((selectionContext) => selectionContext.selector)
    .join("\n");

  useEffect(() => setMessage(null), [key]);

  const run = async (action: ArrangeAction): Promise<void> => {
    const cur = latest.current;

    if (!cur.directionId || busyRef.current || cur.selection.length === 0) {
      return;
    }

    busyRef.current = true;
    setBusy(true);
    setMessage(null);

    try {
      await cur.control.current?.settle();

      const targets = cur.selection.map((selectionContextValue) => ({
        selector: selectionContextValue.selector,
      }));

      const result = await arrangeRequest(cur.projectId, cur.directionId, {
        action,
        targets,
        ...frameRequest(cur.projectId),
      });

      commitWrites(cur, result);
      setMessage(
        result.changed
          ? { kind: "ok", text: successText(result) }
          : { kind: "note", text: result.note ?? "Already aligned." }
      );
    } catch (error) {
      setMessage({ kind: "error", text: errorText(error) });
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  return { isBusy: busy, message, run };
};

const toChord = (event: KeyboardEvent): string | null => {
  if (event.metaKey || event.repeat || !event.altKey) {
    return null;
  }

  return `${event.ctrlKey ? "Ctrl+" : ""}Alt+${event.shiftKey ? "Shift+" : ""}${event.code}`;
};

const useArrangeKeys = (
  root: MutableRefObject<HTMLElement | null>,
  active: boolean,
  run: (action: ArrangeAction) => void
): void => {
  const latest = useRef({ active, run });
  latest.current = { active, run };
  useEffect(() => {
    const ready = (): boolean =>
      latest.current.active &&
      Boolean(root.current && !root.current.closest("[inert]"));

    const fire = (chord: string | null, event?: Event): void => {
      const action = chord ? ARRANGE_SHORTCUTS[chord] : undefined;

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
        (event as CustomEvent<{ readonly key?: string }>).detail?.key ?? null
      );

    globalThis.addEventListener("keydown", onKey);
    globalThis.addEventListener(PREVIEW_ARRANGE_KEY_EVENT, onForwarded);

    return (): void => {
      globalThis.removeEventListener("keydown", onKey);
      globalThis.removeEventListener(PREVIEW_ARRANGE_KEY_EVENT, onForwarded);
    };
  }, [root]);
};

export { useArrange, useArrangeKeys };
