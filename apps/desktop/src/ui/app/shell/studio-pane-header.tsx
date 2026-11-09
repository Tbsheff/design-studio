import { useCallback } from "react";
import type { ReactElement } from "react";

import {
  chatSearchAvailable,
  chatSearchOpen,
  registerChatSearchButton,
} from "../../features/chat/chat-search-model";
import { useLive } from "../../platform/live-store";
import { copy } from "./copy";
import { PaneHeadToggle } from "./pane-head-toggle";
import type { StudioPaneHeaderProps } from "./pane-header-types";
import { PaneStatus } from "./pane-status";

const StudioPaneHeader = (props: StudioPaneHeaderProps): ReactElement => {
  const searchShown = useLive(chatSearchAvailable);
  const searchOpen = useLive(chatSearchOpen);

  const toggleSearch = useCallback(
    () => chatSearchOpen.set(!searchOpen),
    [searchOpen]
  );

  return (
    <>
      <header className="pane-head chat-head">
        <h2 className="chat-head-title">{copy.chatTitle}</h2>
        {props.directionName && (
          <span className="chat-head-scope truncate">
            {props.directionName}
          </span>
        )}
        <span className="chat-head-end" />
        <PaneStatus
          connection={props.connection}
          error={null}
          onDismiss={props.onDismissError}
        />
        {searchShown && (
          <PaneHeadToggle
            buttonRef={registerChatSearchButton}
            extraClass="pane-head-search"
            icon="search"
            isPressed={searchOpen}
            label={copy.searchRuns}
            onClick={toggleSearch}
            tip={copy.searchRuns}
          />
        )}
      </header>
      <PaneStatus
        connection="open"
        error={props.actionError}
        onDismiss={props.onDismissError}
      />
    </>
  );
};

export { StudioPaneHeader };
