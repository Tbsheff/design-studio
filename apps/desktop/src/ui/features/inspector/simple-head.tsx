import { useMemo } from "react";
import type { ReactElement } from "react";

import { toElementLabel } from "./breadcrumb-model.js";
import { MetaRow } from "./meta-row.js";
import type { SimpleEditorProps, SimpleEditorState } from "./simple-model.js";

interface SimpleHeadProps {
  readonly props: SimpleEditorProps;
  readonly state: SimpleEditorState;
}

const SimpleHead = ({ props, state }: SimpleHeadProps): ReactElement => {
  const { edit, tokens } = state;
  const { reset: handleReset } = edit;
  const label = toElementLabel(props.target);

  const name = useMemo(
    () => (
      <span className="ins-layer-name" data-tip={label}>
        {label}
      </span>
    ),
    [label]
  );

  return (
    <div className="ins-head">
      <MetaRow
        tag={null}
        isResetDisabled={false}
        source={name}
        status={edit.status}
        ui={tokens.ui}
        onReset={handleReset}
      >
        {null}
      </MetaRow>
    </div>
  );
};

export { SimpleHead };
