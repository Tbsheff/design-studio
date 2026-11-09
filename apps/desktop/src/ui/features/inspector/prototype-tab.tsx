import { useCallback } from "react";
import type { ReactElement } from "react";

import { requestCanvasTool } from "../../platform/canvas-tool.js";
import { copy } from "./copy.js";

const PrototypeTab = (): ReactElement => {
  const pickLinkTool = useCallback(() => requestCanvasTool("prototype"), []);

  return (
    <div className="edit-prototype">
      <p className="ins-hint">{copy.prototypeHint}</p>
      <button type="button" className="btn small" onClick={pickLinkTool}>
        {copy.prototypeUseTool}
      </button>
    </div>
  );
};

export { PrototypeTab };
