import { useCallback, useState } from "react";
import type { ReactElement } from "react";

import { shortcutLabel } from "../../../shared/keymap";
import {
  chatSearchAvailable,
  chatSearchOpen,
  registerChatSearchButton,
} from "../../features/chat/chat-search-model";
import { IS_MAC } from "../../features/commands/keys";
import { useLive } from "../../platform/live-store";
import { CommentsToggle } from "./comments-toggle";
import { PaneHeadButton } from "./pane-head-button";
import { PaneHeadToggle } from "./pane-head-toggle";
import type { StudioPaneHeaderProps } from "./pane-header-types";
import { PaneProject } from "./pane-project";
import { PaneStatus } from "./pane-status";
import { RenameField } from "./rename-field";

const RAIL_SHORTCUT = shortcutLabel("project-rail", IS_MAC);

const StudioPaneHeader = (props: StudioPaneHeaderProps): ReactElement => {
  const [renaming, setRenaming] = useState(false);
  const { onCollapse, onRename, onTab, tab } = props;
  const searchShown = useLive(chatSearchAvailable) && tab === "chat";
  const searchOpen = useLive(chatSearchOpen);

  const startRename = useCallback(() => setRenaming(true), []);

  const finishRename = useCallback(
    (next: string | null): void => {
      setRenaming(false);

      if (next) {
        void onRename(next);
      }
    },
    [onRename]
  );

  const toggleSearch = useCallback(
    () => chatSearchOpen.set(!searchOpen),
    [searchOpen]
  );

  return (
    <>
      <header className="pane-head">
        {renaming && <RenameField name={props.name} onDone={finishRename} />}
        {!renaming && (
          <PaneProject
            header={props}
            onStartRename={startRename}
            railShortcut={RAIL_SHORTCUT}
          />
        )}
        <PaneStatus
          connection={props.connection}
          error={null}
          onDismiss={props.onDismissError}
        />
        <PaneHeadButton
          extraClass=""
          icon="sidebar"
          label="Hide chat pane"
          onClick={onCollapse}
          tip="Hide pane"
        />
        {searchShown && (
          <PaneHeadToggle
            buttonRef={registerChatSearchButton}
            extraClass="pane-head-search"
            icon="search"
            isPressed={searchOpen}
            label="Search runs"
            onClick={toggleSearch}
            tip="Search runs"
          />
        )}
        <CommentsToggle count={props.commentCount} onTab={onTab} tab={tab} />
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
