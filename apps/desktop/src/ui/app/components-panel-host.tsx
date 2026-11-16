import { Suspense, useCallback } from "react";
import type { ComponentProps, ReactElement } from "react";

import { BlockPanel } from "../features/block/index.js";
import { ChartPanel } from "../features/chart/index.js";
import { ComponentsPanel as FeatureComponentsPanel } from "../features/design-system/components-panel.js";
import { GalleryHost } from "../features/gallery/gallery-host.js";
import { CodeEditDialog } from "../features/inspector/index.js";
import { PatternPanel } from "../features/pattern/index.js";
import { InsertTabBar } from "./insert-tab-bar.js";
import { useInsertPanel } from "./use-insert-panel.js";

type PanelProps = Omit<
  ComponentProps<typeof FeatureComponentsPanel>,
  "renderCode" | "renderGallery"
>;

type CodeSlot = Parameters<
  NonNullable<ComponentProps<typeof FeatureComponentsPanel>["renderCode"]>
>[0];

type GallerySlot = Parameters<
  NonNullable<ComponentProps<typeof FeatureComponentsPanel>["renderGallery"]>
>[0];

interface ExtraPanelState {
  readonly isBlockOpen: boolean;
  readonly isChartOpen: boolean;
  readonly isPatternsOpen: boolean;
}

interface ExtraPanelProps {
  readonly directionId: string | null;
  readonly kind: PanelProps["kind"];
  readonly projectId: string;
  readonly selection: PanelProps["selection"];
}

const toExtraPanel = (
  open: ExtraPanelState,
  props: ExtraPanelProps
): ReactElement | null => {
  if (open.isBlockOpen) {
    return (
      <Suspense fallback={null}>
        <BlockPanel
          directionId={props.directionId}
          kind={props.kind}
          projectId={props.projectId}
          selection={props.selection}
        />
      </Suspense>
    );
  }

  if (open.isChartOpen) {
    return (
      <Suspense fallback={null}>
        <ChartPanel
          directionId={props.directionId}
          kind={props.kind}
          projectId={props.projectId}
          selection={props.selection}
        />
      </Suspense>
    );
  }

  if (open.isPatternsOpen) {
    return (
      <Suspense fallback={null}>
        <PatternPanel
          directionId={props.directionId}
          kind={props.kind}
          projectId={props.projectId}
          selection={props.selection}
        />
      </Suspense>
    );
  }

  return null;
};

const ComponentsPanel = ({
  projectId,
  directionId,
  list,
  active,
  onMention,
  kind,
  selection,
}: PanelProps): ReactElement => {
  const renderGallery = useCallback(
    ({ component, onClose }: GallerySlot) => (
      <GalleryHost
        component={component}
        directionId={directionId}
        projectId={projectId}
        selection={selection}
        onClose={onClose}
      />
    ),
    [directionId, projectId, selection]
  );

  const renderCode = useCallback(({ onClose, target }: CodeSlot) => {
    if (target === null) {
      return null;
    }

    return (
      <Suspense fallback={null}>
        <CodeEditDialog
          projectId={target.projectId}
          directionId={target.directionId}
          file={target.file}
          line={target.line}
          onClose={onClose}
        />
      </Suspense>
    );
  }, []);

  const panel = useInsertPanel();
  const handlePick = panel.onPick;

  const extra = toExtraPanel(panel, {
    directionId,
    kind,
    projectId,
    selection,
  });

  return (
    <>
      <InsertTabBar active={panel.active} onPick={handlePick} />
      {extra ?? (
        <FeatureComponentsPanel
          projectId={projectId}
          directionId={directionId}
          list={list}
          active={active}
          onMention={onMention}
          kind={kind}
          selection={selection}
          renderCode={renderCode}
          renderGallery={renderGallery}
        />
      )}
    </>
  );
};

export { ComponentsPanel };
