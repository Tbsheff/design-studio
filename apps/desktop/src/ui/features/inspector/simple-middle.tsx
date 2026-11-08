import { useMemo } from "react";
import type { ReactElement } from "react";

import { FillSlot, MotionSlot, TextStyleSlot } from "../../inspector-slots.js";
import { BackgroundField } from "./background-field.js";
import { TokenLint } from "./inspector-tokens.js";
import type { SimpleEditorProps, SimpleEditorState } from "./simple-model.js";
import { SimpleSections } from "./simple-sections.js";

interface SimpleMiddleProps {
  readonly props: SimpleEditorProps;
  readonly state: SimpleEditorState;
}

const SimpleMiddle = ({ props, state }: SimpleMiddleProps): ReactElement => {
  const { projectId, directionId, target, port } = props;
  const { edit, tokens, authored } = state;

  const targets = useMemo(() => [target], [target]);

  const textStyle = useMemo(
    () =>
      directionId && (
        <TextStyleSlot
          projectId={projectId}
          directionId={directionId}
          targets={targets}
        />
      ),
    [projectId, directionId, targets]
  );

  const fallback = useMemo(() => <BackgroundField edit={edit} />, [edit]);

  const fill = useMemo(
    () =>
      directionId && (
        <FillSlot
          projectId={projectId}
          directionId={directionId}
          target={target}
          port={port}
          edit={edit}
          fallback={fallback}
        />
      ),
    [projectId, directionId, target, port, edit, fallback]
  );

  return (
    <>
      <TokenLint ui={tokens.ui} edit={edit} css={authored.css} />
      <SimpleSections
        edit={edit}
        ui={tokens.ui}
        selection={target}
        textStyle={textStyle}
        fill={fill}
      />
      {directionId && (
        <MotionSlot
          projectId={projectId}
          directionId={directionId}
          target={target}
          port={port}
        />
      )}
    </>
  );
};

export { SimpleMiddle };
