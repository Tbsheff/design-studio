import { Icon, SheetSlot } from "@design-studio/ui";
import { Suspense, useMemo, useState } from "react";
import type { ReactElement, ComponentProps, ReactNode, RefObject } from "react";

import { ChatPanel } from "../../features/chat/chat-panel";
import { ChatSplitter } from "../../features/chat/chat-splitter";
import { McpEditStrip } from "../../features/chat/mcp-feed";
import { PromptBox } from "../../features/chat/prompt-box";
import { RunDetails } from "../../features/chat/run-details";
import type { RunView } from "../../features/chat/run-state-model";
import { TodoPanel } from "../../features/chat/todo-panel";
import {
  CommentsPanel,
  QueuedComposerBar,
} from "../../features/comments/comments-panel";
import { Inspector, TweaksPanel } from "../../features/inspector";
import { ErrorsPanel } from "../../features/review/errors-panel";
import { TokensPanel } from "../../features/versions-layers-tokens/tokens-panel";
import { VersionsPanel } from "../../features/versions-layers-tokens/versions-panel";
import type { PanelTab } from "../../platform/use-panel-tab";
import { ComponentsPanel } from "../components-panel-host";

interface Props {
  collapsed?: boolean;
  columnsRef: RefObject<HTMLDivElement | null>;
  tab: PanelTab;
  onTab: (tab: PanelTab) => void;
  header: ReactNode;
  system: ReactNode;
  chat: ComponentProps<typeof ChatPanel>;
  errors: ComponentProps<typeof ErrorsPanel>;
  prompt: ComponentProps<typeof PromptBox>;
  inspector: ComponentProps<typeof Inspector>;
  details: Omit<ComponentProps<typeof RunDetails>, "run"> & {
    run: RunView | null;
  };
  tokens: ComponentProps<typeof TokensPanel> | null;
  components?: ComponentProps<typeof ComponentsPanel>;
  versions: ComponentProps<typeof VersionsPanel>;
  comments?: ComponentProps<typeof CommentsPanel>;
  tweaks?: ComponentProps<typeof TweaksPanel>;
  todos?: ComponentProps<typeof TodoPanel> | null;
}

const SHEET_TITLES: Partial<Record<PanelTab, string>> = {
  comments: "Comments",
  components: "Components",
  system: "Design system",
  tokens: "Tokens",
  tweaks: "Tweaks",
  versions: "Versions",
};

const visiblePane = (
  tab: PanelTab,
  has: {
    tokens: boolean;
    comments: boolean;
    tweaks: boolean;
    components: boolean;
  }
): PanelTab => {
  const missing: Partial<Record<PanelTab, boolean>> = {
    comments: !has.comments,
    components: !has.components,
    tokens: !has.tokens,
    tweaks: !has.tweaks,
  };

  if (missing[tab]) {
    return "chat";
  }

  return tab;
};

const SheetHead = ({
  id,
  title,
  onClose,
  onSlot,
}: {
  id: string;
  title: string;
  onClose: () => void;
  onSlot: (el: HTMLDivElement | null) => void;
}): ReactElement => (
  <div className="pane-sheet-head">
    <h2 className="pane-sheet-title" id={id}>
      {title}
    </h2>
    <div className="pane-sheet-slot" ref={onSlot} />
    <button
      type="button"
      className="icon-btn small"
      aria-label="Back to chat"
      data-tip="Back to chat"
      data-tip-align="end"
      onClick={onClose}
    >
      <Icon name="close" size={14} />
    </button>
  </div>
);

const Sheet = (props: Props & { tab: PanelTab }): ReactElement => {
  const close = (): void => props.onTab("chat");
  const [slot, setSlot] = useState<HTMLDivElement | null>(null);
  const sheet = useMemo(() => ({ slot }), [slot]);
  const title = SHEET_TITLES[props.tab] ?? "";

  const body = ((): ReactElement | null => {
    switch (props.tab) {
      case "versions": {
        return <VersionsPanel {...props.versions} />;
      }

      case "tokens": {
        if (props.tokens) {
          return <TokensPanel {...props.tokens} />;
        }

        return null;
      }

      case "components": {
        if (props.components) {
          return <ComponentsPanel {...props.components} />;
        }

        return null;
      }

      case "tweaks": {
        if (props.tweaks) {
          return (
            <Suspense fallback={null}>
              <TweaksPanel {...props.tweaks} />
            </Suspense>
          );
        }

        return null;
      }

      case "comments": {
        if (props.comments) {
          return <CommentsPanel {...props.comments} />;
        }

        return null;
      }

      case "system": {
        return <div className="pane-system">{props.system}</div>;
      }

      default: {
        return null;
      }
    }
  })();

  return (
    <section
      className={`pane-sheet pane-sheet-${props.tab}`}
      aria-labelledby={`${props.tab}-heading`}
    >
      <SheetSlot.Provider value={sheet}>
        <SheetHead
          id={`${props.tab}-heading`}
          title={title}
          onClose={close}
          onSlot={setSlot}
        />
        <div className="pane-sheet-body">{body}</div>
      </SheetSlot.Provider>
    </section>
  );
};

const LeftPane = (props: Props): ReactElement => {
  const tab = visiblePane(props.tab, {
    comments: Boolean(props.comments),
    components: Boolean(props.components),
    tokens: props.tokens !== null,
    tweaks: Boolean(props.tweaks),
  });

  const chat = tab === "chat";
  const edit = tab === "design";
  const sheet = !chat && !edit;
  const { comments } = props;

  return (
    <aside
      className="pane-left"
      data-mode={tab}
      data-popover-boundary=""
      hidden={props.collapsed}
    >
      {props.header}
      <div className="pane-body">
        <div className="pane-chat" hidden={!chat}>
          <ChatPanel {...props.chat} />
        </div>
        {edit && (
          <section className="pane-edit" aria-label="Edit">
            <Suspense fallback={null}>
              <Inspector {...props.inspector} components={props.components} />
            </Suspense>
            <McpEditStrip mcp={props.chat.mcp ?? null} />
          </section>
        )}
        {sheet && <Sheet {...props} tab={tab} />}
      </div>
      <ErrorsPanel {...props.errors} pane={tab} />
      {comments && tab !== "comments" && (
        <QueuedComposerBar
          control={comments.control}
          onShow={() => props.onTab("comments")}
        />
      )}
      {props.todos && chat && <TodoPanel {...props.todos} />}
      <div className="pane-composer" hidden={!chat}>
        <PromptBox {...props.prompt} />
      </div>
      {props.details.run && (
        <RunDetails {...props.details} run={props.details.run} />
      )}
      <ChatSplitter columnsRef={props.columnsRef} />
    </aside>
  );
};

export { visiblePane, LeftPane };
