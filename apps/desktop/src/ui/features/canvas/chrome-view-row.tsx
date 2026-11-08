import type { ReactElement } from "react";

import type { ChromeProps } from "./canvas-chrome-menu.js";
import { CanvasViewRow } from "./canvas-view-row.js";
import { useRulersControl } from "./chrome-rulers.js";

const ChromeViewRow = ({ chrome }: { chrome: ChromeProps }): ReactElement => {
  const { ui, view } = chrome;
  const { onCheck, onSource, onToggleDraw } = view;
  const rulers = useRulersControl(ui.rulers);

  return (
    <CanvasViewRow
      viewport={ui.viewport}
      drawMode={view.drawMode}
      onToggleDraw={onToggleDraw}
      source={view.source}
      onSource={onSource}
      hasHead={view.hasHead}
      checking={view.checking}
      onCheck={onCheck}
      addFrame={view.addFrame}
      theme={view.theme}
      lofi={view.lofi}
      links={view.links}
      rulers={rulers}
    />
  );
};

export { ChromeViewRow };
