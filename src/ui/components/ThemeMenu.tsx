import { useEffect, useRef, useSyncExternalStore, type KeyboardEvent, type RefObject } from 'react';

type ThemePref = 'system' | 'light' | 'dark';

interface ThemeApi {
  get: () => ThemePref;
  set: (pref: ThemePref) => void;
}

const api = (): ThemeApi | undefined => (window as unknown as { studioTheme?: ThemeApi }).studioTheme;

const subscribe = (notify: () => void) => {
  window.addEventListener('studio-theme', notify);
  return () => window.removeEventListener('studio-theme', notify);
};

const OPTIONS: { pref: ThemePref; label: string; path: string }[] = [
  { pref: 'system', label: 'System', path: 'M2.75 3.25h10.5v7.5H2.75zM6 13.25h4M8 10.75v2.5' },
  { pref: 'light', label: 'Light', path: 'M8 5.25a2.75 2.75 0 1 0 0 5.5 2.75 2.75 0 0 0 0-5.5zM8 1.75v1.5M8 12.75v1.5M1.75 8h1.5M12.75 8h1.5M3.6 3.6l1.05 1.05M11.35 11.35l1.05 1.05M3.6 12.4l1.05-1.05M11.35 4.65l1.05-1.05' },
  { pref: 'dark', label: 'Dark', path: 'M13.25 9.75A5.5 5.5 0 1 1 6.25 2.75a4.5 4.5 0 0 0 7 7z' },
];

export default function ThemeMenu({ trigger, onClose }: { trigger: RefObject<HTMLButtonElement | null>; onClose: (refocus: boolean) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const pref = useSyncExternalStore(subscribe, () => api()?.get() ?? 'system');

  useEffect(() => {
    ref.current?.querySelector<HTMLButtonElement>('[aria-checked="true"]')?.focus();
    const onDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!ref.current?.contains(target) && !trigger.current?.contains(target)) onClose(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [onClose, trigger]);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const items = [...(ref.current?.querySelectorAll<HTMLButtonElement>('[role="menuitemradio"]') ?? [])];
    const index = items.indexOf(document.activeElement as HTMLButtonElement);
    if (event.key === 'Escape' || event.key === 'Tab') {
      event.preventDefault();
      event.stopPropagation();
      onClose(event.key === 'Escape');
      return;
    }
    const next = event.key === 'ArrowDown' ? index + 1 : event.key === 'ArrowUp' ? index - 1 : event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : null;
    if (next === null) return;
    event.preventDefault();
    items[(next + items.length) % items.length]?.focus();
  };

  return (
    <div ref={ref} className="theme-menu" role="menu" aria-label="Theme" onKeyDown={onKeyDown}>
      {OPTIONS.map((option) => (
        <button
          key={option.pref}
          type="button"
          role="menuitemradio"
          aria-checked={pref === option.pref}
          onClick={() => {
            api()?.set(option.pref);
            onClose(true);
          }}
        >
          <svg className="icon" width={14} height={14} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d={option.path} />
          </svg>
          <span>{option.label}</span>
        </button>
      ))}
    </div>
  );
}
