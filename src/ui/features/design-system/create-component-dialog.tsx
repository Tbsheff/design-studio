import { useEffect, useState, useTransition } from "react";
import type { FormEvent, KeyboardEvent } from "react";

import { COMPONENT_NAME } from "../../../shared/component-create.js";
import type { ComponentFolder } from "../../../shared/component-create.js";
import type { SelectionContext } from "../../../shared/contracts.js";
import type { InsertTarget } from "../../../shared/insert.js";
import { UiSelect } from "../../kit/UiSelect.js";
import { useModalDialog } from "../../kit/use-popover.js";
import { apiMessage, componentCreateApi } from "./component-create-api.js";
import { COPY } from "./copy.js";

import "../../styles/create-component.css";

interface Props {
  ids: { projectId: string; directionId: string };
  selection: SelectionContext[];
  onDone: (message: string) => void;
  onClose: () => void;
}

const TAG_NAMES: Record<string, string> = {
  a: "NavItem",
  article: "Card",
  button: "ActionButton",
  img: "Picture",
  li: "ListItem",
  section: "Section",
  tr: "TableRow",
};

function suggestName(selection: SelectionContext[]): string {
  const tag = (selection[0]?.tag ?? "div").toLowerCase();
  const base = TAG_NAMES[tag] ?? (selection.length > 1 ? "Row" : "Block");

  return selection[0]?.component && /^[A-Z]/.test(selection[0].component)
    ? `${selection[0].component}Item`
    : base;
}

function targetOf(selection: SelectionContext): InsertTarget {
  if (selection.usedAt && selection.usedBy?.root) {
    return {
      selector: selection.selector,
      source: selection.usedAt,
      tag: selection.usedBy.name.toLowerCase(),
    };
  }

  return {
    selector: selection.selector,
    source: selection.source,
    tag: selection.tag.toLowerCase(),
    ...(selection.owners?.length ? { owners: selection.owners } : {}),
  };
}

function fileHint(
  folder: string,
  name: string,
  known: ComponentFolder | undefined
): string {
  const kebab = known?.kebab ?? /(^|\/)(ui|packages)(\/|$)/.test(folder);

  return `${folder}/${kebab ? name.replaceAll(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase() : name}.tsx`;
}

function useFolders(ids: Props["ids"]) {
  const [folders, setFolders] = useState<ComponentFolder[] | null>(null);
  const [folder, setFolder] = useState("");
  const [note, setNote] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    const read = async () => {
      try {
        const list = await componentCreateApi.folders(
          ids.projectId,
          ids.directionId
        );

        if (!live) {
          return;
        }

        setFolders(list.folders);
        setNote(list.folders.length > 0 ? null : (list.note ?? null));
        setFolder(
          list.folders.find((item) => item.kind === "app")?.folder ??
            list.folders[0]?.folder ??
            (list.note ? "" : "src/components")
        );
      } catch {
        if (live) {
          setFolders([]);
        }
      }
    };

    void read();

    return () => {
      live = false;
    };
  }, [ids.projectId, ids.directionId]);

  return { folder, folders, note, setFolder };
}

export function CreateComponentDialog({
  ids,
  selection,
  onDone,
  onClose,
}: Props) {
  const [name, setName] = useState(() => suggestName(selection));
  const { folders, folder, setFolder, note } = useFolders(ids);
  const [busy, startTransition] = useTransition();
  const [failure, setFailure] = useState<string | null>(null);

  const nameProblem = COMPONENT_NAME.test(name)
    ? null
    : "Use a PascalCase name such as StatRow";

  const dialog = useModalDialog(() => {
    if (busy) {
      return false;
    }

    onClose();
  });

  const count = selection.length;

  const submit = (event: FormEvent) => {
    event.preventDefault();

    if (nameProblem || busy || !folder) {
      return;
    }

    setFailure(null);
    startTransition(async () => {
      try {
        const result = await componentCreateApi.create(
          ids.projectId,
          ids.directionId,
          { folder, name, targets: selection.map(targetOf) }
        );

        const props = result.props.map((prop) => prop.name).join(", ");
        onDone(
          `Created ${result.name} in ${result.file}${props ? ` with ${props}` : ""}, used ${result.select.length} time${result.select.length === 1 ? "" : "s"}.`
        );
        onClose();
      } catch (error) {
        setFailure(apiMessage(error));
      }
    });
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      event.stopPropagation();
    }
  };

  return (
    <dialog
      ref={dialog.ref}
      className="modal cc-dialog"
      aria-label={COPY.labelCreateComponent}
      onMouseDown={dialog.onMouseDown}
      onKeyDown={onKeyDown}
    >
      <form
        className="modal-form"
        onSubmit={(event) => void submit(event)}
        noValidate
      >
        <div className="modal-head">
          <div className="titles">
            <h2>Create component</h2>
            <p>
              {count === 1
                ? "Writes a component file from this element and uses it in its place."
                : `Writes one component from these ${count} elements, with a prop for each part that differs, and uses it in their place.`}
            </p>
          </div>
        </div>
        <div className="modal-body cc-form">
          <label className="field">
            <span>Name</span>
            <input
              data-autofocus
              className="mono"
              value={name}
              spellCheck={false}
              autoComplete="off"
              aria-invalid={nameProblem !== null}
              aria-describedby="cc-name-help"
              onChange={(event) => setName(event.target.value.trim())}
            />
            <span
              id="cc-name-help"
              className={`cc-help${nameProblem ? " error" : ""}`}
            >
              {nameProblem ?? (
                <code>
                  {fileHint(
                    folder || "…",
                    name,
                    folders?.find((item) => item.folder === folder)
                  )}
                </code>
              )}
            </span>
          </label>
          <div className="field">
            <span id="cc-folder-label">Folder</span>
            <UiSelect
              className="ins-select cc-folder"
              aria-label={COPY.labelFolder}
              value={folder}
              placeholder={folders === null ? "Loading…" : "No folder"}
              disabled={!folders?.length}
              options={(folders ?? []).map((item) => ({
                label: `${item.label} · ${item.folder}`,
                value: item.folder,
              }))}
              onChange={setFolder}
            />
          </div>
          {(failure ?? note) && (
            <div className="alert error small" role="alert">
              {failure ?? note}
            </div>
          )}
        </div>
        <div className="modal-foot">
          <button
            type="button"
            className="btn ghost"
            onClick={onClose}
            disabled={busy}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn primary"
            disabled={busy || nameProblem !== null || !folder}
          >
            {busy ? "Creating…" : "Create component"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
