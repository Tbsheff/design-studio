import type {
  FigmaImportPreview,
  FigmaImportResult,
  FigmaImportSource,
  FigmaImportStats,
} from "@design-studio/contracts/figma-nodes";
import {
  looksLikeFigmaLink,
  looksLikeFigmaNodes,
} from "@design-studio/contracts/figma-nodes";
import type {
  InsertTarget,
  JsxInsertPosition,
} from "@design-studio/contracts/insert";
import { Icon, UiSelect, useModalDialog } from "@design-studio/ui";
import { useEffect, useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";

import { ApiError, json } from "../../api.js";

import "../../styles/figma-import.css";
import { copy } from "./copy.js";

interface Props {
  ids: { projectId: string; directionId: string };
  target: InsertTarget;
  text: string;
  canNest: boolean;
  onDone: (message: string) => void;
  onClose: () => void;
}

const POSITIONS: { value: JsxInsertPosition; label: string }[] = [
  { label: "Inside the selection", value: "inside" },
  { label: "After the selection", value: "after" },
  { label: "Before the selection", value: "before" },
];

const route = (ids: Props["ids"]): string =>
  `/api/projects/${encodeURIComponent(ids.projectId)}/d/${encodeURIComponent(ids.directionId)}/figma/import`;

const messageOf = (error: unknown): string => {
  if (
    error instanceof ApiError &&
    error.data &&
    typeof (error.data as { message?: unknown }).message === "string"
  ) {
    return (error.data as { message: string }).message;
  }

  return error instanceof Error ? error.message : String(error);
};

const plural = (count: number, word: string): string =>
  `${count} ${word}${count === 1 ? "" : "s"}`;

const facts = (stats: FigmaImportStats): string[] => {
  const out = [
    plural(stats.layers, "layer"),
    `${plural(stats.tokens, "token color")}`,
  ];

  if (stats.rawColors.length > 0) {
    out.push(plural(stats.rawColors.length, "raw color"));
  }

  if (stats.images > 0) {
    out.push(plural(stats.images, "image placeholder"));
  }

  if (stats.hidden > 0) {
    out.push(`${stats.hidden} hidden skipped`);
  }

  return out;
};

const usePreview = (
  ids: Props["ids"],
  base: FigmaImportSource,
  target: InsertTarget,
  nodeId: string,
  position: JsxInsertPosition
) => {
  const [preview, setPreview] = useState<FigmaImportPreview | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let live = true;
    setLoading(true);
    json<FigmaImportPreview>("POST", route(ids), {
      ...base,
      dryRun: true,
      position,
      target,
      ...(nodeId ? { nodeId } : {}),
    })
      .then((result) => {
        if (!live) {
          return;
        }

        setPreview(result);
        setFailure(null);
      })
      .catch((error: unknown) => live && setFailure(messageOf(error)))
      .finally(() => live && setLoading(false));

    return () => {
      live = false;
    };
  }, [ids, base, target, nodeId, position]);

  return { failure, loading, preview, setFailure };
};

interface PlainFailure {
  text: string;
  fix: string | null;
  details: string | null;
}

const plainFailure = (raw: string): PlainFailure => {
  if (LINKS_OFF.test(raw)) {
    return {
      details: raw,
      fix: "Paste the frame JSON below instead of the link.",
      text: "Design Studio cannot open Figma links here.",
    };
  }

  const status = /Figma API answered (\d+)/.exec(raw);

  if (status) {
    return {
      details: raw,
      fix: "Check that your Figma token can open this file.",
      text: `Figma refused to share this file (error ${status[1]}).`,
    };
  }

  if (raw.length > 140 || /https?:\/\/|[A-Z]+_[A-Z_]+=?/.test(raw)) {
    return { details: raw, fix: null, text: "The Figma frame did not load." };
  }

  return { details: null, fix: null, text: raw };
};

const LINKS_OFF = /Figma API, which is off/;

const nodesUrl = (link: string): string => {
  const match = /figma\.com\/(?:file|design|proto)\/([A-Za-z0-9]+)/.exec(link);
  const node = /[?&]node-id=([^&#]+)/.exec(link)?.[1];
  const ids = node ? decodeURIComponent(node).replace("-", ":") : "<node id>";

  return `https://api.figma.com/v1/files/${match?.[1] ?? "<file key>"}/nodes?ids=${ids}`;
};

const JsonPaste = ({
  link,
  onUse,
}: {
  link: string;
  onUse: (nodes: string) => void;
}) => {
  const [text, setText] = useState("");
  const [bad, setBad] = useState(false);

  const use = () => {
    const nodes = text.trim();

    if (!looksLikeFigmaNodes(nodes)) {
      return setBad(true);
    }

    onUse(nodes);
  };

  return (
    <div className="field">
      <label className="field">
        <span>Frame JSON</span>
        <textarea
          className="mono"
          rows={5}
          value={text}
          spellCheck={false}
          placeholder={copy.nodes}
          aria-invalid={bad}
          aria-describedby="fgi-json-help"
          onChange={(e) => {
            setText(e.target.value);
            setBad(false);
          }}
        />
      </label>
      <p id="fgi-json-help" className="fgi-facts">
        {bad ? "This is not Figma frame JSON. " : ""}Open {nodesUrl(link)} with
        your Figma token (X-Figma-Token header) and paste the reply here. To use
        links, start the studio with STUDIO_FIGMA_FETCH=1 and FIGMA_TOKEN.
      </p>
      <div>
        <button
          type="button"
          className="btn"
          disabled={text.trim() === ""}
          onClick={use}
        >
          Use JSON
        </button>
      </div>
    </div>
  );
};

const JsonFallback = ({
  base,
  failure,
  onUse,
}: {
  base: FigmaImportSource;
  failure: string | null;
  onUse: (nodes: string) => void;
}) => {
  if (!failure || !("link" in base) || !LINKS_OFF.test(failure)) {
    return null;
  }

  return <JsonPaste link={base.link} onUse={onUse} />;
};

const FailureNote = ({ failure }: { failure: string }) => {
  const [open, setOpen] = useState(false);
  const plain = plainFailure(failure);

  return (
    <div className="alert error small fgi-error" role="alert">
      <p>
        {plain.text}
        {plain.fix && ` ${plain.fix}`}
      </p>
      {plain.details && (
        <>
          <button
            type="button"
            className="fgi-details-toggle"
            aria-expanded={open}
            onClick={() => setOpen(!open)}
          >
            <Icon name={open ? "chevronDown" : "chevronRight"} size={12} />
            Details
          </button>
          {open && <p className="fgi-details">{plain.details}</p>}
        </>
      )}
    </div>
  );
};

const Summary = ({ preview }: { preview: FigmaImportPreview }) => {
  const { frame, stats } = preview;

  return (
    <div className="fgi-summary" aria-live="polite">
      <div className="fgi-frame">
        <strong>{frame.name}</strong>
        <span>
          {frame.width ? `${frame.width}×${frame.height}` : frame.type}
        </span>
      </div>
      <div className="fgi-facts">{facts(stats).join(" · ")}</div>
      {stats.kit.length > 0 && (
        <ul className="fgi-kit" aria-label={copy.kitComponents}>
          {stats.kit.slice(0, 6).map((use, index) => (
            <li key={`${use.layer}-${index}`}>
              <span>{use.layer}</span>
              <code>{`<${use.component}>`}</code>
            </li>
          ))}
        </ul>
      )}
      {stats.notes.length > 0 && (
        <ul className="fgi-notes">
          {stats.notes.slice(0, 4).map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      )}
      <div className="fgi-code-wrap">
        <pre className="fgi-code" tabIndex={0} aria-label={copy.markup}>
          {preview.markup}
        </pre>
      </div>
    </div>
  );
};

const FigmaImportDialog = ({
  ids,
  target,
  text,
  canNest,
  onDone,
  onClose,
}: Props) => {
  const [base, setBase] = useState<FigmaImportSource>(() =>
    looksLikeFigmaLink(text) ? { link: text.trim() } : { nodes: text }
  );

  const [nodeId, setNodeId] = useState("");

  const [position, setPosition] = useState<JsxInsertPosition>(
    canNest ? "inside" : "after"
  );

  const [busy, setBusy] = useState(false);

  const { preview, failure, loading, setFailure } = usePreview(
    ids,
    base,
    target,
    nodeId,
    position
  );

  const dialog = useModalDialog(() => {
    if (busy) {
      return false;
    }

    onClose();
  });

  const frames = preview?.frames ?? [];
  const chosen = nodeId || preview?.frame.id || "";

  const submit = async (event: FormEvent) => {
    event.preventDefault();

    if (busy || !preview) {
      return;
    }

    setBusy(true);

    try {
      const result = await json<FigmaImportResult>("POST", route(ids), {
        ...base,
        nodeId: preview.frame.id,
        position,
        target,
      });

      const kit = result.stats.kit.map((use) => use.component);
      const added = result.imports.filter((item) => item.added).length;
      onDone(
        `Imported ${result.frame.name}${kit.length > 0 ? ` with ${[...new Set(kit)].join(", ")}` : ""}${added ? `, ${plural(added, "import")} added` : ""}.`
      );
      onClose();
    } catch (error) {
      setFailure(messageOf(error));
      setBusy(false);
    }
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      event.stopPropagation();
    }
  };

  return (
    <dialog
      ref={dialog.ref}
      className="modal fgi-dialog"
      aria-label={copy.importFigmaFrame}
      onMouseDown={dialog.onMouseDown}
      onKeyDown={onKeyDown}
    >
      <form
        className="modal-form"
        onSubmit={(event) => void submit(event)}
        noValidate
      >
        <div className="modal-head">
          <div className="titles">
            <h2>Import Figma frame</h2>
            <p>
              {preview?.fileName ? `From ${preview.fileName}. ` : ""}Auto layout
              becomes flex, colors use your tokens, and kit instances become
              components.
            </p>
          </div>
        </div>
        <div className="modal-body fgi-form">
          {frames.length > 1 && (
            <div className="field">
              <span>Frame</span>
              <UiSelect
                className="ins-select fgi-select"
                aria-label={copy.frame}
                value={chosen}
                options={frames.map((frame) => ({
                  label: `${frame.name}${frame.width ? ` · ${frame.width}×${frame.height}` : ""}`,
                  value: frame.id,
                }))}
                onChange={setNodeId}
              />
            </div>
          )}
          <div className="field">
            <span>Place</span>
            <UiSelect
              className="ins-select fgi-select"
              aria-label={copy.place}
              value={position}
              options={
                canNest
                  ? POSITIONS
                  : POSITIONS.filter((item) => item.value !== "inside")
              }
              onChange={setPosition}
            />
          </div>
          {preview && <Summary preview={preview} />}
          {loading && !preview && !failure && (
            <div className="fgi-loading">Reading the Figma frame…</div>
          )}
          {failure && <FailureNote failure={failure} />}
          <JsonFallback
            base={base}
            failure={failure}
            onUse={(nodes) => {
              setFailure(null);
              setBase({ nodes });
            }}
          />
        </div>
        <div className="modal-foot">
          <button
            type="button"
            className="btn ghost"
            onClick={onClose}
            disabled={busy}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn primary"
            disabled={busy || loading || !preview || failure !== null}
          >
            {busy ? "Importing…" : "Import frame"}
          </button>
        </div>
      </form>
    </dialog>
  );
};

export { FigmaImportDialog };
