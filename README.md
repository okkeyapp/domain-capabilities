# Okkey domain capabilities catalog

Open JSON catalog mapping domains to **2FA (TOTP)** and **passkey** support. Used by [Okkey](https://github.com/okkeyapp/okkey) Monitoring for gap detection (e.g. “2FA available but not configured”).

## Data sources

| Source | URL | License |
|--------|-----|---------|
| 2FA Directory | https://api.2fa.directory/v4/all.json | MIT — attribution required |
| Passkeys Directory | https://passkeys-api.2fa.directory/v1/supported.json | See upstream repo |

Manual overrides: [`data/overrides.yaml`](data/overrides.yaml).

## Update schedule

GitHub Actions runs **every Monday** ([`.github/workflows/weekly-import.yml`](.github/workflows/weekly-import.yml)):

1. Fetch upstream JSON
2. Merge + apply overrides
3. Commit `data/catalog.json` and `data/manifest.json` if changed

Manual run: **Actions → Weekly catalog import → Run workflow**.

No separate server is required — Actions runners perform the import.

## Consume (raw GitHub)

```text
# Version check (small)
https://raw.githubusercontent.com/okkey/domain-capabilities/main/data/manifest.json

# Full catalog
https://raw.githubusercontent.com/okkey/domain-capabilities/main/data/catalog.json
```

## Local development

```bash
npm ci
npm run import   # refresh data/
npm test
```

## Attribution

When displaying catalog-derived data to users, include:

> Data sourced from [2FA Directory](https://2fa.directory) by 2factorauth.

See [ATTRIBUTION.md](ATTRIBUTION.md).
