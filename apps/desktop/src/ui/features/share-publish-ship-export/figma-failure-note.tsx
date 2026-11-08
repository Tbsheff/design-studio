import type { ReactElement } from "react";

import { FigmaFailureDetails } from "./figma-failure-details.js";
import { toPlainFailure } from "./figma-import-model.js";

interface Props {
  readonly failure: string;
}

const FigmaFailureNote = ({ failure }: Props): ReactElement => {
  const plain = toPlainFailure(failure);

  return (
    <div className="alert error small fgi-error" role="alert">
      <p>
        {plain.text}
        {plain.fix && ` ${plain.fix}`}
      </p>
      {plain.details && <FigmaFailureDetails details={plain.details} />}
    </div>
  );
};

export { FigmaFailureNote };
