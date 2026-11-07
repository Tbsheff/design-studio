import { LeaveDialog } from "./leave-dialog.js";
import type { EditSession } from "./use-edit-session.js";

const LeavePrompt = ({ session }: { readonly session: EditSession }) =>
  session.asking ? <LeaveDialog session={session} /> : null;

export { LeavePrompt };
