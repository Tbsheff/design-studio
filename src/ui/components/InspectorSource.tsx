import { useState } from 'react';
import type { SelectionContext, SourceLoc } from '../../shared/contracts';
import { api, errorText } from '../api';
import { Icon } from './Icon';

function locText(source: SourceLoc): string {
  return `${source.file}:${source.line}:${source.col}`;
}

function SourceLine({ label, source, onOpen }: { label: string; source: SourceLoc; onOpen: (source: SourceLoc) => void }) {
  const text = locText(source);
  return (
    <div className="ins-source-row">
      <span className="ins-source-label">{label}</span>
      <code className="ins-source-path" title={text}>
        {text}
      </code>
      <button type="button" className="icon-btn small" aria-label={`Open ${source.file} in the editor`} data-tip="Open in editor" onClick={() => onOpen(source)}>
        <Icon name="code" size={13} />
      </button>
    </div>
  );
}

export function InspectorSource({ projectId, directionId, selection }: { projectId: string; directionId: string | null; selection: SelectionContext }) {
  const [note, setNote] = useState<string | null>(null);
  const source = selection.source;
  if (!source || !directionId) return null;
  const open = (loc: SourceLoc) => {
    setNote(null);
    api
      .openSource(projectId, directionId, locText(loc))
      .then((result) => setNote(`Opened ${result.path}`))
      .catch((err: unknown) => setNote(errorText(err)));
  };
  return (
    <div className="ins-source-block" aria-label="Source">
      <SourceLine label="Element" source={source} onOpen={open} />
      {selection.usedAt && <SourceLine label="Used in" source={selection.usedAt} onOpen={open} />}
      {note && (
        <div className="ins-source-note" role="status">
          {note}
        </div>
      )}
    </div>
  );
}
