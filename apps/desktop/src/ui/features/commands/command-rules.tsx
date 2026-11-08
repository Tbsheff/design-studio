import type { ReactElement } from "react";
import { useEffect, useState, useTransition } from "react";

import { copy } from "./copy.js";
import { errorText, json } from "./deps.js";

const rulesPath = (projectId: string): string =>
  `/api/projects/${encodeURIComponent(projectId)}/command-rules`;

const RULES_LIMIT = 200;

const listRules = async (projectId: string): Promise<{ rules: string[] }> => {
  const page = await json<{ items: string[] }>(
    "GET",
    `${rulesPath(projectId)}?limit=${RULES_LIMIT}&cursor=null`
  );

  return { rules: page.items };
};

const removeRule = (
  projectId: string,
  rule: string
): Promise<{ rules: string[] }> =>
  json<{ rules: string[] }>("POST", `${rulesPath(projectId)}/remove`, { rule });

const CommandRules = ({ projectId }: { projectId: string }): ReactElement => {
  const [rules, setRules] = useState<string[] | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;

    const load = async (): Promise<void> => {
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

    return (): void => {
      live = false;
    };
  }, [projectId]);

  const remove = (rule: string): void => {
    setError(null);
    startTransition(async () => {
      try {
        const result = await removeRule(projectId, rule);

        startTransition(() => setRules(result.rules));
      } catch (err) {
        startTransition(() => setError(errorText(err)));
      }
    });
  };

  return (
    <fieldset
      className="skills-field command-rules"
      data-testid="command-rules"
    >
      <legend>{copy.textAllowedCommands}</legend>
      {rules !== null &&
        ((rules.length === 0 && (
          <p className="command-rules-empty">{copy.textNoCommandsAreAlways}</p>
        )) || (
          <ul>
            {rules.map((rule) => (
              <li key={rule}>
                <code>{rule}</code>
                <button
                  type="button"
                  className="btn small"
                  disabled={isPending}
                  aria-label={`Remove ${rule}`}
                  onClick={() => remove(rule)}
                >
                  {copy.textRemove}
                </button>
              </li>
            ))}
          </ul>
        ))}
      {error && (
        <p className="permission-error" role="alert">
          {error}
        </p>
      )}
    </fieldset>
  );
};

export { CommandRules };
