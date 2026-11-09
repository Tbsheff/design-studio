import { useEffect, useRef } from "react";
import type { ReactElement } from "react";

import { toCodeEditView } from "./code-edit-model.js";

interface Props {
  readonly file: string;
  readonly initialText: string;
  readonly line: number;
  readonly onChange: (text: string) => void;
  readonly onSave: () => void;
}

interface Destroyable {
  readonly destroy: () => void;
}

const CodeEditEditor = ({
  file,
  initialText,
  line,
  onChange,
  onSave,
}: Props): ReactElement => {
  const hostRef = useRef<HTMLDivElement>(null);
  const saveRef = useRef(onSave);
  const changeRef = useRef(onChange);

  useEffect(() => {
    saveRef.current = onSave;
    changeRef.current = onChange;
  }, [onChange, onSave]);

  useEffect(() => {
    const host = hostRef.current;
    let isLive = true;
    let view: Destroyable | null = null;

    const mount = async (): Promise<void> => {
      if (!host) {
        return;
      }

      const createView = await toCodeEditView();

      if (!isLive) {
        return;
      }

      view = await createView(host, {
        file,
        initialText,
        line,
        onChange: (text) => {
          changeRef.current(text);
        },
        onSave: () => {
          saveRef.current();
        },
      });

      if (!isLive) {
        view.destroy();
      }
    };

    void mount();

    return (): void => {
      isLive = false;
      view?.destroy();
    };
  }, [file, initialText, line]);

  return <div ref={hostRef} className="code-edit-host" />;
};

export { CodeEditEditor };
