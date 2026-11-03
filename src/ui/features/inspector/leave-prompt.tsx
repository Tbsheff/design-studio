import type { EditSession } from "../../useEditSession.js";
import { LeaveDialog } from "./leave-dialog.js";

const LeavePrompt = ({ session }: { session: EditSession }) => {
  return session.asking ? <LeaveDialog session={session} /> : null;
};

export { LeavePrompt };
