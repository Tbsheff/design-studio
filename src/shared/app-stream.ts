export const APP_STREAM_PATH = '/api/stream';
export const STREAM_HELLO = 'stream.hello';
export const STREAM_APPROVALS = 'stream.approvals';

export interface StreamHello {
  sid: string;
}

export interface StreamWatchRequest {
  watch?: Record<string, number>;
  unwatch?: string[];
}
