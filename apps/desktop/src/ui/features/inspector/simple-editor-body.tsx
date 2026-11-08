import type { ReactElement, ReactNode } from "react";

import { copy } from "./copy.js";
import { TokenNotes } from "./inspector-tokens.js";
import { SimpleHead } from "./simple-head.js";
import { SimpleLead } from "./simple-lead.js";
import { SimpleMiddle } from "./simple-middle.js";
import type { SimpleEditorProps, SimpleEditorState } from "./simple-model.js";
import { SimpleTail } from "./simple-tail.js";

interface SimpleEditorBodyProps {
  readonly props: SimpleEditorProps;
  readonly state: SimpleEditorState;
  readonly exportMenu: ReactNode;
}

const SimpleEditorBody = ({
  props,
  state,
  exportMenu,
}: SimpleEditorBodyProps): ReactElement => {
  const { keepRaw, tokens } = state;
  const { dismiss, note } = tokens.snap;

  return (
    <section className="inspector ins-simple" aria-label={copy.designInspector}>
      <SimpleHead props={props} state={state} />
      <div className="ins-scroll">
        <SimpleLead props={props} state={state} />
        <SimpleMiddle props={props} state={state} />
        <SimpleTail props={props} state={state} exportMenu={exportMenu} />
      </div>
      <TokenNotes
        ui={tokens.ui}
        note={note}
        onKeepRaw={keepRaw}
        onDismiss={dismiss}
      />
    </section>
  );
};

export { SimpleEditorBody };
