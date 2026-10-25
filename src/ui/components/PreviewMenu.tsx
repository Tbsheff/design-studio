import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';
import type { KeyId } from '../../shared/keymap';
import { KeyHint } from '../commands/keys';
import { Icon, type IconName } from './Icon';

export interface PreviewMenuItem {
  id: string;
  label: string;
  icon: IconName;
  keyId?: KeyId;
  run: () => void | Promise<unknown>;
  hidden?: boolean;
}

const EDGE = 8;

function step(key: string, index: number, count: number): number | null {
  if (key === 'ArrowDown') return (index + 1) % count;
  if (key === 'ArrowUp') return (index - 1 + count) % count;
  if (key === 'Home') return 0;
  if (key === 'End') return count - 1;
  return null;
}

export function PreviewMenu({ at, label, items, onClose }: { at: { x: number; y: number }; label: string; items: PreviewMenuItem[]; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState(at);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    setPos({ x: Math.max(EDGE, Math.min(at.x, window.innerWidth - width - EDGE)), y: Math.max(EDGE, Math.min(at.y, window.innerHeight - height - EDGE)) });
    el.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus({ preventScroll: true });
  }, [at]);

  useEffect(() => {
    const onDown = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) onClose();
    };
    window.addEventListener('mousedown', onDown, true);
    window.addEventListener('blur', onClose);
    window.addEventListener('resize', onClose);
    return () => {
      window.removeEventListener('mousedown', onDown, true);
      window.removeEventListener('blur', onClose);
      window.removeEventListener('resize', onClose);
    };
  }, [onClose]);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape' || event.key === 'Tab') {
      event.preventDefault();
      event.stopPropagation();
      onClose();
      return;
    }
    const buttons = [...(ref.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') ?? [])];
    const next = step(event.key, buttons.indexOf(document.activeElement as HTMLButtonElement), buttons.length);
    if (next === null) return;
    event.preventDefault();
    buttons[next]?.focus();
  };

  return (
    <div ref={ref} className="project-menu at-pointer preview-menu" role="menu" aria-label={label} style={{ position: 'fixed', left: pos.x, top: pos.y, right: 'auto' }} onKeyDown={onKeyDown} onContextMenu={(event) => event.preventDefault()}>
      {items
        .filter((item) => !item.hidden)
        .map((item) => (
          <button
            key={item.id}
            type="button"
            role="menuitem"
            onClick={() => {
              onClose();
              void item.run();
            }}
          >
            <Icon name={item.icon} size={14} />
            <span>{item.label}</span>
            {item.keyId ? <KeyHint id={item.keyId} /> : <span />}
          </button>
        ))}
    </div>
  );
}
