import { useEffect } from "react";
import type { MutableRefObject } from "react";

import type { EditSession, EditSessionHandle } from "./use-edit-session.js";

const useSessionHandle = (
  ref: MutableRefObject<EditSessionHandle | null> | undefined,
  session: EditSession
) => {
  useEffect(() => {
    if (!ref) {
      return;
    }

    ref.current = {
      count: session.count,
      isDirty: session.isDirty,
      discard: session.discard,
      net: session.net,
      requestExit: session.requestExit,
      save: session.save,
    };
  });
  useEffect(
    () => () => {
      if (ref) {
        ref.current = null;
      }
    },
    [ref]
  );
};

export { useSessionHandle };
