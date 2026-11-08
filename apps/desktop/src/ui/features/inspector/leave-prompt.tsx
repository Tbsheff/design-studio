import type { ReactElement } from "react";

import { LeaveDialog } from "./leave-dialog.js";
import type { EditSession } from "./use-edit-session.js";

const LeavePrompt = ({
  session,
}: {
  readonly session: EditSession;
}): ReactElement | null => {
  if (!session.isAsking) {
    return null;
  }

  return <LeaveDialog session={session} />;
};

export { LeavePrompt };
