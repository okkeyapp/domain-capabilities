import { normalizeDomain } from "./normalizeDomain.mjs";

const TWO_FA_URL = "https://api.2fa.directory/v4/all.json";
const PASSKEYS_URL = "https://passkeys-api.2fa.directory/v1/supported.json";

/**
 * @typedef {{ supports2FA: boolean; supportsPasskeys: boolean; sources: string[] }} CatalogEntry
 * @typedef {Record<string, CatalogEntry>} CatalogEntries
 */

/**
 * @param {unknown} twoFaJson
 * @returns {CatalogEntries}
 */
export function mergeFromTwoFaDirectory(twoFaJson) {
  /** @type {CatalogEntries} */
  const entries = {};
  if (!twoFaJson || typeof twoFaJson !== "object") {
    return entries;
  }
  for (const [domainKey, value] of Object.entries(twoFaJson)) {
    const domain = normalizeDomain(domainKey);
    if (!domain) {
      continue;
    }
    const methods = value && typeof value === "object" && Array.isArray(value.methods) ? value.methods : [];
    const supports2FA = methods.includes("totp");
    if (!supports2FA) {
      continue;
    }
    entries[domain] = {
      supports2FA: true,
      supportsPasskeys: entries[domain]?.supportsPasskeys ?? false,
      sources: uniqueSources([...(entries[domain]?.sources ?? []), "2fa.directory"]),
    };
    const additional =
      value && typeof value === "object" && Array.isArray(value["additional-domains"])
        ? value["additional-domains"]
        : [];
    for (const alt of additional) {
      const altDomain = normalizeDomain(alt);
      if (!altDomain) {
        continue;
      }
      entries[altDomain] = {
        supports2FA: true,
        supportsPasskeys: entries[altDomain]?.supportsPasskeys ?? false,
        sources: uniqueSources([...(entries[altDomain]?.sources ?? []), "2fa.directory"]),
      };
    }
  }
  return entries;
}

/**
 * @param {CatalogEntries} entries
 * @param {unknown} passkeysJson
 * @returns {CatalogEntries}
 */
export function mergePasskeysDirectory(entries, passkeysJson) {
  const next = { ...entries };
  if (!passkeysJson || typeof passkeysJson !== "object") {
    return next;
  }
  const domains = Array.isArray(passkeysJson) ? passkeysJson : Object.keys(passkeysJson);
  if (Array.isArray(passkeysJson)) {
    for (const row of passkeysJson) {
      applyPasskeyEntry(next, row);
    }
    return next;
  }
  for (const [domainKey, value] of Object.entries(passkeysJson)) {
    applyPasskeyDomain(next, domainKey, value);
  }
  return next;
}

/**
 * @param {CatalogEntries} entries
 * @param {unknown} row
 */
function applyPasskeyEntry(entries, row) {
  if (!row || typeof row !== "object") {
    return;
  }
  const domain = normalizeDomain(/** @type {{ domain?: string }} */ (row).domain);
  if (domain) {
    applyPasskeyDomain(entries, domain, row);
  }
}

/**
 * @param {CatalogEntries} entries
 * @param {string} domainKey
 * @param {unknown} value
 */
function applyPasskeyDomain(entries, domainKey, value) {
  const domain = normalizeDomain(domainKey);
  if (!domain) {
    return;
  }
  const prev = entries[domain] ?? { supports2FA: false, supportsPasskeys: false, sources: [] };
  entries[domain] = {
    supports2FA: prev.supports2FA,
    supportsPasskeys: true,
    sources: uniqueSources([...prev.sources, "passkeys.directory"]),
  };
  const additional =
    value && typeof value === "object" && Array.isArray(value["additional-domains"])
      ? value["additional-domains"]
      : [];
  for (const alt of additional) {
    const altDomain = normalizeDomain(alt);
    if (!altDomain) {
      continue;
    }
    const altPrev = entries[altDomain] ?? { supports2FA: false, supportsPasskeys: false, sources: [] };
    entries[altDomain] = {
      supports2FA: altPrev.supports2FA,
      supportsPasskeys: true,
      sources: uniqueSources([...altPrev.sources, "passkeys.directory"]),
    };
  }
}

/**
 * @param {CatalogEntries} entries
 * @param {Array<{ domain: string; supports2FA?: boolean; supportsPasskeys?: boolean }>} overrides
 */
export function applyOverrides(entries, overrides) {
  const next = { ...entries };
  for (const row of overrides) {
    const domain = normalizeDomain(row.domain);
    if (!domain) {
      continue;
    }
    const prev = next[domain] ?? { supports2FA: false, supportsPasskeys: false, sources: [] };
    next[domain] = {
      supports2FA: row.supports2FA ?? prev.supports2FA,
      supportsPasskeys: row.supportsPasskeys ?? prev.supportsPasskeys,
      sources: uniqueSources([...prev.sources, "okkey.override"]),
    };
  }
  return next;
}

/** @param {string[]} sources */
function uniqueSources(sources) {
  return [...new Set(sources.filter(Boolean))];
}

export { TWO_FA_URL, PASSKEYS_URL };
