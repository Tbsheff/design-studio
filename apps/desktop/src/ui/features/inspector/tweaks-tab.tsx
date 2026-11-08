import type { ReactElement } from "react";

import type { InspectorProps } from "./inspector-model.js";
import { InspectorTweaks } from "./inspector-tweaks.js";
import { TweaksNote } from "./tweaks-note.js";
import type { EditSession } from "./use-edit-session.js";

interface Props {
  readonly tweaks: InspectorProps["tweaks"];
  readonly session: EditSession;
}

const TweaksTab = ({ tweaks, session }: Props): ReactElement => (
  <>
    {tweaks && session.count > 0 && <TweaksNote session={session} />}
    <InspectorTweaks tweaks={tweaks} isBlocked={session.count > 0} />
  </>
);

export { TweaksTab };
