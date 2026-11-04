import { randomBytes } from "node:crypto";

import type {
  FrameStateDef,
  MockRule,
} from "@design-studio/contracts/frame-state";

type RecordedBody =
  | boolean
  | number
  | string
  | readonly RecordedBody[]
  | { readonly [key: string]: RecordedBody }
  | null;

interface RecordedResponse {
  readonly body: RecordedBody;
  readonly method: string;
  readonly pathname: string;
  readonly status: number;
}

type ResponseRecorder = (response: RecordedResponse) => void;

interface Trial {
  readonly def: FrameStateDef;
  readonly recorder: ResponseRecorder | null;
}

interface TrialSpec {
  readonly mocks: MockRule[];
  readonly recorder: ResponseRecorder | null;
}

const TRIAL_ID_BYTES = 5;

const trials = new Map<string, Trial>();

const toTrialKey = (projectDir: string, stateId: string): string =>
  `${projectDir}|${stateId}`;

const startTrial = (projectDir: string, spec: TrialSpec): string => {
  const id = `t${randomBytes(TRIAL_ID_BYTES).toString("hex")}`;

  const def: FrameStateDef = {
    id,
    kind: "mock",
    mocks: spec.mocks,
    name: "Scenario trial",
    signedIn: true,
  };

  trials.set(toTrialKey(projectDir, id), { def, recorder: spec.recorder });

  return id;
};

const stopTrial = (projectDir: string, stateId: string): void => {
  trials.delete(toTrialKey(projectDir, stateId));
};

const toTrialDef = (
  projectDir: string,
  stateId: string
): FrameStateDef | null =>
  trials.get(toTrialKey(projectDir, stateId))?.def ?? null;

const toTrialRecorder = (
  projectDir: string,
  stateId: string
): ResponseRecorder | null =>
  trials.get(toTrialKey(projectDir, stateId))?.recorder ?? null;

export { stopTrial, toTrialDef, toTrialRecorder, startTrial };

export type { RecordedBody, RecordedResponse, ResponseRecorder, TrialSpec };
