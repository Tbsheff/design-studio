import { Suspense, createElement } from "react";
import type { ComponentProps, ReactElement, ReactNode, RefObject } from "react";

import { ChatPanel } from "../../features/chat/chat-panel";
import { ChatSplitter } from "../../features/chat/chat-splitter";
import { PromptBox } from "../../features/chat/prompt-box";
import { RunDetails } from "../../features/chat/run-details";
import type { RunView } from "../../features/chat/run-state-model";
import { TodoPanel } from "../../features/chat/todo-panel";
import { QueuedComposerBar } from "../../features/comments";
import type { CommentsPanel } from "../../features/comments/comments-panel";
import { ErrorsPanel } from "../../features/review/errors-panel";

interface Props {
  columnsRef: RefObject<HTMLDivElement | null>;
  header: ReactNode;
  chat: ComponentProps<typeof ChatPanel>;
  errors: ComponentProps<typeof ErrorsPanel>;
  prompt: ComponentProps<typeof PromptBox>;
  details: Omit<ComponentProps<typeof RunDetails>, "run"> & {
    run: RunView | null;
  };
  comments?: ComponentProps<typeof CommentsPanel>;
  onShowComments: () => void;
  todos?: ComponentProps<typeof TodoPanel> | null;
}

const LeftPane = (props: Props): ReactElement => {
  const { comments } = props;

  return (
    <aside className="pane-left" data-mode="chat" data-popover-boundary="">
      {props.header}
      <div className="pane-body">
        <div className="pane-chat">{createElement(ChatPanel, props.chat)}</div>
      </div>
      {createElement(ErrorsPanel, { ...props.errors, pane: "chat" })}
      {comments && (
        <Suspense fallback={null}>
          <QueuedComposerBar
            control={comments.control}
            onShow={props.onShowComments}
          />
        </Suspense>
      )}
      {props.todos && createElement(TodoPanel, props.todos)}
      <div className="pane-composer">
        {createElement(PromptBox, props.prompt)}
      </div>
      {props.details.run &&
        createElement(RunDetails, { ...props.details, run: props.details.run })}
      <ChatSplitter columnsRef={props.columnsRef} />
    </aside>
  );
};

export { LeftPane };
