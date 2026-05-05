# caryn-ops/tracker

Desktop app + CLI that ingests `.msg` emails (and chat transcripts), routes
each one to a Confluence page using a fuzzy match against
`Confluence_Pages_Directory.docx`, and uses Claude to draft three reusable
artifacts — Confluence status update, Jira action items, stakeholder email
reply — that you can copy or push to Confluence with one click.

```
   data/inbox/*.msg          ┐
   data/transcripts/*.md     ├─►  per-email folder under data/projects/<subject>/
   data/attachments/*        ┘    ├── <subject>.msg
                                  ├── attachments/   (extracted from .msg)
                                  ├── context.json   (parsed metadata + body + mapping)
                                  └── synthesis.json (Claude's 3 outputs, cached)
                                            │
                                            ▼
                              ┌─ Copy buttons (Confluence / Jira / Email)
                              └─ Push button → Confluence page (status panel + attachments)
```

## What the app gives you

- **Drop zone** for `.msg` files. Drag from Outlook or pick a file.
- **Recent list** with status icons, attachment chips, and the resolved project.
- **Synthesis modal** with three sections, each independently copyable.
- **Manual push to Confluence** — the panel only goes live when you click.
- **Per-email folder layout** so attachments stay tied to the email they came with.

## Quick start

```powershell
# 1. Install deps (once)
cd tracker
npm install

# 2. Configure
copy .env.example .env
# Fill in ATLASSIAN_API_TOKEN and ANTHROPIC_API_KEY in .env, then close it.

# 3. Drop your real Confluence_Pages_Directory.docx into ./data/

# 4. Run the desktop app
npm run dev
```

The first thing the app does is start watching `data/inbox/`. Drop a `.msg`
there — or onto the app's drop zone — and within ~1 second a new project
folder appears under `data/projects/<subject>/`.

## The flow inside the app

1. **Ingest.** A `.msg` lands in the inbox. The watcher extracts the email,
   pulls every attachment into `data/projects/<subject>/attachments/`, and
   writes a `context.json` with the parsed body, sender, recipients, and
   attachment hashes.
2. **Map.** The fuzzy matcher resolves the subject + sender + recipients
   against the routing table in `Confluence_Pages_Directory.docx`. The result
   is shown as a green chip ("→ ICHRA Carrier Onboarding") or, if no match,
   an orange "unmapped" chip — at which point you'd add an `(aka …)` alias to
   the directory and click Rebuild.
3. **Synthesize.** Click "Draft update" on a row. The app calls Claude with
   the email body + the routing table cached in the system prompt (so the
   second-onwards call costs ~10× less). Output is three blocks:
   - Confluence Status — markdown bullets for the page panel.
   - Jira Action Items — a list of `{title, description, projectHint}` objects.
   - Stakeholder Email — a draft reply in your voice.
4. **Copy or push.** Each block has a Copy button. The Confluence Status block
   also has a "Push to Confluence" button — that's the only thing in the
   product that writes externally. It updates the resolved page with a
   `Status Update — YYYY-MM-DD` panel and uploads any attachments not already
   on the page (deduped by sha256 stored in the upload `comment`).

Re-running synthesis is fine — it appends to the front of `syntheses[]` in
`context.json`. Re-pushing the same day is also idempotent (the prior
same-day panel is replaced, not stacked).

## Verification

Run the connection check before relying on the push button:

```powershell
npm run verify
```

Ends with `✔ Confluence REST reachable. Authenticated as <you>.` on success.
The Atlassian MCP connector that the IDE uses is a separate auth path; this
verifier proves the desktop app's REST call will work too.

## Claude details

- **Model:** `claude-opus-4-7` (latest Opus). Adaptive thinking only —
  `temperature` and `budget_tokens` are not used.
- **Prompt caching:** The system prompt (your role, the 56-entry routing
  table, your writing style guide) is marked `cache_control: ephemeral`.
  First call writes the cache (~1.25× cost), subsequent calls within 5
  minutes read it (~0.1× cost). The `cache hit: N tok` chip in the modal
  shows when this is working.
- **Structured output:** Uses `client.messages.parse()` with a Zod schema —
  the response is validated end-to-end and lands in `parsed_output` typed.

## CLI mode (legacy)

The original CLI commands still work for headless usage:

```powershell
npm run verify         # Confluence connection check
npm run index          # Rebuild fuzzy routing table from .docx
npm run -- match "Re: ICHRA carrier sync"   # Test a title
npm run ingest         # Batch-ingest transcripts/.msg/attachments → daily_tracking.json
npm run sync [day]     # Push aggregated daily panels to Confluence
npm run loop -- 600000 # Run ingest+sync every 10 minutes
```

CLI mode predates the desktop app and is still fine for unattended hosts.
The desktop app uses the same shared library (`src/`), so the matcher and
Confluence client are identical between the two paths.

## Tests

```powershell
npm test
```

Covers the fuzzy matcher (token overlap, alias hit, fuzzy fallback,
no-match) and the synthesis-block merge (idempotent re-merge).
