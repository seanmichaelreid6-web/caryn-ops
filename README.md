# caryn-ops

Home of the **Outlook Email → Markdown Archive** — a drag-and-drop tool that
files `.msg`, `.eml`, and PDF emails (or a `.zip` of emails) into organized
folders. It extracts regular attachments from Outlook files automatically and
adds a readable text version of each spreadsheet, document and PDF. When every
saved message from the same thread is dropped together, it combines the
messages and all their attachments into one archive folder. A running
`email-index.csv` lists everything filed, and already-filed emails are skipped.

- **The tool:** [`tools/email-pdf-to-markdown.html`](tools/email-pdf-to-markdown.html) —
  a single file that runs entirely in your web browser. Download it, double-click
  it, and drop your email PDFs on it. Nothing is uploaded anywhere.
- **Instructions:** [`tools/README.md`](tools/README.md) — how to download it,
  how to use it, and what to expect.
- **Source code:** [`tools/src/`](tools/src/) — for developers who want to
  modify or rebuild the tool.
