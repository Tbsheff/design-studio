import { createContext, useContext, useEffect, useState, type KeyboardEvent } from 'react';
import type { SharedSource } from '../../shared/app';
import type { ElementSourceInfo, SelectionContext, TextFromData, TextSourceAnswer, TextSourceInfo } from '../../shared/contracts';
import { api } from '../api';
import { textHints, type DirectEdit } from '../useDirectEdit';
import { Icon } from './Icon';

export interface InspectorApp {
  appDir: string | null;
  ask: ((prompt: string) => void) | null;
  element: ElementSourceInfo | null;
}

export const InspectorAppContext = createContext<InspectorApp>({ appDir: null, ask: null, element: null });

export function useInspectorApp(): InspectorApp {
  return useContext(InspectorAppContext);
}

function loc(source: { file: string; line: number }): string {
  return `${source.file}:${source.line}`;
}

function shortLoc(source: { file: string; line: number }): string {
  return `${source.file.split('/').pop() ?? source.file}:${source.line}`;
}

export function dataTextPrompt(text: string, data: TextFromData): string {
  const shown = text.length > 80 ? `${text.slice(0, 79)}…` : text;
  return `The text "${shown}" comes from data: ${data.expression} in ${loc(data)}. Change it to: `;
}

type TextEditScope = Pick<DirectEdit, 'scope' | 'text' | 'status' | 'previewText' | 'revertText' | 'commit'>;

function useTextSource(edit: TextEditScope, selection: SelectionContext): TextSourceAnswer | null {
  const [answer, setAnswer] = useState<TextSourceAnswer | null>(null);
  const { projectId, directionId } = edit.scope;
  const source = selection.source;
  const savedAt = edit.status.kind === 'saved' ? edit.status.at : 0;
  const key = JSON.stringify([source, selection.text, selection.usedAt ?? null, selection.owners?.map((owner) => owner.stack) ?? [], savedAt]);
  const hints = textHints(selection);
  useEffect(() => {
    if (!directionId || !source) return setAnswer(null);
    let live = true;
    api
      .textSource(projectId, directionId, source, hints)
      .then((next) => live && setAnswer(next))
      .catch(() => live && setAnswer(null));
    return () => {
      live = false;
    };
  }, [projectId, directionId, key]);
  return answer;
}

function SourceTextRow({ found, edit }: { found: TextSourceInfo; edit: TextEditScope }) {
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      edit.commit();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      edit.revertText();
    }
  };
  return (
    <>
      <div className="ins-field wide">
        <label htmlFor="ins-content" className="ins-scrub static">
          Content
        </label>
        <input id="ins-content" className="ins-input" aria-label="Text content" value={edit.text} spellCheck={false} onChange={(event) => edit.previewText(event.target.value)} onBlur={edit.commit} onKeyDown={onKeyDown} />
      </div>
      <div className="ins-data-text wide" role="note">
        <span>
          Edits {found.what} in <code data-tip={loc(found)}>{shortLoc(found)}</code>.{found.shared ? ` ${found.shared}` : ''}
        </span>
      </div>
    </>
  );
}

export function DataTextNote({ data, selection, edit }: { data: TextFromData; selection: SelectionContext; edit: TextEditScope }) {
  const answer = useTextSource(edit, selection);
  if (answer && 'found' in answer) return <SourceTextRow found={answer.found} edit={edit} />;
  return <DataTextAsk data={data} text={selection.text} reason={answer && 'reason' in answer ? answer.reason : null} />;
}

function DataTextAsk({ data, text, reason }: { data: TextFromData; text: string; reason: string | null }) {
  const { ask } = useInspectorApp();
  return (
    <div className="ins-data-text wide" role="note">
      <span>
        This text comes from data: <code>{data.expression}</code> in <code data-tip={loc(data)}>{shortLoc(data)}</code>.{reason ? ` ${reason}` : ''}
      </span>
      {ask && (
        <button type="button" className="btn small ghost" onClick={() => ask(dataTextPrompt(text, data))}>
          <Icon name="chat" size={12} />
          Ask the agent to change it
        </button>
      )}
    </div>
  );
}

export function SharedSourceNote({ shared, editingUse, canUse, onToggle }: { shared: SharedSource; editingUse: boolean; canUse: boolean; onToggle: () => void }) {
  const what = shared.name ?? shared.file.split('/').pop() ?? shared.file;
  if (editingUse && shared.use) {
    return (
      <div className="ins-shared" role="note">
        <span>
          Edits go to this use of {what} in <code data-tip={loc(shared.use)}>{shortLoc(shared.use)}</code>
        </span>
        <button type="button" className="btn small ghost" onClick={onToggle}>
          Edit every {what}
        </button>
      </div>
    );
  }
  return (
    <div className="ins-shared" role="note">
      <span>
        {shared.name ? `Changes every ${shared.name}.` : `Changes every use of ${what}.`}
      </span>
      {canUse && shared.use && (
        <button type="button" className="btn small" onClick={onToggle}>
          Edit this use instead
        </button>
      )}
    </div>
  );
}
