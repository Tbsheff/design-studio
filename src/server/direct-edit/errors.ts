type DirectEditErrorCode =
  | 'invalid_request'
  | 'invalid_source'
  | 'source_not_found'
  | 'element_not_found'
  | 'parse_failed'
  | 'not_host_element'
  | 'style_not_literal'
  | 'text_not_editable'
  | 'cannot_move'
  | 'cannot_restructure'
  | 'attribute_not_literal'
  | 'no_change'
  | 'stale_selection'
  | 'no_base_version'
  | 'run_in_progress'
  | 'unknown_token'
  | 'invalid_token'
  | 'token_exists'
  | 'tokens_invalid'
  | 'no_design_system'
  | 'no_tweaks'
  | 'unknown_tweak'
  | 'invalid_tweak_value'
  | 'tweak_not_declared'
  | 'history_empty'
  | 'history_stale';

const STATUS_FOR_CODE: Partial<Record<DirectEditErrorCode, 404 | 409>> = {
  run_in_progress: 409,
  history_stale: 409,
  token_exists: 409,
  no_design_system: 404,
  no_tweaks: 404,
};

export class DirectEditError extends Error {
  readonly code: DirectEditErrorCode;
  private readonly statusOverride: 404 | 409 | 422 | undefined;

  constructor(code: DirectEditErrorCode, message: string, status?: 404 | 409 | 422) {
    super(message);
    this.code = code;
    this.statusOverride = status;
  }

  get status(): 404 | 409 | 422 {
    return this.statusOverride ?? STATUS_FOR_CODE[this.code] ?? 422;
  }
}

export interface SourcePosition {
  line: number;
  col: number;
}

export interface SourceEdit {
  tag?: string;
  style?: Record<string, string | null>;
  text?: string;
  name?: string | null;
  move?: 'up' | 'down';
  insert?: 'text' | 'frame' | 'rect' | 'ellipse';
  classes?: { add?: string[]; remove?: string[] };
}

export interface PatchResult {
  code: string;
  tag: string;
  applied: { style: string[]; text: boolean; classes?: boolean };
  title?: string;
  moved?: SourcePosition;
}

const STALE_SELECTION_MESSAGE = 'The page changed since you selected this element. Select it again.';

export function assertSameTag(expected: string | undefined, actual: string | null): void {
  if (expected !== undefined && actual?.toLowerCase() !== expected) {
    throw new DirectEditError('stale_selection', STALE_SELECTION_MESSAGE);
  }
}

export const TEXT_NOT_EDITABLE_MESSAGE = 'This element has child elements; edit a leaf element or ask the agent';
