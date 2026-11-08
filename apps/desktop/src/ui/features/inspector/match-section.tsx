import type { SelectionContext } from "@design-studio/contracts";
import { Suspense, lazy } from "react";
import type { MutableRefObject, ReactElement } from "react";

import type { PreviewPort } from "../../platform/bridge.js";
import type { DesignTokens, DirectEdit } from "./deps.js";

const InspectorMatch = lazy(async () => {
  await import("../../styles/inspector-match.css");
  const loaded = await import("./inspector-match.js");

  return { default: loaded.InspectorMatch };
});

const MatchSection = (props: {
  readonly projectId: string;
  readonly directionId: string | null;
  readonly selection: SelectionContext[];
  readonly port: MutableRefObject<PreviewPort | null>;
  readonly tokens: DesignTokens | null;
  readonly edit: DirectEdit;
}): ReactElement | null => {
  const { directionId, edit } = props;

  if (!directionId || props.selection.length === 0) {
    return null;
  }

  return (
    <Suspense fallback={null}>
      <InspectorMatch
        projectId={props.projectId}
        directionId={directionId}
        selection={props.selection}
        port={props.port}
        tokens={props.tokens}
        drain={edit.drain}
      />
    </Suspense>
  );
};

export { MatchSection };
