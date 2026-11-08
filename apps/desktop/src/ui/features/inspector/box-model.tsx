import { useCallback, useState } from "react";
import type { ReactElement } from "react";

import type { DeclaredMargins } from "./box-model-model.js";
import { BoxPadding } from "./box-padding.js";
import { BoxRing } from "./box-ring.js";
import type { DirectEdit } from "./deps.js";

interface Props {
  readonly edit: DirectEdit;
  readonly declared: DeclaredMargins;
}

const BoxModel = ({ edit, declared }: Props): ReactElement => {
  const [isPaddingLinked, setIsPaddingLinked] = useState(false);
  const [isMarginLinked, setIsMarginLinked] = useState(false);

  const handleMargin = useCallback((): void => {
    setIsMarginLinked((isLinked) => !isLinked);
  }, []);

  const handlePadding = useCallback((): void => {
    setIsPaddingLinked((isLinked) => !isLinked);
  }, []);

  return (
    <div className="box-model">
      <BoxRing
        box="margin"
        edit={edit}
        isLinked={isMarginLinked}
        declared={declared}
        onToggle={handleMargin}
      >
        <BoxPadding
          edit={edit}
          isLinked={isPaddingLinked}
          onToggle={handlePadding}
        />
      </BoxRing>
    </div>
  );
};

export { BoxModel };
