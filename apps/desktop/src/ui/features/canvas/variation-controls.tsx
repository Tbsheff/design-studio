import type { RunStatus, SelectionContext } from "@design-studio/contracts";
import { Icon } from "@design-studio/ui";
import { useEffect, useState } from "react";
import type { PointerEvent as ReactPointerEvent, ReactElement } from "react";

import { copy } from "./copy.js";
import { menuKeys, useMenu } from "./frame-resize-handles.js";

const STATUS_TEXT: Record<RunStatus, string> = {
  budget_exceeded: "Budget limit",
  canceled: "Canceled",
  completed: "Done",
  failed: "Failed",
  running: "Running",
};

interface Sibling {
  id: string;
  label: string;
  title: string;
}

interface FrameVariation {
  label: string;
  title: string;
  status: RunStatus | null;
  costText: string;
  siblings: Sibling[];
  scoped?: boolean;
  error?: string | null;
  keepBlocked?: string | null;
  onKeep: () => void | Promise<void>;
  onMix: (toDirectionId: string, element: SelectionContext) => Promise<void>;
}

const stop = (e: ReactPointerEvent): void => e.stopPropagation();

function UseInMenu({
  siblings,
  busy,
  onPick,
}: {
  siblings: Sibling[];
  busy: boolean;
  onPick: (id: string) => void;
}): ReactElement {
  const menu = useMenu();
  useEffect(() => {
    if (menu.open) {
      menu.root.current
        ?.querySelector<HTMLButtonElement>('[role="menuitem"]')
        ?.focus();
    }
  }, [menu.open, menu.root]);

  return (
    <div className="frame-menu-root" ref={menu.root}>
      <button
        ref={menu.trigger}
        type="button"
        className="frame-chip strong"
        aria-haspopup="menu"
        aria-expanded={menu.open}
        disabled={busy}
        onPointerDown={stop}
        onClick={() => menu.setOpen((v) => !v)}
        data-tip={
          menu.open
            ? undefined
            : "Use the selected element in another variation"
        }
      >
        {busy ? "Starting…" : "Use in…"}
        <Icon name="chevronDown" size={12} />
      </button>
      {menu.open && (
        <div
          className="project-menu canvas-menu frame-menu"
          role="menu"
          aria-label={copy.inVariation}
          onKeyDown={(e) => menuKeys(e, menu.close)}
        >
          {siblings.map((other) => (
            <button
              key={other.id}
              type="button"
              role="menuitem"
              tabIndex={-1}
              onClick={() => {
                menu.close(true);
                onPick(other.id);
              }}
            >
              <span className="badge">{other.label}</span>
              <span>{other.title}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function shortRejection(error: string): string {
  if (!error.startsWith("Rejected:")) {
    return error.length > 60 ? `${error.slice(0, 60)}…` : error;
  }

  return /another file|other files/.test(error)
    ? "Rejected: changed another file"
    : "Rejected: changed code outside the element";
}

function VariationControls({
  variation,
  active,
  element,
  onMixed,
}: {
  variation: FrameVariation;
  active: boolean;
  element: SelectionContext | null;
  onMixed: () => void;
}): ReactElement {
  const [mixing, setMixing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [keeping, setKeeping] = useState(false);
  const { status } = variation;

  const keep = async (): Promise<void> => {
    if (variation.keepBlocked || keeping) {
      return;
    }

    setKeeping(true);
    setError(null);

    try {
      await variation.onKeep();
    } catch (failure) {
      setError(
        `Could not keep it. ${failure instanceof Error ? failure.message : String(failure)}`
      );
    } finally {
      setKeeping(false);
    }
  };

  const mix = async (to: string): Promise<void> => {
    if (!element) {
      return;
    }

    setMixing(true);
    setError(null);

    try {
      await variation.onMix(to, element);
      onMixed();
    } catch (failure) {
      setError(
        `Could not use the element. ${failure instanceof Error ? failure.message : String(failure)} Pick it again, then try again.`
      );
    } finally {
      setMixing(false);
    }
  };

  return (
    <>
      {!variation.error && (
        <span
          className={`variation-status ${status ?? "idle"}`}
          data-testid="variation-status"
          data-tip={variation.costText}
        >
          {status ? STATUS_TEXT[status] : "No run"}
        </span>
      )}
      {active &&
        element &&
        !variation.scoped &&
        variation.siblings.length > 0 && (
          <UseInMenu
            siblings={variation.siblings}
            busy={mixing}
            onPick={(id) => void mix(id)}
          />
        )}
      <button
        type="button"
        className="frame-chip keep"
        aria-disabled={variation.keepBlocked ? true : undefined}
        data-tip={
          variation.keepBlocked ??
          (variation.scoped
            ? "Put this version of the element into the design"
            : undefined)
        }
        data-testid="variation-keep"
        onPointerDown={stop}
        onClick={() => void keep()}
      >
        {keeping ? "Keeping…" : "Keep this one"}
      </button>
      {variation.error && (
        <span
          className="frame-error scope"
          role="status"
          aria-label={variation.error}
          data-testid="variation-error"
          data-tip={variation.error}
        >
          {shortRejection(variation.error)}
        </span>
      )}
      {error && (
        <span className="frame-error" role="alert">
          {error}
        </span>
      )}
    </>
  );
}

export { VariationControls, stop };

export type { FrameVariation, Sibling };
