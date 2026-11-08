import type { PackSummary } from "@design-studio/contracts";
import { Icon } from "@design-studio/ui";
import type {
  DragEvent,
  FormEvent,
  KeyboardEvent,
  ReactElement,
  ReactNode,
} from "react";
import { useEffect, useState, useTransition, useRef } from "react";

import { Markdown } from "../../ai/components/ai/markdown.js";
import { errorText } from "../../api.js";
import { hasNativePicker, pickFolder } from "../../platform/desktop.js";
import { packApi } from "../../platform/pack-api.js";
import { COPY } from "./copy.js";
import { refreshPacks, pickable, usePacks } from "./packs.js";

const DEFAULT_BASE = "modern-minimal";

type Mode = "auto" | "light" | "dark";

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

const EMPTY: DraftForm = {
  basePackId: DEFAULT_BASE,
  brief: "",
  designMd: "",
  designMdFile: null,
  folder: "",
  images: [],
  mode: "auto",
  name: "",
  tokensFile: null,
  urlInput: "",
  urls: [],
};

const MAX_URLS = 3;

const allUrls = (form: DraftForm): string[] => {
  const typed = form.urlInput.trim();
  const list = form.urls.flatMap((url) => (url.trim() ? [url.trim()] : []));

  return typed && !list.includes(typed)
    ? [...list, typed].slice(0, MAX_URLS)
    : list;
};

const hasSource = (form: DraftForm): boolean => {
  const filled = (text: string): boolean => text.trim() !== "";

  return (
    allUrls(form).length > 0 ||
    filled(form.designMd) ||
    filled(form.brief) ||
    filled(form.folder) ||
    form.tokensFile !== null ||
    form.images.length > 0
  );
};

const optional = (text: string): string | undefined =>
  text.trim() === "" ? undefined : text;

const toFormData = (form: DraftForm): FormData => {
  const request = {
    basePackId: form.basePackId,
    brief: optional(form.brief),
    designMd: optional(form.designMd),
    folderPath: optional(form.folder.trim()),
    mode: form.mode,
    name: optional(form.name.trim()),
    urls: allUrls(form),
  };

  const data = new FormData();
  data.append("request", JSON.stringify(request));

  if (form.tokensFile) {
    data.append("tokensFile", form.tokensFile, form.tokensFile.name);
  }

  for (const image of form.images) {
    data.append("images", image, image.name);
  }

  return data;
};

const Section = ({
  title,
  hint,
  children,
  className,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}): ReactElement => (
  <section
    className={`nds-section${className ? ` ${className}` : ""}`}
    aria-label={title}
  >
    <div className="nds-section-head">
      <h2>{title}</h2>
      {hint && <p>{hint}</p>}
    </div>
    {children}
  </section>
);

const useDropGuard = (): void => {
  useEffect(() => {
    const outside = (event: globalThis.DragEvent): void => {
      const { target } = event;

      if (target instanceof Element && target.closest("[data-drop-target]")) {
        return;
      }

      event.preventDefault();

      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = "none";
      }
    };

    globalThis.addEventListener("dragover", outside);
    globalThis.addEventListener("drop", outside);

    return (): void => {
      globalThis.removeEventListener("dragover", outside);
      globalThis.removeEventListener("drop", outside);
    };
  }, []);
};

const IMAGE_TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp"];

const DROP_ACCEPT = `${IMAGE_TYPES.join(",")},.json,application/json,.css,text/css,.md,.markdown,text/markdown`;

const MAX_IMAGES = 8;

type Patch = Partial<DraftForm>;

const routeFiles = async (
  files: File[],
  form: DraftForm
): Promise<{ patch: Patch; skipped: string[] }> => {
  const patch: Patch = {};
  const skipped: string[] = [];
  const images = [...form.images];

  for (const file of files) {
    const lower = file.name.toLowerCase();

    if (IMAGE_TYPES.includes(file.type)) {
      if (images.length < MAX_IMAGES) {
        images.push(file);
      } else {
        skipped.push(`${file.name} (at most ${MAX_IMAGES} images)`);
      }
    } else if (/\.(json|css)$/u.test(lower)) {
      patch.tokensFile = file;
    } else if (/\.(md|markdown)$/u.test(lower)) {
      patch.designMd = await file.text();
      patch.designMdFile = file.name;
    } else {
      skipped.push(file.name);
    }
  }

  if (images.length !== form.images.length) {
    patch.images = images;
  }

  return { patch, skipped };
};

const Chip = ({
  icon,
  label,
  onRemove,
}: {
  icon: Parameters<typeof Icon>[0]["name"];
  label: string;
  onRemove: () => void;
}): ReactElement => (
  <li className="nds-chip">
    <Icon name={icon} size={12} />
    <span className="truncate">{label}</span>
    <button
      type="button"
      className="icon-btn small"
      aria-label={`Remove ${label}`}
      onClick={onRemove}
    >
      <Icon name="close" size={12} />
    </button>
  </li>
);

const DropZone = ({
  form,
  set,
}: {
  form: DraftForm;
  set: (patch: Patch) => void;
}): ReactElement => {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const add = async (files: File[]): Promise<void> => {
    const { patch, skipped } = await routeFiles(files, form);
    set(patch);
    setNote(
      skipped.length > 0
        ? `Not added: ${skipped.join(", ")}. Use PNG, JPEG, GIF or WebP images, a .json or .css tokens file, or a .md file.`
        : null
    );
  };

  const onDrop = (event: DragEvent): void => {
    event.preventDefault();
    setOver(false);
    void add([...event.dataTransfer.files]);
  };

  const hasFiles =
    form.images.length > 0 ||
    form.tokensFile !== null ||
    form.designMdFile !== null;

  return (
    <div
      className={`nds-dropzone ${over ? "over" : ""}`}
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
        aria-label={COPY.labelAddFiles}
        onChange={(event) => {
          void add([...(event.target.files ?? [])]);
          event.target.value = "";
        }}
      />
      <span className="nds-dropzone-art" aria-hidden="true">
        <Icon name="image" size={20} />
      </span>
      <div className="nds-dropzone-text">
        <strong>{COPY.textDropScreenshotsALogo}</strong>
        <span>{COPY.textTheAiStepLooks}</span>
      </div>
      <button
        type="button"
        className="btn small"
        onClick={() => input.current?.click()}
      >
        {COPY.textChooseFiles}
      </button>
      {hasFiles && (
        <ul className="nds-chips" aria-label={COPY.labelAddedFiles}>
          {form.images.map((image, index) => (
            <Chip
              key={`${image.name}-${index}`}
              icon="image"
              label={image.name}
              onRemove={() =>
                set({ images: form.images.filter((_, at) => at !== index) })
              }
            />
          ))}
          {form.tokensFile && (
            <Chip
              icon="token"
              label={form.tokensFile.name}
              onRemove={() => set({ tokensFile: null })}
            />
          )}
          {form.designMdFile && (
            <Chip
              icon="doc"
              label={form.designMdFile}
              onRemove={() => set({ designMd: "", designMdFile: null })}
            />
          )}
        </ul>
      )}
      {note && (
        <p className="nds-drop-note" role="status">
          {note}
        </p>
      )}
    </div>
  );
};

const UrlField = ({
  form,
  set,
}: {
  form: DraftForm;
  set: (patch: Patch) => void;
}): ReactElement => {
  const full = form.urls.length >= MAX_URLS;

  const add = (): void => {
    const url = form.urlInput.trim();

    if (!url || full || form.urls.includes(url)) {
      return;
    }

    set({ urlInput: "", urls: [...form.urls, url] });
  };

  const onKey = (event: KeyboardEvent<HTMLInputElement>): void => {
    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();
    add();
  };

  return (
    <div className="nds-stack">
      <div className="nds-row">
        <input
          type="url"
          inputMode="url"
          placeholder={COPY.placeholderHttpsExampleCom}
          value={form.urlInput}
          aria-label={COPY.labelWebsite}
          disabled={full}
          onKeyDown={onKey}
          onChange={(event) => set({ urlInput: event.target.value })}
        />
        <button
          type="button"
          className="btn small"
          disabled={!form.urlInput.trim() || full}
          onClick={add}
        >
          {COPY.textAdd}
        </button>
      </div>
      {form.urls.length > 0 && (
        <ul className="nds-chips" aria-label={COPY.labelWebsites}>
          {form.urls.map((url) => (
            <Chip
              key={url}
              icon="globe"
              label={url.replace(/^https?:\/\//u, "").replace(/\/$/u, "")}
              onRemove={() =>
                set({ urls: form.urls.filter((item) => item !== url) })
              }
            />
          ))}
        </ul>
      )}
    </div>
  );
};

const DesignMdField = ({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}): ReactElement => {
  const [view, setView] = useState<"edit" | "preview">("edit");

  return (
    <div className="nds-md">
      <div
        className="nds-tabs"
        role="tablist"
        aria-label={COPY.labelDesignMdView}
      >
        {(["edit", "preview"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={view === tab}
            className={`nds-tab ${view === tab ? "on" : ""}`}
            onClick={() => setView(tab)}
          >
            {tab === "edit" ? "Edit" : "Preview"}
          </button>
        ))}
      </div>
      {view === "edit" ? (
        <textarea
          aria-label={COPY.labelDesignMd}
          rows={6}
          placeholder={COPY.placeholderBrand1010ColorPalette}
          value={value}
          onChange={(evt) => onChange(evt.target.value)}
        />
      ) : (
        <div className="nds-preview" aria-label={COPY.labelDesignMdPreview}>
          {value.trim() ? (
            <Markdown>{value}</Markdown>
          ) : (
            <p className="muted">{COPY.textNothingToPreviewYet}</p>
          )}
        </div>
      )}
    </div>
  );
};

const TokensField = ({
  file,
  onChange,
}: {
  file: File | null;
  onChange: (file: File | null) => void;
}): ReactElement => {
  const input = useRef<HTMLInputElement>(null);

  return (
    <div className="nds-row">
      <input
        ref={input}
        type="file"
        accept=".json,application/json,.css,text/css"
        hidden
        aria-label={COPY.labelTokensFileUpload}
        onChange={(evtNext) => onChange(evtNext.target.files?.[0] ?? null)}
      />
      <span className={`nds-file truncate ${file ? "" : "muted"}`}>
        {file ? file.name : "No tokens file"}
      </span>
      <button
        type="button"
        className="btn small"
        onClick={() => input.current?.click()}
      >
        {COPY.textChooseFile}
      </button>
      {file && (
        <button
          type="button"
          className="btn ghost small"
          onClick={() => onChange(null)}
        >
          {COPY.textRemove}
        </button>
      )}
    </div>
  );
};

const FolderField = ({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) => {
  const [manual, setManual] = useState(() => !hasNativePicker());
  const [error, setError] = useState<string | null>(null);

  const choose = async () => {
    setError(null);

    try {
      const outcome = await pickFolder({
        title: "Choose a code folder to scan",
      });

      if (outcome.kind === "picked") {
        onChange(outcome.path);
      }

      if (outcome.kind === "unsupported") {
        setManual(true);
      }
    } catch (err) {
      setError(errorText(err));
    }
  };

  return (
    <div className="nds-stack">
      <div className="nds-row">
        {manual ? (
          <input
            placeholder={COPY.placeholderUsersYouCodeApp}
            value={value}
            aria-label={COPY.labelFolderPath}
            onChange={(eventNext) => onChange(eventNext.target.value)}
          />
        ) : (
          <span className={`nds-file truncate ${value ? "" : "muted"}`}>
            {value || "No folder chosen"}
          </span>
        )}
        {hasNativePicker() && (
          <button
            type="button"
            className="btn small"
            onClick={() => void choose()}
          >
            {COPY.textChooseFolder}
          </button>
        )}
        {value && (
          <button
            type="button"
            className="btn ghost small"
            onClick={() => onChange("")}
          >
            {COPY.textClear}
          </button>
        )}
      </div>
      {error && <span className="alert error small">{error}</span>}
    </div>
  );
};

const Advanced = ({
  form,
  set,
}: {
  form: DraftForm;
  set: (patch: Patch) => void;
}) => {
  const count = [
    form.tokensFile,
    form.folder.trim(),
    form.designMd.trim(),
  ].filter(Boolean).length;

  return (
    <details className="nds-advanced" open={count > 0 ? true : undefined}>
      <summary>
        <span className="nds-section-head">
          <span className="nds-section-title">{COPY.textAdvanced}</span>
          <span className="nds-section-hint">
            {COPY.textCodeFolderAndImport}
          </span>
        </span>
        <Icon name="chevronRight" size={14} />
      </summary>
      <div className="nds-advanced-body">
        <div className="nds-field">
          <span className="nds-field-label">{COPY.textTokensFile}</span>
          <span className="nds-field-hint">
            {COPY.textFigmaVariablesJsonWith}
          </span>
          <span className="nds-field-hint">{COPY.textFromFigmaExportThe}</span>
          <TokensField
            file={form.tokensFile}
            onChange={(tokensFile) => set({ tokensFile })}
          />
        </div>
        <div className="nds-field">
          <span className="nds-field-label">{COPY.textCodeFolder}</span>
          <span className="nds-field-hint">{COPY.textReadOnlyTheStudio}</span>
          <FolderField
            value={form.folder}
            onChange={(folder) => set({ folder })}
          />
        </div>
        <div className="nds-field">
          <span className="nds-field-label">{COPY.labelDesignMd}</span>
          <span className="nds-field-hint">
            {COPY.textPasteAnExistingDesign}
          </span>
          <DesignMdField
            value={form.designMd}
            onChange={(designMd) =>
              set({
                designMd,
                designMdFile: designMd.trim() ? form.designMdFile : null,
              })
            }
          />
        </div>
      </div>
    </details>
  );
};

const PackSwatches = ({ pack }: { pack: PackSummary }) => (
  <span className="nds-preset-swatches" aria-hidden="true">
    {pack.swatches.slice(0, 4).map((swatch) => (
      <span key={swatch.name} style={{ background: swatch.value }} />
    ))}
  </span>
);

const Presets = ({
  value,
  onChange,
}: {
  value: string;
  onChange: (id: string) => void;
}) => {
  const { packs } = pickable(usePacks());

  if (!packs) {
    return null;
  }

  return (
    <div className="nds-presets" role="group" aria-label={COPY.labelStartFrom}>
      {packs.map((pack) => (
        <button
          key={pack.id}
          type="button"
          className="nds-preset"
          aria-pressed={pack.id === value}
          onClick={() => onChange(pack.id)}
        >
          <PackSwatches pack={pack} />
          <span className="truncate">{pack.name}</span>
        </button>
      ))}
    </div>
  );
};

const sourceList = (
  form: DraftForm
): { icon: Parameters<typeof Icon>[0]["name"]; label: string }[] => {
  const list: {
    icon: Parameters<typeof Icon>[0]["name"];
    label: string;
  }[] = allUrls(form).map((url) => ({
    icon: "globe",
    label: url.replace(/^https?:\/\//u, "").replace(/\/$/u, ""),
  }));

  if (form.designMd.trim()) {
    list.push({ icon: "doc", label: form.designMdFile ?? "DESIGN.md" });
  }

  if (form.brief.trim()) {
    list.push({ icon: "pencil", label: "Brief" });
  }

  if (form.tokensFile) {
    list.push({ icon: "token", label: form.tokensFile.name });
  }

  if (form.folder.trim()) {
    list.push({
      icon: "folder",
      label:
        form.folder.trim().split("/").findLast(Boolean) ?? form.folder.trim(),
    });
  }

  if (form.images.length > 0) {
    list.push({
      icon: "image",
      label:
        form.images.length === 1
          ? "1 image, for the AI step"
          : `${form.images.length} images, for the AI step`,
    });
  }

  return list;
};

const SourceSummary = ({ form }: { form: DraftForm }) => {
  const list = sourceList(form);

  return (
    <div className="nds-summary">
      <h2>{COPY.textSources}</h2>
      {list.length === 0 ? (
        <p className="nds-summary-empty">{COPY.textAddAWebsiteA}</p>
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
};

const Basics = ({
  form,
  set,
}: {
  form: DraftForm;
  set: (patch: Patch) => void;
}) => (
  <div
    className="nds-basics"
    role="group"
    aria-label={COPY.labelDesignSystemSettings}
  >
    <label className="field">
      <span>{COPY.textName}</span>
      <input
        value={form.name}
        maxLength={80}
        placeholder={COPY.placeholderFromTheWebsiteOrBrief}
        aria-label={COPY.labelDesignSystemName}
        onChange={(eventOther) => set({ name: eventOther.target.value })}
      />
    </label>
    <label className="field">
      <span>{COPY.labelMode}</span>
      <select
        className="select"
        value={form.mode}
        aria-label={COPY.labelMode}
        onChange={(eventExtra) =>
          set({ mode: eventExtra.target.value as Mode })
        }
      >
        <option value="auto">{COPY.textDetect}</option>
        <option value="light">{COPY.textLight}</option>
        <option value="dark">{COPY.textDark}</option>
      </select>
    </label>
  </div>
);

const NewDesignSystem = ({
  onCancel,
  onCreated,
}: {
  onCancel: () => void;
  onCreated: (projectId: string) => void;
}) => {
  const [form, setForm] = useState<DraftForm>(EMPTY);
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const set = (patch: Patch) => setForm((prev) => ({ ...prev, ...patch }));
  const ready = hasSource(form) && !busy;
  useDropGuard();

  const submit = (event: FormEvent) => {
    event.preventDefault();

    if (!ready) {
      return;
    }

    setError(null);
    startTransition(async () => {
      try {
        const result = await packApi.createDesignSystemDraft(toFormData(form));
        refreshPacks();
        onCreated(result.project.id);
      } catch (err) {
        setError(errorText(err));
      }
    });
  };

  return (
    <div className="home nds">
      <header className="home-header">
        <button
          type="button"
          className="btn ghost small has-icon back-btn"
          onClick={onCancel}
          disabled={busy}
        >
          <Icon name="arrowLeft" size={14} />
          {COPY.textBack}
        </button>
      </header>
      <main className="nds-main">
        <form
          className="nds-form"
          onSubmit={(evtOther) => void submit(evtOther)}
          aria-busy={busy}
        >
          <div className="nds-head">
            <h1>{COPY.textNewDesignSystem}</h1>
            <p className="muted">{COPY.textAddWhatYouHave}</p>
          </div>
          <div className="nds-sources">
            <Section
              title={COPY.titleFilesAndImages}
              className="nds-section-drop"
            >
              <DropZone form={form} set={set} />
            </Section>
            <Section
              title={COPY.titleWebsite}
              hint="Up to 3 pages. The studio reads their HTML and CSS."
            >
              <UrlField form={form} set={set} />
            </Section>
            <Section
              title={COPY.titleBrief}
              hint="A few words about the brand, the product and the mood."
            >
              <textarea
                aria-label={COPY.labelBrief}
                rows={3}
                maxLength={4000}
                placeholder={COPY.placeholderCalmPreciseBankingAppFor}
                value={form.brief}
                onChange={(evtExtra) => set({ brief: evtExtra.target.value })}
              />
            </Section>
            <Section
              title={COPY.titleStartFrom}
              hint="The base for every value your sources do not set."
            >
              <Presets
                value={form.basePackId}
                onChange={(basePackId) => set({ basePackId })}
              />
            </Section>
            <Advanced form={form} set={set} />
          </div>
          <aside className="nds-side" aria-label={COPY.labelCreate}>
            <div className="nds-side-card">
              <Basics form={form} set={set} />
              <SourceSummary form={form} />
              {error && (
                <div className="alert error small" role="alert">
                  {error}
                </div>
              )}
              <div className="nds-side-actions">
                <button
                  type="submit"
                  className="btn send has-icon nds-create"
                  disabled={!ready}
                >
                  {busy && <span className="spinner" />}
                  {busy ? "Opening draft…" : "Create"}
                </button>
                <button
                  type="button"
                  className="btn ghost"
                  onClick={onCancel}
                  disabled={busy}
                >
                  {COPY.textCancel}
                </button>
              </div>
            </div>
          </aside>
        </form>
      </main>
    </div>
  );
};

export { NewDesignSystem };
