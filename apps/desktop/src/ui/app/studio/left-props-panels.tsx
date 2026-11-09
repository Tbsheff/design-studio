import type { SelectionContext, Version } from "@design-studio/contracts";
import type { ComponentProps } from "react";

import { api } from "../../api";
import { componentMention } from "../../features/chat/use-mentions";
import { runCommand } from "../../features/commands";
import type { CommentsPanel } from "../../features/comments/index.js";
import { applyCommit } from "../../features/inspector/index.js";
import type { Inspector } from "../../features/inspector/index.js";
import type { VersionsPanel } from "../../features/versions-layers-tokens/index.js";
import { renameVersion } from "../../features/versions-layers-tokens/versions-api";
import { focusComposer } from "../../platform/focus";
import type { ColumnTab } from "../../platform/panel-tab";
import type { DraftStore } from "../../platform/storage";
import type { ComponentsPanel } from "../components-panel-host";
import { appDirOf } from "./project-model";
import type { StudioCtx } from "./studio-context";

interface LeftProps {
  readonly comments: ComponentProps<typeof CommentsPanel>;
  readonly components: ComponentProps<typeof ComponentsPanel>;
  readonly inspector: ComponentProps<typeof Inspector>;
  readonly versions: ComponentProps<typeof VersionsPanel>;
}

const COMPARE_LIMIT = 2;

const isColumnShown = (ctx: StudioCtx, tab: ColumnTab): boolean =>
  ctx.ui.editorColumn.isOpen && ctx.ui.editorColumn.tab === tab;

const askAgent = async (
  prompt: string,
  draft: DraftStore,
  showChat: () => Promise<boolean>
): Promise<void> => {
  if (!(await showChat())) {
    return;
  }

  draft.set(prompt);
  globalThis.requestAnimationFrame((): void => focusComposer(prompt));
};

const selectMode = async (): Promise<void> => {
  await runCommand("tool.select");
};

const inspectorSession = (ctx: StudioCtx): Partial<LeftProps["inspector"]> => {
  const { ui, core } = ctx;

  return {
    onSessionEnd: (action: string): void => {
      if (action === "discard") {
        ui.setSelection([]);
      }

      core.data.refreshVersions();
    },
    onStale: (message: string): void => {
      ui.setStaleNotice(message);
      ui.setSelection([]);
    },
    session: ui.editSession,
  };
};

const inspectorHistory = (ctx: StudioCtx): Partial<LeftProps["inspector"]> => {
  const { historyChain, editHistory } = ctx.core;

  return {
    onRedo: (): void => {
      if (editHistory.redo.enabled) {
        editHistory.redo.onRedo();
      }
    },
    onUndo: (): void => {
      if (historyChain.canUndo) {
        historyChain.onUndo();
      }
    },
  };
};

const inspectorProps = (ctx: StudioCtx): LeftProps["inspector"] => {
  const { project, ui, panes, core, run } = ctx;
  const { port } = ui;

  return {
    appDir: appDirOf(project),
    control: ui.editControl,
    directionId: core.directionId,
    isEditable: panes.editable,
    isSelectMode: panes.isInspectorOpen,
    notice: ui.staleNotice,
    onAskAgent: (prompt: string): Promise<void> =>
      askAgent(prompt, ui.draft, (): Promise<boolean> =>
        panes.showPane("chat")
      ),
    onCommitted: (commit: Parameters<typeof applyCommit>[1]): void => {
      ui.setSelection((prev): SelectionContext[] => applyCommit(prev, commit));
      port.current?.refreshRects();
    },
    onExit: (): void => ui.setSelection([]),
    onSelectMode: selectMode,
    onTab: ui.setInspectorTab,
    port: ui.port,
    projectId: ctx.projectId,
    selection: ui.selection,
    tab: ui.inspectorTab,
    tokens: core.studioTokens.draft.effective,
    tweaks: {
      draft: core.tweaks,
      isRunning: core.activeRun !== null,
      onSuggest: run.suggestTweaks,
    },
    ...inspectorSession(ctx),
    ...inspectorHistory(ctx),
  } as LeftProps["inspector"];
};

const commentsProps = (ctx: StudioCtx): LeftProps["comments"] => {
  const { ui, core } = ctx;

  return {
    control: core.comments,
    onOpenRun: ui.setDetailsRunId,
    onOpenVersion: (versionId: string): void => {
      const version = core.versions.find(
        (entry): boolean => entry.id === versionId
      );

      if (!version) {
        return;
      }

      ui.setCompareOpen(false);
      ui.setSource({
        kind: "version",
        title: version.name ?? version.title,
        versionId,
      });
    },
    running: core.activeRun !== null,
    selection: ui.selection,
  };
};

const componentsProps = (
  ctx: StudioCtx
): NonNullable<LeftProps["components"]> => {
  const { project, ui, panes, core } = ctx;

  return {
    active: isColumnShown(ctx, "components"),
    directionId: core.directionId,
    kind: project.kind,
    list: core.componentList,
    onMention: async (
      component: Parameters<typeof componentMention>[0]
    ): Promise<void> => {
      const shown = panes.showPane("chat");

      ui.setMentionRequest((prev) => ({
        mention: componentMention(component),
        seq: (prev?.seq ?? 0) + 1,
      }));
      await shown;
    },
    projectId: ctx.projectId,
    selection: ui.selection,
  };
};

const toggleCompare = (prev: Version[], version: Version): Version[] => {
  if (prev.some((entry): boolean => entry.id === version.id)) {
    return prev.filter((entry): boolean => entry.id !== version.id);
  }

  return [...prev, version].slice(-COMPARE_LIMIT);
};

const openVersionIdOf = (ctx: StudioCtx): string | null => {
  const { source } = ctx.ui;

  if (source.kind === "version") {
    return source.versionId;
  }

  return null;
};

const renameAndRefresh = async (
  projectId: string,
  versionId: string,
  name: string | null,
  refresh: () => void
): Promise<void> => {
  try {
    await renameVersion(projectId, versionId, name);
  } finally {
    refresh();
  }
};

const versionsActions = (ctx: StudioCtx): Partial<LeftProps["versions"]> => {
  const { projectId, ui, core } = ctx;
  const { data } = core;

  return {
    onRename: (version: Version, name: string | null): Promise<void> =>
      ui.act((): Promise<void> =>
        renameAndRefresh(projectId, version.id, name, data.refreshVersions)
      ),
    onRestore: (version: Version): Promise<void> =>
      core.withDid((id): Promise<void> =>
        core.refreshAfter((): Promise<Version> =>
          api.restore(projectId, id, version.id)
        )
      ),
    onToggleCompare: (version: Version): void =>
      ui.setCompare((prev): Version[] => toggleCompare(prev, version)),
  };
};

const versionsProps = (ctx: StudioCtx): LeftProps["versions"] => {
  const { projectId, ui, core, run } = ctx;
  const { data, guard } = core;

  return {
    active: isColumnShown(ctx, "versions"),
    busy: ui.busy,
    compare: ui.compare.map((entry): string => entry.id),
    directionId: core.directionId,
    onCompare: (): void => ui.setCompareOpen(true),
    onExport: (version: Version): void =>
      core.exporter.open({ versionId: version.id }),
    onNewDirection: guard(
      async (fromVersionId: string, name: string): Promise<void> => {
        const created = await api.createDirection(
          projectId,
          fromVersionId,
          name
        );

        data.setDirectionId(created.id);
      }
    ),
    onOpen: (version: Version, label: string): void => {
      ui.setCompareOpen(false);
      ui.setSource({ kind: "version", title: label, versionId: version.id });
    },
    onPolish: run.polish,
    onReview: core.reviewVersion,
    onSelectDirection: guard(data.setDirectionId),
    onUndo: core.undo,
    openVersionId: openVersionIdOf(ctx),
    project: ctx.project,
    running: core.activeRun !== null,
    versions: core.versions,
    ...versionsActions(ctx),
  } as LeftProps["versions"];
};

export { commentsProps, componentsProps, inspectorProps, versionsProps };
