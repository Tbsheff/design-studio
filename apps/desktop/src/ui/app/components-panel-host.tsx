import { Suspense, useCallback } from "react";
import type { ComponentProps, ReactElement } from "react";

import {
  BlockPanel,
  BlockTabBar,
  useBlockTab,
} from "../features/block/index.js";
import {
  ChartPanel,
  ChartTabBar,
  useChartTab,
} from "../features/chart/index.js";
import { ComponentsPanel as FeatureComponentsPanel } from "../features/design-system/components-panel.js";
import { GalleryHost } from "../features/gallery/gallery-host.js";
import {
  PatternPanel,
  PatternTabs,
  useInsertTab,
} from "../features/pattern/index.js";

type PanelProps = Omit<
  ComponentProps<typeof FeatureComponentsPanel>,
  "renderGallery"
>;

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

  const { select: handleSelect, tab } = useInsertTab();
  const chartTab = useChartTab();
  const blockTab = useBlockTab();
  const closeChart = chartTab.close;
  const closeBlock = blockTab.close;
  const toggleChart = chartTab.toggle;
  const toggleBlock = blockTab.toggle;

  const handleChartToggle = useCallback((): void => {
    closeBlock();
    toggleChart();
  }, [closeBlock, toggleChart]);

  const handleBlockToggle = useCallback((): void => {
    closeChart();
    toggleBlock();
  }, [closeChart, toggleBlock]);

  const extra = toExtraPanel(
    {
      isBlockOpen: blockTab.isOpen,
      isChartOpen: chartTab.isOpen,
      isPatternsOpen: tab === "patterns",
    },
    { directionId, kind, projectId, selection }
  );

  return (
    <>
      <Suspense fallback={null}>
        <PatternTabs onSelect={handleSelect} tab={tab} />
        <ChartTabBar isOpen={chartTab.isOpen} onToggle={handleChartToggle} />
        <BlockTabBar isOpen={blockTab.isOpen} onToggle={handleBlockToggle} />
      </Suspense>
      {extra ?? (
        <FeatureComponentsPanel
          projectId={projectId}
          directionId={directionId}
          list={list}
          active={active}
          onMention={onMention}
          kind={kind}
          selection={selection}
          renderGallery={renderGallery}
        />
      )}
    </>
  );
};

export { ComponentsPanel };
