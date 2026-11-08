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
    api
      .projectFile(projectId, filePath)
      .then((blob) => {
        if (!alive) {
          return;
        }

        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
      })
      .catch(() => alive && setFailed(true));

    return (): void => {
      alive = false;

      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [projectId, filePath]);

  if (failed) {
    return <div className="muted small-text">Screenshot not available</div>;
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

const SHOT_SUFFIX = /-(?:desktop|tablet|mobile)\.png$/;

const directionOf = (results: RenderCheckResult[] | null): string | null => {
  const shot = results?.find((r) => r.screenshotPath)?.screenshotPath;
  const name = shot?.split(/[\\/]/).pop() ?? "";

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

    api
      .listRuns(projectId)
      .then((runs) => {
        const run = runs.find(
          (r) =>
            r.directionId === did &&
            (r.finalCheck as FinalCheckWithBaseline | undefined)?.baseline
        );

        if (alive) {
          setKeys(
            (run?.finalCheck as FinalCheckWithBaseline | undefined)?.baseline
              ?.keys ?? null
          );
        }
      })
      .catch(() => null);

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
      (f) => f.severity !== "error" || keep(layoutKey(result.viewport, f))
    ),
    overflow: result.horizontalOverflow && keep(`${result.viewport}|overflow`),
    problems: [...result.pageErrors, ...result.consoleErrors].filter((p) =>
      keep(consoleKey(result.viewport, p))
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
        <strong>Render check</strong>
        <div className="spacer" />
        <button className="icon-btn" aria-label={copy.close} onClick={onClose}>
          <Icon name="close" />
        </button>
      </div>
      <div className="check-body">
        {error && <div className="alert error">{error}</div>}
        {hidden > 0 && (
          <div className="muted small-text" data-tip={copy.findingsThePage}>
            {hidden} old, hidden
          </div>
        )}
        {shown.map(({ result: r, problems, layout, overflow }) => {
          const ok = problems.length === 0 && !overflow;

          const layoutTotal = Math.max(
            layout.length,
            (r.layoutTotal ?? 0) - ((r.layout ?? []).length - layout.length)
          );

          return (
            <div key={`${r.viewport}-${r.width}`} className="check-row">
              <div className="row">
                <span className={`badge ${ok ? "ok" : "fail"}`}>
                  {ok ? "Pass" : "Fail"}
                </span>
                <span>
                  {r.viewport === "desktop"
                    ? "Desktop"
                    : r.viewport === "tablet"
                      ? "Tablet"
                      : "Mobile"}
                </span>
                <span className="muted num">
                  {r.width} × {r.height}
                </span>
                {overflow && (
                  <span className="badge warn">Horizontal overflow</span>
                )}
                {layout.length > 0 && (
                  <span className="badge warn">
                    {layoutTotal} layout{" "}
                    {layoutTotal === 1 ? "issue" : "issues"}
                  </span>
                )}
              </div>
              {layout.length > 0 && (
                <ul className="check-errors check-layout">
                  {layout.map((f, i) => (
                    <li key={i}>
                      <strong>{f.kind}</strong>{" "}
                      <code>{f.source ?? f.selector}</code>: {f.detail}
                    </li>
                  ))}
                </ul>
              )}
              {problems.length > 0 && (
                <ul className="check-errors">
                  {problems.map((p, i) => (
                    <li key={i}>{p}</li>
                  ))}
                </ul>
              )}
              {r.screenshotPath && (
                <CheckScreenshot
                  projectId={projectId}
                  filePath={r.screenshotPath}
                  label={
                    r.viewport === "desktop"
                      ? "Desktop"
                      : r.viewport === "tablet"
                        ? "Tablet"
                        : "Mobile"
                  }
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export { RenderCheckPanel };
