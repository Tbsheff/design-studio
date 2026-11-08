import { EXPORT_SCALES } from "@design-studio/contracts/export";
import type {
  EditorInfo,
  ExportFormat,
  ExportFrame,
  ExportScale,
  ExportScope,
  HandoffResult,
  McpStatus,
} from "@design-studio/contracts/export";
import { Icon, useModalDialog } from "@design-studio/ui";
import type { IconName } from "@design-studio/ui";
import { useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent, ReactElement } from "react";

import { downloadBlob } from "../../domain/format.js";
import { canvasFrameName, framePage } from "../canvas/canvas-frames.js";
import { mcpApi } from "../chat/mcp-model.js";
import { copy as uiCopy } from "./copy.js";
import {
  canRevealDownload,
  canvasFrameChoices,
  exportApi,
  frameRoute,
  readExportPrefs,
  revealDownload,
  saveExportPrefs,
} from "./export-api.js";
import type { ExportTarget, FrameChoice } from "./export-api.js";

import "../../styles/export.css";
import { useCopied } from "./use-copied.js";

export interface Props {
  target: ExportTarget;
  onClose: () => void;
}

interface FormatInfo {
  id: ExportFormat;
  label: string;
  icon: IconName;
  hint: string;
  action: string;
}

const FORMATS: FormatInfo[] = [
  {
    action: "Export PNG",
    hint: "One image per frame. Many frames download as a zip.",
    icon: "image",
    id: "png",
    label: "PNG",
  },
  {
    action: "Export SVG",
    hint: "Vector shapes and live text, with font names. Pictures stay embedded. Many frames download as a zip.",
    icon: "pencil",
    id: "svg",
    label: "SVG",
  },
  {
    action: "Export PDF",
    hint: "One page per frame, at 2× for sharp print.",
    icon: "doc",
    id: "pdf",
    label: "PDF",
  },
  {
    action: "Export PPTX",
    hint: "One slide per frame, or per slide of a deck, with text, boxes, shadows, gradients, SVG icons and images you can edit in Keynote or PowerPoint.",
    icon: "play",
    id: "pptx",
    label: "PPTX",
  },
  {
    action: "Export HTML",
    hint: "One file with CSS, fonts and images inside. Opens offline.",
    icon: "code",
    id: "html",
    label: "HTML",
  },
  {
    action: "Export zip",
    hint: "The project files of this version as a zip.",
    icon: "folder",
    id: "zip",
    label: "Source",
  },
  {
    action: "Create handoff",
    hint: "A folder for a coding agent: HANDOFF.md, tokens, screens and source.",
    icon: "terminal",
    id: "handoff",
    label: "Handoff",
  },
];

const MOBILE_MAX = 600;
const MOBILE_FRAME = { height: 844, name: "Mobile", width: 390 };

type Status =
  | { kind: "idle" }
  | { kind: "busy"; startedAt: number }
  | { kind: "done"; text: string; note: string | null; reveal: boolean }
  | { kind: "error"; text: string };

const RADIO_STEP: Record<string, (index: number, count: number) => number> = {
  ArrowDown: (i, n) => (i + 1) % n,
  ArrowLeft: (i, n) => (i - 1 + n) % n,
  ArrowRight: (i, n) => (i + 1) % n,
  ArrowUp: (i, n) => (i - 1 + n) % n,
};

const onRadioKey = (event: KeyboardEvent<HTMLDivElement>): void => {
  const step = RADIO_STEP[event.key];

  if (!step) {
    return;
  }

  const radios = [
    ...event.currentTarget.querySelectorAll<HTMLButtonElement>(
      '[role="radio"]:not(:disabled)'
    ),
  ];

  const index = radios.indexOf(document.activeElement as HTMLButtonElement);

  if (index === -1) {
    return;
  }

  event.preventDefault();
  const next = radios[step(index, radios.length)];
  next?.focus();
  next?.click();
};

const Segmented = <T extends string | number>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { id: T; label: string; icon?: IconName }[];
  onChange: (value: T) => void;
}): ReactElement => (
  <div
    className="segmented export-seg"
    role="radiogroup"
    aria-label={label}
    onKeyDown={onRadioKey}
  >
    {options.map((option) => (
      <button
        key={option.id}
        type="button"
        role="radio"
        aria-checked={value === option.id}
        tabIndex={value === option.id ? 0 : -1}
        className={value === option.id ? "on" : ""}
        onClick={() => onChange(option.id)}
      >
        {option.icon ? <Icon name={option.icon} size={14} /> : null}
        {option.label}
      </button>
    ))}
  </div>
);
const useElapsed = (status: Status): number => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (status.kind !== "busy") {
      return;
    }

    const timer = globalThis.setInterval(() => setNow(Date.now()), 1000);

    return (): void => globalThis.clearInterval(timer);
  }, [status.kind]);

  return status.kind === "busy"
    ? Math.max(0, Math.floor((now - status.startedAt) / 1000))
    : 0;
};

const HandoffResultView = ({
  target,
  result,
  editors,
  onError,
}: {
  target: ExportTarget;
  result: HandoffResult;
  editors: EditorInfo[];
  onError: (text: string) => void;
}): ReactElement => {
  const [copied, copy] = useCopied();
  const folder = result.path.split("/").pop() ?? "";

  const run = async (task: () => Promise<void>): Promise<void> => {
    try {
      await task();
    } catch (error) {
      onError(error instanceof Error ? error.message : String(error));
    }
  };

  return (
    <div className="export-handoff-result">
      <div className="export-path" data-tip={result.path}>
        <Icon name="folder" size={14} />
        <span className="truncate">…/handoff/{folder}</span>
      </div>
      <p className="export-sub">
        {result.files.length} files. Paste the prompt into Claude Code to build
        the design.
      </p>
      <div className="export-row-actions">
        <button
          type="button"
          className="btn small primary has-icon"
          onClick={() => copy("prompt", result.prompt)}
        >
          <Icon name={copied === "prompt" ? "check" : "copy"} size={14} />
          <span aria-live="polite">
            {copied === "prompt" ? "Copied" : "Copy prompt for Claude Code"}
          </span>
        </button>
        <button
          type="button"
          className="btn small has-icon"
          onClick={() =>
            run(async () => {
              const zip = await exportApi.handoffZip(target.projectId, folder);
              downloadBlob(zip.blob, zip.name);
            })
          }
        >
          <Icon name="download" size={14} />
          Download zip
        </button>
        <button
          type="button"
          className="btn small ghost"
          onClick={() =>
            run(() => exportApi.revealHandoff(target.projectId, folder))
          }
        >
          {uiCopy.revealInFinder}
        </button>
      </div>
      {editors.length > 0 && target.directionId ? (
        <div className="export-editors">
          <span className="export-label">{uiCopy.openProjectIn}</span>
          {editors.map((editor) => (
            <button
              key={editor.id}
              type="button"
              className="btn small ghost"
              onClick={() =>
                run(() =>
                  exportApi.openInEditor(
                    target.projectId,
                    target.directionId as string,
                    editor.id
                  )
                )
              }
            >
              {editor.name}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
};

const ConnectClaudeCode = (): ReactElement => {
  const [status, setStatus] = useState<McpStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, copy] = useCopied();
  useEffect(() => {
    let live = true;
    const load = async (): Promise<void> => {
      try {
        const next = await mcpApi.status();

        if (live) {
          setStatus(next);
        }
      } catch (failure) {
        if (live) {
          setError(
            failure instanceof Error ? failure.message : String(failure)
          );
        }
      }
    };
    void load();

    return (): void => {
      live = false;
    };
  }, []);

  const change = async (input: {
    enabled?: boolean;
    edits?: boolean;
    rotate?: boolean;
  }): Promise<void> => {
    setBusy(true);
    setError(null);

    try {
      setStatus(await mcpApi.set(input));
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : String(failure));
    } finally {
      setBusy(false);
    }
  };

  const on = status?.enabled === true;
  const edits = status?.edits === true;

  return (
    <section className="export-connect" aria-label={uiCopy.connectToClaude}>
      <div className="export-connect-head">
        <div className="titles">
          <h3>{uiCopy.connectToClaude}</h3>
          <p className="export-sub">{uiCopy.aLocalMcpServer}</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-label={uiCopy.mcpServer}
          className={`export-switch${on ? " on" : ""}`}
          disabled={busy || status === null}
          onClick={() => void change({ enabled: !on })}
        >
          <span className="export-switch-knob" />
        </button>
      </div>
      {status?.error || error ? (
        <div className="alert error small" role="alert">
          {status?.error ?? error}
        </div>
      ) : null}
      {on && status?.command ? (
        <>
          <div className="export-command" data-tip={status.command}>
            <code className="truncate">{status.command}</code>
            <button
              type="button"
              className="btn small has-icon"
              onClick={() => copy("mcp", status.command as string)}
            >
              <Icon name={copied === "mcp" ? "check" : "copy"} size={14} />
              <span aria-live="polite">
                {copied === "mcp" ? "Copied" : "Copy command"}
              </span>
            </button>
          </div>
          <div className="export-connect-head export-control">
            <div className="titles">
              <h4>{uiCopy.allowEdits}</h4>
              <p className="export-sub">
                {edits
                  ? "Claude Code can also edit files and elements, arrange frames, comment, restore versions, apply design systems, create projects and export. Each edit is a version you can undo. It cannot start or stop Claude runs in the studio. Reconnect the server in Claude Code after you change this."
                  : "Off: Claude Code can only read. Turn on to let it edit the design and the canvas directly."}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={edits}
              aria-label={uiCopy.allowEdits}
              className={`export-switch${edits ? " on" : ""}`}
              disabled={busy}
              onClick={() => void change({ edits: !edits })}
            >
              <span className="export-switch-knob" />
            </button>
          </div>
          <div className="export-connect-foot">
            <span className="export-sub">
              {status.running ? `Running at ${status.url}` : "Not running"}
            </span>
            <button
              type="button"
              className="btn small ghost"
              disabled={busy}
              onClick={() => void change({ rotate: true })}
            >
              {uiCopy.newToken}
            </button>
          </div>
        </>
      ) : null}
    </section>
  );
};

interface Options {
  projectId: string;
  format: ExportFormat;
  scale: ExportScale;
  scope: ExportScope;
  frames: FrameChoice[];
  picked: Set<string>;
  chosen: ExportFrame[];
  selectionOnly: boolean;
  needsFrames: boolean;
  choose: (next: ExportFormat) => void;
  chooseScale: (next: ExportScale) => void;
  chooseScope: (next: ExportScope) => void;
  toggle: (id: string) => void;
}

const useExportOptions = (target: ExportTarget): Options => {
  const initial = useMemo(readExportPrefs, []);

  const [format, setFormat] = useState<ExportFormat>(
    target.format ?? (target.selector ? "png" : initial.format)
  );

  const [scale, setScale] = useState<ExportScale>(initial.scale);
  const [scope, setScope] = useState<ExportScope>(initial.scope);

  const frames = useMemo(
    () => canvasFrameChoices(target.projectId, target.directionId),
    [target.projectId, target.directionId]
  );

  const [picked, setPicked] = useState<Set<string>>(
    () => new Set(frames.map((f) => f.id))
  );

  const selectionOnly =
    Boolean(target.selector) && (format === "png" || format === "svg");

  return {
    choose: (next) => {
      setFormat(next);
      saveExportPrefs({ format: next, scale, scope });
    },
    chooseScale: (next) => {
      setScale(next);
      saveExportPrefs({ format, scale: next, scope });
    },
    chooseScope: (next) => {
      setScope(next);
      saveExportPrefs({ format, scale, scope: next });
    },
    chosen: frames.filter((f) => picked.has(f.id)).map((f) => f.frame),
    format,
    frames,
    needsFrames: format !== "zip" && !selectionOnly,
    picked,
    projectId: target.projectId,
    scale,
    scope,
    selectionOnly,
    toggle: (id) =>
      setPicked((prev) => {
        const next = new Set(prev);

        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }

        return next;
      }),
  };
};

const useEditors = (active: boolean): EditorInfo[] => {
  const [editors, setEditors] = useState<EditorInfo[]>([]);
  useEffect(() => {
    if (!active || editors.length > 0) {
      return;
    }

    let live = true;
    const load = async (): Promise<void> => {
      try {
        const list = await exportApi.editors();

        if (live) {
          setEditors(list);
        }
      } catch {
        return;
      }
    };
    void load();

    return (): void => {
      live = false;
    };
  }, [active, editors.length]);

  return editors;
};

const exportOnce = async (
  target: ExportTarget,
  options: Options
): Promise<Status> => {
  const selectionFrame =
    options.frames.find((f) => f.active)?.frame ?? options.chosen[0];

  const useSelection =
    options.selectionOnly && target.selector && selectionFrame;

  const file = await exportApi.exportFile(target.projectId, {
    format: options.format as Exclude<ExportFormat, "handoff">,
    frames: useSelection && selectionFrame ? [selectionFrame] : options.chosen,
    scale: options.scale,
    scope: options.scope,
    versionId: target.versionId,
    ...(useSelection ? { selector: target.selector } : {}),
  });

  downloadBlob(file.blob, file.name);

  return {
    kind: "done",
    note: file.note,
    reveal: canRevealDownload(),
    text: `Saved ${file.name}`,
  };
};

const handoffFrames = (chosen: ExportFrame[]): ExportFrame[] =>
  chosen.some((f) => f.width <= MOBILE_MAX)
    ? chosen
    : [...chosen, MOBILE_FRAME];

const FrameList = ({ options }: { options: Options }): ReactElement => (
  <fieldset className="export-field export-frames">
    <legend className="export-label">
      {options.format === "html" ? "Pages from frames" : "Frames"}
    </legend>
    {options.frames.map((choice) => (
      <label key={choice.id} className="export-frame">
        <input
          type="checkbox"
          checked={options.picked.has(choice.id)}
          onChange={() => options.toggle(choice.id)}
        />
        <span className="export-frame-name">
          {canvasFrameName(options.projectId, choice.id, choice.frame.name)}
        </span>
        <span
          className="export-frame-path truncate"
          data-tip={frameRoute(choice.frame)}
        >
          {framePage(choice.frame.path)}
        </span>
        <span className="export-frame-size">
          {choice.frame.width} × {choice.frame.height}
        </span>
      </label>
    ))}
  </fieldset>
);

const OptionFields = ({ options }: { options: Options }): ReactElement => {
  const { format, chosen, scale, scope, selectionOnly } = options;
  const first = chosen[0];

  return (
    <>
      {selectionOnly ? (
        <div className="export-field">
          <span className="export-label">{uiCopy.area}</span>
          <span className="export-selection">
            <Icon name="pointer" size={14} />
            Selected element
          </span>
        </div>
      ) : null}
      {options.needsFrames ? <FrameList options={options} /> : null}
      {format === "png" ? (
        <div className="export-field export-inline">
          <span className="export-label">{uiCopy.scale}</span>
          <Segmented
            label="Scale"
            value={scale}
            options={EXPORT_SCALES.map((s) => ({ id: s, label: `${s}×` }))}
            onChange={options.chooseScale}
          />
          {first && !selectionOnly ? (
            <span className="export-sub export-size">
              {first.width * scale} px wide
            </span>
          ) : null}
        </div>
      ) : null}
      {((format === "png" || format === "svg") && !selectionOnly) ||
      format === "pdf" ? (
        <div className="export-field export-inline">
          <span className="export-label">{uiCopy.area}</span>
          <Segmented
            label="Area"
            value={scope}
            options={[
              { id: "page" as ExportScope, label: "Full page" },
              { id: "frame" as ExportScope, label: "Frame only" },
            ]}
            onChange={options.chooseScope}
          />
        </div>
      ) : null}
    </>
  );
};

const StatusLine = ({
  status,
  handoff,
}: {
  status: Status;
  handoff: boolean;
}): ReactElement => {
  const elapsed = useElapsed(status);

  return (
    <div className="export-status" aria-live="polite">
      {status.kind === "busy" ? (
        <span className="export-progress">
          <span className="spinner" />
          {handoff ? "Building handoff" : "Exporting"}…{" "}
          <span className="tabular">{elapsed} s</span>
        </span>
      ) : null}
      {status.kind === "done" ? (
        <span className="export-done" data-tip={status.text}>
          <Icon name="check" size={14} />
          <span className="truncate">{status.text}</span>
          {status.note ? (
            <span className="export-sub">· {status.note}</span>
          ) : null}
          {status.reveal ? (
            <button
              type="button"
              className="btn small ghost"
              onClick={revealDownload}
            >
              {uiCopy.revealInFinder}
            </button>
          ) : null}
        </span>
      ) : null}
    </div>
  );
};

const actionLabel = (
  info: FormatInfo,
  status: Status,
  rebuilt: boolean
): string => {
  if (status.kind === "error") {
    return "Try again";
  }

  return rebuilt ? "Rebuild handoff" : info.action;
};

export const ExportDialog = ({ target, onClose }: Props): ReactElement => {
  const options = useExportOptions(target);
  const { format } = options;
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [handoff, setHandoff] = useState<HandoffResult | null>(null);
  const editors = useEditors(format === "handoff");
  const busy = status.kind === "busy";
  const dialog = useModalDialog(() => (busy ? false : onClose()));

  const info =
    FORMATS.find((f) => f.id === format) ?? (FORMATS[0] as FormatInfo);

  const canRun = !busy && (!options.needsFrames || options.chosen.length > 0);
  const shown = format === "handoff" ? handoff : null;

  const run = async (): Promise<void> => {
    if (!canRun) {
      return;
    }

    setStatus({ kind: "busy", startedAt: Date.now() });

    try {
      if (format === "handoff") {
        setHandoff(
          await exportApi.handoff(target.projectId, {
            frames: handoffFrames(options.chosen),
            versionId: target.versionId,
          })
        );
        setStatus({ kind: "idle" });

        return;
      }

      setStatus(await exportOnce(target, options));
    } catch (error) {
      setStatus({
        kind: "error",
        text: error instanceof Error ? error.message : String(error),
      });
    }
  };

  return (
    <dialog
      ref={dialog.ref}
      className="modal export-dialog"
      aria-label={uiCopy.export}
      onMouseDown={dialog.onMouseDown}
    >
      <div className="modal-head">
        <div
          className="titles"
          data-tip={`From version: ${target.versionLabel}`}
          data-tip-align="start"
        >
          <h2>{uiCopy.export}</h2>
          <p className="truncate">From version: {target.versionLabel}</p>
        </div>
        <button
          className="icon-btn"
          aria-label={uiCopy.closeExport}
          onClick={onClose}
          disabled={busy}
        >
          <Icon name="close" />
        </button>
      </div>
      <div className="modal-body export-body" aria-busy={busy}>
        <Segmented
          label="Format"
          value={format}
          options={FORMATS.map((f) => ({
            icon: f.icon,
            id: f.id,
            label: f.label,
          }))}
          onChange={(next) => {
            options.choose(next);
            setStatus({ kind: "idle" });
          }}
        />
        <p className="export-sub export-hint">{info.hint}</p>
        <OptionFields options={options} />
        {shown ? (
          <HandoffResultView
            target={target}
            result={shown}
            editors={editors}
            onError={(text) => setStatus({ kind: "error", text })}
          />
        ) : null}
        {format === "handoff" ? <ConnectClaudeCode /> : null}
        {status.kind === "error" ? (
          <div className="alert error small" role="alert">
            {status.text}
          </div>
        ) : null}
      </div>
      <div className="modal-foot">
        <StatusLine status={status} handoff={format === "handoff"} />
        <button
          type="button"
          className="btn ghost"
          onClick={onClose}
          disabled={busy}
        >
          {uiCopy.close}
        </button>
        <button
          type="button"
          className={`btn has-icon${shown ? "" : " primary"}`}
          disabled={!canRun}
          onClick={() => void run()}
          data-autofocus
        >
          <Icon
            name={format === "handoff" ? "terminal" : "download"}
            size={14}
          />
          {actionLabel(info, status, shown !== null)}
        </button>
      </div>
    </dialog>
  );
};
