import type { ComponentProps } from 'react';
import type { Project, ProjectKind, RunStatus, Version } from '../../shared/contracts';
import { Canvas } from './Canvas';
import { CompareView } from './CompareView';
import { DesignMdModal } from './DesignMdModal';
import { SettingsModal } from './SettingsModal';
import { UnfinishedBanner } from './UnfinishedBanner';

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

export function CenterView(props: CenterProps) {
  const { left, right } = props;
  if (props.compareOpen && left && right) {
    return <CompareView projectId={props.projectId} kind={props.kind} left={left} right={right} versions={props.versions} onClose={props.onCloseCompare} />;
  }
  return <Canvas {...props.canvas} />;
}

const STOPPED: ReadonlySet<RunStatus> = new Set(['canceled', 'failed', 'budget_exceeded']);

export function runStoppedUnsaved(runs: readonly { startedAt: number; status: RunStatus }[], versions: readonly Version[]): boolean {
  const head = versions.reduce((latest, version) => Math.max(latest, version.createdAt), 0);
  return runs.some((run) => run.startedAt > head && STOPPED.has(run.status));
}

export function UnfinishedSlot(props: { visible: boolean; count: number; busy: boolean; runStopped: boolean; onKeep: () => void; onDiscard: () => void }) {
  if (!props.visible) return null;
  return <UnfinishedBanner count={props.count} busy={props.busy} runStopped={props.runStopped} onKeep={props.onKeep} onDiscard={props.onDiscard} />;
}

interface ModalsProps {
  project: Project;
  designOpen: boolean;
  settingsOpen: boolean;
  onSaved: (project: Project) => void;
  onCloseDesign: () => void;
  onCloseSettings: () => void;
}

export function StudioModals(props: ModalsProps) {
  return (
    <>
      {props.designOpen && <DesignMdModal projectId={props.project.id} onClose={props.onCloseDesign} />}
      {props.settingsOpen && <SettingsModal project={props.project} onSaved={props.onSaved} onClose={props.onCloseSettings} />}
    </>
  );
}

export function StudioBoot({ message, onExit }: { message: string | null; onExit: () => void }) {
  if (message === null) return <div className="boot muted">Loading project…</div>;
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
}

export function StudioToast({ text }: { text: string | null }) {
  return (
    <div className="ds-toast-slot" role="status" aria-live="polite">
      {text && <div className="ds-toast">{text}</div>}
    </div>
  );
}
