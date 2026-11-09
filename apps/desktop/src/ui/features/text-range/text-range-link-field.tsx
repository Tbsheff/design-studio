import { useCallback, useEffect, useRef, useState } from "react";
import type { ChangeEvent, FormEvent, ReactElement } from "react";

import { copy } from "./copy.js";

import styles from "./text-range.module.css";

interface TextRangeLinkFieldProps {
  readonly onSubmit: (href: string) => void;
}

const TextRangeLinkField = ({
  onSubmit,
}: TextRangeLinkFieldProps): ReactElement => {
  const [href, setHref] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleHrefChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => setHref(event.target.value),
    []
  );

  const handleSubmit = useCallback(
    (event: FormEvent): void => {
      event.preventDefault();

      if (href.trim() !== "") {
        onSubmit(href.trim());
      }
    },
    [href, onSubmit]
  );

  return (
    <form className={styles.field} onSubmit={handleSubmit}>
      <input
        aria-label={copy.linkLabel}
        className={styles.input}
        name="href"
        onChange={handleHrefChange}
        placeholder={copy.linkPlaceholder}
        ref={inputRef}
        type="url"
        value={href}
      />
      <button className="btn small primary" type="submit">
        {copy.apply}
      </button>
    </form>
  );
};

export { TextRangeLinkField };
