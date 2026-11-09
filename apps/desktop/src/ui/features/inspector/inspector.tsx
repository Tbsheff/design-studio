import type { ReactElement } from "react";
import { useMemo, useState } from "react";

import { InspectorEditPane } from "./inspector-edit-pane.js";
import type { InspectorProps, InspectorTab } from "./inspector-model.js";
import { InspectorAppContext } from "./use-inspector-app.js";
import { useInspectorSession } from "./use-inspector-session.js";
import { usePlaceTool } from "./use-place-tool.js";
import { useStableCallbacks } from "./use-stable-callbacks.js";

const Inspector = (raw: InspectorProps): ReactElement => {
  const props = useStableCallbacks(raw);
  const [ownTab, setOwnTab] = useState<InspectorTab>("simple");
  const session = useInspectorSession(props);
  usePlaceTool(props);
  const { appDir, onAskAgent } = props;

  const app = useMemo(
    () => ({ appDir: appDir ?? null, ask: onAskAgent ?? null, element: null }),
    [appDir, onAskAgent]
  );

  return (
    <InspectorAppContext.Provider value={app}>
      <InspectorEditPane
        props={props}
        session={session}
        tab={props.tab ?? ownTab}
        onTab={props.onTab ?? setOwnTab}
      />
    </InspectorAppContext.Provider>
  );
};

export { Inspector };

export type { InspectorTab } from "./inspector-model.js";
