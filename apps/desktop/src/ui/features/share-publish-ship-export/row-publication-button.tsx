import { useCallback } from "react";
import type { ReactElement } from "react";

import type { Publication } from "../../../shared/publish.js";
import { pick } from "../../platform/pick.js";

interface Props {
  isBusy: boolean;
  isDanger: boolean;
  label: string;
  publication: Publication;
  tip: string;
  onAct: (publication: Publication) => void;
}

const RowPublicationButton = ({
  isBusy,
  isDanger,
  label,
  onAct,
  publication,
  tip,
}: Props): ReactElement => {
  const act = useCallback((): void => {
    onAct(publication);
  }, [onAct, publication]);

  return (
    <button
      type="button"
      className={pick(isDanger, "btn ghost small danger", "btn ghost small")}
      disabled={isBusy}
      onClick={act}
      data-tip={tip}
    >
      {label}
    </button>
  );
};

export { RowPublicationButton };
