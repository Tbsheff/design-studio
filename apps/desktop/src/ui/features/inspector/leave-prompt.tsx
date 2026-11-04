import { LeaveDialog } from "./leave-dialog.js";
import type { EditSession } from "./use-edit-session.js";

const LeavePrompt = ({ session }: { session: EditSession }) =>
  session.asking ? <LeaveDialog session={session} /> : null;

export { LeavePrompt };
