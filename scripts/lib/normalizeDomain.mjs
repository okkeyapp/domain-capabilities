/**
 * Normalize hostname to a catalog lookup key (registrable domain heuristic).
 * Strips www.; uses last two labels for multi-part hosts (co.uk not handled).
 */
export function normalizeDomain(input) {
  let raw = String(input ?? "").trim().toLowerCase();
  if (!raw) {
    return "";
  }
  raw = raw.replace(/^https?:\/\//, "");
  const host = raw.replace(/^www\./, "").split("/")[0]?.split(":")[0] ?? "";
  if (!host) {
    return "";
  }
  const parts = host.split(".").filter(Boolean);
  if (parts.length <= 2) {
    return host;
  }
  return parts.slice(-2).join(".");
}
