import type { ReactElement } from "react";

import { ComponentsTab } from "./components-tab.js";
import { InspectorCode } from "./inspector-code.js";
import type { InspectorProps, InspectorTab } from "./inspector-model.js";
import { ProSlot } from "./pro-slot.js";
import { PrototypeTab } from "./prototype-tab.js";
import { SimpleSlot } from "./simple-slot.js";
import { TweaksTab } from "./tweaks-tab.js";
import type { EditSession } from "./use-edit-session.js";

interface Props {
  readonly props: InspectorProps;
  readonly session: EditSession;
  readonly tab: InspectorTab;
}

const InspectorTabBody = ({ props, session, tab }: Props): ReactElement => (
  <div
    className="edit-body"
    role="tabpanel"
    id={`edit-pane-${tab}`}
    aria-labelledby={`edit-tab-${tab}`}
  >
    {tab === "simple" && <SimpleSlot props={props} />}
    {tab === "pro" && <ProSlot props={props} />}
    {tab === "prototype" && <PrototypeTab />}
    {tab === "components" && <ComponentsTab components={props.components} />}
    {tab === "code" && (
      <InspectorCode
        projectId={props.projectId}
        directionId={props.directionId}
        selection={props.selection.at(-1) ?? null}
        port={props.port}
      />
    )}
    {tab === "tweaks" && <TweaksTab tweaks={props.tweaks} session={session} />}
  </div>
);

export { InspectorTabBody };
