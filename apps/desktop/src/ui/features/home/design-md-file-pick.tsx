import { Icon } from "@design-studio/ui";
import { useCallback } from "react";
import type { ChangeEvent, ReactElement } from "react";

import { copy } from "./copy.js";

const ICON_SIZE = 14;

interface DesignMdFilePickProps {
  readonly onDesignMd: (value: string) => void;
  readonly onError: (message: string) => void;
}

const readDesignMd = async (
  file: File,
  onDesignMd: (value: string) => void,
  onError: (message: string) => void
): Promise<void> => {
  try {
    onDesignMd(await file.text());
  } catch {
    onError(`Could not read ${file.name}.`);
  }
};

const DesignMdFilePick = ({
  onDesignMd,
  onError,
}: DesignMdFilePickProps): ReactElement => {
  const pickFile = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      const [file] = event.target.files ?? [];
      event.target.value = "";

      if (file) {
        readDesignMd(file, onDesignMd, onError);
      }
    },
    [onDesignMd, onError]
  );

  return (
    <label className="btn small has-icon file-pick">
      <Icon name="file" size={ICON_SIZE} />
      {copy.loadDesignMdFromA}
      <input
        type="file"
        accept=".md,text/markdown,text/plain"
        hidden
        onChange={pickFile}
      />
    </label>
  );
};

export { DesignMdFilePick };
