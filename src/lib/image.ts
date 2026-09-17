import { HttpError } from "./http-error";
import { MAX_IMAGE_PIXELS } from "./limits";

export type ImageKind = "jpeg" | "png" | "webp";

const PNG_SIG = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]);

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

function readU32(bytes: Uint8Array, offset: number): number {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return view.getUint32(offset);
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
  while (offset + 4 < bytes.length) {
    if (bytes[offset] !== 0xff) {
      throw new HttpError(422, "invalid_image", "JPEG markers are corrupt.", "validation");
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
    if (
      (marker >= 0xc0 && marker <= 0xc3) ||
      (marker >= 0xc5 && marker <= 0xc7) ||
      (marker >= 0xc9 && marker <= 0xcb) ||
      (marker >= 0xcd && marker <= 0xcf)
    ) {
      if (offset + 9 >= bytes.length) {
        throw new HttpError(422, "invalid_image", "JPEG SOF is truncated.", "validation");
      }
      const height = (bytes[offset + 5]! << 8) + bytes[offset + 6]!;
      const width = (bytes[offset + 7]! << 8) + bytes[offset + 8]!;
      return { width, height };
    }
    offset += 2 + size;
  }
  throw new HttpError(422, "invalid_image", "JPEG is missing a frame header.", "validation");
}

function pngInfo(bytes: Uint8Array): { width: number; height: number; animated: boolean } {
  if (bytes.length < 33) {
    throw new HttpError(422, "invalid_image", "PNG is truncated.", "validation");
  }
  const ihdrLen = readU32(bytes, 8);
  if (ihdrLen !== 13 || !eq(bytes, 12, Uint8Array.from([73, 72, 68, 82]))) {
    throw new HttpError(422, "invalid_image", "PNG IHDR is invalid.", "validation");
  }
  const width = readU32(bytes, 16);
  const height = readU32(bytes, 20);
  let offset = 8;
  let animated = false;
  while (offset + 8 <= bytes.length) {
    const length = readU32(bytes, offset);
    const type = String.fromCharCode(
      bytes[offset + 4]!,
      bytes[offset + 5]!,
      bytes[offset + 6]!,
      bytes[offset + 7]!,
    );
    if (type === "acTL") {
      animated = true;
    }
    if (type === "IEND") {
      break;
    }
    offset += 12 + length;
  }
  return { width, height, animated };
}

function webpInfo(bytes: Uint8Array): { width: number; height: number; animated: boolean } {
  let offset = 12;
  let animated = false;
  let width = 0;
  let height = 0;
  while (offset + 8 <= bytes.length) {
    const type = String.fromCharCode(
      bytes[offset]!,
      bytes[offset + 1]!,
      bytes[offset + 2]!,
      bytes[offset + 3]!,
    );
    const size = bytes[offset + 4]! |
      (bytes[offset + 5]! << 8) |
      (bytes[offset + 6]! << 16) |
      (bytes[offset + 7]! << 24);
    const dataStart = offset + 8;
    if (type === "VP8X" && dataStart + 10 <= bytes.length) {
      const flags = bytes[dataStart]!;
      animated = (flags & 0x02) !== 0;
      width = 1 + (bytes[dataStart + 4]! | (bytes[dataStart + 5]! << 8) | (bytes[dataStart + 6]! << 16));
      height = 1 + (bytes[dataStart + 7]! | (bytes[dataStart + 8]! << 8) | (bytes[dataStart + 9]! << 16));
    }
    if (type === "ANIM" || type === "ANMF") {
      animated = true;
    }
    offset = dataStart + size + (size % 2);
  }
  if (width === 0 || height === 0) {
    throw new HttpError(422, "invalid_image", "WebP is missing dimensions.", "validation");
  }
  return { width, height, animated };
}

export function inspectImage(bytes: Uint8Array, declaredMime: string): {
  kind: ImageKind;
  mime: string;
} {
  const kind = sniff(bytes);
  if (!kind) {
    throw new HttpError(422, "invalid_image", "Only static JPEG, PNG, or WebP is accepted.", "validation");
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
    throw new HttpError(422, "invalid_image", "Animated images are not accepted.", "validation");
  }
  if (info.width < 1 || info.height < 1 || info.width * info.height > MAX_IMAGE_PIXELS) {
    throw new HttpError(422, "invalid_image", "Image dimensions exceed the decoder limit.", "validation");
  }
  return { kind, mime };
}
