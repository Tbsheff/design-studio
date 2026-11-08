import { useMemo } from "react";
import type { ReactElement } from "react";

import { InspectorBreadcrumb } from "./inspector-breadcrumb.js";
import { CopyCssButton } from "./inspector-other-styles.js";
import { SourceLink } from "./inspector-source.js";
import { MetaRow } from "./meta-row.js";
import type { SimpleEditorProps, SimpleEditorState } from "./simple-model.js";

interface SimpleHeadProps {
  readonly props: SimpleEditorProps;
  readonly state: SimpleEditorState;
}

const SimpleHead = ({ props, state }: SimpleHeadProps): ReactElement => {
  const { projectId, directionId, target, port } = props;
  const { edit, tokens, authored } = state;
  const { reset } = edit;

  const source = useMemo(
    () => (
      <SourceLink
        projectId={projectId}
        directionId={directionId}
        source={target.source}
      />
    ),
    [projectId, directionId, target.source]
  );

  return (
    <div className="ins-head">
      <InspectorBreadcrumb selection={target} port={port} />
      <MetaRow
        tag={null}
        isResetDisabled={false}
        source={source}
        status={edit.status}
        ui={tokens.ui}
        onReset={reset}
      >
        <CopyCssButton authored={authored} />
      </MetaRow>
    </div>
  );
};

export { SimpleHead };
