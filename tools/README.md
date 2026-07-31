# Email PDF → Markdown converter

`email-pdf-to-markdown.html` is a single-file tool that turns emails you've
saved as PDFs into Markdown documents. It runs entirely in your web browser —
no installation, no internet connection needed, and your emails never leave
your computer.

## How to get it

1. Open `tools/email-pdf-to-markdown.html` in this repository on GitHub.
2. Click the **Download raw file** button (the down-arrow icon near the top right).
3. Save it anywhere on your computer — your Desktop is fine.

## How to use it

1. Double-click the saved `email-pdf-to-markdown.html` file. It opens in your
   web browser (Chrome, Edge, or Firefox recommended).
2. Drag one or more email PDFs onto the drop area (or click it to pick files).
3. Each PDF is converted and the Markdown file downloads automatically to your
   Downloads folder. If your browser asks for permission to download multiple
   files, allow it.

## What you get

- **Filename:** `Subject line - YYYY-MM-DD.md`, where the date is the date of
  the **latest message** in the email thread. Characters that aren't allowed in
  filenames (`: / \ ? * " < > |`) are removed from the subject automatically.
- **Contents:** the subject as a title, then each message in the thread with
  its **From / Sent / To / Cc / Subject** lines followed by the message text,
  separated by horizontal rules.

## Good to know

- It's tuned for PDFs saved from **Outlook** (the `From:` / `Sent:` / `To:` /
  `Subject:` header style, including quoted earlier messages and
  `-----Original Message-----` separators). It also understands
  "On ‹date›, ‹name› wrote:" reply headers.
- If no subject can be found in the PDF, it falls back to the PDF's title or
  the PDF's filename. If no message date can be found, it falls back to the
  date stored inside the PDF file. The tool shows a note whenever it falls
  back, so you always know what it did.
- Ambiguous numeric dates like `3/4/2026` are read the US way (March 4).
  Written-out dates like `4 March 2026` are always read correctly.
- Scanned/image-only PDFs won't work — there's no text in them to extract.

## Rebuilding the tool (for developers)

The tool is generated from `src/app.html` (the page and all the logic) with
[pdf.js](https://mozilla.github.io/pdf.js/) inlined so the file works offline:

```bash
cd tools/src
npm install pdfjs-dist@3.11.174 --no-save
node build.mjs
```

This rewrites `tools/email-pdf-to-markdown.html`.
