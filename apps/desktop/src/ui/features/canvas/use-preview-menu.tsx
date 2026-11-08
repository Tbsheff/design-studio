import type {
  ProjectKind,
  SelectionContext,
  SelectMove,
  ZoomKey,
} from "@design-studio/contracts";
import { TRY_VARIANTS_COMMAND } from "@design-studio/contracts/element-variants";
import { lazy, Suspense, useCallback, useRef, useState } from "react";
import type { MutableRefObject, ReactElement } from "react";

import {
  commandBlocker,
  IconSlot,
  ImageGenerateSlot,
  ImageSearchMount,
  runCommand,
  useIconHost,
  useImageSearchHost,
} from "../../canvas-preview-slots.js";
import type { GenerateTabProps } from "../../canvas-preview-slots.js";
import type { PreviewPort } from "../../platform/bridge.js";
import { uiStore } from "../../platform/storage.js";
import { formatCopyCss } from "../inspector/authored-css.js";
import { pasteJsx } from "../inspector/paste-jsx.js";
import {
  selectionTargets,
  structureMenuItems,
} from "../inspector/structure-edits.js";
import { requestAuthoredCss } from "../inspector/use-authored-css.js";
import { PatternSlot, usePatternHost } from "../pattern/index.js";
import { PropSlot, usePropHost } from "../prop/index.js";
import type { LayerEdits } from "../versions-layers-tokens/use-layer-edits.js";
import { PreviewMenu } from "./preview-menu.js";
import type { PreviewMenuItem } from "./preview-menu.js";
import { toValueOr } from "./settle-model.js";

const renderGenerateTab = (props: GenerateTabProps): ReactElement => (
  <ImageGenerateSlot
    directionId={props.directionId}
    projectId={props.projectId}
    target={props.target}
    onDone={props.onDone}
  />
);

const CreateComponentDialog = lazy(async () => {
  const loaded = await import("../design-system/create-component-dialog.js");

  return { default: loaded.CreateComponentDialog };
});

interface Options {
  selection: SelectionContext[];
  port: MutableRefObject<PreviewPort | null> | undefined;
  selectRelative: (selector: string, move: SelectMove) => void;
  zoom: (key: ZoomKey) => void;
  edits: Pick<
    LayerEdits,
    "enabled" | "structureKey" | "canPaste" | "busy" | "notify"
  >;
  ids: { projectId: string; directionId: string | null; kind: ProjectKind };
}

const copyCss = async (
  port: PreviewPort | null,
  selector: string
): Promise<void> => {
  const css = await requestAuthoredCss(port, selector);

  if (css) {
    await toValueOr(navigator.clipboard.writeText(formatCopyCss(css)), null);
  }
};

const structureItems = (options: Options): PreviewMenuItem[] => {
  const { edits } = options;

  if (!edits.enabled) {
    return [];
  }

  const state = {
    canPaste: edits.canPaste,
    count: options.selection.length,
    hasSource: selectionTargets(options.selection) !== null,
    isBusy: edits.busy,
  };

  return structureMenuItems(state, edits.structureKey, true);
};

const disabledBy = (reason: string | null): { disabled?: string } =>
  reason ? { disabled: reason } : {};

const pasteItem = (
  optionsValue: Options,
  target: SelectionContext
): PreviewMenuItem[] => {
  if (!optionsValue.edits.enabled || !optionsValue.ids.directionId) {
    return [];
  }

  const blocked =
    !target.source && !target.owners?.length
      ? "This element has no source location"
      : optionsValue.edits.busy
        ? "Wait for the last edit to finish"
        : null;

  const ids = {
    directionId: optionsValue.ids.directionId,
    projectId: optionsValue.ids.projectId,
  };

  return [
    {
      divider: true,
      icon: "code",
      id: "paste-jsx",
      label: "Paste JSX or Figma",
      run: () => pasteJsx(ids, target, optionsValue.edits.notify),
      ...disabledBy(blocked),
    },
  ];
};

const createBlocker = (options4: Options): string | null => {
  if (options4.ids.kind !== "react") {
    return "Components need a React project. This is a plain HTML page";
  }

  if (options4.selection.some((item) => !item.source && !item.owners?.length)) {
    return "An element has no source location";
  }

  return options4.edits.busy ? "Wait for the last edit to finish" : null;
};

const createItem = (options3: Options, open: () => void): PreviewMenuItem[] => {
  if (!options3.edits.enabled || !options3.ids.directionId) {
    return [];
  }

  const blocked = createBlocker(options3);

  const label =
    options3.selection.length > 1
      ? `Create component from ${options3.selection.length}…`
      : "Create component…";

  return [
    {
      icon: "component",
      id: "create-component",
      label,
      run: open,
      ...disabledBy(blocked),
    },
  ];
};

const menuItems = (
  options5: Options,
  target: SelectionContext,
  openCreate: () => void,
  iconItems: (target: SelectionContext) => PreviewMenuItem[]
): PreviewMenuItem[] => [
  {
    icon: "chat",
    id: "ask",
    label: "Ask the agent about this",
    run: () =>
      void (
        runCommand("selection.ask-inline") || runCommand("panel.focus-composer")
      ),
  },
  {
    icon: "compare",
    id: "variants",
    label: "Try variants…",
    run: () => void runCommand(TRY_VARIANTS_COMMAND),
    ...disabledBy(commandBlocker(TRY_VARIANTS_COMMAND)),
  },
  {
    icon: "pointer",
    id: "parent",
    keyId: "select-parent",
    label: "Select parent",
    run: () => options5.selectRelative(target.selector, "parent"),
  },
  {
    icon: "pointer",
    id: "child",
    keyId: "select-child",
    label: "Select child",
    run: () => options5.selectRelative(target.selector, "child"),
  },
  {
    icon: "copy",
    id: "copy-css",
    label: "Copy CSS",
    run: () => copyCss(options5.port?.current ?? null, target.selector),
  },
  {
    icon: "search",
    id: "zoom",
    keyId: "zoom-selection",
    label: "Zoom to selection",
    run: () => options5.zoom("selection"),
  },
  {
    icon: "layers",
    id: "layers",
    keyId: "layers",
    label: "Show in layers",
    run: () => uiStore.set({ layersOpen: true }),
  },
  ...structureItems(options5),
  ...pasteItem(options5, target),
  ...iconItems(target),
  ...createItem(options5, openCreate),
];

const usePreviewMenu = (options6: Options) => {
  const [at, setAt] = useState<{ x: number; y: number } | null>(null);
  const latest = useRef(options6);
  latest.current = options6;

  const onContextMenu = useCallback(
    (point: { x: number; y: number }) => setAt(point),
    []
  );

  const close = useCallback(() => setAt(null), []);
  const [creating, setCreating] = useState<SelectionContext[] | null>(null);
  const target = options6.selection.at(-1);
  const openCreate = (): void => setCreating(latest.current.selection);
  const { directionId } = options6.ids;

  const hostOptions = {
    busy: options6.edits.busy,
    directionId,
    enabled: options6.edits.enabled,
    notify: options6.edits.notify,
    projectId: options6.ids.projectId,
    selection: options6.selection,
  };

  const icons = useIconHost(hostOptions);
  const photos = useImageSearchHost(hostOptions);

  const props = usePropHost({
    busy: options6.edits.busy,
    directionId,
    enabled: options6.edits.enabled,
    isReact: options6.ids.kind === "react",
    notify: options6.edits.notify,
    projectId: options6.ids.projectId,
  });

  const patterns = usePatternHost({
    busy: options6.edits.busy,
    directionId,
    enabled: options6.edits.enabled,
    isReact: options6.ids.kind === "react",
    notify: options6.edits.notify,
    projectId: options6.ids.projectId,
  });

  const dialog =
    creating && directionId ? (
      <Suspense fallback={null}>
        <CreateComponentDialog
          ids={{ directionId, projectId: options6.ids.projectId }}
          selection={creating}
          onDone={options6.edits.notify}
          onClose={() => setCreating(null)}
        />
      </Suspense>
    ) : null;

  const items =
    at && target
      ? menuItems(latest.current, target, openCreate, (item) => [
          ...icons.items(item),
          ...photos.items(item),
          ...props.items(item),
          ...patterns.items(item),
        ])
      : [];

  const menu = (
    <>
      {at && target ? (
        <PreviewMenu
          at={at}
          label={`Actions for ${target.tag}`}
          items={items}
          onClose={close}
        />
      ) : null}
      {dialog}
      {icons.opened && directionId ? (
        <IconSlot
          projectId={options6.ids.projectId}
          directionId={directionId}
          mode={icons.opened.mode}
          target={icons.opened.target}
          onClose={icons.close}
          onDone={options6.edits.notify}
        />
      ) : null}
      {props.opened ? (
        <Suspense fallback={null}>
          <PropSlot
            isDialog
            layer={props.opened.layer}
            target={props.opened.target}
            onClose={props.close}
            onDone={options6.edits.notify}
          />
        </Suspense>
      ) : null}
      {patterns.opened && directionId ? (
        <Suspense fallback={null}>
          <PatternSlot
            directionId={directionId}
            projectId={options6.ids.projectId}
            target={patterns.opened}
            onClose={patterns.close}
            onDone={options6.edits.notify}
          />
        </Suspense>
      ) : null}
      <ImageSearchMount
        directionId={directionId}
        host={photos}
        projectId={options6.ids.projectId}
        renderGenerate={renderGenerateTab}
        onDone={options6.edits.notify}
      />
    </>
  );

  return { menu, onContextMenu };
};

export { usePreviewMenu };
