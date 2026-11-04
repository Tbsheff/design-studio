import { useCallback, useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { createPortal } from "react-dom";

import type { SelectionContext } from "../../../shared/contracts.js";
import type {
  InsertPosition,
  InsertableComponent,
  InsertableList,
} from "../../../shared/insert.js";
import { PreviewMenu } from "../canvas/preview-menu.js";
import type { PreviewMenuItem } from "../canvas/preview-menu.js";
import { NO_SOURCE } from "../inspector/structure-edits.js";
import { insertApi, insertBus, insertError } from "./component-insert-api.js";
import type { DropHint } from "./component-insert-api.js";

const DRAG_START_PX = 4;

export const useInsertable = (
  projectId: string,
  directionId: string | null,
  enabled: boolean,
  version: string
) => {
  const [state, setState] = useState<{
    list: InsertableList | null;
    error: string | null;
  }>({ error: null, list: null });

  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!enabled || !directionId) {
      return;
    }

    let live = true;

    const read = async () => {
      try {
        const list = await insertApi.list(projectId, directionId);

        if (live) {
          setState({ error: null, list });
        }
      } catch (error: unknown) {
        if (live) {
          setState((prev) => ({ ...prev, error: insertError(error) }));
        }
      }
    };

    void read();

    return () => {
      live = false;
    };
  }, [projectId, directionId, enabled, version, attempt]);
  useEffect(
    () => setState({ error: null, list: null }),
    [projectId, directionId]
  );

  return { ...state, retry: () => setAttempt((n) => n + 1) };
};

interface Drag {
  component: InsertableComponent;
  pointerId: number;
  startX: number;
  startY: number;
  active: boolean;
}

export interface ComponentDrag {
  ghost: { name: string; x: number; y: number; hint: DropHint | null } | null;
  handlers: (component: InsertableComponent) => {
    onPointerDown: (event: ReactPointerEvent<HTMLElement>) => void;
    onPointerMove: (event: ReactPointerEvent<HTMLElement>) => void;
    onPointerUp: (event: ReactPointerEvent<HTMLElement>) => void;
    onPointerCancel: () => void;
    onClickCapture: (event: React.MouseEvent) => void;
  };
}

const startDrag = (
  component: InsertableComponent,
  event: ReactPointerEvent<HTMLElement>
): Drag => ({
  active: false,
  component,
  pointerId: event.pointerId,
  startX: event.clientX,
  startY: event.clientY,
});

const isBelowThreshold = (
  cur: Drag,
  event: ReactPointerEvent<HTMLElement>
): boolean =>
  Math.hypot(event.clientX - cur.startX, event.clientY - cur.startY) <
  DRAG_START_PX;

const useCancelOnEscape = (active: boolean, cancel: () => void): void => {
  useEffect(() => {
    if (!active) {
      return;
    }

    const onKey = (event: KeyboardEvent) => event.key === "Escape" && cancel();
    globalThis.addEventListener("keydown", onKey);

    return () => globalThis.removeEventListener("keydown", onKey);
  }, [active, cancel]);
};

const swallowClick = (
  dragged: { current: boolean },
  event: React.MouseEvent
) => {
  if (!dragged.current) {
    return;
  }

  dragged.current = false;
  event.preventDefault();
  event.stopPropagation();
};

export const useComponentDrag = (): ComponentDrag => {
  const drag = useRef<Drag | null>(null);
  const dragged = useRef(false);
  const frame = useRef(0);
  const [ghost, setGhost] = useState<ComponentDrag["ghost"]>(null);

  const cancel = useCallback(() => {
    drag.current = null;
    setGhost(null);
  }, []);

  useCancelOnEscape(ghost !== null, cancel);

  const handlers = (component: InsertableComponent) => ({
    onClickCapture: (event: React.MouseEvent) => swallowClick(dragged, event),
    onPointerCancel: cancel,
    onPointerDown(event: ReactPointerEvent<HTMLElement>) {
      if (event.button !== 0) {
        return;
      }

      dragged.current = false;
      drag.current = startDrag(component, event);
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    onPointerMove(event: ReactPointerEvent<HTMLElement>) {
      const cur = drag.current;

      if (!cur || cur.pointerId !== event.pointerId) {
        return;
      }

      if (!cur.active && isBelowThreshold(cur, event)) {
        return;
      }

      cur.active = true;
      const { clientX: x, clientY: y } = event;
      setGhost((prev) => ({
        hint: prev?.hint ?? null,
        name: component.name,
        x,
        y,
      }));

      if (frame.current) {
        return;
      }

      frame.current = globalThis.requestAnimationFrame(() => {
        frame.current = 0;
        insertBus
          .get()
          ?.dragMove(x, y, (hint) =>
            setGhost((prev) => (prev ? { ...prev, hint } : prev))
          );
      });
    },
    onPointerUp(event: ReactPointerEvent<HTMLElement>) {
      const cur = drag.current;
      drag.current = null;
      setGhost(null);

      if (!cur?.active) {
        return;
      }

      dragged.current = true;
      insertBus.get()?.dragEnd(cur.component, event.clientX, event.clientY);
    },
  });

  return { ghost, handlers };
};

export const DragGhost = ({ ghost }: { ghost: ComponentDrag["ghost"] }) => {
  if (!ghost) {
    return null;
  }

  return createPortal(
    <div
      className="cmp-ghost"
      style={{ left: ghost.x + 12, top: ghost.y + 12 }}
      role="status"
      aria-live="polite"
    >
      <span className="cmp-ghost-name">{ghost.name}</span>
      <span
        className={`cmp-ghost-hint${ghost.hint && !ghost.hint.ok ? " bad" : ""}`}
      >
        {ghost.hint?.text ?? "Drop on an element in the frame"}
      </span>
    </div>,
    document.body
  );
};

const blockReason = (
  selection: SelectionContext | undefined
): string | undefined => {
  if (!selection) {
    return "Select an element on the canvas first.";
  }

  if (!selection.source && !selection.owners?.length) {
    return NO_SOURCE;
  }

  return undefined;
};

export const InsertMenu = ({
  component,
  at,
  selection,
  onClose,
}: {
  component: InsertableComponent;
  at: { x: number; y: number };
  selection: SelectionContext | undefined;
  onClose: () => void;
}) => {
  const disabled = blockReason(selection);
  const tag = selection?.tag.toLowerCase() ?? "selection";

  const run = (position: InsertPosition) => () =>
    insertBus.get()?.insert(component, position);

  const items: PreviewMenuItem[] = [
    {
      icon: "frame",
      id: "insert-inside",
      label: `Insert inside ${tag}`,
      run: run("inside"),
      ...(disabled ? { disabled } : {}),
    },
    {
      icon: "arrowDown",
      id: "insert-after",
      label: `Insert after ${tag}`,
      run: run("after"),
      ...(disabled ? { disabled } : {}),
    },
  ];

  return (
    <PreviewMenu
      at={at}
      label={`Insert ${component.name}`}
      items={items}
      onClose={onClose}
    />
  );
};
