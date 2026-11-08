import { useCallback, useState } from "react";
import type { ChangeEvent, KeyboardEvent } from "react";

interface ImportFieldsSetup {
  readonly onImage: (file: File) => void;
  readonly onUrl: (url: string) => void;
}

interface ImportFields {
  readonly handleEnter: (event: KeyboardEvent<HTMLInputElement>) => void;
  readonly handleFile: (event: ChangeEvent<HTMLInputElement>) => void;
  readonly handleImport: () => void;
  readonly handleUrlInput: (event: ChangeEvent<HTMLInputElement>) => void;
  readonly url: string;
}

const useImportFields = (setup: ImportFieldsSetup): ImportFields => {
  const { onImage, onUrl } = setup;
  const [url, setUrl] = useState("");

  const handleUrlInput = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setUrl(event.target.value);
  }, []);

  const handleImport = useCallback(() => onUrl(url), [onUrl, url]);

  const handleEnter = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Enter") {
        onUrl(url);
      }
    },
    [onUrl, url]
  );

  const handleFile = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const [file] = event.target.files ?? [];

      event.target.value = "";

      if (file) {
        onImage(file);
      }
    },
    [onImage]
  );

  return {
    handleEnter,
    handleFile,
    handleImport,
    handleUrlInput,
    url,
  };
};

export { useImportFields };

export type { ImportFields, ImportFieldsSetup };
