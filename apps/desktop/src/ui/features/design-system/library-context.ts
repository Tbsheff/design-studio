import type { LibraryDialog } from "./library-model.js";

interface LibraryContext {
  readonly setDialog: (dialog: LibraryDialog) => void;
  readonly setSelectedId: (id: string | null) => void;
  readonly show: (text: string) => void;
}

export type { LibraryContext };
