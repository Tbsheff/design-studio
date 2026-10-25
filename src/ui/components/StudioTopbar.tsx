import type { ProjectKind } from '../../shared/contracts';
import { BrandMark } from './BrandMark';
import { DesignSystemChip, type DesignSystemActions, type DesignSystemRef } from './DesignSystemChip';
import { Icon } from './Icon';
import { tipWithKey } from '../commands/keys';

interface Props {
  name: string;
  kind: ProjectKind;
  directionName: string | null;
  designSystem: DesignSystemRef;
  designSystemActions: DesignSystemActions;
  connection: string;
  actionError: string | null;
  onDismissError: () => void;
  onExit: () => void;
  onDesign: () => void;
  onSettings: () => void;
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
        <button className="btn ghost small" data-tip={tipWithKey('All projects', 'home')} data-tip-align="start" onClick={props.onExit}>
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
        <DesignSystemChip system={props.designSystem} actions={props.designSystemActions} onOpenDesignMd={props.onDesign} />
        <button className="btn ghost small has-icon" onClick={props.onDesign}>
          <Icon name="doc" />
          DESIGN.md
        </button>
        <button className="icon-btn" aria-label="Settings" data-tip={tipWithKey('Project settings', 'settings')} data-tip-align="end" onClick={props.onSettings}>
          <Icon name="settings" />
        </button>
      </div>
    </header>
  );
}
