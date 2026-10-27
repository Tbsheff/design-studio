import { useEffect, useRef, useState } from 'react';
import type { Project, RunLevel } from '../shared/contracts';
import { api, errorText } from './api';

interface RunLevelState {
  level: RunLevel;
  error: string | null;
  choose: (level: RunLevel) => void;
  clearError: () => void;
}

export function useRunLevel(projectId: string, saved: RunLevel | undefined, onSaved: (project: Project) => void): RunLevelState {
  const [level, setLevel] = useState<RunLevel>(saved ?? 'prototype');
  const [error, setError] = useState<string | null>(null);
  const seq = useRef(0);

  useEffect(() => {
    if (saved) setLevel(saved);
  }, [saved, projectId]);

  const choose = (next: RunLevel) => {
    if (next === level) return;
    const previous = level;
    const ticket = ++seq.current;
    setLevel(next);
    setError(null);
    api
      .updateSettings(projectId, { defaultLevel: next })
      .then((project) => {
        if (ticket === seq.current) onSaved(project);
      })
      .catch((err: unknown) => {
        if (ticket !== seq.current) return;
        setLevel(previous);
        setError(`Could not save the run level: ${errorText(err)}`);
      });
  };

  return { level, error, choose, clearError: () => setError(null) };
}
