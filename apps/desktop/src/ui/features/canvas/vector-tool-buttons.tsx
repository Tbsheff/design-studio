import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { VectorToolButton } from "./vector-tool-button.js";
import { VECTOR_TOOLS, useVectorTool } from "./vector-tool-model.js";

const VectorToolButtons = (): ReactElement => {
  const { tool, available } = useVectorTool();

  return (
    <fieldset
      className="ui-tools topbar-tools vector-tools"
      aria-label={copy.tools}
    >
      {VECTOR_TOOLS.map((item) => (
        <VectorToolButton
          key={item.id}
          item={item}
          isActive={available && tool === item.id}
          isDisabled={!available}
        />
      ))}
    </fieldset>
  );
};

export { VectorToolButtons };
