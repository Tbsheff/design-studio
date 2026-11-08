import { useModalDialog } from "@design-studio/ui";
import { useCallback, useTransition } from "react";
import type { ReactElement } from "react";

import { LeaveFoot } from "./leave-foot.js";
import { LeaveHead } from "./leave-head.js";
import { useDialogBackdrop } from "./use-dialog-backdrop.js";
import type { EditSession } from "./use-edit-session.js";

const DIALOG_STYLE = { width: "min(400px, 100%)" };

const LeaveDialog = ({
  session,
}: {
  readonly session: EditSession;
}): ReactElement => {
  const [, startTransition] = useTransition();

  const cancel = useCallback(() => {
    startTransition(async () => {
      await session.answer("cancel");
    });
  }, [session]);

  const { ref } = useModalDialog(cancel);
  useDialogBackdrop(ref, cancel);

  return (
    <dialog
      ref={ref}
      className="modal edit-leave-dialog"
      style={DIALOG_STYLE}
      aria-labelledby="edit-leave-title"
      aria-describedby="edit-leave-text"
    >
      <LeaveHead net={session.net} error={session.error} />
      <LeaveFoot session={session} />
    </dialog>
  );
};

export { LeaveDialog };
