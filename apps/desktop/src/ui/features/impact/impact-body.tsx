import { useCallback, useState } from "react";
import type { ChangeEvent, ReactElement } from "react";

import { copy } from "./copy.js";
import { ImpactActions } from "./impact-actions.js";
import { ImpactRow } from "./impact-row.js";
import { useImpact } from "./use-impact.js";

import styles from "./impact.module.css";

interface ImpactBodyProps {
  readonly directionId: string | null;
  readonly file: string | null;
  readonly projectId: string;
}

const ImpactBody = ({
  directionId,
  file: initialFile,
  projectId,
}: ImpactBodyProps): ReactElement => {
  const [file, setFile] = useState(initialFile ?? "");
  const impact = useImpact({ directionId, file, projectId });

  const handleFile = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => setFile(event.target.value),
    []
  );

  const routes = impact.view?.routes ?? [];
  const phase = impact.view?.phase ?? "none";
  const isEmpty = !impact.isBusy && phase !== "none" && routes.length === 0;

  return (
    <section aria-label={copy.title} className={styles.body}>
      <label className={styles.field}>
        <span className={styles.label}>{copy.fileLabel}</span>
        <input
          className="input small"
          onChange={handleFile}
          placeholder={copy.filePlaceholder}
          value={file}
        />
      </label>
      <ImpactActions
        canCompare={impact.canCompare}
        hasFile={file.trim() !== ""}
        isBusy={impact.isBusy}
        isSaved={phase === "baseline" && routes.length > 0}
        onBaseline={impact.handleBaseline}
        onCompare={impact.handleCompare}
      />
      {impact.error !== null && <p className="ui-error">{copy.runFailed}</p>}
      {isEmpty && <p className={styles.note}>{copy.empty}</p>}
      <ul className={styles.list}>
        {routes.map((route) => (
          <ImpactRow key={route.route} route={route} />
        ))}
      </ul>
    </section>
  );
};

export { ImpactBody };
