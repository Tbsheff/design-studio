import { useEffect, useState, type ReactNode } from 'react';
import type { ProjectKind, RunLevel, Starter } from '../../shared/contracts';
import { api } from '../api';

export interface HomeTemplate {
  id: string;
  label: string;
  prompt: string;
  starterId?: string;
  kind?: ProjectKind;
  level?: RunLevel;
}

const S = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;
const soft = { fill: 'currentColor', fillOpacity: 0.14 } as const;
const mark = { fill: 'currentColor', fillOpacity: 0.55, stroke: 'none' } as const;

function Art({ children }: { children: ReactNode }) {
  return (
    <svg width="56" height="48" viewBox="0 0 56 48" aria-hidden="true" {...S}>
      {children}
    </svg>
  );
}

const ART: Record<string, ReactNode> = {
  blank: (
    <Art>
      <path d="M16 4h17l8 8v32H16z" {...soft} />
      <path d="M33 4v8h8" />
    </Art>
  ),
  mobile: (
    <Art>
      <rect x="19" y="3" width="18" height="42" rx="3.5" {...soft} />
      <rect x="23" y="10" width="10" height="8" rx="1.5" {...mark} />
      <path d="M23 23h10M23 27h7M23 31h10" />
      <rect x="23" y="36" width="10" height="4" rx="2" {...mark} />
    </Art>
  ),
  slides: (
    <Art>
      <rect x="6" y="10" width="30" height="22" rx="2" />
      <rect x="13" y="15" width="34" height="24" rx="2" {...soft} />
      <path d="M18 21h12M18 25h8" />
      <rect x="34" y="20" width="9" height="12" rx="1" {...mark} />
    </Art>
  ),
  document: (
    <Art>
      <path d="M15 4h18l8 8v32H15z" {...soft} />
      <path d="M33 4v8h8M20 14h9M20 20h16M20 25h16M20 30h16M20 35h10" />
      <path d="M20 40h6" strokeOpacity={0.55} strokeWidth={2.5} />
    </Art>
  ),
  wireframe: (
    <Art>
      <rect x="5" y="7" width="46" height="34" rx="3" {...soft} />
      <path d="M10 13h10M10 19h36" />
      <path d="M11 23l34 12M45 23L11 35" strokeDasharray="2.5 2.5" strokeOpacity={0.7} />
      <rect x="11" y="23" width="34" height="12" rx="1" strokeDasharray="2.5 2.5" />
    </Art>
  ),
  animation: (
    <Art>
      <rect x="8" y="5" width="40" height="27" rx="3" {...soft} />
      <circle cx="28" cy="18.5" r="6" {...mark} />
      <path d="M26.5 16v5l4-2.5z" fill="currentColor" stroke="none" />
      <path d="M8 40h40" strokeOpacity={0.4} strokeWidth={3} />
      <path d="M8 40h16" strokeWidth={3} />
      <circle cx="24" cy="40" r="2.5" fill="currentColor" />
    </Art>
  ),
  mockups: (
    <Art>
      <rect x="5" y="12" width="30" height="26" rx="3" />
      <rect x="17" y="6" width="34" height="28" rx="3" {...soft} />
      <path d="M22 12h12M22 16h20" />
      <rect x="22" y="21" width="9" height="8" rx="1" {...mark} />
      <path d="M35 22h11M35 26h8" />
    </Art>
  ),
  dashboard: (
    <Art>
      <rect x="5" y="6" width="46" height="36" rx="3" {...soft} />
      <path d="M5 13h46M14 13v29" />
      <path d="M8 18h3M8 22h3M8 26h3" />
      <path d="M21 36V27M28 36V21M35 36V24M42 36V18" strokeWidth={3} strokeOpacity={0.7} />
    </Art>
  ),
  landing: (
    <Art>
      <rect x="5" y="5" width="46" height="38" rx="3" {...soft} />
      <path d="M5 12h46" />
      <circle cx="9" cy="8.5" r=".8" fill="currentColor" />
      <circle cx="12" cy="8.5" r=".8" fill="currentColor" />
      <path d="M16 20h24M20 25h16" />
      <rect x="22" y="30" width="12" height="5" rx="2.5" {...mark} />
    </Art>
  ),
  form: (
    <Art>
      <rect x="11" y="4" width="34" height="40" rx="3" {...soft} />
      <path d="M16 10h10" />
      <rect x="16" y="14" width="24" height="6" rx="1.5" />
      <rect x="16" y="24" width="24" height="6" rx="1.5" />
      <rect x="16" y="34" width="12" height="5" rx="2.5" {...mark} />
    </Art>
  ),
  email: (
    <Art>
      <rect x="10" y="4" width="36" height="40" rx="3" {...soft} />
      <circle cx="16" cy="11" r="2" {...mark} />
      <path d="M21 11h12M16 19h24M16 24h24M16 29h18" />
      <rect x="16" y="34" width="24" height="5" rx="2.5" {...mark} />
    </Art>
  ),
  pairing: (
    <Art>
      <rect x="7" y="5" width="42" height="38" rx="3" {...soft} />
      <text x="12" y="25" fill="currentColor" stroke="none" fontFamily="var(--serif)" fontSize="15">
        Aa
      </text>
      <path d="M33 15h10M36 19h7" />
      <rect x="12" y="31" width="8" height="7" rx="1.5" {...mark} />
      <rect x="23" y="31" width="8" height="7" rx="1.5" fill="currentColor" fillOpacity={0.3} stroke="none" />
      <rect x="34" y="31" width="8" height="7" rx="1.5" />
    </Art>
  ),
};

export const HOME_TEMPLATES: HomeTemplate[] = [
  { id: 'blank', label: 'Blank', prompt: '' },
  { id: 'mobile', label: 'Mobile app', prompt: 'Design a mobile app for ', starterId: 'mobile-app' },
  { id: 'slides', label: 'Slides', prompt: 'Make a slide deck about ', starterId: 'deck' },
  { id: 'document', label: 'Document', prompt: 'Write and lay out a document about ', starterId: 'docs' },
  { id: 'wireframe', label: 'Wireframe', prompt: 'Wireframe ', level: 'wireframe' },
  { id: 'animation', label: 'Animation', prompt: 'Make an animated ' },
  { id: 'mockups', label: 'UI mockups', prompt: 'Make UI mockups for ', kind: 'react' },
  { id: 'dashboard', label: 'Dashboard', prompt: 'Prototype a dashboard for ', starterId: 'dashboard' },
  { id: 'landing', label: 'Landing page', prompt: 'Design a landing page for ', starterId: 'landing' },
  { id: 'form', label: 'Form', prompt: 'Design a form for ', starterId: 'form' },
  { id: 'email', label: 'HTML email', prompt: 'Design an HTML email for ' },
  { id: 'pairing', label: 'Color + type pairing', prompt: 'Make a color and type pairing sheet for ' },
];

export function HomeTemplateGrid({ selected, disabled, onPick }: { selected: string | null; disabled: boolean; onPick: (template: HomeTemplate, starter: Starter | null) => void }) {
  const [starters, setStarters] = useState<Starter[]>([]);
  useEffect(() => {
    api
      .starters()
      .then(setStarters)
      .catch(() => setStarters([]));
  }, []);
  return (
    <div className="ui-tile-grid home-tile-grid" role="group" aria-label="Templates">
      {HOME_TEMPLATES.map((template) => (
        <button
          key={template.id}
          type="button"
          className="ui-tile"
          aria-pressed={selected === template.id}
          disabled={disabled}
          data-template={template.id}
          onClick={() => onPick(template, starters.find((starter) => starter.id === template.starterId) ?? null)}
        >
          <span className="ui-tile-art">{ART[template.id]}</span>
          {template.label}
        </button>
      ))}
    </div>
  );
}
