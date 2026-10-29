import { useEffect, useState, type FormEvent, type KeyboardEvent } from 'react';
import { COMPONENT_NAME, type ComponentFolder } from '../../shared/component-create';
import type { SelectionContext } from '../../shared/contracts';
import type { InsertTarget } from '../../shared/insert';
import { apiMessage, componentCreateApi } from '../componentCreateApi';
import { useModalDialog } from '../usePopover';
import { UiSelect } from './UiSelect';
import '../styles/create-component.css';

interface Props {
  ids: { projectId: string; directionId: string };
  selection: SelectionContext[];
  onDone: (message: string) => void;
  onClose: () => void;
}

const TAG_NAMES: Record<string, string> = { a: 'NavItem', li: 'ListItem', button: 'ActionButton', tr: 'TableRow', section: 'Section', article: 'Card', img: 'Picture' };

function suggestName(selection: SelectionContext[]): string {
  const tag = (selection[0]?.tag ?? 'div').toLowerCase();
  const base = TAG_NAMES[tag] ?? (selection.length > 1 ? 'Row' : 'Block');
  return selection[0]?.component && /^[A-Z]/.test(selection[0].component) ? `${selection[0].component}Item` : base;
}

function targetOf(selection: SelectionContext): InsertTarget {
  if (selection.usedAt && selection.usedBy?.root) return { source: selection.usedAt, tag: selection.usedBy.name.toLowerCase(), selector: selection.selector };
  return { source: selection.source, tag: selection.tag.toLowerCase(), selector: selection.selector, ...(selection.owners?.length ? { owners: selection.owners } : {}) };
}

function fileHint(folder: string, name: string): string {
  const kebab = /(^|\/)(ui|packages)(\/|$)/.test(folder);
  return `${folder}/${kebab ? name.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase() : name}.tsx`;
}

function useFolders(ids: Props['ids']) {
  const [folders, setFolders] = useState<ComponentFolder[] | null>(null);
  const [folder, setFolder] = useState('');
  const [note, setNote] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    componentCreateApi
      .folders(ids.projectId, ids.directionId)
      .then((list) => {
        if (!live) return;
        setFolders(list.folders);
        setNote(list.folders.length ? null : (list.note ?? null));
        setFolder(list.folders.find((item) => item.kind === 'app')?.folder ?? list.folders[0]?.folder ?? (list.note ? '' : 'src/components'));
      })
      .catch(() => live && setFolders([]));
    return () => {
      live = false;
    };
  }, [ids.projectId, ids.directionId]);
  return { folders, folder, setFolder, note };
}

export default function CreateComponentDialog({ ids, selection, onDone, onClose }: Props) {
  const [name, setName] = useState(() => suggestName(selection));
  const { folders, folder, setFolder, note } = useFolders(ids);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const nameProblem = COMPONENT_NAME.test(name) ? null : 'Use a PascalCase name such as StatRow';
  const dialog = useModalDialog(() => {
    if (busy) return false;
    onClose();
  });
  const count = selection.length;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (nameProblem || busy || !folder) return;
    setBusy(true);
    setFailure(null);
    try {
      const result = await componentCreateApi.create(ids.projectId, ids.directionId, { targets: selection.map(targetOf), name, folder });
      const props = result.props.map((prop) => prop.name).join(', ');
      onDone(`Created ${result.name} in ${result.file}${props ? ` with ${props}` : ''}, used ${result.select.length} time${result.select.length === 1 ? '' : 's'}.`);
      onClose();
    } catch (error) {
      setFailure(apiMessage(error));
      setBusy(false);
    }
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') event.stopPropagation();
  };

  return (
    <dialog ref={dialog.ref} className="modal cc-dialog" aria-label="Create component" onMouseDown={dialog.onMouseDown} onKeyDown={onKeyDown}>
      <form className="modal-form" onSubmit={(event) => void submit(event)} noValidate>
        <div className="modal-head">
          <div className="titles">
            <h2>Create component</h2>
            <p>{count === 1 ? 'Writes a component file from this element and uses it in its place.' : `Writes one component from these ${count} elements, with a prop for each part that differs, and uses it in their place.`}</p>
          </div>
        </div>
        <div className="modal-body cc-form">
          <label className="field">
            <span>Name</span>
            <input data-autofocus className="mono" value={name} spellCheck={false} autoComplete="off" aria-invalid={nameProblem !== null} aria-describedby="cc-name-help" onChange={(event) => setName(event.target.value.trim())} />
            <span id="cc-name-help" className={`cc-help${nameProblem ? ' error' : ''}`}>
              {nameProblem ?? <code>{fileHint(folder || '…', name)}</code>}
            </span>
          </label>
          <div className="field">
            <span id="cc-folder-label">Folder</span>
            <UiSelect className="ins-select cc-folder" aria-label="Folder" value={folder} placeholder={folders === null ? 'Loading…' : 'No folder'} disabled={!folders?.length} options={(folders ?? []).map((item) => ({ value: item.folder, label: `${item.label} · ${item.folder}` }))} onChange={setFolder} />
          </div>
          {(failure ?? note) && (
            <div className="alert error small" role="alert">
              {failure ?? note}
            </div>
          )}
        </div>
        <div className="modal-foot">
          <button type="button" className="btn ghost" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="submit" className="btn primary" disabled={busy || nameProblem !== null || !folder}>
            {busy ? 'Creating…' : 'Create component'}
          </button>
        </div>
      </form>
    </dialog>
  );
}
