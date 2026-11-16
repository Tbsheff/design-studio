import { useMemo } from "react";
import type { ReactElement } from "react";

import { StateStylesSlot } from "../../inspector-slots.js";
import { ClassLine } from "./class-line.js";
import { toDomClasses } from "./element-classes-model.js";
import { ErrorLine } from "./error-line.js";
import { InspectorVariantBar } from "./inspector-variant-bar.js";
import { SharedNote } from "./shared-note.js";
import type { SimpleEditorProps, SimpleEditorState } from "./simple-model.js";

interface SimpleLeadProps {
  readonly props: SimpleEditorProps;
  readonly state: SimpleEditorState;
}

const SimpleLead = ({ props, state }: SimpleLeadProps): ReactElement => {
  const { projectId, directionId, target, port } = props;
  const { edit, classes, classLine } = state;
  const hasSource = Boolean(directionId && target.source);
  const { outerHTML } = target;
  const resolved = useMemo(() => toDomClasses(outerHTML), [outerHTML]);

  return (
    <>
      <ErrorLine status={edit.status} text={target.text} />
      <SharedNote
        sharedEditing={props.sharedEditing}
        isForwards={classes.element?.forwardsClassName === true}
      />
      {props.component}
      <ClassLine info={classLine} resolved={resolved} />
      <InspectorVariantBar
        selector={target.selector}
        port={port}
        support={classes.variants}
        quietNote={classLine?.note ?? null}
      />
      {directionId && hasSource && (
        <StateStylesSlot
          projectId={projectId}
          directionId={directionId}
          target={target}
          port={port}
          status={edit.status}
        />
      )}
    </>
  );
};

export { SimpleLead };
