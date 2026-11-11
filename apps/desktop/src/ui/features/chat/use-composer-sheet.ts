import { useCallback, useMemo, useState } from "react";

import type {
  ComposerSheet,
  ComposerSheetState,
} from "./composer-sheet-model.js";

const useComposerSheet = (): ComposerSheetState => {
  const [open, setOpen] = useState<ComposerSheet | null>(null);
  const close = useCallback((): void => setOpen(null), []);
  const show = useCallback((sheet: ComposerSheet): void => setOpen(sheet), []);

  return useMemo(() => ({ close, open, show }), [close, open, show]);
};

export { useComposerSheet };
