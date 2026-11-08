import type {
  Project,
  ProjectKind,
  RunStatus,
  Version,
} from "@design-studio/contracts";
import type { ComponentProps } from "react";

import { Canvas } from "../../features/canvas/canvas";
import { UnfinishedBanner } from "../../features/chat/unfinished-banner";
import { DesignMdModal } from "../../features/design-system/design-md-modal";
import { CompareView } from "../../features/versions-layers-tokens/compare-view";
import { SettingsModal } from "./settings-modal";

interface CenterProps {
  projectId: string;
  kind: ProjectKind;
  compareOpen: boolean;
  left: Version | undefined;
  right: Version | undefined;
  versions?: Version[];
  onCloseCompare: () => void;
  canvas: ComponentProps<typeof Canvas>;
}

const CenterView = (props: CenterProps) => {
  const { left, right } = props;

  if (props.compareOpen && left && right) {
    return (
      <CompareView
        projectId={props.projectId}
        kind={props.kind}
        left={left}
        right={right}
        versions={props.versions}
        onClose={props.onCloseCompare}
      />
    );
  }

  return <Canvas {...props.canvas} />;
};

const STOPPED: ReadonlySet<RunStatus> = new Set([
  "canceled",
  "failed",
  "budget_exceeded",
]);

const runStoppedUnsaved = (
  runs: readonly { startedAt: number; status: RunStatus }[],
  versions: readonly Version[]
): boolean => {
  const head = versions.reduce(
    (latest, version) => Math.max(latest, version.createdAt),
    0
  );

  return runs.some((run) => run.startedAt > head && STOPPED.has(run.status));
};

const UnfinishedSlot = (props: {
  visible: boolean;
  count: number;
  busy: boolean;
  runStopped: boolean;
  onKeep: () => void;
  onDiscard: () => void;
}) => {
  if (!props.visible) {
    return null;
  }

  return (
    <UnfinishedBanner
      count={props.count}
      busy={props.busy}
      runStopped={props.runStopped}
      onKeep={props.onKeep}
      onDiscard={props.onDiscard}
    />
  );
};

interface ModalsProps {
  project: Project;
  designOpen: boolean;
  settingsOpen: boolean;
  onSaved: (project: Project) => void;
  onCloseDesign: () => void;
  onCloseSettings: () => void;
}

const StudioModals = (props: ModalsProps) => (
  <>
    {props.designOpen && (
      <DesignMdModal
        projectId={props.project.id}
        onClose={props.onCloseDesign}
      />
    )}
    {props.settingsOpen && (
      <SettingsModal
        project={props.project}
        onSaved={props.onSaved}
        onClose={props.onCloseSettings}
      />
    )}
  </>
);

const StudioBoot = ({
  message,
  onExit,
}: {
  message: string | null;
  onExit: () => void;
}) => {
  if (message === null) {
    return <div className="boot muted">Loading project…</div>;
  }

  return (
    <div className="boot">
      <div className="boot-card">
        <h1>Cannot open project</h1>
        <p className="muted">{message}</p>
        <button className="btn" onClick={onExit}>
          Back to projects
        </button>
      </div>
    </div>
  );
};

const StudioToast = ({ text }: { text: string | null }) => (
  <div className="ds-toast-slot" role="status" aria-live="polite">
    {text && <div className="ds-toast">{text}</div>}
  </div>
);

export {
  CenterView,
  runStoppedUnsaved,
  UnfinishedSlot,
  StudioModals,
  StudioBoot,
  StudioToast,
};
