import type { ReactElement, ReactNode } from "react";
import { useMemo } from "react";

import { TextStyleSlot } from "../../inspector-slots.js";
import { copy } from "./copy.js";
import { ErrorLine } from "./error-line.js";
import { MatchSection } from "./match-section.js";
import { MetaRow } from "./meta-row.js";
import { MultiFieldset } from "./multi-fieldset.js";
import { MultiNote } from "./multi-note.js";
import { SelectMatchingSection } from "./select-matching-section.js";
import type { EditorProps, MultiEdit } from "./simple-model.js";
import { TokenNotes } from "./token-notes.js";
import type { UseInspectorTokensResult } from "./token-scope-model.js";

interface SimpleMultiBodyProps {
  readonly props: EditorProps;
  readonly component: ReactNode;
  readonly edit: MultiEdit;
  readonly tokens: UseInspectorTokensResult;
  readonly keepRaw: (raw: Parameters<MultiEdit["preview"]>[0]) => void;
}

const SimpleMultiBody = ({
  props,
  component,
  edit,
  tokens,
  keepRaw,
}: SimpleMultiBodyProps): ReactElement => {
  const { projectId, directionId, selection, port } = props;
  const { dismiss, note } = tokens.snap;
  const { reset } = edit;
  const source = useMemo(() => <span className="ins-source" />, []);

  const textStyle = useMemo(
    () =>
      directionId && (
        <TextStyleSlot
          projectId={projectId}
          directionId={directionId}
          targets={selection}
        />
      ),
    [projectId, directionId, selection]
  );

  return (
    <section className="inspector ins-simple" aria-label={copy.designInspector}>
      <MetaRow
        tag={`${selection.length} elements`}
        source={source}
        status={edit.status}
        ui={tokens.ui}
        onReset={reset}
        isResetDisabled={edit.blocked !== null}
      >
        {null}
      </MetaRow>
      <div className="ins-scroll">
        <MultiNote reason={edit.blocked} />
        <ErrorLine status={edit.status} text={null} />
        {component}
        <MultiFieldset edit={edit} ui={tokens.ui} textStyle={textStyle} />
        <MatchSection
          projectId={projectId}
          directionId={directionId}
          selection={selection}
          port={port}
          tokens={props.tokens}
          edit={edit}
        />
        <SelectMatchingSection selection={selection} port={port} />
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

export { SimpleMultiBody };
