export type QueryValue =
  | { kind: "missing" }
  | { kind: "value"; value: string }
  | { kind: "repeated" };

export function singleQueryParam(
  searchParams: Record<string, string | string[] | undefined>,
  name: string,
): QueryValue {
  const raw = searchParams[name];
  if (raw === undefined) {
    return { kind: "missing" };
  }
  if (Array.isArray(raw)) {
    if (raw.length === 0) {
      return { kind: "missing" };
    }
    if (raw.length > 1) {
      return { kind: "repeated" };
    }
    return { kind: "value", value: raw[0] ?? "" };
  }
  return { kind: "value", value: raw };
}

export function prefillOrEmpty(value: QueryValue, fallback: string): string {
  if (value.kind === "missing") {
    return fallback;
  }
  if (value.kind === "repeated") {
    return "";
  }
  return value.value;
}
