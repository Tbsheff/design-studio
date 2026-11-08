import { useEffect } from "react";
import type { MutableRefObject } from "react";

import type { EditSession, EditSessionHandle } from "./use-edit-session.js";

const useSessionHandle = (
  ref: MutableRefObject<EditSessionHandle | null> | undefined,
  session: EditSession
): void => {
  useEffect(() => {
    if (!ref) {
      return;
    }

    ref.current = {
      count: session.count,
      discard: session.discard,
      isDirty: session.isDirty,
      net: session.net,
      requestExit: session.requestExit,
      save: session.save,
    };
  });
  useEffect(
    () => (): void => {
      if (ref) {
        ref.current = null;
      }
    },
    [ref]
  );
};

export { useSessionHandle };
