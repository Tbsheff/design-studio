import { copy } from "./copy.js";

interface ImportMenuEntry {
  readonly icon: "plus";
  readonly id: string;
  readonly label: string;
  readonly run: () => void;
}

const importPageItems = (
  kind: string,
  directionId: string | null,
  run: () => void
): ImportMenuEntry[] => {
  if (kind !== "html" || !directionId) {
    return [];
  }

  return [{ icon: "plus", id: "import-page", label: copy.menuItem, run }];
};

export { importPageItems };

export type { ImportMenuEntry };
