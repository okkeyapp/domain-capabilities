#!/usr/bin/env node
import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";

import {
  applyOverrides,
  mergeFromTwoFaDirectory,
  mergePasskeysDirectory,
  PASSKEYS_URL,
  TWO_FA_URL,
} from "./lib/mergeCatalog.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const dataDir = path.join(rootDir, "data");
const catalogPath = path.join(dataDir, "catalog.json");
const manifestPath = path.join(dataDir, "manifest.json");
const overridesPath = path.join(dataDir, "overrides.yaml");

const FETCH_TIMEOUT_MS = 60_000;

/**
 * @param {string} url
 */
async function fetchJson(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "OkkeyDomainCapabilitiesImporter/1.0" },
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} for ${url}`);
    }
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

function sha256Hex(text) {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

function versionFromDate(date = new Date()) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}.${m}.${d}`;
}

async function loadOverrides() {
  try {
    const raw = await readFile(overridesPath, "utf8");
    const parsed = parseYaml(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    if (/** @type {NodeJS.ErrnoException} */ (error).code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

export async function runImport(options = {}) {
  const now = options.now ?? new Date();
  const version = options.version ?? versionFromDate(now);
  const generatedAt = now.toISOString();

  const [twoFaJson, passkeysJson, overrides] = await Promise.all([
    options.twoFaJson ?? fetchJson(TWO_FA_URL),
    options.passkeysJson ?? fetchJson(PASSKEYS_URL),
    options.overrides ?? loadOverrides(),
  ]);

  let entries = mergeFromTwoFaDirectory(twoFaJson);
  entries = mergePasskeysDirectory(entries, passkeysJson);
  entries = applyOverrides(entries, overrides);

  const catalogBody = {
    version,
    generatedAt,
    entries,
  };
  const catalogJson = `${JSON.stringify(catalogBody, null, 2)}\n`;
  const sha256 = sha256Hex(catalogJson);

  const catalogWithHash = {
    version,
    generatedAt,
    sha256,
    entries,
  };
  const catalogJsonFinal = `${JSON.stringify(catalogWithHash, null, 2)}\n`;

  const manifest = {
    version,
    generatedAt,
    sha256,
    entryCount: Object.keys(entries).length,
  };

  if (options.write !== false) {
    await mkdir(dataDir, { recursive: true });
    await writeFile(catalogPath, catalogJsonFinal, "utf8");
    await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  }

  return { catalog: catalogWithHash, manifest };
}

const isMain =
  process.argv[1] != null && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isMain) {
  runImport()
    .then(({ manifest }) => {
      console.info(
        `Catalog ${manifest.version}: ${manifest.entryCount} domains (sha256 ${manifest.sha256.slice(0, 12)}…)`,
      );
    })
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
}
