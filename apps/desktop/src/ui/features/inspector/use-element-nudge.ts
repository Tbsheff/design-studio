import type {
  BridgeToParent,
  DirectEditRequest,
  NudgeBase,
  NudgeItem,
  SelectionContext,
} from "@design-studio/contracts";
import { useEffect, useRef } from "react";

import { nudgeStepOf } from "../../../shared/nudge.js";
import { api, errorText } from "../../api.js";
import type { ParentMessageBody } from "../../platform/bridge.js";
import {
  canvasHasKeys,
  inspectorButtonFocused,
  isTypingTarget,
} from "../../platform/typing-target.js";
import { focusStageQuietly } from "../canvas/use-inline-text-edit.js";
import { multiBlockReason } from "./mixed-values.js";
import { startOptimistic } from "./optimistic-edit.js";
import { buildEditRequest, mergeCommit } from "./use-direct-edit.js";

const SAVE_MS = 300;

const FLOW_HINT =
  "Arrow keys move absolute elements and elements with a margin. Drag this one to change its place in the layout.";

const NO_SOURCE_HINT =
  "This element has no source location, so it cannot move here.";

const SOME_HINT =
  "Some selected elements sit in the layout, so the arrow keys move only the others. Drag one to change its place.";

interface Options {
  readonly projectId: string;
  readonly directionId: string | null;
  readonly selection: SelectionContext[];
  readonly isEnabled: boolean;
  readonly post: (body: ParentMessageBody) => void;
  readonly listen: (handler: (message: BridgeToParent) => void) => () => void;
  readonly setSelection: (
    updater: (prev: SelectionContext[]) => SelectionContext[]
  ) => void;
  readonly refreshRects: () => void;
  readonly onError: (message: string) => void;
}

interface Mover {
  readonly target: SelectionContext;
  readonly base: NudgeBase;
}

interface Burst {
  readonly key: string;
  readonly items: Mover[];
  readonly dx: number;
  readonly dy: number;
}

interface Step {
  readonly base: NudgeBase;
  readonly dx: number;
  readonly dy: number;
}

const FLUSH_ON = new Set<BridgeToParent["type"]>([
  "ready",
  "history-key",
  "app-key",
  "structure-key",
  "reorder-key",
  "move-start",
]);

const shown = new Set<string>();

const axisStyle = (
  prop: string,
  start: number,
  delta: number
): Record<string, string> =>
  delta === 0 ? {} : { [prop]: `${Math.round(start + delta)}px` };

const nudgeStyle = (b: Step): Record<string, string> => {
  const { base, dx, dy } = b;

  if (base.mode === "margin") {
    return {
      ...axisStyle("margin-left", base.x, base.lockX ? 0 : dx),
      ...axisStyle("margin-top", base.y, base.lockY ? 0 : dy),
    };
  }

  if (base.mode !== "position") {
    return {};
  }

  return {
    ...axisStyle(
      base.fromRight ? "right" : "left",
      base.x,
      base.fromRight ? -dx : dx
    ),
    ...axisStyle(
      base.fromBottom ? "bottom" : "top",
      base.y,
      base.fromBottom ? -dy : dy
    ),
  };
};

const isMovable = (base: NudgeBase, dx: number, dy: number): boolean => {
  if (base.mode === "position") {
    return true;
  }

  return (
    base.mode === "margin" &&
    ((dx !== 0 && !base.lockX) || (dy !== 0 && !base.lockY))
  );
};

const burstKey = (selectors: string[]): string =>
  selectors.toSorted().join("\n");

interface Saved {
  readonly edit: DirectEditRequest;
  readonly selector: string;
  readonly style: Record<string, string>;
  readonly back: Record<string, string>;
}

const savedOf = (b: Burst): Saved[] =>
  b.items.flatMap((item) => {
    const style = nudgeStyle({ base: item.base, dx: b.dx, dy: b.dy });
    const edit = buildEditRequest(item.target, style);

    if (!edit) {
      return [];
    }

    const back = Object.fromEntries(
      Object.keys(style).map((key) => [key, item.target.styles[key] ?? ""])
    );

    return [{ back, edit, selector: item.target.selector, style }];
  });

const OVERLAY_OPEN =
  'dialog[open], [role="dialog"], [role="menu"], [role="listbox"], [data-esc-owner]';

const shouldPickNew = (
  message: BridgeToParent,
  current: SelectionContext[]
): boolean => {
  if (message.type !== "select" && message.type !== "select-many") {
    return false;
  }

  const picked =
    message.type === "select"
      ? [message.selection.selector]
      : message.selections.map((s) => s.selector);

  if (message.additive) {
    return true;
  }

  return burstKey(picked) !== burstKey(current.map((s) => s.selector));
};

const keysToCanvas = (): void => {
  const focused = document.activeElement;

  if (
    focused instanceof HTMLIFrameElement &&
    focused.closest(".canvas .stage")
  ) {
    focused.blur();
  }
};

const shouldBlurToCanvas = (event: KeyboardEvent): boolean => {
  const focused = document.activeElement;

  if (
    event.key !== "Escape" ||
    event.defaultPrevented ||
    !(focused instanceof HTMLElement) ||
    focused === document.body
  ) {
    return false;
  }

  if (
    canvasHasKeys() ||
    focused instanceof HTMLIFrameElement ||
    isTypingTarget(focused) ||
    document.querySelector(OVERLAY_OPEN)
  ) {
    return false;
  }

  const stage = document.querySelector<HTMLElement>(".canvas .stage");

  if (stage) {
    focusStageQuietly(stage);
  } else {
    focused.blur();
  }

  event.preventDefault();
  event.stopImmediatePropagation();

  return true;
};

const shouldTakeArrowKeys = (): boolean => {
  if (canvasHasKeys()) {
    return true;
  }

  const button = inspectorButtonFocused();

  if (!button || document.querySelector(OVERLAY_OPEN)) {
    return false;
  }

  button.blur();

  return true;
};

const useElementNudge = (o: Options): void => {
  const live = useRef(o);
  live.current = o;
  const burst = useRef<Burst | null>(null);
  const timer = useRef<number | null>(null);
  const flushNow = useRef<() => void>(() => undefined);

  useEffect(() => {
    const hintOnce = (text: string) => {
      if (shown.has(text)) {
        return;
      }

      shown.add(text);
      live.current.onError(text);
    };

    const restore = (list: Saved[], message: string) => {
      live.current.post({ type: "preview-reset" });

      for (const one of list) {
        live.current.setSelection((prev) =>
          mergeCommit(prev, { selector: one.selector, style: one.back })
        );
      }

      live.current.onError(message);
    };

    const save = async (b: Burst) => {
      const cur = live.current;
      const list = savedOf(b);

      if (list.length === 0 || !cur.directionId) {
        return;
      }

      for (const one of list) {
        cur.setSelection((prev) =>
          mergeCommit(prev, { selector: one.selector, style: one.style })
        );
      }

      const port = { post: cur.post, refreshRects: cur.refreshRects };

      const optimistic = list.map((one) =>
        startOptimistic(port, one.edit, (message) =>
          live.current.onError(message)
        )
      );

      try {
        if (list.length === 1) {
          const result = await api.directEdit(
            cur.projectId,
            cur.directionId,
            (list[0] as Saved).edit
          );

          optimistic[0]?.saved(result.tailwind);
        } else {
          const result = await api.directEditBatch(
            cur.projectId,
            cur.directionId,
            { edits: list.map((one) => one.edit) }
          );

          optimistic.forEach((one, index) =>
            one.saved(result.applied[index]?.tailwind)
          );
        }

        live.current.refreshRects();
      } catch (error) {
        for (const one of optimistic) {
          one.failed(errorText(error));
        }

        restore(list, errorText(error));
      }
    };

    const flush = () => {
      if (timer.current !== null) {
        window.clearTimeout(timer.current);
      }

      timer.current = null;
      const b = burst.current;
      burst.current = null;

      if (b && (b.dx !== 0 || b.dy !== 0)) {
        void save(b);
      }
    };

    const moversFor = (wanted: NudgeItem[]): Mover[] | null => {
      const cur = live.current;

      if (!cur.isEnabled || !cur.directionId) {
        return null;
      }

      const picked = wanted.flatMap((item) => {
        const target = cur.selection.find((s) => s.selector === item.selector);

        return target ? [{ base: item.base, target }] : [];
      });

      if (picked.length === 0) {
        return null;
      }

      const reason =
        picked.length > 1
          ? multiBlockReason(picked.map((item) => item.target))
          : picked[0]?.target.source
            ? null
            : NO_SOURCE_HINT;

      if (reason) {
        hintOnce(reason);
      }

      return reason ? null : picked;
    };

    const begin = (wanted: NudgeItem[], key: string): Burst | null => {
      const all = moversFor(wanted);

      if (!all) {
        return null;
      }

      const items = all.filter((item) => item.base.mode !== "none");

      if (items.length < all.length) {
        hintOnce(items.length === 0 ? FLOW_HINT : SOME_HINT);
      }

      return items.length === 0 ? null : { dx: 0, dy: 0, items, key };
    };

    const press = (wanted: NudgeItem[], dx: number, dy: number) => {
      const key = burstKey(wanted.map((item) => item.selector));

      if (burst.current && burst.current.key !== key) {
        flush();
      }

      const current = burst.current ?? begin(wanted, key);

      if (!current) {
        return;
      }

      if (!current.items.some((item) => isMovable(item.base, dx, dy))) {
        return hintOnce(FLOW_HINT);
      }

      const b = { ...current, dx: current.dx + dx, dy: current.dy + dy };
      burst.current = b;

      for (const item of b.items) {
        live.current.post({
          selector: item.target.selector,
          style: nudgeStyle({ base: item.base, dx: b.dx, dy: b.dy }),
          type: "preview-style",
        });
      }

      live.current.refreshRects();

      if (timer.current !== null) {
        window.clearTimeout(timer.current);
      }

      timer.current = window.setTimeout(flush, SAVE_MS);
    };

    const onKey = (event: KeyboardEvent) => {
      if (
        live.current.isEnabled &&
        live.current.selection.length > 0 &&
        shouldBlurToCanvas(event)
      ) {
        return;
      }

      const step = nudgeStepOf(event);

      if (!step) {
        if (burst.current && event.key !== "Shift") {
          flush();
        }

        return;
      }

      const cur = live.current;

      if (
        !cur.isEnabled ||
        cur.selection.length === 0 ||
        !shouldTakeArrowKeys()
      ) {
        return;
      }

      event.preventDefault();
      cur.post({ dx: step.dx, dy: step.dy, type: "nudge" });
    };

    flushNow.current = flush;
    let editing = false;

    const stop = o.listen((message) => {
      if (message.type === "nudge-key") {
        press(
          [
            { base: message.base, selector: message.selector },
            ...(message.others ?? []),
          ],
          message.dx,
          message.dy
        );
      } else if (FLUSH_ON.has(message.type)) {
        flush();
      }

      if (message.type === "text-edit") {
        editing = message.state === "start";
      } else if (message.type === "text-commit") {
        editing = false;
      }

      if (shouldPickNew(message, live.current.selection)) {
        window.setTimeout(() => editing || keysToCanvas(), 0);
      }
    });

    window.addEventListener("keydown", onKey, true);

    return () => {
      stop();
      window.removeEventListener("keydown", onKey, true);
      flush();
    };
  }, [o.listen]);

  const key = burstKey(o.selection.map((s) => s.selector));
  useEffect(() => {
    if (burst.current && key !== burst.current.key) {
      flushNow.current();
    }
  }, [key]);
};

export { nudgeStyle, useElementNudge };
