import { useEffect, useState, type ReactNode } from 'react';
import type { EditorInfo } from '../../shared/export';
import type { SelectionContext } from '../../shared/contracts';
import { api, errorText } from '../api';
import { exportApi } from '../exportApi';
import { useProjectEvents } from '../events';
import { Icon } from './Icon';

interface Props {
  projectId: string;
  directionId: string | null;
  selection: SelectionContext | null;
}

type Snippet = { kind: 'loading' } | { kind: 'ready'; code: string; file: string; line: number; exact: boolean } | { kind: 'error'; message: string };

const TOKEN = /(<!--[\s\S]*?-->|\{\/\*[\s\S]*?\*\/\})|(<\/?[A-Za-z][\w.:-]*|\/?>)|("[^"]*"|'[^']*'|`[^`]*`)|([A-Za-z_:][\w:.-]*)(?==)|(\{|\})/g;

export function highlight(code: string): ReactNode[] {
  const out: ReactNode[] = [];
  let at = 0;
  let index = 0;
  for (const match of code.matchAll(TOKEN)) {
    const start = match.index ?? 0;
    if (start > at) out.push(code.slice(at, start));
    const kind = match[1] ? 'comment' : match[2] ? 'tag' : match[3] ? 'string' : match[4] ? 'attr' : 'punct';
    out.push(
      <span key={index} className={`tok-${kind}`}>
        {match[0]}
      </span>,
    );
    index += 1;
    at = start + match[0].length;
  }
  if (at < code.length) out.push(code.slice(at));
  return out;
}

function useSnippet(projectId: string, directionId: string | null, selection: SelectionContext | null): Snippet {
  const [snippet, setSnippet] = useState<Snippet>({ kind: 'loading' });
  const [tick, setTick] = useState(0);
  useProjectEvents(projectId, (event) => {
    if (event.type === 'version.created' && event.directionId === directionId) setTick((value) => value + 1);
  });
  const source = selection?.source ?? null;
  const fallback = selection?.outerHTML ?? '';
  const key = source ? `${source.file}:${source.line}:${source.col}` : '';
  useEffect(() => {
    if (!directionId || !source) {
      setSnippet({ kind: 'ready', code: fallback, file: '', line: 0, exact: false });
      return;
    }
    let live = true;
    setSnippet((prev) => (prev.kind === 'ready' ? prev : { kind: 'loading' }));
    api
      .elementSource(projectId, directionId, source)
      .then((result) => {
        if (!live) return;
        setSnippet(result.code === null ? { kind: 'ready', code: fallback, file: result.file, line: result.line, exact: false } : { kind: 'ready', code: result.code, file: result.file, line: result.line, exact: true });
      })
      .catch((err: unknown) => live && setSnippet({ kind: 'error', message: errorText(err) }));
    return () => {
      live = false;
    };
  }, [projectId, directionId, key, tick, fallback]);
  return snippet;
}

function OpenInEditor({ projectId, directionId, file }: { projectId: string; directionId: string; file: string }) {
  const [editors, setEditors] = useState<EditorInfo[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    exportApi.editors().then(setEditors).catch(() => setEditors([]));
  }, []);
  const editor = editors?.[0];
  if (!editor) return null;
  return (
    <>
      <button
        type="button"
        className="btn ghost small has-icon"
        title={`Open ${file} in ${editor.name}`}
        onClick={() => {
          setError(null);
          exportApi.openInEditor(projectId, directionId, editor.id, file).catch((err: unknown) => setError(errorText(err)));
        }}
      >
        <Icon name="file" size={13} />
        Open in {editor.name}
      </button>
      {error && <span className="ins-code-error">{error}</span>}
    </>
  );
}

function CopySnippet({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
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
      <Icon name={copied ? 'check' : 'copy'} size={13} />
      <span aria-live="polite">{copied ? 'Copied' : 'Copy'}</span>
    </button>
  );
}

export function InspectorCode({ projectId, directionId, selection }: Props) {
  const snippet = useSnippet(projectId, directionId, selection);
  if (!selection) return <p className="ins-hint">Select an element on the canvas to see its source code.</p>;
  return (
    <div className="ins-code">
      <div className="ins-code-bar">
        <span className="ins-code-file" title={snippet.kind === 'ready' && snippet.file ? `${snippet.file}:${snippet.line}` : undefined}>
          {snippet.kind === 'ready' && snippet.file ? `${snippet.file}:${snippet.line}` : 'Rendered HTML'}
        </span>
        {snippet.kind === 'ready' && <CopySnippet code={snippet.code} />}
        {snippet.kind === 'ready' && snippet.file && directionId && <OpenInEditor projectId={projectId} directionId={directionId} file={snippet.file} />}
      </div>
      {snippet.kind === 'error' && (
        <p className="ins-error" role="alert">
          <Icon name="alert" size={14} />
          <span>{snippet.message}</span>
        </p>
      )}
      {snippet.kind === 'loading' && <p className="ins-hint">Loading source…</p>}
      {snippet.kind === 'ready' && (
        <>
          {!snippet.exact && <p className="ins-note ins-code-note">No source location. This is the rendered HTML.</p>}
          <pre className="ins-code-pre" tabIndex={0} aria-label="Element source">
            <code>{highlight(snippet.code)}</code>
          </pre>
        </>
      )}
    </div>
  );
}
