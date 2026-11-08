import { Suspense, createElement, useCallback } from "react";
import type { ReactElement, ComponentProps, ReactNode, RefObject } from "react";

import { ChatPanel } from "../../features/chat/chat-panel";
import { ChatSplitter } from "../../features/chat/chat-splitter";
import { McpEditStrip } from "../../features/chat/mcp-feed";
import { PromptBox } from "../../features/chat/prompt-box";
import { RunDetails } from "../../features/chat/run-details";
import type { RunView } from "../../features/chat/run-state-model";
import { TodoPanel } from "../../features/chat/todo-panel";
import { QueuedComposerBar } from "../../features/comments";
import { CommentsPanel } from "../../features/comments/comments-panel";
import { Inspector, TweaksPanel } from "../../features/inspector";
import { ErrorsPanel } from "../../features/review/errors-panel";
import { TokensPanel } from "../../features/versions-layers-tokens/tokens-panel";
import { VersionsPanel } from "../../features/versions-layers-tokens/versions-panel";
import type { PanelTab } from "../../platform/use-panel-tab";
import { ComponentsPanel } from "../components-panel-host";
import { SheetFrame } from "./sheet-frame";

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

const toTokensBody = (props: Props): ReactElement | null => {
  if (props.tokens) {
    return createElement(TokensPanel, props.tokens);
  }

  return null;
};

const toComponentsBody = (props: Props): ReactElement | null => {
  if (props.components) {
    return createElement(ComponentsPanel, props.components);
  }

  return null;
};

const toTweaksBody = (props: Props): ReactElement | null => {
  if (props.tweaks) {
    return createElement(
      Suspense,
      { fallback: null },
      createElement(TweaksPanel, props.tweaks)
    );
  }

  return null;
};

const toCommentsBody = (props: Props): ReactElement | null => {
  if (props.comments) {
    return createElement(CommentsPanel, props.comments);
  }

  return null;
};

const toSheetBody = (props: Props, tab: PanelTab): ReactElement | null => {
  switch (tab) {
    case "versions": {
      return createElement(VersionsPanel, props.versions);
    }

    case "tokens": {
      return toTokensBody(props);
    }

    case "components": {
      return toComponentsBody(props);
    }

    case "tweaks": {
      return toTweaksBody(props);
    }

    case "comments": {
      return toCommentsBody(props);
    }

    case "system": {
      return <div className="pane-system">{props.system}</div>;
    }

    default: {
      return null;
    }
  }
};

const toEditPane = (props: Props): ReactElement => (
  <section className="pane-edit" aria-label="Edit">
    {createElement(
      Suspense,
      { fallback: null },
      createElement(Inspector, {
        ...props.inspector,
        components: props.components,
      })
    )}
    <McpEditStrip mcp={props.chat.mcp ?? null} />
  </section>
);

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
  const { comments, onTab } = props;

  const showChat = useCallback(() => onTab("chat"), [onTab]);
  const showComments = useCallback(() => onTab("comments"), [onTab]);

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
          {createElement(ChatPanel, props.chat)}
        </div>
        {edit && toEditPane(props)}
        {sheet && (
          <SheetFrame
            onClose={showChat}
            tab={tab}
            title={SHEET_TITLES[tab] ?? ""}
          >
            {toSheetBody(props, tab)}
          </SheetFrame>
        )}
      </div>
      {createElement(ErrorsPanel, { ...props.errors, pane: tab })}
      {comments && tab !== "comments" && (
        <Suspense fallback={null}>
          <QueuedComposerBar control={comments.control} onShow={showComments} />
        </Suspense>
      )}
      {props.todos && chat && createElement(TodoPanel, props.todos)}
      <div className="pane-composer" hidden={!chat}>
        {createElement(PromptBox, props.prompt)}
      </div>
      {props.details.run &&
        createElement(RunDetails, { ...props.details, run: props.details.run })}
      <ChatSplitter columnsRef={props.columnsRef} />
    </aside>
  );
};

export { LeftPane };
