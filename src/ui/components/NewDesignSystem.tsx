import { useEffect, useRef, useState, type DragEvent, type FormEvent, type KeyboardEvent, type ReactNode } from 'react';
import type { PackSummary } from '../../shared/contracts';
import { Markdown } from '../ai/components/ai/markdown';
import { api, errorText } from '../api';
import { hasNativePicker, pickFolder } from '../folderPicker';
import { pickable, refreshPacks, usePacks } from '../packs';
import { Icon } from './Icon';

const MAX_URLS = 3;
const MAX_IMAGES = 8;
const MAX_PRESETS = 6;
const DEFAULT_BASE = 'modern-minimal';
const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
const DROP_ACCEPT = `${IMAGE_TYPES.join(',')},.json,application/json,.css,text/css,.md,.markdown,text/markdown`;

type Mode = 'auto' | 'light' | 'dark';

interface DraftForm {
  name: string;
  mode: Mode;
  basePackId: string;
  urls: string[];
  urlInput: string;
  designMd: string;
  designMdFile: string | null;
  brief: string;
  tokensFile: File | null;
  folder: string;
  images: File[];
}

const EMPTY: DraftForm = { name: '', mode: 'auto', basePackId: DEFAULT_BASE, urls: [], urlInput: '', designMd: '', designMdFile: null, brief: '', tokensFile: null, folder: '', images: [] };

function allUrls(form: DraftForm): string[] {
  const typed = form.urlInput.trim();
  const list = form.urls.map((url) => url.trim()).filter(Boolean);
  return typed && !list.includes(typed) ? [...list, typed].slice(0, MAX_URLS) : list;
}

function hasSource(form: DraftForm): boolean {
  const filled = (text: string) => text.trim() !== '';
  return allUrls(form).length > 0 || filled(form.designMd) || filled(form.brief) || filled(form.folder) || form.tokensFile !== null || form.images.length > 0;
}

function optional(text: string): string | undefined {
  return text.trim() === '' ? undefined : text;
}

function toFormData(form: DraftForm): FormData {
  const request = {
    name: optional(form.name.trim()),
    mode: form.mode,
    basePackId: form.basePackId,
    urls: allUrls(form),
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

type Patch = Partial<DraftForm>;

async function routeFiles(files: File[], form: DraftForm): Promise<{ patch: Patch; skipped: string[] }> {
  const patch: Patch = {};
  const skipped: string[] = [];
  const images = [...form.images];
  for (const file of files) {
    const lower = file.name.toLowerCase();
    if (IMAGE_TYPES.includes(file.type)) {
      if (images.length < MAX_IMAGES) images.push(file);
      else skipped.push(`${file.name} (at most ${MAX_IMAGES} images)`);
    } else if (/\.(json|css)$/.test(lower)) {
      patch.tokensFile = file;
    } else if (/\.(md|markdown)$/.test(lower)) {
      patch.designMd = await file.text();
      patch.designMdFile = file.name;
    } else {
      skipped.push(file.name);
    }
  }
  if (images.length !== form.images.length) patch.images = images;
  return { patch, skipped };
}

function Section({ title, hint, children, className }: { title: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <section className={`nds-section${className ? ` ${className}` : ''}`} aria-label={title}>
      <div className="nds-section-head">
        <h2>{title}</h2>
        {hint && <p>{hint}</p>}
      </div>
      {children}
    </section>
  );
}

function Chip({ icon, label, onRemove }: { icon: Parameters<typeof Icon>[0]['name']; label: string; onRemove: () => void }) {
  return (
    <li className="nds-chip">
      <Icon name={icon} size={12} />
      <span className="truncate">{label}</span>
      <button type="button" className="icon-btn small" aria-label={`Remove ${label}`} onClick={onRemove}>
        <Icon name="close" size={12} />
      </button>
    </li>
  );
}

function DropZone({ form, set }: { form: DraftForm; set: (patch: Patch) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const add = async (files: File[]) => {
    const { patch, skipped } = await routeFiles(files, form);
    set(patch);
    setNote(skipped.length > 0 ? `Not added: ${skipped.join(', ')}. Use PNG, JPEG, GIF or WebP images, a .json or .css tokens file, or a .md file.` : null);
  };
  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    setOver(false);
    void add(Array.from(event.dataTransfer.files));
  };
  const hasFiles = form.images.length > 0 || form.tokensFile !== null || form.designMdFile !== null;
  return (
    <div
      className={`nds-dropzone ${over ? 'over' : ''}`}
      data-drop-target=""
      onDragOver={(event) => {
        event.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={onDrop}
    >
      <input
        ref={input}
        type="file"
        accept={DROP_ACCEPT}
        multiple
        hidden
        aria-label="Add files"
        onChange={(event) => {
          void add(Array.from(event.target.files ?? []));
          event.target.value = '';
        }}
      />
      <span className="nds-dropzone-art" aria-hidden="true">
        <Icon name="image" size={20} />
      </span>
      <div className="nds-dropzone-text">
        <strong>Drop screenshots, a logo, a tokens file or a DESIGN.md</strong>
        <span>The AI step looks at images. Tokens files (Figma variables, DTCG, Tokens Studio) and DESIGN.md are read at once.</span>
      </div>
      <button type="button" className="btn small" onClick={() => input.current?.click()}>
        Choose files…
      </button>
      {hasFiles && (
        <ul className="nds-chips" aria-label="Added files">
          {form.images.map((image, index) => (
            <Chip key={`${image.name}-${index}`} icon="image" label={image.name} onRemove={() => set({ images: form.images.filter((_, at) => at !== index) })} />
          ))}
          {form.tokensFile && <Chip icon="token" label={form.tokensFile.name} onRemove={() => set({ tokensFile: null })} />}
          {form.designMdFile && <Chip icon="doc" label={form.designMdFile} onRemove={() => set({ designMd: '', designMdFile: null })} />}
        </ul>
      )}
      {note && (
        <p className="nds-drop-note" role="status">
          {note}
        </p>
      )}
    </div>
  );
}

function UrlField({ form, set }: { form: DraftForm; set: (patch: Patch) => void }) {
  const full = form.urls.length >= MAX_URLS;
  const add = () => {
    const url = form.urlInput.trim();
    if (!url || full || form.urls.includes(url)) return;
    set({ urls: [...form.urls, url], urlInput: '' });
  };
  const onKey = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    add();
  };
  return (
    <div className="nds-stack">
      <div className="nds-row">
        <input type="url" inputMode="url" placeholder="https://example.com" value={form.urlInput} aria-label="Website" disabled={full} onKeyDown={onKey} onChange={(event) => set({ urlInput: event.target.value })} />
        <button type="button" className="btn small" disabled={!form.urlInput.trim() || full} onClick={add}>
          Add
        </button>
      </div>
      {form.urls.length > 0 && (
        <ul className="nds-chips" aria-label="Websites">
          {form.urls.map((url) => (
            <Chip key={url} icon="globe" label={url.replace(/^https?:\/\//, '').replace(/\/$/, '')} onRemove={() => set({ urls: form.urls.filter((item) => item !== url) })} />
          ))}
        </ul>
      )}
    </div>
  );
}

function PackSwatches({ pack }: { pack: PackSummary }) {
  return (
    <span className="nds-preset-swatches" aria-hidden="true">
      {pack.swatches.slice(0, 4).map((swatch) => (
        <span key={swatch.name} style={{ background: swatch.value }} />
      ))}
    </span>
  );
}

function Presets({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const { packs } = pickable(usePacks());
  if (!packs) return null;
  const first = packs.slice(0, MAX_PRESETS);
  const chosen = packs.find((pack) => pack.id === value);
  const shown = chosen && !first.includes(chosen) ? [...first.slice(0, MAX_PRESETS - 1), chosen] : first;
  return (
    <div className="nds-presets" role="group" aria-label="Start from">
      {shown.map((pack) => (
        <button key={pack.id} type="button" className="nds-preset" aria-pressed={pack.id === value} onClick={() => onChange(pack.id)}>
          <PackSwatches pack={pack} />
          <span className="truncate">{pack.name}</span>
        </button>
      ))}
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
        <textarea aria-label="DESIGN.md" rows={6} placeholder="# Brand&#10;&#10;## Color Palette & Roles&#10;- Primary: #0e7490" value={value} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <div className="nds-preview" aria-label="DESIGN.md preview">
          {value.trim() ? <Markdown>{value}</Markdown> : <p className="muted">Nothing to preview yet.</p>}
        </div>
      )}
    </div>
  );
}

function TokensField({ file, onChange }: { file: File | null; onChange: (file: File | null) => void }) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <div className="nds-row">
      <input ref={input} type="file" accept=".json,application/json,.css,text/css" hidden aria-label="Tokens file upload" onChange={(e) => onChange(e.target.files?.[0] ?? null)} />
      <span className={`nds-file truncate ${file ? '' : 'muted'}`}>{file ? file.name : 'No tokens file'}</span>
      <button type="button" className="btn small" onClick={() => input.current?.click()}>
        Choose file…
      </button>
      {file && (
        <button type="button" className="btn ghost small" onClick={() => onChange(null)}>
          Remove
        </button>
      )}
    </div>
  );
}

function FolderField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [manual, setManual] = useState(() => !hasNativePicker());
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
        {hasNativePicker() && (
          <button type="button" className="btn small" onClick={() => void choose()}>
            Choose folder…
          </button>
        )}
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

function Advanced({ form, set }: { form: DraftForm; set: (patch: Patch) => void }) {
  const count = [form.tokensFile, form.folder.trim(), form.designMd.trim()].filter(Boolean).length;
  return (
    <details className="nds-advanced" open={count > 0 ? true : undefined}>
      <summary>
        <Icon name="chevronRight" size={14} />
        Advanced
        <span className="nds-advanced-hint">Tokens file, code folder, DESIGN.md</span>
      </summary>
      <div className="nds-advanced-body">
        <div className="nds-field">
          <span className="nds-field-label">Tokens file</span>
          <span className="nds-field-hint">Figma variables JSON (with Light and Dark modes), DTCG or Tokens Studio JSON, or CSS custom properties. It wins over every other source.</span>
          <span className="nds-field-hint">From Figma: export the variables yourself (a plugin or the REST /variables/local answer) and choose the file here. The studio does not ask for a Figma token and does not connect to Figma.</span>
          <TokensField file={form.tokensFile} onChange={(tokensFile) => set({ tokensFile })} />
        </div>
        <div className="nds-field">
          <span className="nds-field-label">Code folder</span>
          <span className="nds-field-hint">Read only. The studio scans CSS, SCSS and Tailwind config files.</span>
          <FolderField value={form.folder} onChange={(folder) => set({ folder })} />
        </div>
        <div className="nds-field">
          <span className="nds-field-label">DESIGN.md</span>
          <span className="nds-field-hint">Paste an existing DESIGN.md. It becomes the system's guide.</span>
          <DesignMdField value={form.designMd} onChange={(designMd) => set({ designMd, designMdFile: designMd.trim() ? form.designMdFile : null })} />
        </div>
      </div>
    </details>
  );
}

function sourceList(form: DraftForm): Array<{ icon: Parameters<typeof Icon>[0]['name']; label: string }> {
  const list: Array<{ icon: Parameters<typeof Icon>[0]['name']; label: string }> = allUrls(form).map((url) => ({ icon: 'globe', label: url.replace(/^https?:\/\//, '').replace(/\/$/, '') }));
  if (form.designMd.trim()) list.push({ icon: 'doc', label: form.designMdFile ?? 'DESIGN.md' });
  if (form.brief.trim()) list.push({ icon: 'pencil', label: 'Brief' });
  if (form.tokensFile) list.push({ icon: 'token', label: form.tokensFile.name });
  if (form.folder.trim()) list.push({ icon: 'folder', label: form.folder.trim().split('/').filter(Boolean).pop() ?? form.folder.trim() });
  if (form.images.length > 0) list.push({ icon: 'image', label: form.images.length === 1 ? '1 image, for the AI step' : `${form.images.length} images, for the AI step` });
  return list;
}

function SourceSummary({ form }: { form: DraftForm }) {
  const list = sourceList(form);
  return (
    <div className="nds-summary">
      <h2>Sources</h2>
      {list.length === 0 ? (
        <p className="nds-summary-empty">Add a website, a brief, files or images.</p>
      ) : (
        <ul>
          {list.map((item, index) => (
            <li key={`${item.label}-${index}`}>
              <Icon name={item.icon} size={12} />
              <span className="truncate">{item.label}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Basics({ form, set }: { form: DraftForm; set: (patch: Patch) => void }) {
  const { packs } = pickable(usePacks());
  return (
    <div className="nds-basics" role="group" aria-label="Design system settings">
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

function useDropGuard(): void {
  useEffect(() => {
    const outside = (event: globalThis.DragEvent) => {
      const target = event.target;
      if (target instanceof Element && target.closest('[data-drop-target]')) return;
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = 'none';
    };
    window.addEventListener('dragover', outside);
    window.addEventListener('drop', outside);
    return () => {
      window.removeEventListener('dragover', outside);
      window.removeEventListener('drop', outside);
    };
  }, []);
}

export function NewDesignSystem({ onCancel, onCreated }: { onCancel: () => void; onCreated: (projectId: string) => void }) {
  const [form, setForm] = useState<DraftForm>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (patch: Patch) => setForm((prev) => ({ ...prev, ...patch }));
  const ready = hasSource(form) && !busy;
  useDropGuard();

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
            <p className="muted">Add what you have. The studio opens the draft at once, reads each source while you watch, then the AI step finishes it.</p>
          </div>
          <div className="nds-sources">
            <Section title="Files and images" className="nds-section-drop">
              <DropZone form={form} set={set} />
            </Section>
            <Section title="Website" hint="Up to 3 pages. The studio reads their HTML and CSS.">
              <UrlField form={form} set={set} />
            </Section>
            <Section title="Brief" hint="A few words about the brand, the product and the mood.">
              <textarea aria-label="Brief" rows={3} maxLength={4000} placeholder="Calm, precise banking app for small teams" value={form.brief} onChange={(e) => set({ brief: e.target.value })} />
            </Section>
            <Section title="Start from" hint="The base for every value your sources do not set.">
              <Presets value={form.basePackId} onChange={(basePackId) => set({ basePackId })} />
            </Section>
            <Advanced form={form} set={set} />
          </div>
          <aside className="nds-side" aria-label="Create">
            <div className="nds-side-card">
              <Basics form={form} set={set} />
              <SourceSummary form={form} />
              {error && (
                <div className="alert error small" role="alert">
                  {error}
                </div>
              )}
              <div className="nds-side-actions">
                <button type="submit" className="btn send has-icon nds-create" disabled={!ready}>
                  {busy && <span className="spinner" />}
                  {busy ? 'Opening draft…' : 'Create'}
                </button>
                <button type="button" className="btn ghost" onClick={onCancel} disabled={busy}>
                  Cancel
                </button>
              </div>
            </div>
          </aside>
        </form>
      </main>
    </div>
  );
}
