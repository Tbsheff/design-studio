import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import type { Project } from '../../shared/contracts';
import { Icon } from './Icon';
import type { MenuAt } from './ProjectGrid';

export function CardMenu({ project, at, onClose, onPick }: { project: Project; at: Exclude<MenuAt, null>; onClose: (refocus: boolean) => void; onPick: (action: 'open' | 'rename' | 'duplicate' | 'delete') => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus();
    const onDown = (event: globalThis.MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) onClose(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [onClose]);
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const items = [...(ref.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') ?? [])];
    const index = items.indexOf(document.activeElement as HTMLButtonElement);
    if (event.key === 'Escape' || event.key === 'Tab') {
      event.preventDefault();
      event.stopPropagation();
      onClose(true);
      return;
    }
    const next = event.key === 'ArrowDown' ? index + 1 : event.key === 'ArrowUp' ? index - 1 : event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : null;
    if (next === null) return;
    event.preventDefault();
    items[(next + items.length) % items.length]?.focus();
  };
  const style = typeof at === 'string' ? undefined : { left: at.x, top: at.y, right: 'auto' };
  const mode = typeof at === 'string' ? (at === 'keys' ? ' instant' : '') : ' at-pointer';
  const item = (action: 'open' | 'rename' | 'duplicate' | 'delete', label: string, icon: Parameters<typeof Icon>[0]['name'], keys: string, danger = false) => (
    <button type="button" role="menuitem" className={danger ? 'danger' : undefined} onClick={() => onPick(action)}>
      <Icon name={icon} size={14} />
      <span>{label}</span>
      <kbd aria-hidden="true">{keys}</kbd>
    </button>
  );
  return (
    <div ref={ref} className={`project-menu${mode}`} role="menu" aria-label={`Actions for ${project.name}`} style={style} onKeyDown={onKeyDown} onContextMenu={(event) => event.preventDefault()}>
      {item('open', 'Open', 'chevronRight', '↩')}
      {item('rename', 'Rename', 'pencil', 'F2')}
      {item('duplicate', 'Duplicate', 'copy', '⌘D')}
      <div className="project-menu-sep" role="separator" />
      {item('delete', 'Delete', 'trash', '⌘⌫', true)}
    </div>
  );
}

export function RenameField({ project, onDone }: { project: Project; onDone: (name: string | null) => void }) {
  const [value, setValue] = useState(project.name);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    onDone(value.trim() && value.trim() !== project.name ? value.trim() : null);
  };
  return (
    <form className="project-rename" onSubmit={submit}>
      <input
        ref={ref}
        aria-label="Project name"
        value={value}
        maxLength={120}
        onChange={(event) => setValue(event.target.value)}
        onBlur={() => onDone(value.trim() && value.trim() !== project.name ? value.trim() : null)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault();
            event.stopPropagation();
            onDone(null);
          }
        }}
      />
    </form>
  );
}
