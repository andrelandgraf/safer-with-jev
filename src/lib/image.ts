import jpeg from "jpeg-js";
import { PNG } from "pngjs";
import { HttpError } from "./http-error";
import { MAX_IMAGE_PIXELS } from "./limits";

export type ImageKind = "jpeg" | "png" | "webp";

const PNG_SIG = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]);
const MAX_CHUNK_WALK = 16_384;

function eq(bytes: Uint8Array, offset: number, expected: Uint8Array): boolean {
  if (bytes.length < offset + expected.length) {
    return false;
  }
  for (let i = 0; i < expected.length; i += 1) {
    if (bytes[offset + i] !== expected[i]) {
      return false;
    }
  }
  return true;
}

function readU32BE(bytes: Uint8Array, offset: number): number {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return view.getUint32(offset);
}

function readU32LE(bytes: Uint8Array, offset: number): number {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return view.getUint32(offset, true);
}

function invalidImage(message: string): HttpError {
  return new HttpError(422, "invalid_image", message, "validation");
}

function sniff(bytes: Uint8Array): ImageKind | null {
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xd8) {
    return "jpeg";
  }
  if (eq(bytes, 0, PNG_SIG)) {
    return "png";
  }
  if (
    bytes.length >= 12 &&
    eq(bytes, 0, Uint8Array.from([82, 73, 70, 70])) &&
    eq(bytes, 8, Uint8Array.from([87, 69, 66, 80]))
  ) {
    return "webp";
  }
  return null;
}

function mimeFor(kind: ImageKind): string {
  if (kind === "jpeg") {
    return "image/jpeg";
  }
  if (kind === "png") {
    return "image/png";
  }
  return "image/webp";
}

function jpegDimensions(bytes: Uint8Array): { width: number; height: number } {
  let offset = 2;
  let steps = 0;
  while (offset + 4 < bytes.length) {
    steps += 1;
    if (steps > MAX_CHUNK_WALK) {
      throw invalidImage("JPEG markers are corrupt.");
    }
    if (bytes[offset] !== 0xff) {
      throw invalidImage("JPEG markers are corrupt.");
    }
    const marker = bytes[offset + 1];
    if (marker === undefined) {
      break;
    }
    if (marker === 0xda || marker === 0xd9) {
      break;
    }
    if (marker >= 0xd0 && marker <= 0xd7) {
      offset += 2;
      continue;
    }
    const size = (bytes[offset + 2]! << 8) + bytes[offset + 3]!;
    if (size < 2) {
      throw invalidImage("JPEG markers are corrupt.");
    }
    if (
      (marker >= 0xc0 && marker <= 0xc3) ||
      (marker >= 0xc5 && marker <= 0xc7) ||
      (marker >= 0xc9 && marker <= 0xcb) ||
      (marker >= 0xcd && marker <= 0xcf)
    ) {
      if (offset + 9 >= bytes.length) {
        throw invalidImage("JPEG SOF is truncated.");
      }
      const height = (bytes[offset + 5]! << 8) + bytes[offset + 6]!;
      const width = (bytes[offset + 7]! << 8) + bytes[offset + 8]!;
      return { width, height };
    }
    const next = offset + 2 + size;
    if (next <= offset || next > bytes.length) {
      throw invalidImage("JPEG is truncated.");
    }
    offset = next;
  }
  throw invalidImage("JPEG is missing a frame header.");
}

function pngInfo(bytes: Uint8Array): { width: number; height: number; animated: boolean } {
  if (bytes.length < 33) {
    throw invalidImage("PNG is truncated.");
  }
  const ihdrLen = readU32BE(bytes, 8);
  if (ihdrLen !== 13 || !eq(bytes, 12, Uint8Array.from([73, 72, 68, 82]))) {
    throw invalidImage("PNG IHDR is invalid.");
  }
  const width = readU32BE(bytes, 16);
  const height = readU32BE(bytes, 20);
  let offset = 8;
  let animated = false;
  let sawIend = false;
  let steps = 0;
  while (offset + 8 <= bytes.length) {
    steps += 1;
    if (steps > MAX_CHUNK_WALK) {
      throw invalidImage("PNG is truncated.");
    }
    const length = readU32BE(bytes, offset);
    if (offset + 12 + length > bytes.length) {
      throw invalidImage("PNG is truncated.");
    }
    const type = String.fromCharCode(
      bytes[offset + 4]!,
      bytes[offset + 5]!,
      bytes[offset + 6]!,
      bytes[offset + 7]!,
    );
    if (type === "acTL") {
      animated = true;
    }
    const next = offset + 12 + length;
    if (next <= offset) {
      throw invalidImage("PNG is truncated.");
    }
    offset = next;
    if (type === "IEND") {
      sawIend = true;
      break;
    }
  }
  if (!sawIend) {
    throw invalidImage("PNG is truncated.");
  }
  return { width, height, animated };
}

function webpInfo(bytes: Uint8Array): { width: number; height: number; animated: boolean } {
  const riffSize = readU32LE(bytes, 4);
  if (8 + riffSize > bytes.length) {
    throw invalidImage("WebP is truncated.");
  }
  let offset = 12;
  let animated = false;
  let width = 0;
  let height = 0;
  let sawBitmap = false;
  let steps = 0;
  while (offset + 8 <= bytes.length) {
    steps += 1;
    if (steps > MAX_CHUNK_WALK) {
      throw invalidImage("WebP is truncated.");
    }
    const type = String.fromCharCode(
      bytes[offset]!,
      bytes[offset + 1]!,
      bytes[offset + 2]!,
      bytes[offset + 3]!,
    );
    const size = readU32LE(bytes, offset + 4);
    const dataStart = offset + 8;
    const payloadEnd = dataStart + size;
    if (payloadEnd > bytes.length) {
      throw invalidImage("WebP is truncated.");
    }
    if (type === "VP8X") {
      if (size < 10) {
        throw invalidImage("WebP is truncated.");
      }
      const flags = bytes[dataStart]!;
      animated = (flags & 0x02) !== 0;
      width = 1 + (bytes[dataStart + 4]! | (bytes[dataStart + 5]! << 8) | (bytes[dataStart + 6]! << 16));
      height = 1 + (bytes[dataStart + 7]! | (bytes[dataStart + 8]! << 8) | (bytes[dataStart + 9]! << 16));
    }
    if (type === "VP8 " && size >= 10) {
      sawBitmap = true;
      if (width === 0 || height === 0) {
        width = (bytes[dataStart + 6]! | (bytes[dataStart + 7]! << 8)) & 0x3fff;
        height = (bytes[dataStart + 8]! | (bytes[dataStart + 9]! << 8)) & 0x3fff;
      }
    }
    if (type === "VP8L" && size >= 5) {
      sawBitmap = true;
      if (width === 0 || height === 0) {
        const bits =
          bytes[dataStart + 1]! |
          (bytes[dataStart + 2]! << 8) |
          (bytes[dataStart + 3]! << 16) |
          (bytes[dataStart + 4]! << 24);
        width = (bits & 0x3fff) + 1;
        height = ((bits >> 14) & 0x3fff) + 1;
      }
    }
    if (type === "ANIM" || type === "ANMF") {
      animated = true;
    }
    const next = payloadEnd + (size % 2);
    if (next <= offset) {
      throw invalidImage("WebP is truncated.");
    }
    offset = next;
  }
  if (animated) {
    throw invalidImage("Animated images are not accepted.");
  }
  if (!sawBitmap || width === 0 || height === 0) {
    throw invalidImage("WebP is missing dimensions.");
  }
  return { width, height, animated };
}

function decodeJpeg(bytes: Uint8Array, width: number, height: number): void {
  try {
    const decoded = jpeg.decode(Buffer.from(bytes), {
      maxResolutionInMP: MAX_IMAGE_PIXELS / 1_000_000,
      maxMemoryUsageInMB: 96,
    });
    if (decoded.width !== width || decoded.height !== height) {
      throw invalidImage("JPEG dimensions do not match the decoded frame.");
    }
  } catch (error) {
    if (error instanceof HttpError) {
      throw error;
    }
    throw invalidImage("JPEG is truncated.");
  }
}

function decodePng(bytes: Uint8Array, width: number, height: number): void {
  try {
    const decoded = PNG.sync.read(Buffer.from(bytes));
    if (decoded.width !== width || decoded.height !== height) {
      throw invalidImage("PNG dimensions do not match the decoded frame.");
    }
  } catch (error) {
    if (error instanceof HttpError) {
      throw error;
    }
    throw invalidImage("PNG is truncated.");
  }
}

export function inspectImage(bytes: Uint8Array, declaredMime: string): {
  kind: ImageKind;
  mime: string;
} {
  const kind = sniff(bytes);
  if (!kind) {
    throw invalidImage("Only static JPEG, PNG, or WebP is accepted.");
  }
  const mime = mimeFor(kind);
  const declared = declaredMime.split(";")[0]?.trim().toLowerCase() ?? "";
  const aliases = kind === "jpeg" ? ["image/jpeg", "image/jpg"] : [mime];
  if (!aliases.includes(declared)) {
    throw new HttpError(415, "mime_mismatch", "Content-Type does not match the image bytes.", "validation");
  }

  const info =
    kind === "jpeg"
      ? { ...jpegDimensions(bytes), animated: false }
      : kind === "png"
        ? pngInfo(bytes)
        : webpInfo(bytes);

  if (info.animated) {
    throw invalidImage("Animated images are not accepted.");
  }
  if (info.width < 1 || info.height < 1 || info.width * info.height > MAX_IMAGE_PIXELS) {
    throw invalidImage("Image dimensions exceed the decoder limit.");
  }
  if (kind === "jpeg") {
    decodeJpeg(bytes, info.width, info.height);
  } else if (kind === "png") {
    decodePng(bytes, info.width, info.height);
  }
  return { kind, mime };
}
