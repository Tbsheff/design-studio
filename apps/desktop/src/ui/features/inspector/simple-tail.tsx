import { useMemo } from "react";
import type { ReactElement, ReactNode } from "react";

import { MotionSlot } from "../../inspector-slots.js";
import { InspectorOtherStyles } from "./inspector-other-styles.js";
import { MatchSection } from "./match-section.js";
import { MoreSections } from "./more-sections.js";
import { SelectMatchingSection } from "./select-matching-section.js";
import type { SimpleEditorProps, SimpleEditorState } from "./simple-model.js";

interface SimpleTailProps {
  readonly props: SimpleEditorProps;
  readonly state: SimpleEditorState;
  readonly exportMenu: ReactNode;
}

const SimpleTail = ({
  props,
  state,
  exportMenu,
}: SimpleTailProps): ReactElement => {
  const { projectId, directionId, target, port, tokens } = props;
  const selection = useMemo(() => [target], [target]);

  return (
    <MoreSections>
      {directionId && (
        <MotionSlot
          projectId={projectId}
          directionId={directionId}
          target={target}
          port={port}
        />
      )}
      {props.trailing}
      <MatchSection
        projectId={projectId}
        directionId={directionId}
        selection={selection}
        port={port}
        tokens={tokens}
        edit={state.edit}
      />
      <SelectMatchingSection selection={selection} port={port} />
      <InspectorOtherStyles css={state.authored.css} />
      <div className="ins-export">{exportMenu}</div>
    </MoreSections>
  );
};

export { SimpleTail };
