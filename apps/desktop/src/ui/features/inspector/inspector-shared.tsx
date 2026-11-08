import type {
  ElementSourceInfo,
  SelectionContext,
  TextFromData,
  TextSourceAnswer,
  TextSourceInfo,
} from "@design-studio/contracts";
import type { SharedSource } from "@design-studio/contracts/app";
import { Icon } from "@design-studio/ui";
import { createContext, useContext, useEffect, useState } from "react";
import type { KeyboardEvent, ReactElement } from "react";

import { api } from "../../api.js";
import { copy } from "./copy.js";
import { textHints } from "./use-direct-edit.js";
import type { DirectEdit } from "./use-direct-edit.js";

interface InspectorApp {
  readonly appDir: string | null;
  readonly ask: ((prompt: string) => void) | null;
  readonly element: ElementSourceInfo | null;
}

const InspectorAppContext = createContext<InspectorApp>({
  appDir: null,
  ask: null,
  element: null,
});

function useInspectorApp(): InspectorApp {
  return useContext(InspectorAppContext);
}

function loc(source: { readonly file: string; readonly line: number }): string {
  return `${source.file}:${source.line}`;
}

function shortLoc(source: {
  readonly file: string;
  readonly line: number;
}): string {
  return `${source.file.split("/").pop() ?? source.file}:${source.line}`;
}

function dataTextPrompt(text: string, data: TextFromData): string {
  const shown = text.length > 80 ? `${text.slice(0, 79)}…` : text;

  return `The text "${shown}" comes from data: ${data.expression} in ${loc(data)}. Change it to: `;
}

type TextEditScope = Pick<
  DirectEdit,
  "scope" | "text" | "status" | "previewText" | "revertText" | "commit"
>;

function useTextSource(
  edit: TextEditScope,
  selection: SelectionContext
): TextSourceAnswer | null {
  const [answer, setAnswer] = useState<TextSourceAnswer | null>(null);
  const { projectId, directionId } = edit.scope;
  const { source } = selection;
  const savedAt = edit.status.kind === "saved" ? edit.status.at : 0;

  const key = JSON.stringify([
    source,
    selection.text,
    selection.usedAt ?? null,
    selection.owners?.map((owner) => owner.stack) ?? [],
    savedAt,
  ]);

  const hints = textHints(selection);
  useEffect(() => {
    if (!directionId || !source) {
      return setAnswer(null);
    }

    let live = true;
    api
      .textSource(projectId, directionId, source, hints)
      .then((next) => live && setAnswer(next))
      .catch(() => live && setAnswer({ reason: "" }));

    return (): void => {
      live = false;
    };
  }, [projectId, directionId, key]);

  return answer;
}

function SourceTextRow({
  found,
  edit,
}: {
  readonly found: TextSourceInfo;
  readonly edit: TextEditScope;
}): ReactElement {
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === "Enter") {
      event.preventDefault();
      edit.commit();
    } else if (event.key === "Escape") {
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
        <input
          id="ins-content"
          className="ins-input"
          aria-label={copy.textContent}
          value={edit.text}
          spellCheck={false}
          onChange={(event) => edit.previewText(event.target.value)}
          onBlur={edit.commit}
          onKeyDown={onKeyDown}
        />
      </div>
      <div className="ins-data-text wide" role="note">
        <span>
          Edits {found.what} in{" "}
          <code data-tip={loc(found)}>{shortLoc(found)}</code>.
          {found.shared ? ` ${found.shared}` : ""}
        </span>
      </div>
    </>
  );
}

function DataTextNote({
  data,
  selection,
  edit,
}: {
  readonly data: TextFromData;
  readonly selection: SelectionContext;
  readonly edit: TextEditScope;
}): ReactElement {
  const answer = useTextSource(edit, selection);

  if (answer && "found" in answer) {
    return <SourceTextRow found={answer.found} edit={edit} />;
  }

  if (!answer && edit.scope.directionId && selection.source) {
    return (
      <div className="ins-data-text wide" role="status">
        <span>Looking for where this text is set…</span>
      </div>
    );
  }

  return (
    <DataTextAsk
      data={data}
      text={selection.text}
      reason={answer && "reason" in answer ? answer.reason : null}
    />
  );
}

function DataTextAsk({
  data,
  text,
  reason,
}: {
  readonly data: TextFromData;
  readonly text: string;
  readonly reason: string | null;
}): ReactElement {
  const { ask } = useInspectorApp();

  return (
    <div className="ins-data-text wide" role="note">
      <span>
        This text comes from data: <code>{data.expression}</code> in{" "}
        <code data-tip={loc(data)}>{shortLoc(data)}</code>.
        {reason ? ` ${reason}` : ""}
      </span>
      {ask && (
        <button
          type="button"
          className="btn small ghost"
          onClick={() => ask(dataTextPrompt(text, data))}
        >
          <Icon name="chat" size={12} />
          Ask the agent to change it
        </button>
      )}
    </div>
  );
}

function SharedSourceNote({
  shared,
  isEditingUse: editingUse,
  canUse,
  onToggle,
}: {
  readonly shared: SharedSource;
  readonly isEditingUse: boolean;
  readonly canUse: boolean;
  readonly onToggle: () => void;
}): ReactElement {
  const what = shared.name ?? shared.file.split("/").pop() ?? shared.file;

  if (editingUse && shared.use) {
    return (
      <div className="ins-shared" role="note">
        <span>
          Edits go to this use of {what} in{" "}
          <code data-tip={loc(shared.use)}>{shortLoc(shared.use)}</code>
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
        {shared.name
          ? `Changes every ${shared.name}.`
          : `Changes every use of ${what}.`}
      </span>
      {canUse && shared.use && (
        <button type="button" className="btn small" onClick={onToggle}>
          Edit this use instead
        </button>
      )}
    </div>
  );
}

function AddButton({
  label,
  tip,
  shortcut,
  onClick,
}: {
  readonly label: string;
  readonly tip?: string;
  readonly shortcut?: string;
  readonly onClick: () => void;
}): ReactElement {
  return (
    <button
      type="button"
      className="ins-add"
      aria-label={`Add ${label.toLowerCase()}`}
      aria-keyshortcuts={shortcut}
      data-tip={tip}
      data-tip-align={tip ? "start" : undefined}
      onClick={onClick}
    >
      <Icon name="plus" size={12} />
      {label}
    </button>
  );
}

export {
  InspectorAppContext,
  useInspectorApp,
  dataTextPrompt,
  DataTextNote,
  SharedSourceNote,
  AddButton,
};

export type { InspectorApp };
