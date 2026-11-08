import { useMemo } from "react";
import type { ReactElement } from "react";

import { UserMessage } from "./chat-parts.js";
import type { TurnActions } from "./chat-turn-model.js";
import { copy } from "./copy.js";
import { MessageEditor } from "./message-editor.js";
import { RestoreConfirm } from "./restore-confirm.js";
import type { RunView } from "./run-state-model.js";
import { TitleField } from "./title-field.js";
import { TurnTools } from "./turn-tools.js";
import { useRewindableTurn } from "./use-rewindable-turn.js";
import type { TurnRewind } from "./use-rewindable-turn.js";

interface RewindableTurnProps {
  readonly actions: TurnActions;
  readonly prompt: string;
  readonly rewind: TurnRewind;
  readonly run: RunView;
  readonly title: string | undefined;
}

const RewindableTurn = ({
  actions,
  prompt,
  rewind,
  run,
  title,
}: RewindableTurnProps): ReactElement => {
  const turn = useRewindableTurn({ actions, rewind, run, title });
  const { mode, renameFailed, onCancel, onConfirmRestore, onEdit } = turn;
  const { onRename, onRenameDone, onRestore, onSend } = turn;
  const { editTip, forkBase, restoreTip, restoreVersionId } = rewind;

  const tools = useMemo(
    () => (
      <TurnTools
        editTip={editTip}
        restoreTip={restoreTip}
        onEdit={onEdit}
        onRename={onRename}
        onRestore={onRestore}
      />
    ),
    [editTip, restoreTip, onEdit, onRename, onRestore]
  );

  const editor = useMemo(() => {
    if (mode === "edit" && forkBase) {
      return (
        <MessageEditor initial={prompt} onCancel={onCancel} onSend={onSend} />
      );
    }

    return null;
  }, [mode, forkBase, prompt, onCancel, onSend]);

  const titleSlot = useMemo(() => {
    if (mode === "rename") {
      return <TitleField initial={title ?? ""} onDone={onRenameDone} />;
    }

    return null;
  }, [mode, title, onRenameDone]);

  return (
    <>
      <UserMessage
        run={run}
        title={title}
        tools={tools}
        replaceBody={editor}
        titleSlot={titleSlot}
        onRename={onRename}
      />
      {renameFailed && (
        <p className="msg-turn-error" role="alert">
          {copy.couldNotRenameThis}
        </p>
      )}
      {mode === "confirm" && restoreVersionId && (
        <RestoreConfirm
          count={actions.dirtyCount()}
          onCancel={onCancel}
          onConfirm={onConfirmRestore}
        />
      )}
    </>
  );
};

export { RewindableTurn };
