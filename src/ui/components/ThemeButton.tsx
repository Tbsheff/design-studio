import { lazy, Suspense, useRef, useState } from 'react';
import { Icon } from './Icon';

const ThemeMenu = lazy(() => import('./ThemeMenu'));

export function ThemeButton() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLButtonElement>(null);
  return (
    <span className="theme-anchor">
      <button ref={ref} type="button" className="icon-btn" aria-label="Theme" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(!open)}>
        <Icon name="moon" />
      </button>
      {open && (
        <Suspense fallback={null}>
          <ThemeMenu
            trigger={ref}
            onClose={(refocus) => {
              setOpen(false);
              if (refocus) ref.current?.focus();
            }}
          />
        </Suspense>
      )}
    </span>
  );
}
