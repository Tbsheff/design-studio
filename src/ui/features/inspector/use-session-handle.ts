import { useEffect, type MutableRefObject } from "react";

import type { EditSession, EditSessionHandle } from "../../useEditSession.js";

const useSessionHandle = (
  ref: MutableRefObject<EditSessionHandle | null> | undefined,
  session: EditSession
) => {
  useEffect(() => {
    if (!ref) {
      return;
    }

    ref.current = {
      dirty: session.dirty,
      count: session.count,
      net: session.net,
      requestExit: session.requestExit,
      save: session.save,
      discard: session.discard,
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
