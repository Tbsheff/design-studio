import { useRef, useState, type DragEvent, type FormEvent, type ReactNode } from 'react';
import { Markdown } from '../ai/components/ai/markdown';
import { api, errorText } from '../api';
import { pickFolder } from '../folderPicker';
import { pickable, refreshPacks, usePacks } from '../packs';
import { Icon } from './Icon';

const MAX_URLS = 3;
const MAX_IMAGES = 8;
const DEFAULT_BASE = 'modern-minimal';
const IMAGE_ACCEPT = 'image/png,image/jpeg,image/gif,image/webp';

type Mode = 'auto' | 'light' | 'dark';

interface DraftForm {
  name: string;
  mode: Mode;
  basePackId: string;
  urls: string[];
  designMd: string;
  brief: string;
  tokensFile: File | null;
  folder: string;
  images: File[];
}

const EMPTY: DraftForm = { name: '', mode: 'auto', basePackId: DEFAULT_BASE, urls: [''], designMd: '', brief: '', tokensFile: null, folder: '', images: [] };

function hasSource(form: DraftForm): boolean {
  const filled = (text: string) => text.trim() !== '';
  return form.urls.some(filled) || filled(form.designMd) || filled(form.brief) || filled(form.folder) || form.tokensFile !== null || form.images.length > 0;
}

function optional(text: string): string | undefined {
  return text.trim() === '' ? undefined : text;
}

function toFormData(form: DraftForm): FormData {
  const request = {
    name: optional(form.name.trim()),
    mode: form.mode,
    basePackId: form.basePackId,
    urls: form.urls.map((url) => url.trim()).filter(Boolean),
    designMd: optional(form.designMd),
    brief: optional(form.brief),
    folderPath: optional(form.folder.trim()),
  };
  const data = new FormData();
  data.append('request', JSON.stringify(request));
  if (form.tokensFile) data.append('tokensFile', form.tokensFile, form.tokensFile.name);
  for (const image of form.images) data.append('images', image, image.name);
  return data;
}

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="nds-section" aria-label={title}>
      <div className="nds-section-head">
        <h2>{title}</h2>
        {hint && <p>{hint}</p>}
      </div>
      {children}
    </section>
  );
}

function UrlFields({ urls, onChange }: { urls: string[]; onChange: (urls: string[]) => void }) {
  const set = (index: number, value: string) => onChange(urls.map((url, at) => (at === index ? value : url)));
  return (
    <div className="nds-stack">
      {urls.map((url, index) => (
        <div className="nds-row" key={index}>
          <input type="url" inputMode="url" placeholder="https://example.com" value={url} aria-label={`Website ${index + 1}`} onChange={(e) => set(index, e.target.value)} />
          {urls.length > 1 && (
            <button type="button" className="icon-btn" aria-label={`Remove website ${index + 1}`} onClick={() => onChange(urls.filter((_, at) => at !== index))}>
              <Icon name="close" size={14} />
            </button>
          )}
        </div>
      ))}
      {urls.length < MAX_URLS && (
        <button type="button" className="btn ghost small nds-add" onClick={() => onChange([...urls, ''])}>
          Add another website
        </button>
      )}
    </div>
  );
}

function DesignMdField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [view, setView] = useState<'edit' | 'preview'>('edit');
  return (
    <div className="nds-md">
      <div className="nds-tabs" role="tablist" aria-label="DESIGN.md view">
        {(['edit', 'preview'] as const).map((tab) => (
          <button key={tab} type="button" role="tab" aria-selected={view === tab} className={`nds-tab ${view === tab ? 'on' : ''}`} onClick={() => setView(tab)}>
            {tab === 'edit' ? 'Edit' : 'Preview'}
          </button>
        ))}
      </div>
      {view === 'edit' ? (
        <textarea aria-label="DESIGN.md" rows={8} placeholder="# Brand&#10;&#10;## Color Palette & Roles&#10;- Primary: #0e7490" value={value} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <div className="nds-preview" aria-label="DESIGN.md preview">
          {value.trim() ? <Markdown>{value}</Markdown> : <p className="muted">Nothing to preview yet.</p>}
        </div>
      )}
    </div>
  );
}

function TokensDrop({ file, onChange }: { file: File | null; onChange: (file: File | null) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    setOver(false);
    const dropped = event.dataTransfer.files[0];
    if (dropped) onChange(dropped);
  };
  return (
    <div
      className={`nds-drop ${over ? 'over' : ''}`}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={onDrop}
    >
      <input ref={input} type="file" accept=".json,application/json,.css,text/css" hidden aria-label="Tokens file upload" onChange={(e) => onChange(e.target.files?.[0] ?? null)} />
      {file ? (
        <div className="nds-row">
          <span className="nds-file truncate">{file.name}</span>
          <button type="button" className="btn ghost small" onClick={() => onChange(null)}>
            Remove
          </button>
        </div>
      ) : (
        <button type="button" className="btn small" onClick={() => input.current?.click()}>
          Choose tokens file…
        </button>
      )}
      {!file && <span className="hint">Or drop a DTCG or Tokens Studio JSON file, or a CSS file like globals.css.</span>}
    </div>
  );
}

function FolderField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [manual, setManual] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const choose = async () => {
    setError(null);
    try {
      const outcome = await pickFolder({ title: 'Choose a code folder to scan' });
      if (outcome.kind === 'picked') onChange(outcome.path);
      if (outcome.kind === 'unsupported') setManual(true);
    } catch (err) {
      setError(errorText(err));
    }
  };
  return (
    <div className="nds-stack">
      <div className="nds-row">
        {manual ? (
          <input placeholder="/Users/you/code/app" value={value} aria-label="Folder path" onChange={(e) => onChange(e.target.value)} />
        ) : (
          <span className={`nds-file truncate ${value ? '' : 'muted'}`}>{value || 'No folder chosen'}</span>
        )}
        <button type="button" className="btn small" onClick={() => void choose()}>
          Choose folder…
        </button>
        {value && (
          <button type="button" className="btn ghost small" onClick={() => onChange('')}>
            Clear
          </button>
        )}
      </div>
      {error && <span className="alert error small">{error}</span>}
    </div>
  );
}

function ImagesField({ images, onChange }: { images: File[]; onChange: (images: File[]) => void }) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <div className="nds-stack">
      <input ref={input} type="file" accept={IMAGE_ACCEPT} multiple hidden aria-label="Image upload" onChange={(e) => onChange([...images, ...Array.from(e.target.files ?? [])].slice(0, MAX_IMAGES))} />
      {images.length > 0 && (
        <ul className="nds-images">
          {images.map((image, index) => (
            <li key={`${image.name}-${index}`}>
              <span className="truncate">{image.name}</span>
              <button type="button" className="icon-btn" aria-label={`Remove ${image.name}`} onClick={() => onChange(images.filter((_, at) => at !== index))}>
                <Icon name="close" size={12} />
              </button>
            </li>
          ))}
        </ul>
      )}
      {images.length < MAX_IMAGES && (
        <button type="button" className="btn small nds-add" onClick={() => input.current?.click()}>
          Add images…
        </button>
      )}
    </div>
  );
}

function Basics({ form, set }: { form: DraftForm; set: (patch: Partial<DraftForm>) => void }) {
  const { packs } = pickable(usePacks());
  return (
    <div className="nds-basics">
      <label className="field">
        <span>Name</span>
        <input value={form.name} maxLength={80} placeholder="From the website or brief" aria-label="Design system name" onChange={(e) => set({ name: e.target.value })} />
      </label>
      <label className="field">
        <span>Mode</span>
        <select className="select" value={form.mode} aria-label="Mode" onChange={(e) => set({ mode: e.target.value as Mode })}>
          <option value="auto">Detect</option>
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>
      </label>
      <label className="field">
        <span>Start from</span>
        <select className="select" value={form.basePackId} aria-label="Start from" onChange={(e) => set({ basePackId: e.target.value })}>
          {(packs ?? []).map((pack) => (
            <option key={pack.id} value={pack.id}>
              {pack.name}
              {pack.source === 'user' ? ' (yours)' : ''}
            </option>
          ))}
          {!packs && <option value={DEFAULT_BASE}>Modern Minimal</option>}
        </select>
      </label>
    </div>
  );
}

export function NewDesignSystem({ onCancel, onCreated }: { onCancel: () => void; onCreated: (projectId: string) => void }) {
  const [form, setForm] = useState<DraftForm>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (patch: Partial<DraftForm>) => setForm((prev) => ({ ...prev, ...patch }));
  const ready = hasSource(form) && !busy;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!ready) return;
    setBusy(true);
    setError(null);
    try {
      const result = await api.createDesignSystemDraft(toFormData(form));
      refreshPacks();
      onCreated(result.project.id);
    } catch (err) {
      setError(errorText(err));
      setBusy(false);
    }
  };

  return (
    <div className="home nds">
      <header className="home-header">
        <button type="button" className="btn ghost small" onClick={onCancel} disabled={busy}>
          Back
        </button>
      </header>
      <main className="nds-main">
        <form className="nds-form" onSubmit={(e) => void submit(e)} aria-busy={busy}>
          <div className="nds-head">
            <h1>New design system</h1>
            <p className="muted">Add one or more sources. The studio makes a draft in seconds, then opens it as a project with a kit page.</p>
          </div>
          <Basics form={form} set={set} />
          <Section title="Website" hint="Up to 3 pages. The studio reads their HTML and CSS.">
            <UrlFields urls={form.urls} onChange={(urls) => set({ urls })} />
          </Section>
          <Section title="DESIGN.md" hint="Paste an existing DESIGN.md. It becomes the system's guide.">
            <DesignMdField value={form.designMd} onChange={(designMd) => set({ designMd })} />
          </Section>
          <Section title="Brief" hint="A few words about the brand and mood.">
            <textarea aria-label="Brief" rows={3} maxLength={4000} placeholder="Calm, precise banking app for small teams" value={form.brief} onChange={(e) => set({ brief: e.target.value })} />
          </Section>
          <Section title="Tokens file" hint="DTCG or Tokens Studio JSON, or CSS custom properties. It wins over every other source.">
            <TokensDrop file={form.tokensFile} onChange={(tokensFile) => set({ tokensFile })} />
          </Section>
          <Section title="Code folder" hint="Read only. The studio scans CSS, SCSS and Tailwind config files.">
            <FolderField value={form.folder} onChange={(folder) => set({ folder })} />
          </Section>
          <Section title="Images" hint="Screenshots or a logo, kept for the AI step.">
            <ImagesField images={form.images} onChange={(images) => set({ images })} />
          </Section>
          {error && (
            <div className="alert error small" role="alert">
              {error}
            </div>
          )}
          <div className="nds-foot">
            {!busy && !hasSource(form) && <p className="nds-foot-hint">Add a website, DESIGN.md, brief, tokens file, folder or image to continue.</p>}
            <button type="button" className="btn ghost" onClick={onCancel} disabled={busy}>
              Cancel
            </button>
            <button type="submit" className="btn primary has-icon" disabled={!ready}>
              {busy && <span className="spinner" />}
              {busy ? 'Making draft…' : 'Create draft'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
