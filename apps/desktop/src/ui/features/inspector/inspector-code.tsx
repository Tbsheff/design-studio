import type { SelectionContext } from "@design-studio/contracts";
import type { EditorInfo } from "@design-studio/contracts/export";
import { Icon } from "@design-studio/ui";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";

import { api, errorText } from "../../api.js";
import { useProjectEvents } from "../../platform/events.js";
import { exportApi } from "../share-publish-ship-export/export-api.js";
import { copy } from "./copy.js";

interface Props {
  readonly projectId: string;
  readonly directionId: string | null;
  readonly selection: SelectionContext | null;
}

type Snippet =
  | { readonly kind: "loading" }
  | {
      readonly kind: "ready";
      readonly code: string;
      readonly file: string;
      readonly line: number;
      readonly isExact: boolean;
    }
  | { readonly kind: "error"; readonly message: string };

const TOKEN =
  /(<!--[\s\S]*?-->|\{\/\*[\s\S]*?\*\/\})|(<\/?[A-Za-z][\w.:-]*|\/?>)|("[^"]*"|'[^']*'|`[^`]*`)|([A-Za-z_:][\w:.-]*)(?==)|(\{|\})/gu;

const highlight = (code: string): ReactNode[] => {
  const out: ReactNode[] = [];
  let at = 0;
  let index = 0;

  for (const match of code.matchAll(TOKEN)) {
    const start = match.index ?? 0;

    if (start > at) {
      out.push(code.slice(at, start));
    }

    const kind = match[1]
      ? "comment"
      : match[2]
        ? "tag"
        : match[3]
          ? "string"
          : match[4]
            ? "attr"
            : "punct";

    out.push(
      <span key={index} className={`tok-${kind}`}>
        {match[0]}
      </span>
    );
    index += 1;
    at = start + match[0].length;
  }

  if (at < code.length) {
    out.push(code.slice(at));
  }

  return out;
};

const useSnippet = (
  projectId: string,
  directionId: string | null,
  selection: SelectionContext | null
): Snippet => {
  const [snippet, setSnippet] = useState<Snippet>({ kind: "loading" });
  const [tick, setTick] = useState(0);
  useProjectEvents(projectId, (event) => {
    if (event.type === "version.created" && event.directionId === directionId) {
      setTick((value) => value + 1);
    }
  });
  const source = selection?.source ?? null;
  const fallback = selection?.outerHTML ?? "";
  const key = source ? `${source.file}:${source.line}:${source.col}` : "";
  useEffect(() => {
    if (!directionId || !source) {
      setSnippet({
        code: fallback,
        file: "",
        isExact: false,
        kind: "ready",
        line: 0,
      });

      return;
    }

    let live = true;
    setSnippet((prev) => (prev.kind === "ready" ? prev : { kind: "loading" }));
    api
      .elementSource(projectId, directionId, source)
      .then((result) => {
        if (!live) {
          return;
        }

        setSnippet(
          result.code === null
            ? {
                code: fallback,
                file: result.file,
                isExact: false,
                kind: "ready",
                line: result.line,
              }
            : {
                code: result.code,
                file: result.file,
                isExact: true,
                kind: "ready",
                line: result.line,
              }
        );
      })
      .catch(
        (error: unknown) =>
          live && setSnippet({ kind: "error", message: errorText(error) })
      );

    return () => {
      live = false;
    };
  }, [projectId, directionId, key, tick, fallback]);

  return snippet;
};

const OpenInEditor = ({
  projectId,
  directionId,
  file,
}: {
  readonly projectId: string;
  readonly directionId: string;
  readonly file: string;
}) => {
  const [editors, setEditors] = useState<EditorInfo[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    exportApi
      .editors()
      .then(setEditors)
      .catch(() => setEditors([]));
  }, []);
  const editor = editors?.[0];

  if (!editor) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        className="btn ghost small has-icon"
        data-tip={`Open ${file} in ${editor.name}`}
        data-tip-align="end"
        onClick={() => {
          setError(null);
          exportApi
            .openInEditor(projectId, directionId, editor.id, file)
            .catch((err: unknown) => setError(errorText(err)));
        }}
      >
        <Icon name="file" size={13} />
        Open in {editor.name}
      </button>
      {error && <span className="ins-code-error">{error}</span>}
    </>
  );
};

const CopySnippet = ({ code }: { readonly code: string }) => {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) {
      return;
    }

    const timer = window.setTimeout(() => setCopied(false), 1500);

    return () => window.clearTimeout(timer);
  }, [copied]);

  return (
    <button
      type="button"
      className="btn ghost small has-icon"
      onClick={() => {
        void navigator.clipboard.writeText(code).then(() => setCopied(true));
      }}
    >
      <Icon name={copied ? "check" : "copy"} size={13} />
      <span aria-live="polite">{copied ? "Copied" : "Copy"}</span>
    </button>
  );
};

const InspectorCode = ({ projectId, directionId, selection }: Props) => {
  const snippet = useSnippet(projectId, directionId, selection);

  if (!selection) {
    return (
      <p className="ins-hint">
        Select an element on the canvas to see its source code.
      </p>
    );
  }

  return (
    <div className="ins-code">
      <div className="ins-code-bar">
        <span
          className="ins-code-file"
          data-tip={
            snippet.kind === "ready" && snippet.file
              ? `${snippet.file}:${snippet.line}`
              : undefined
          }
        >
          {snippet.kind === "ready" && snippet.file
            ? `${snippet.file}:${snippet.line}`
            : "Rendered HTML"}
        </span>
        {snippet.kind === "ready" && <CopySnippet code={snippet.code} />}
        {snippet.kind === "ready" && snippet.file && directionId && (
          <OpenInEditor
            projectId={projectId}
            directionId={directionId}
            file={snippet.file}
          />
        )}
      </div>
      {snippet.kind === "error" && (
        <p className="ins-error" role="alert">
          <Icon name="alert" size={14} />
          <span>{snippet.message}</span>
        </p>
      )}
      {snippet.kind === "loading" && (
        <p className="ins-hint">Loading source…</p>
      )}
      {snippet.kind === "ready" && (
        <>
          {!snippet.isExact && (
            <p className="ins-note ins-code-note">
              No source location. This is the rendered HTML.
            </p>
          )}
          <pre
            className="ins-code-pre"
            tabIndex={0}
            aria-label={copy.elementSource}
          >
            <code>{highlight(snippet.code)}</code>
          </pre>
        </>
      )}
    </div>
  );
};

export { highlight, InspectorCode };
