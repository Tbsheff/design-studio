import { Suspense, useMemo } from "react";
import type { ReactElement } from "react";

import {
  FillSlot,
  MotionSlot,
  TextRewriteSlot,
  TextStyleSlot,
} from "../../inspector-slots.js";
import { BackgroundField } from "./background-field.js";
import { copy } from "./copy.js";
import { RareSection } from "./rare-section.js";
import type { SimpleEditorProps, SimpleEditorState } from "./simple-model.js";
import { SimpleSections } from "./simple-sections.js";
import { TokenLint } from "./token-lint.js";

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
        <div className="ins-text-tools">
          <TextStyleSlot
            projectId={projectId}
            directionId={directionId}
            targets={targets}
          />
          <Suspense fallback={null}>
            <TextRewriteSlot
              projectId={projectId}
              directionId={directionId}
              targets={targets}
            />
          </Suspense>
        </div>
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
        classes={state.classes}
        textStyle={textStyle}
        fill={fill}
        layout={props.layout}
        hasEffectLayers={Boolean(directionId && target.source)}
      />
      {directionId && (
        <RareSection title={copy.motionTitle} aside={null} modifier={null}>
          <MotionSlot
            projectId={projectId}
            directionId={directionId}
            target={target}
            port={port}
          />
        </RareSection>
      )}
    </>
  );
};

export { SimpleMiddle };
