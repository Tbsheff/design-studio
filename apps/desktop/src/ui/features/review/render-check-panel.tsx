import type {
  LayoutFinding,
  RenderCheckResult,
} from "@design-studio/contracts";
import { Icon } from "@design-studio/ui";
import { useEffect, useState } from "react";
import type { ReactElement } from "react";

import {
  consoleKey,
  keyCounts,
  layoutKey,
  takeKey,
} from "../../../shared/final-check-baseline.js";
import type { FinalCheckWithBaseline } from "../../../shared/final-check-baseline.js";
import { api } from "../../api.js";
import { copy } from "./copy.js";
import { pick } from "./pick.js";

interface Props {
  projectId: string;
  results: RenderCheckResult[] | null;
  error: string | null;
  onClose: () => void;
}

const CheckScreenshot = ({
  projectId,
  filePath,
  label,
}: {
  projectId: string;
  filePath: string;
  label: string;
}): ReactElement | null => {
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let alive = true;
    let objectUrl: string | null = null;

    const load = async (): Promise<void> => {
      try {
        const blob = await api.projectFile(projectId, filePath);

        if (!alive) {
          return;
        }

        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
      } catch {
        if (alive) {
          setFailed(true);
        }
      }
    };

    void load();

    return (): void => {
      alive = false;

      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [projectId, filePath]);

  if (failed) {
    return (
      <div className="muted small-text">{copy.screenshotNotAvailable}</div>
    );
  }

  if (!src) {
    return null;
  }

  return (
    <img
      className="check-shot"
      src={src}
      alt={`${label} render check screenshot`}
    />
  );
};

const SHOT_SUFFIX = /-(?:desktop|tablet|mobile)\.png$/u;

const directionOf = (results: RenderCheckResult[] | null): string | null => {
  const shot = results?.find(
    (renderCheckResult) => renderCheckResult.screenshotPath
  )?.screenshotPath;

  const name = shot?.split(/[\\/]/u).pop() ?? "";

  return SHOT_SUFFIX.test(name) ? name.replace(SHOT_SUFFIX, "") : null;
};

const useOldKeys = (
  projectId: string,
  results: RenderCheckResult[] | null
): string[] | null => {
  const [keys, setKeys] = useState<string[] | null>(null);
  const did = directionOf(results);
  useEffect(() => {
    let alive = true;
    setKeys(null);

    if (!did) {
      return;
    }

    const load = async (): Promise<void> => {
      try {
        const runs = await api.listRuns(projectId);

        const run = runs.find(
          (runSummary) =>
            runSummary.directionId === did &&
            (runSummary.finalCheck as FinalCheckWithBaseline | undefined)
              ?.baseline
        );

        if (alive) {
          setKeys(
            (run?.finalCheck as FinalCheckWithBaseline | undefined)?.baseline
              ?.keys ?? null
          );
        }
      } catch {
        return;
      }
    };

    void load();

    return (): void => {
      alive = false;
    };
  }, [projectId, did, results]);

  return keys;
};

interface ShownResult {
  result: RenderCheckResult;
  problems: string[];
  layout: LayoutFinding[];
  overflow: boolean;
}

const hideOld = (
  results: RenderCheckResult[] | null,
  keys: string[] | null
): { shown: ShownResult[]; hidden: number } => {
  const counts = keyCounts(keys ?? []);
  let hidden = 0;

  const keep = (key: string): boolean => {
    const old = takeKey(counts, `error|${key}`);

    if (old) {
      hidden += 1;
    }

    return !old;
  };

  const shown = (results ?? []).map((result) => ({
    layout: (result.layout ?? []).filter(
      (layoutFinding) =>
        layoutFinding.severity !== "error" ||
        keep(layoutKey(result.viewport, layoutFinding))
    ),
    overflow: result.horizontalOverflow && keep(`${result.viewport}|overflow`),
    problems: [...result.pageErrors, ...result.consoleErrors].filter((item) =>
      keep(consoleKey(result.viewport, item))
    ),
    result,
  }));

  return { hidden, shown };
};

const RenderCheckPanel = ({
  projectId,
  results,
  error,
  onClose,
}: Props): ReactElement => {
  const { shown, hidden } = hideOld(results, useOldKeys(projectId, results));

  return (
    <div
      className="check-panel"
      role="region"
      aria-label={copy.renderCheckResults}
    >
      <div className="check-head">
        <Icon name="scan" />
        <strong>{copy.renderCheck}</strong>
        <div className="spacer" />
        <button className="icon-btn" aria-label={copy.close} onClick={onClose}>
          <Icon name="close" />
        </button>
      </div>
      <div className="check-body">
        {error && <div className="alert error">{error}</div>}
        {hidden > 0 && (
          <div className="muted small-text" data-tip={copy.findingsThePage}>
            {hidden}
            {copy.oldHidden}
          </div>
        )}
        {shown.map(
          ({ result: renderCheckResult, problems, layout, overflow }) => {
            const ok = problems.length === 0 && !overflow;

            const layoutTotal = Math.max(
              layout.length,
              (renderCheckResult.layoutTotal ?? 0) -
                ((renderCheckResult.layout ?? []).length - layout.length)
            );

            return (
              <div
                key={`${renderCheckResult.viewport}-${renderCheckResult.width}`}
                className="check-row"
              >
                <div className="row">
                  <span className={`badge ${pick(ok, "ok", "fail")}`}>
                    {pick(ok, "Pass", "Fail")}
                  </span>
                  <span>
                    {renderCheckResult.viewport === "desktop"
                      ? "Desktop"
                      : pick(
                          renderCheckResult.viewport === "tablet",
                          "Tablet",
                          "Mobile"
                        )}
                  </span>
                  <span className="muted num">
                    {renderCheckResult.width}
                    {copy.times}
                    {renderCheckResult.height}
                  </span>
                  {overflow && (
                    <span className="badge warn">
                      {copy.horizontalOverflow}
                    </span>
                  )}
                  {layout.length > 0 && (
                    <span className="badge warn">
                      {layoutTotal}
                      {copy.layout} {pick(layoutTotal === 1, "issue", "issues")}
                    </span>
                  )}
                </div>
                {layout.length > 0 && (
                  <ul className="check-errors check-layout">
                    {layout.map((layoutFinding, index) => (
                      <li key={index}>
                        <strong>{layoutFinding.kind}</strong>{" "}
                        <code>
                          {layoutFinding.source ?? layoutFinding.selector}
                        </code>
                        {copy.colon}
                        {layoutFinding.detail}
                      </li>
                    ))}
                  </ul>
                )}
                {problems.length > 0 && (
                  <ul className="check-errors">
                    {problems.map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                )}
                {renderCheckResult.screenshotPath && (
                  <CheckScreenshot
                    projectId={projectId}
                    filePath={renderCheckResult.screenshotPath}
                    label={
                      renderCheckResult.viewport === "desktop"
                        ? "Desktop"
                        : pick(
                            renderCheckResult.viewport === "tablet",
                            "Tablet",
                            "Mobile"
                          )
                    }
                  />
                )}
              </div>
            );
          }
        )}
      </div>
    </div>
  );
};

export { RenderCheckPanel };
