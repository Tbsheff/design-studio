import type { ChangeEvent, ReactElement } from "react";
import { useCallback } from "react";

import { canvasStore } from "../canvas/canvas-frames-model.js";
import { activeFrame } from "../canvas/index.js";
import { copy } from "./copy.js";
import { RulesEditorActions } from "./rules-editor-actions.js";
import { RulesEditorHead } from "./rules-editor-head.js";
import { RulesEditorResult } from "./rules-editor-result.js";
import {
  toHitMap,
  toImportedText,
  toOriginText,
  toPendingImport,
} from "./rules-model.js";
import { useRulesEditor } from "./use-rules-editor.js";
import type { LiveFrame } from "./use-rules-editor.js";

const MAX_SIDE = 4000;
const MIN_SIDE = 200;
const TEXT_ROWS = 8;

interface Props {
  projectId: string;
  directionId: string;
}

const PLACEHOLDER =
  "One rule per line, for example:\ncontrols: h-9 rounded-md\ncards: rounded-xl p-6\nno raw hex\nfont: Inter\nuse Button from @/components/ui/button, not <button>\nKeep labels short and plain.";

const toSide = (value: number): number =>
  Math.min(MAX_SIDE, Math.max(MIN_SIDE, Math.round(value)));

const toLiveFrame = (projectId: string): LiveFrame | null => {
  const layout = canvasStore.get(projectId);

  if (!layout) {
    return null;
  }

  const frame = activeFrame(layout);

  const live: LiveFrame = {
    frame: frame.id,
    height: toSide(frame.height),
    width: toSide(frame.width),
  };

  if (frame.path) {
    return { ...live, path: frame.path };
  }

  return live;
};

const RulesEditor = ({ projectId, directionId }: Props): ReactElement => {
  const editor = useRulesEditor(projectId, directionId, toLiveFrame);
  const { error, result, save, setText, state, test, text } = editor;

  const changeText = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>): void => {
      setText(event.target.value);
    },
    [setText]
  );

  const pendingImport = toPendingImport(state, text);

  const importRules = useCallback((): void => {
    if (pendingImport) {
      setText(toImportedText(text, pendingImport));
    }
  }, [pendingImport, setText, text]);

  if (!state) {
    return (
      <section className="rules-editor" aria-label={copy.designRules}>
        {error && <p className="rules-error">{error}</p>}
        {!error && <p className="pane-system-text">{copy.loadingRules}</p>}
      </section>
    );
  }

  return (
    <section className="rules-editor" aria-label={copy.designRules}>
      <RulesEditorHead
        importFrom={state.importFrom}
        isImportable={pendingImport !== null}
        onImport={importRules}
      />
      <p className="pane-system-text">
        {toOriginText(state)}
        {copy.theAgentFollowsEvery}
      </p>
      <textarea
        className="rules-input"
        aria-label={copy.rulesOnePer}
        spellCheck={false}
        rows={TEXT_ROWS}
        value={text}
        placeholder={PLACEHOLDER}
        onChange={changeText}
      />
      <RulesEditorActions
        isDirty={text.trim() !== state.text.trim()}
        isEmpty={!text.trim()}
        isSaving={editor.isSaving}
        isTesting={editor.isTesting}
        note={editor.note}
        onSave={save}
        onTest={test}
      />
      {error && <p className="rules-error">{error}</p>}
      <RulesEditorResult
        hits={toHitMap(result)}
        result={result}
        rules={result?.rules ?? state.rules}
      />
    </section>
  );
};

export { RulesEditor };

export type { Props };
