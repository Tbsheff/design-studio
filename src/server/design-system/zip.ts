import { deflateRawSync, inflateRawSync } from 'node:zlib';

export interface ZipEntry {
  name: string;
  data: Buffer;
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(data: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of data) crc = (CRC_TABLE[(crc ^ byte) & 0xff] ?? 0) ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function dosTime(date: Date): { time: number; day: number } {
  const time = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
  const day = ((Math.max(1980, date.getFullYear()) - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
  return { time, day };
}

export function zipFiles(entries: ZipEntry[], date: Date = new Date()): Buffer {
  const { time, day } = dosTime(date);
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;
  for (const entry of entries) {
    const name = Buffer.from(entry.name, 'utf8');
    const packed = deflateRawSync(entry.data);
    const crc = crc32(entry.data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6);
    local.writeUInt16LE(8, 8);
    local.writeUInt16LE(time, 10);
    local.writeUInt16LE(day, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(packed.length, 18);
    local.writeUInt32LE(entry.data.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(8, 10);
    central.writeUInt16LE(time, 12);
    central.writeUInt16LE(day, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(packed.length, 20);
    central.writeUInt32LE(entry.data.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt32LE((0o100644 << 16) >>> 0, 38);
    central.writeUInt32LE(offset, 42);
    locals.push(local, name, packed);
    centrals.push(central, name);
    offset += local.length + name.length + packed.length;
  }
  const centralSize = centrals.reduce((sum, part) => sum + part.length, 0);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralSize, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, ...centrals, end]);
}

export interface UnzipLimits {
  maxEntries: number;
  maxEntryBytes: number;
  maxTotalBytes: number;
}

export class ZipError extends Error {}

const EOCD_SIGNATURE = 0x06054b50;
const CENTRAL_SIGNATURE = 0x02014b50;
const LOCAL_SIGNATURE = 0x04034b50;
const EOCD_MIN = 22;
const MAX_COMMENT = 0xffff;
const S_IFMT = 0o170000;
const S_IFREG = 0o100000;

function findEnd(bytes: Buffer): number {
  const stop = Math.max(0, bytes.length - EOCD_MIN - MAX_COMMENT);
  for (let at = bytes.length - EOCD_MIN; at >= stop; at -= 1) if (bytes.readUInt32LE(at) === EOCD_SIGNATURE) return at;
  throw new ZipError('not a zip file');
}

function inflate(packed: Buffer, method: number, size: number, limit: number): Buffer {
  if (method === 0) return packed;
  try {
    return inflateRawSync(packed, { maxOutputLength: Math.min(size, limit) + 1 });
  } catch {
    throw new ZipError('a file in the zip is damaged or too large');
  }
}

interface CentralEntry {
  name: string;
  flags: number;
  method: number;
  crc: number;
  packedSize: number;
  size: number;
  unixMode: number;
  localAt: number;
  next: number;
}

function readCentral(bytes: Buffer, at: number, end: number): CentralEntry {
  if (at + 46 > end || bytes.readUInt32LE(at) !== CENTRAL_SIGNATURE) throw new ZipError('not a zip file');
  const nameLength = bytes.readUInt16LE(at + 28);
  const skip = bytes.readUInt16LE(at + 30) + bytes.readUInt16LE(at + 32);
  const madeByUnix = bytes.readUInt16LE(at + 4) >> 8 === 3;
  return {
    name: bytes.subarray(at + 46, at + 46 + nameLength).toString('utf8'),
    flags: bytes.readUInt16LE(at + 8),
    method: bytes.readUInt16LE(at + 10),
    crc: bytes.readUInt32LE(at + 16),
    packedSize: bytes.readUInt32LE(at + 20),
    size: bytes.readUInt32LE(at + 24),
    unixMode: madeByUnix ? bytes.readUInt32LE(at + 38) >>> 16 : 0,
    localAt: bytes.readUInt32LE(at + 42),
    next: at + 46 + nameLength + skip,
  };
}

function checkEntry(entry: CentralEntry, limits: UnzipLimits): void {
  const { name } = entry;
  if (entry.flags & 0x1) throw new ZipError('encrypted zips are not supported');
  if (entry.method !== 0 && entry.method !== 8) throw new ZipError(`${name} uses a compression method that is not supported`);
  if (name.endsWith('/')) throw new ZipError(`folder entries are not allowed: ${name}`);
  if (entry.unixMode !== 0 && (entry.unixMode & S_IFMT) !== S_IFREG) throw new ZipError(`${name} is not a regular file`);
  if (entry.size > limits.maxEntryBytes) throw new ZipError(`${name} is larger than ${Math.round(limits.maxEntryBytes / 1024)} KB`);
}

function readData(bytes: Buffer, entry: CentralEntry, centralStart: number, limits: UnzipLimits): Buffer {
  const { localAt } = entry;
  if (localAt + 30 > centralStart || bytes.readUInt32LE(localAt) !== LOCAL_SIGNATURE) throw new ZipError('not a zip file');
  const dataAt = localAt + 30 + bytes.readUInt16LE(localAt + 26) + bytes.readUInt16LE(localAt + 28);
  if (dataAt + entry.packedSize > centralStart) throw new ZipError('not a zip file');
  const data = inflate(bytes.subarray(dataAt, dataAt + entry.packedSize), entry.method, entry.size, limits.maxEntryBytes);
  if (data.length !== entry.size || crc32(data) !== entry.crc) throw new ZipError(`${entry.name} is damaged`);
  return Buffer.from(data);
}

function readDirectory(bytes: Buffer, limits: UnzipLimits): { count: number; centralStart: number; end: number } {
  if (bytes.length < EOCD_MIN) throw new ZipError('not a zip file');
  const end = findEnd(bytes);
  const count = bytes.readUInt16LE(end + 10);
  const centralSize = bytes.readUInt32LE(end + 12);
  const centralStart = bytes.readUInt32LE(end + 16);
  if (count === 0xffff || centralStart === 0xffffffff || bytes.readUInt16LE(end + 4) !== 0 || bytes.readUInt16LE(end + 8) !== count) throw new ZipError('zip64 and multi-part zips are not supported');
  if (count > limits.maxEntries) throw new ZipError(`the zip has more than ${limits.maxEntries} entries`);
  if (centralStart + centralSize > end) throw new ZipError('not a zip file');
  return { count, centralStart, end };
}

export function unzipFiles(bytes: Buffer, limits: UnzipLimits): ZipEntry[] {
  const { count, centralStart, end } = readDirectory(bytes, limits);
  const entries: ZipEntry[] = [];
  const seen = new Set<string>();
  let total = 0;
  let at = centralStart;
  for (let index = 0; index < count; index += 1) {
    const entry = readCentral(bytes, at, end);
    at = entry.next;
    checkEntry(entry, limits);
    if (seen.has(entry.name)) throw new ZipError(`${entry.name} is in the zip more than once`);
    seen.add(entry.name);
    total += entry.size;
    if (total > limits.maxTotalBytes) throw new ZipError(`the zip contents are larger than ${Math.round(limits.maxTotalBytes / 1024)} KB`);
    entries.push({ name: entry.name, data: readData(bytes, entry, centralStart, limits) });
  }
  return entries;
}
