import type { ShipSettings } from "@design-studio/contracts/ship";
import { useEffect, useState } from "react";
import type { MutableRefObject } from "react";

import { copy } from "./copy.js";

import "../../styles/ship.css";
import { shipApi } from "./ship-api.js";

interface Props {
  projectId: string;
  saveRef: MutableRefObject<(() => Promise<void>) | null>;
}

export function ShipTemplates({ projectId, saveRef }: Props) {
  const [draft, setDraft] = useState<ShipSettings | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    shipApi
      .settings(projectId)
      .then((settings) => live && setDraft(settings))
      .catch(() => live && setLoadError("Could not read the ship templates."));

    return () => {
      live = false;
    };
  }, [projectId]);

  saveRef.current = draft
    ? async () => void (await shipApi.saveSettings(projectId, draft))
    : null;

  const set = (patch: Partial<ShipSettings>) =>
    setDraft((prev) => (prev ? { ...prev, ...patch } : prev));

  return (
    <section className="ship-settings" aria-label={copy.shipTemplates}>
      <h3>Ship as branch and PR</h3>
      {loadError && <p className="field-help">{loadError}</p>}
      {draft && (
        <>
          <div className="ship-settings-row">
            <label className="field">
              <span>Your name in branches</span>
              <input
                className="mono"
                value={draft.user}
                placeholder={copy.fromGitUser}
                spellCheck={false}
                autoComplete="off"
                onChange={(e) => set({ user: e.target.value })}
              />
            </label>
            <label className="field">
              <span>Issue id</span>
              <input
                className="mono"
                value={draft.issueId}
                placeholder={copy.qa1234}
                spellCheck={false}
                autoComplete="off"
                onChange={(e) => set({ issueId: e.target.value })}
              />
            </label>
          </div>
          <label className="field">
            <span>Branch template</span>
            <input
              className="mono"
              value={draft.branchTemplate}
              spellCheck={false}
              autoComplete="off"
              onChange={(e) => set({ branchTemplate: e.target.value })}
            />
          </label>
          <label className="field">
            <span>Pull request body template</span>
            <textarea
              className="mono"
              rows={5}
              value={draft.bodyTemplate}
              spellCheck={false}
              onChange={(e) => set({ bodyTemplate: e.target.value })}
            />
            <small className="field-help">
              Placeholders:{" "}
              {
                "{user} {slug} {issue} (lower case) {ISSUE} (as typed) {title} {summary} {versions} {files}"
              }
              . A line whose placeholders are all empty is left out.
            </small>
          </label>
        </>
      )}
    </section>
  );
}
