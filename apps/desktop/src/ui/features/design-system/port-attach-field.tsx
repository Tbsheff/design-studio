import type { ReactElement } from "react";

import { COPY } from "./copy.js";
import { AttachRow } from "./port-attach-row.js";
import { CandidatePick } from "./port-candidate-pick.js";
import { toNoteClass } from "./port-model.js";
import { useAttach } from "./use-port-attach.js";

const AttachField = ({
  error: listError,
  onAttached,
}: {
  error: string | null;
  onAttached: (projectId: string) => void;
}): ReactElement => {
  const attach = useAttach(onAttached);
  const { appDir, found, setAppDir } = attach;
  const isWaiting = found !== null && !appDir;
  const shownError = attach.failure ?? listError;

  return (
    <>
      <div className="field">
        <span id="port-attach-label">{COPY.textAppFolder}</span>
        <AttachRow attach={attach} isWaiting={isWaiting} />
      </div>
      {found && (
        <CandidatePick found={found} value={appDir} onChange={setAppDir} />
      )}
      <p className={toNoteClass(Boolean(shownError))}>
        {shownError ?? COPY.textNoAppIsAttached}
      </p>
    </>
  );
};

export { AttachField };
