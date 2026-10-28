import type { SelectionContext } from '../shared/contracts';
import { IMAGE_BYTES_MAX, imageKindOf, type SetImageRequest, type SetImageResult } from '../shared/image';
import { ApiError, json } from './api';

const d = (pid: string, did: string) => `/api/projects/${encodeURIComponent(pid)}/d/${encodeURIComponent(did)}`;

export function imageTargetOf(selection: SelectionContext): SetImageRequest['target'] {
  return {
    source: selection.source,
    tag: selection.tag.toLowerCase(),
    selector: selection.selector,
    background: imageKindOf(selection) === 'background',
    ...(selection.source ? {} : { html: selection.outerHTML.slice(0, 4000) }),
    ...(selection.owners?.length ? { owners: selection.owners } : {}),
  };
}

export async function fileData(file: Blob & { name?: string }): Promise<{ name: string; data: string }> {
  if (file.size > IMAGE_BYTES_MAX) throw new Error('The image is larger than 10 MB.');
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = '';
  const step = 0x8000;
  for (let at = 0; at < bytes.length; at += step) binary += String.fromCharCode(...bytes.subarray(at, at + step));
  const ext = file.type.split('/')[1]?.replace('svg+xml', 'svg').replace('jpeg', 'jpg') ?? 'png';
  return { name: file.name || `pasted-image.${ext}`, data: btoa(binary) };
}

export function imageFileOf(list: DataTransferItemList | FileList | null | undefined): File | null {
  if (!list) return null;
  for (const item of Array.from(list as ArrayLike<DataTransferItem | File>)) {
    const file = item instanceof File ? item : item.kind === 'file' ? item.getAsFile() : null;
    if (file && file.type.startsWith('image/')) return file;
  }
  return null;
}

export async function clipboardImage(): Promise<Blob | null> {
  const items = await navigator.clipboard.read();
  for (const item of items) {
    const type = item.types.find((kind) => kind.startsWith('image/'));
    if (type) return item.getType(type);
  }
  return null;
}

export function imageError(error: unknown): string {
  if (error instanceof ApiError && typeof (error.data as { message?: unknown } | undefined)?.message === 'string') return (error.data as { message: string }).message;
  if (error instanceof Error) return error.message;
  return 'The image could not be placed.';
}

export const imageApi = {
  set: (pid: string, did: string, request: SetImageRequest) => json<SetImageResult>('POST', `${d(pid, did)}/image`, request),
};
