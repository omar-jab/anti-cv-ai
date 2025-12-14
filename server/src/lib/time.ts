export function toIso(value: number | null) {
  return typeof value === "number" && value > 0
    ? new Date(value).toISOString()
    : null;
}
