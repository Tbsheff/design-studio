import type { ReactElement } from "react";
import { useCallback, useEffect, useState, useTransition } from "react";

import { CommandRuleList } from "./command-rule-list.js";
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
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let live = true;

    const load = async (): Promise<void> => {
      try {
        const result = await listRules(projectId);

        if (live) {
          setRules(result.rules);
        }
      } catch (error) {
        if (live) {
          setMessage(errorText(error));
        }
      }
    };

    void load();

    return (): void => {
      live = false;
    };
  }, [projectId]);

  const remove = useCallback(
    (rule: string): void => {
      setMessage(null);
      startTransition(async () => {
        try {
          const result = await removeRule(projectId, rule);

          startTransition(() => setRules(result.rules));
        } catch (error) {
          startTransition(() => setMessage(errorText(error)));
        }
      });
    },
    [projectId]
  );

  return (
    <fieldset
      className="skills-field command-rules"
      data-testid="command-rules"
    >
      <legend>{copy.textAllowedCommands}</legend>
      {rules !== null && (
        <CommandRuleList
          isPending={isPending}
          onRemove={remove}
          rules={rules}
        />
      )}
      {message && (
        <p className="permission-error" role="alert">
          {message}
        </p>
      )}
    </fieldset>
  );
};

export { CommandRules };
