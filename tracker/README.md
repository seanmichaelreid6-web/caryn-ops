# caryn-ops/tracker

Master project tracker. Ingests three sources, maps each activity to a
Confluence page via a fuzzy lookup against `Confluence_Pages_Directory.docx`,
and pushes a daily "Status Update" block + new attachments to the right page.

## Inputs

| Source | Path (env var) | Notes |
| --- | --- | --- |
| Curated chat transcripts | `TRANSCRIPTS_DIR` | `.md`, `.txt`, or `.json` |
| Outlook `.msg` + attachments | `MSG_DIR` | Embedded attachments are extracted to `ATTACHMENTS_DIR/<msg-stem>/` |
| Standalone attachment folders | `ATTACHMENTS_DIR` | First sub-folder name acts as a project hint |
| Confluence Pages Directory | `DIRECTORY_DOCX` | `.docx` (or `.txt`/`.md` fallback) |

## Outputs

- `data/state/project_index.json` — parsed directory + aliases.
- `data/state/daily_tracking.json` — append-only master log of every event,
  with mapped project + sync state.
- Confluence page updates — a `Status Update — YYYY-MM-DD` info panel,
  prepended to the page body and idempotent on re-runs.
- Confluence attachments — uploaded with comment `tracker-sha256:<hash>`,
  which is how we dedupe across runs.

## Setup

```bash
cd tracker
npm install
cp .env.example .env
# Fill in ATLASSIAN_API_TOKEN (https://id.atlassian.com/manage-profile/security/api-tokens)
# Drop your Confluence_Pages_Directory.docx into ./data/
```

## Verification

The Atlassian connection has two layers:

1. **MCP layer** — `carynhealth.atlassian.net` (cloudId
   `6347e5f2-420c-4290-a4d0-c0adb614e411`) is already wired through the
   Atlassian MCP connector, with `read:page:confluence`,
   `write:page:confluence`, and `read:space:confluence` scopes.
   This is what Claude uses for ad-hoc reads/writes during development.
2. **REST layer** — the backend itself uses `email + API token` Basic auth
   against the Confluence Cloud REST API v2 so it can run on a schedule
   without an interactive Claude session.

Run the verifier:

```bash
npm run verify
```

Expected output ends with `✔ Confluence REST reachable. Authenticated as <you>.`.
If it errors, the most common causes are:

- Empty `ATLASSIAN_API_TOKEN` — generate one and re-export.
- Token mismatched against `ATLASSIAN_EMAIL` — must be the same account.
- 401/403 — your Confluence permissions don't include the target space.

## Daily flow

```bash
npm run index    # rebuild fuzzy index from the .docx
npm run ingest   # transcripts + .msg + attachments → daily_tracking.json
npm run sync     # push status blocks + attachments to Confluence
# or do it all on a timer:
npm run loop -- 600000   # every 10 minutes
```

## Mapping nuanced meeting titles

The matcher runs three passes in order:

1. **Exact (normalized)** — case/punctuation/date-insensitive equality.
2. **Token overlap** — useful when titles are wrapped in noise like
   `"Re: ICHRA Carrier Onboarding — weekly sync 2025-05-01"`. Stop-words
   (`weekly`, `sync`, `re:`, `1:1`, dates, …) are stripped before scoring.
3. **Fuzzy** — Fuse.js across the title + every alias from the directory,
   gated by `FUZZY_THRESHOLD` (default `0.42`).

When a title still doesn't match, run:

```bash
npm run -- match "Re: weird title"
```

If it returns nothing, add an alias to the directory entry, e.g.:

```
ICHRA Carrier Onboarding — https://…/pages/60588040 (aka ICHRA Onboarding; Carrier Onboarding; weird title)
```

…and re-run `npm run index`.

## Status block format

Each sync prepends an info panel like:

```
ℹ Status Update — 2025-05-01
   Aggregated from 3 activity event(s) by caryn-ops/tracker.
   • 14:00 · Transcript — kickoff (Sean, Manoj)
   • 16:00 · Email — follow-up email
   • 17:30 · Attachment — 2 attachment(s)  [purple status lozenge]
   Generated 2025-05-01T18:02:11.000Z
```

Re-running the sync for the same day overwrites the prior block instead
of stacking duplicates.

## Tests

```bash
npm test
```

Covers the fuzzy matcher (token overlap, alias hit, fuzzy fallback,
no-match) and the synthesis/merge logic (block emission + idempotent
re-merge).
