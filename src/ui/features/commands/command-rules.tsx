import { useEffect, useState } from "react";

import { errorText, json } from "../../api";

const rulesPath = (projectId: string) =>
  `/api/projects/${encodeURIComponent(projectId)}/command-rules`;

const RULES_LIMIT = 200;

const listRules = async (projectId: string) => {
  const page = await json<{ items: string[] }>(
    "GET",
    `${rulesPath(projectId)}?limit=${RULES_LIMIT}&cursor=null`
  );

  return { rules: page.items };
};

const removeRule = (projectId: string, rule: string) =>
  json<{ rules: string[] }>("POST", `${rulesPath(projectId)}/remove`, { rule });

export function CommandRules({ projectId }: { projectId: string }) {
  const [rules, setRules] = useState<string[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    const load = async () => {
      try {
        const result = await listRules(projectId);

        if (live) {
          setRules(result.rules);
        }
      } catch (err) {
        if (live) {
          setError(errorText(err));
        }
      }
    };
    void load();

    return () => {
      live = false;
    };
  }, [projectId]);

  const remove = async (rule: string) => {
    setBusy(rule);
    setError(null);

    try {
      setRules((await removeRule(projectId, rule)).rules);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(null);
    }
  };

  return (
    <fieldset
      className="skills-field command-rules"
      data-testid="command-rules"
    >
      <legend>Allowed commands</legend>
      {rules === null ? null : rules.length === 0 ? (
        <p className="command-rules-empty">No commands are always allowed.</p>
      ) : (
        <ul>
          {rules.map((rule) => (
            <li key={rule}>
              <code>{rule}</code>
              <button
                type="button"
                className="btn small"
                disabled={busy !== null}
                aria-label={`Remove ${rule}`}
                onClick={() => void remove(rule)}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
      {error && (
        <p className="permission-error" role="alert">
          {error}
        </p>
      )}
    </fieldset>
  );
}
