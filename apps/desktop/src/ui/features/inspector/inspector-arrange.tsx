import type { ReactElement } from "react";
import { useCallback, useRef, useTransition } from "react";

import type { ArrangeAction } from "../../../shared/arrange.js";
import { ArrangeBar } from "./arrange-bar.js";
import { ArrangeMessage } from "./arrange-message.js";
import { isArrangeShown } from "./arrange-model.js";
import type { Props } from "./arrange-model.js";
import { useArrange, useArrangeKeys } from "./use-arrange.js";

const InspectorArrange = (props: Props): ReactElement => {
  const root = useRef<HTMLDivElement>(null);
  const arrange = useArrange(props);
  const [, startTransition] = useTransition();

  const active =
    props.isEditable &&
    props.selection.length > 0 &&
    props.directionId !== null;

  const handleRun = useCallback(
    (action: ArrangeAction) => {
      startTransition(async () => {
        await arrange.run(action);
      });
    },
    [arrange]
  );

  useArrangeKeys(root, active, handleRun);

  const isShown =
    props.shouldShowBar && active && isArrangeShown(props.selection);

  return (
    <div ref={root} className="ins-arrange-wrap" data-shown={isShown}>
      {isShown && (
        <ArrangeBar
          selection={props.selection}
          isBusy={arrange.isBusy}
          onRun={handleRun}
        />
      )}
      <ArrangeMessage message={arrange.message} />
    </div>
  );
};

export { InspectorArrange };
