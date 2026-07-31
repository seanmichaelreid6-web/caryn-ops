# Email PDF → Markdown converter

`email-pdf-to-markdown.html` is a single-file tool that turns emails you've
saved as PDFs into organized folders with Markdown files inside. It runs
entirely in your web browser — no installation, no internet connection needed,
and your emails never leave your computer.

It reads both kinds of email PDFs:

- **Normal PDFs** (made with "Save as PDF") — converted instantly.
- **Image-only PDFs** (made with "Microsoft Print to PDF", which saves the
  email as a picture) — read with the built-in OCR engine. This takes a few
  seconds per page.

## How to get it

1. Open `tools/email-pdf-to-markdown.html` in this repository on GitHub.
2. Click the **Download raw file** button (the down-arrow icon near the top right).
3. Save it anywhere on your computer — your Desktop is fine.

## One-time setup

1. Double-click the saved `email-pdf-to-markdown.html` file. It opens in your
   web browser (Chrome or Edge recommended).
2. Click **Choose folder** at the top and pick your email home folder — the
   folder that holds (or will hold) your category folders, for example a
   folder on your Desktop. The browser will ask you to allow access; click
   **Allow** (choose "Allow on every visit" if offered, so you aren't asked again).

## Converting an email

1. Drag the email PDF onto the drop area (or click it to pick the file).
   You can drop several at once.
2. The tool reads the email and suggests a name in the form
   **`Subject From Sender Month Day`** — for example
   `Rates and Cost for the Fixed Indemnity LM on Ind Product From MaryKate Ellis May 15`.
   Edit the name if you want (for example, shortening the sender to a first name).
3. Pick the category to file it under — your categories (Everest Emails,
   Optimed Agency Emails, Paysign emails, Billing Emails, IQ emails,
   FTC Emails, Sent emails) are built in, any folders already inside your home
   folder are offered too, and **+ New category folder…** creates a new one.
4. Click **Save to folder**. The tool creates:

   ```
   [your home folder]/
     Everest Emails/
       Rates and Cost ... From MaryKate Ellis May 15/     ← the email's folder
         Rates and Cost ... From MaryKate Ellis May 15.md ← the Markdown file
   ```

5. Drag the email's attachments into that same folder. If the email listed
   attachments, the Markdown file includes them as a checklist so you can
   confirm you've got them all.

## What the Markdown contains

The subject as a title, then each message in the thread with its
**From / Sent / To / Cc** lines, the attachment checklist, and the message
text. Characters not allowed in file names (`: / \ ? * " < > |`) are removed
automatically, and a `[Draft]` tag on the subject is stripped.

## Good to know

- The **date** in the name is the date of the latest message in the thread.
  Ambiguous numeric dates like `3/4/2026` are read the US way (March 4).
- **Firefox and Safari** can't create folders directly from a web page. There
  the Save button becomes **Download folder (.zip)** — unzip it inside your
  category folder and you get the same result.
- **Tip:** when saving emails from Outlook, choosing **Save as PDF** as the
  print destination (instead of **Microsoft Print to PDF**) produces PDFs
  with real text — they convert instantly and with perfect accuracy, and
  they're searchable too. Image-only PDFs still work via OCR, but OCR can
  occasionally misread a character.
- If the tool can't find a subject, sender, or date, it falls back to the
  PDF's own title and stored date and tells you what it did — and you can
  always edit the name before saving.

## Rebuilding the tool (for developers)

The tool is generated from `src/app.html` (page, parsing, and UI logic) with
[pdf.js](https://mozilla.github.io/pdf.js/) (PDF reading) and
[tesseract.js](https://tesseract.projectnaptha.com/) (OCR) inlined so the
single file works offline:

```bash
cd tools/src
npm install pdfjs-dist@3.11.174 tesseract.js@5 --no-save
curl -sSL -o eng.traineddata https://raw.githubusercontent.com/tesseract-ocr/tessdata_fast/4.1.0/eng.traineddata
gzip -9 eng.traineddata
node build.mjs
```

This rewrites `tools/email-pdf-to-markdown.html`.
