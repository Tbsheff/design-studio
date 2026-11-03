import { useEffect, useRef, useState, type MutableRefObject } from "react";

import {
  ARRANGE_SHORTCUTS,
  type ArrangeAction,
} from "../../../shared/arrange.js";
import { arrange as arrangeRequest, errorText } from "../../api.js";
import { isTypingTarget } from "../../platform/typing-target.js";
import { PREVIEW_ARRANGE_KEY_EVENT } from "../../usePreviewFrames.js";
import {
  type Props,
  type Message,
  OK_MS,
  successText,
  commitWrites,
} from "./arrange-model.js";

function useArrange(props: Props) {
  const latest = useRef(props);
  latest.current = props;
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);
  const busyRef = useRef(false);
  useEffect(() => {
    if (message?.kind !== "ok") {
      return;
    }

    const timer = window.setTimeout(() => setMessage(null), OK_MS);

    return () => window.clearTimeout(timer);
  }, [message]);
  const key = props.selection.map((s) => s.selector).join("\n");
  useEffect(() => setMessage(null), [key]);

  const run = async (action: ArrangeAction) => {
    const cur = latest.current;

    if (!cur.directionId || busyRef.current || cur.selection.length === 0) {
      return;
    }

    busyRef.current = true;
    setBusy(true);
    setMessage(null);

    try {
      await cur.control.current?.settle();
      const targets = cur.selection.map((s) => ({ selector: s.selector }));

      const result = await arrangeRequest(cur.projectId, cur.directionId, {
        targets,
        action,
        ...frameRequest(cur.projectId),
      });

      commitWrites(cur, result);
      setMessage(
        result.changed
          ? { kind: "ok", text: successText(result) }
          : { kind: "note", text: result.note ?? "Already aligned." }
      );
    } catch (err) {
      setMessage({ kind: "error", text: errorText(err) });
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  return { busy, message, run };
}

function chordOf(event: KeyboardEvent): string | null {
  if (event.metaKey || event.repeat || !event.altKey) {
    return null;
  }

  return `${event.ctrlKey ? "Ctrl+" : ""}Alt+${event.shiftKey ? "Shift+" : ""}${event.code}`;
}

function useArrangeKeys(
  root: MutableRefObject<HTMLElement | null>,
  active: boolean,
  run: (action: ArrangeAction) => void
): void {
  const latest = useRef({ active, run });
  latest.current = { active, run };
  useEffect(() => {
    const ready = () =>
      latest.current.active &&
      Boolean(root.current && !root.current.closest("[inert]"));

    const fire = (chord: string | null, event?: Event) => {
      const action = chord ? ARRANGE_SHORTCUTS[chord] : undefined;

      if (!action || !ready()) {
        return;
      }

      event?.preventDefault();
      latest.current.run(action);
    };

    const onKey = (event: KeyboardEvent) => {
      if (!isTypingTarget(event.target)) {
        fire(chordOf(event), event);
      }
    };

    const onForwarded = (event: Event) =>
      fire((event as CustomEvent<{ key?: string }>).detail?.key ?? null);

    window.addEventListener("keydown", onKey);
    window.addEventListener(PREVIEW_ARRANGE_KEY_EVENT, onForwarded);

    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(PREVIEW_ARRANGE_KEY_EVENT, onForwarded);
    };
  }, [root]);
}

export { useArrange, useArrangeKeys };
