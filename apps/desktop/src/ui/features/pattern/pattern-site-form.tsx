import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { PatternSiteTiles } from "./pattern-site-tiles.js";
import { PatternSiteUrl } from "./pattern-site-url.js";
import { usePatternSite } from "./use-pattern-site.js";
import type { PatternSiteSetup } from "./use-pattern-site.js";

import styles from "./pattern.module.css";

const PatternSiteForm = (setup: PatternSiteSetup): ReactElement => {
  const site = usePatternSite(setup);
  const { onClose } = setup;
  const { find } = site;
  let importLabel: string = copy.importSection;

  if (site.isImporting) {
    importLabel = copy.importing;
  }

  return (
    <form className={styles.form} noValidate onSubmit={site.handleSubmit}>
      <p className={styles.note}>{copy.siteHint}</p>
      <PatternSiteUrl
        isFinding={find.isFinding}
        onChange={site.handleUrl}
        onFind={find.handleFind}
        url={site.url}
      />
      {find.hasSearched && find.candidates.length === 0 && (
        <span className={styles.note}>{copy.noSections}</span>
      )}
      {find.candidates.length > 0 && (
        <PatternSiteTiles
          candidates={find.candidates}
          onSelect={site.handleSelect}
          selector={site.selector}
        />
      )}
      <label className={styles.field}>
        {copy.siteName}
        <input
          className={styles.input}
          name="name"
          onChange={site.handleName}
          placeholder={copy.sitePlaceholder}
          value={site.name}
        />
      </label>
      <div className={styles.actions}>
        <button
          className={styles.primary}
          disabled={!site.isReady || site.isImporting}
          type="submit"
        >
          {importLabel}
        </button>
        <button className={styles.small} onClick={onClose} type="button">
          {copy.cancel}
        </button>
      </div>
      <span className={styles.error} role="alert">
        {site.error}
      </span>
    </form>
  );
};

export { PatternSiteForm };
