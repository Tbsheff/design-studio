import type { CopyCodeFormat } from "@design-studio/contracts/export";
import { Icon, usePopover } from "@design-studio/ui";
import type { IconName } from "@design-studio/ui";
import { useCallback, useEffect, useRef, useState } from "react";
import type { KeyboardEvent, ReactElement } from "react";

import { copy as uiCopy } from "./copy.js";

import "../../styles/export.css";
import { activeExportFrame, exportApi, openExport } from "./export-api.js";

interface Props {
  projectId: string;
  directionId: string | null;
  selector: string;
  variant?: "icon" | "row";
}

type State =
  | { kind: "idle" }
  | { kind: "busy" }
  | { kind: "copied"; label: string }
  | { kind: "failed"; message: string };

const RESET_MS = 1600;

const menuKeys = (
  event: KeyboardEvent<HTMLElement>,
  close: (refocus: boolean) => void
): void => {
  if (event.key === "Tab") {
    close(false);
  }

  const steps: Record<string, number> = { ArrowDown: 1, ArrowUp: -1 };
  const step = steps[event.key];

  if (!step) {
    return;
  }

  event.preventDefault();

  const items = [
    ...event.currentTarget.querySelectorAll<HTMLButtonElement>(
      '[role="menuitem"]'
    ),
  ];

  const index = items.indexOf(document.activeElement as HTMLButtonElement);
  items[(Math.max(0, index) + step + items.length) % items.length]?.focus();
};

const toBlob = async (text: Promise<string>): Promise<Blob> =>
  new Blob([await text], { type: "text/plain" });

const writeWhenReady = async (text: Promise<string>): Promise<void> => {
  if (
    typeof ClipboardItem === "undefined" ||
    typeof navigator.clipboard?.write !== "function"
  ) {
    await navigator.clipboard.writeText(await text);

    return;
  }

  try {
    await navigator.clipboard.write([
      new ClipboardItem({ "text/plain": toBlob(text) }),
    ]);
  } catch (error) {
    const value = await text;

    try {
      await navigator.clipboard.writeText(value);
    } catch {
      throw error;
    }
  }
};

const toCopyText = async (
  produce: () => Promise<string | null>
): Promise<string> => {
  const value = await produce();

  if (!value) {
    throw new Error("Nothing to copy");
  }

  return value;
};

const TriggerContent = ({
  variant,
  open,
  busy,
  text,
  icon,
}: {
  variant: "icon" | "row";
  open: boolean;
  busy: boolean;
  text: string;
  icon: IconName;
}): ReactElement => {
  if (variant === "row") {
    return (
      <>
        <span>{text}</span>
        <Icon name={open ? "chevronDown" : "chevronRight"} size={12} />
      </>
    );
  }

  return busy ? <span className="spinner" /> : <Icon name={icon} size={14} />;
};

const CopyCodeMenu = ({
  projectId,
  directionId,
  selector,
  variant = "icon",
}: Props): ReactElement => {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<State>({ kind: "idle" });
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const timer = useRef<ReturnType<typeof globalThis.setTimeout> | null>(null);

  const close = useCallback((refocus: boolean) => {
    setOpen(false);

    if (refocus) {
      trigger.current?.focus();
    }
  }, []);

  usePopover(open, root, close);
  useEffect(
    () => (): void => {
      if (timer.current !== null) {
        globalThis.clearTimeout(timer.current);
      }
    },
    []
  );
  useEffect(() => {
    if (open) {
      root.current
        ?.querySelector<HTMLButtonElement>('[role="menuitem"]')
        ?.focus();
    }
  }, [open]);

  const settle = (next: State): void => {
    setState(next);

    if (timer.current !== null) {
      globalThis.clearTimeout(timer.current);
    }

    timer.current = globalThis.setTimeout(
      () => setState({ kind: "idle" }),
      RESET_MS
    );
  };

  const copy = async (
    label: string,
    produce: () => Promise<string | null>
  ): Promise<void> => {
    const text = toCopyText(produce);

    const written = writeWhenReady(text);
    close(true);
    setState({ kind: "busy" });

    try {
      await written;
      settle({ kind: "copied", label });
    } catch (error) {
      settle({
        kind: "failed",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  };

  const code = (format: CopyCodeFormat) => async (): Promise<string | null> => {
    if (!directionId) {
      return null;
    }

    return (
      await exportApi.copyCode(projectId, {
        directionId,
        format,
        frame: activeExportFrame(projectId),
        selector,
      })
    ).code;
  };

  const items: { label: string; icon: IconName; run: () => void }[] = [
    {
      icon: "code",
      label: "Copy HTML and CSS",
      run: () => void copy("HTML", code("html")),
    },
    {
      icon: "code",
      label: "Copy Tailwind",
      run: () => void copy("Tailwind", code("tailwind")),
    },
    {
      icon: "code",
      label: "Copy React",
      run: () => void copy("React", code("react")),
    },
    {
      icon: "image",
      label: "Export PNG…",
      run: () => {
        close(false);
        openExport({ format: "png", selector });
      },
    },
  ];

  const label =
    state.kind === "busy"
      ? "Copying code"
      : state.kind === "copied"
        ? `Copied ${state.label}`
        : state.kind === "failed"
          ? `Copy failed: ${state.message}`
          : "Copy as code";

  const icon: IconName =
    state.kind === "copied"
      ? "check"
      : state.kind === "failed"
        ? "alert"
        : "code";

  return (
    <div className="copy-code-root" ref={root}>
      <button
        ref={trigger}
        type="button"
        className={`${variant === "row" ? "ins-export-row" : "icon-btn small copy-code-trigger"}${state.kind === "busy" ? " busy" : ""}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        data-tip={open || variant === "row" ? null : label}
        data-tip-align="end"
        onClick={() => setOpen((value) => !value)}
      >
        <TriggerContent
          variant={variant}
          open={open}
          busy={state.kind === "busy"}
          text={state.kind === "idle" ? "Export selection" : label}
          icon={icon}
        />
      </button>
      <span className="sr-only" aria-live="polite">
        {state.kind === "idle" ? "" : label}
      </span>
      {open ? (
        <div
          className="project-menu copy-code-menu"
          role="menu"
          aria-label={uiCopy.copyElement}
          onKeyDown={(e) => menuKeys(e, close)}
        >
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              tabIndex={-1}
              onClick={item.run}
            >
              <Icon name={item.icon} size={14} />
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
};

export { CopyCodeMenu };
