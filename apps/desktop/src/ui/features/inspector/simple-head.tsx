import { useMemo } from "react";
import type { ReactElement } from "react";

import { toElementLabel } from "./breadcrumb-model.js";
import { CopyCssButton } from "./copy-css-button.js";
import { MetaRow } from "./meta-row.js";
import type { SimpleEditorProps, SimpleEditorState } from "./simple-model.js";

interface SimpleHeadProps {
  readonly props: SimpleEditorProps;
  readonly state: SimpleEditorState;
}

const SimpleHead = ({ props, state }: SimpleHeadProps): ReactElement => {
  const { edit, tokens, authored } = state;
  const { reset } = edit;
  const label = toElementLabel(props.target);

  const name = useMemo(
    () => (
      <span className="ins-source ins-layer-name" data-tip={label}>
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
        onReset={reset}
      >
        <CopyCssButton authored={authored} />
      </MetaRow>
    </div>
  );
};

export { SimpleHead };
