import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";
import { memo, useEffect, useState } from "react";

import { ComponentsTab } from "./components-tab.js";
import { InspectorArrange } from "./inspector-arrange.js";
import { InspectorCode } from "./inspector-code.js";
import type { InspectorProps, InspectorTab } from "./inspector-model.js";
import { InspectorAppContext } from "./inspector-shared.js";
import { InspectorTools } from "./inspector-tools.js";
import { InspectorTweaks } from "./inspector-tweaks.js";
import { LeavePrompt } from "./leave-prompt.js";
import { ProTab } from "./pro-tab.js";
import { sameShared } from "./same-props.js";
import { SessionHeader } from "./session-header.js";
import { SimpleTab } from "./simple-tab.js";
import { TabBar } from "./tab-bar.js";
import { TweaksNote } from "./tweaks-note.js";
import { useEditSession } from "./use-edit-session.js";
import { restoreEditVariant } from "./use-edit-variant.js";
import { useSessionHandle } from "./use-session-handle.js";
import { useStableCallbacks } from "./use-stable-callbacks.js";

import "../../styles/inspector-edit.css";

const SimpleTabMemo = memo(SimpleTab, sameShared);
const ToolsMemo = memo(InspectorTools, sameShared);
const ArrangeMemo = memo(InspectorArrange, sameShared);

const Inspector = (raw: InspectorProps): ReactElement => {
  const props = useStableCallbacks(raw);
  const [ownTab, setOwnTab] = useState<InspectorTab>("simple");
  const tab = props.tab ?? ownTab;
  const onTab = props.onTab ?? setOwnTab;

  const session = useEditSession({
    control: props.control,
    directionId: props.directionId,
    onEnded: (action, result) => {
      if (props.onSessionEnd) {
        props.onSessionEnd(action, result);
      } else if (action === "discard" && props.selection.length > 0) {
        props.onStale("");
      }
    },
    port: props.port,
    projectId: props.projectId,
  });

  useSessionHandle(props.session, session);
  const { port } = props;
  useEffect(() => (): void => restoreEditVariant(port.current), [port]);

  return (
    <InspectorAppContext.Provider
      value={{
        appDir: props.appDir ?? null,
        ask: props.onAskAgent ?? null,
        element: null,
      }}
    >
      <div className="edit-pane" aria-label="Edit">
        <SessionHeader session={session} onDone={() => props.onExit?.()} />
        {session.error && !session.isAsking && (
          <div className="ins-error" role="alert">
            <Icon name="alert" size={14} />
            <span>{session.error}</span>
            <button
              type="button"
              className="icon-btn small"
              aria-label="Dismiss"
              onClick={session.clearError}
            >
              <Icon name="close" size={12} />
            </button>
          </div>
        )}
        <LeavePrompt session={session} />
        <TabBar tab={tab} onTab={onTab} />
        {(tab === "simple" || tab === "pro") && <ToolsMemo {...props} />}
        <ArrangeMemo {...props} shouldShowBar={tab === "simple"} />
        <div
          className="edit-body"
          role="tabpanel"
          id={`edit-pane-${tab}`}
          aria-labelledby={`edit-tab-${tab}`}
        >
          {tab === "simple" && <SimpleTabMemo {...props} />}
          {tab === "pro" && <ProTab {...props} />}
          {tab === "components" && (
            <ComponentsTab components={props.components} />
          )}
          {tab === "code" && (
            <InspectorCode
              projectId={props.projectId}
              directionId={props.directionId}
              selection={props.selection.at(-1) ?? null}
            />
          )}
          {tab === "tweaks" && (
            <>
              {props.tweaks && session.count > 0 && (
                <TweaksNote session={session} />
              )}
              <InspectorTweaks
                tweaks={props.tweaks}
                isBlocked={session.count > 0}
              />
            </>
          )}
        </div>
      </div>
    </InspectorAppContext.Provider>
  );
};

export { Inspector };

export type { InspectorTab } from "./inspector-model.js";
