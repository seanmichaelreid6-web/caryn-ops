# caryn-ops

Tools for turning a job's Outlook email into an organized, AI-readable context library.

## [Email → Context Library](tools/README.md) — the main tool

`tools/email-to-context.html` — drop emails saved from Outlook (`.eml`, `.msg`, or a
`.zip` of them) and each becomes its own folder holding a Markdown copy of the email,
the untouched original, and every attachment in its original form, extracted from
inside the email. Also keeps a running `email-index.csv` of everything filed, and
skips duplicates. Runs entirely in the browser; nothing is uploaded.

**[Full instructions →](tools/README.md)**

## [Email PDF → Markdown](tools/README-pdf-tool.md) — the older tool

`tools/email-pdf-to-markdown.html` — converts emails that were printed to PDF, using
built-in OCR, and pulls matching attachments from an Attachments folder. Useful for a
backlog of already-printed PDFs; for new emails prefer the tool above.
