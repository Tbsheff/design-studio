import { createContext, useContext } from 'react';
import type { SharedSource } from '../../shared/app';
import type { ElementSourceInfo, TextFromData } from '../../shared/contracts';
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

export function dataTextPrompt(text: string, data: TextFromData): string {
  const shown = text.length > 80 ? `${text.slice(0, 79)}…` : text;
  return `The text "${shown}" comes from data: ${data.expression} in ${loc(data)}. Change it to: `;
}

export function DataTextNote({ data, text }: { data: TextFromData; text: string }) {
  const { ask } = useInspectorApp();
  return (
    <div className="ins-data-text wide" role="note">
      <span>
        This text comes from data: <code>{data.expression}</code> in <code title={loc(data)}>{loc(data)}</code>
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
          Edits go to this use of {what} in <code title={loc(shared.use)}>{loc(shared.use)}</code>
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
