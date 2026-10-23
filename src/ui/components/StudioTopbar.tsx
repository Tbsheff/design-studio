import type { ProjectKind } from '../../shared/contracts';
import { DesignSystemChip, type DesignSystemRef } from './DesignSystemChip';
import { Icon } from './Icon';

interface Props {
  name: string;
  kind: ProjectKind;
  directionName: string | null;
  designSystem: DesignSystemRef;
  connection: string;
  actionError: string | null;
  onDismissError: () => void;
  onExit: () => void;
  onDesign: () => void;
  onSettings: () => void;
}

export function BrandMark() {
  return (
    <span className="brand-mark" aria-hidden="true">
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinejoin="round">
        <path d="M3 3h6.5a3.5 3.5 0 0 1 0 7H6.5V13H3z" />
      </svg>
    </span>
  );
}

function ConnectionState({ connection }: { connection: string }) {
  if (connection === 'open') return null;
  return (
    <span className="conn" role="status">
      <span className="spinner" />
      {connection === 'connecting' ? 'Connecting…' : 'Reconnecting…'}
    </span>
  );
}

function ActionError({ message, onDismiss }: { message: string | null; onDismiss: () => void }) {
  if (!message) return null;
  return (
    <span className="alert error inline" role="alert" title={message}>
      <Icon name="alert" size={14} />
      <span className="alert-text">{message}</span>
      <button className="icon-btn small" aria-label="Dismiss" onClick={onDismiss}>
        <Icon name="close" size={14} />
      </button>
    </span>
  );
}

export function StudioTopbar(props: Props) {
  return (
    <header className="topbar">
      <BrandMark />
      <nav className="crumbs" aria-label="Breadcrumb">
        <button className="btn ghost small" onClick={props.onExit}>
          Projects
        </button>
        <span className="crumb-sep" aria-hidden="true">
          /
        </span>
        <span className="topbar-name truncate" title={props.name}>
          {props.name}
        </span>
        <span className="badge">{props.kind === 'html' ? 'HTML' : 'React + Vite'}</span>
        {props.directionName && (
          <span className="topbar-direction">
            <span className="crumb-sep" aria-hidden="true">/</span> {props.directionName}
          </span>
        )}
      </nav>
      <div className="spacer" />
      <div className="topbar-actions">
        <ConnectionState connection={props.connection} />
        <ActionError message={props.actionError} onDismiss={props.onDismissError} />
        <DesignSystemChip system={props.designSystem} onOpenDesignMd={props.onDesign} />
        <button className="btn ghost small has-icon" onClick={props.onDesign}>
          <Icon name="doc" />
          DESIGN.md
        </button>
        <button className="icon-btn" aria-label="Settings" data-tip="Project settings" data-tip-align="end" onClick={props.onSettings}>
          <Icon name="settings" />
        </button>
      </div>
    </header>
  );
}
