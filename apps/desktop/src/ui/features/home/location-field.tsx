import { slugify, nameFromPrompt } from "@design-studio/contracts/folders";
import type { WorkspaceFolder } from "@design-studio/contracts/folders";
import { LazySelect } from "@design-studio/ui";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { FolderPath } from "./folder-path.js";
import { DEFAULT, listLocationOptions } from "./location-options-model.js";
import { PastePath } from "./paste-path.js";
import type { FolderChooser } from "./use-folder-chooser.js";
import { useLocationField } from "./use-location-field.js";

interface LocationProps {
  readonly folders: WorkspaceFolder[];
  readonly value: string | null;
  readonly homeDir: string | null;
  readonly prompt: string;
  readonly chooser: FolderChooser;
  readonly onChange: (path: string | null) => void;
  readonly onAddFolder: (path: string) => Promise<WorkspaceFolder | null>;
}

const DEFAULT_LABEL = "Design Studio";

const toLocationTarget = (
  parent: string | null,
  prompt: string
): string | null => {
  if (parent) {
    return `${parent}/${slugify(nameFromPrompt(prompt))}`;
  }

  return null;
};

const toLocationTail = (
  isPasting: boolean,
  target: string | null,
  homeDir: string | null,
  saveFolder: (path: string) => Promise<void>
): ReactElement => {
  if (isPasting) {
    return (
      <PastePath
        label="Folder for the new project"
        action="Use folder"
        onSubmit={saveFolder}
      />
    );
  }

  return (
    <span className="home-location-target" data-testid="location-target">
      {target && (
        <>
          {copy.newFolder}
          <FolderPath path={target} homeDir={homeDir} />
        </>
      )}
    </span>
  );
};

const LocationField = ({
  folders,
  value,
  homeDir,
  prompt,
  chooser,
  onChange,
  onAddFolder,
}: LocationProps): ReactElement => {
  const field = useLocationField({ chooser, onAddFolder, onChange, value });
  const fallback = folders.find((folder) => folder.default) ?? null;
  const usable = folders.filter((folder) => !folder.missing && !folder.default);
  const target = toLocationTarget(value ?? fallback?.path ?? null, prompt);

  const options = listLocationOptions(usable, value, homeDir, {
    fallback: fallback?.label ?? DEFAULT_LABEL,
    isUnsupported: chooser.isUnsupported,
  });

  return (
    <div className="home-location">
      <label htmlFor="new-project-location">{copy.location}</label>
      <LazySelect
        id="new-project-location"
        value={value ?? DEFAULT}
        disabled={chooser.isPicking}
        options={options}
        onChange={field.handleChange}
      />
      {toLocationTail(field.isPasting, target, homeDir, field.saveFolder)}
    </div>
  );
};

export { LocationField };
