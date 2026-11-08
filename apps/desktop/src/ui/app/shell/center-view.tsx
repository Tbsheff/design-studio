import type { ProjectKind, Version } from "@design-studio/contracts";
import { Suspense, createElement } from "react";
import type { ComponentProps, ReactElement } from "react";

import { Canvas } from "../../features/canvas/index.js";
import { CompareView } from "../../features/versions-layers-tokens/index.js";

interface CenterViewProps {
  projectId: string;
  kind: ProjectKind;
  compareOpen: boolean;
  left: Version | undefined;
  right: Version | undefined;
  versions?: Version[];
  onCloseCompare: () => void;
  canvas: ComponentProps<typeof Canvas>;
}

const CenterView = (props: CenterViewProps): ReactElement => {
  const { left, right } = props;

  if (props.compareOpen && left && right) {
    return (
      <Suspense fallback={null}>
        <CompareView
          projectId={props.projectId}
          kind={props.kind}
          left={left}
          right={right}
          versions={props.versions}
          onClose={props.onCloseCompare}
        />
      </Suspense>
    );
  }

  return createElement(Canvas, props.canvas);
};

export { CenterView };

export type { CenterViewProps };
