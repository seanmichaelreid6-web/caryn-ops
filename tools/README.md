# Email → Context Library

`email-to-context.html` turns emails saved out of Outlook into an organized library
of Markdown files and original attachments — ready to feed to an AI assistant as
context. It runs entirely in your browser: no install, no internet, nothing uploaded.

**The key idea:** an email saved from Outlook as a `.eml` (or `.msg`) file already
contains the message *and* every attachment inside it. So there is no printing, no
scanning, and nothing to match up by filename — the tool opens the email and pulls
everything out.

## Step 1 — get the emails out of Outlook

**One email at a time:** right-click it in the message list → **Save as** →
**Save as EML**. (In Outlook on the web the command is **Download** → **Download as
EML**.) You can also drag a message straight from Outlook into a folder.

**Many at once** — the fast way for a backlog:
1. Select the emails you want (Ctrl-click, or Ctrl+A for a whole folder).
2. **Forward** → **Forward as attachment**. Each email becomes an attachment.
3. Send it to yourself.
4. Open that email and click **Download all** — you get one `.zip` containing all
   of them, each still carrying its own attachments.

If you still have **classic Outlook**, selecting many messages and dragging them
into a folder saves each as a `.msg` file — the fastest option of all. The tool
reads those too.

## Step 2 — one-time setup

1. Download `email-to-context.html` from this repository (open the file, click the
   **Download raw file** down-arrow) and save it anywhere — your Desktop is fine.
2. Double-click it. It opens in your browser (**Chrome or Edge** recommended).
3. Click **Choose folder** and pick your library folder — the folder that holds
   your category folders. Click **Allow** when the browser asks. It's remembered.

## Step 3 — file your emails

Pick the category, then drop `.eml`, `.msg`, or `.zip` files on the page — as many
at once as you like. For each email you get:

```
Everest Emails/
  Rates and Cost for the Fixed Indemnity LM on Ind Product From MaryKate Ellis May 15/
    email.md                        the email as Markdown, with real headers
    original.eml                    the untouched original — nothing is ever lost
    attachments/
      Individual Product ... breakdown.xlsx     original file, byte for byte
      Group Product Cost Grid.pdf
    attachments-as-text/
      Individual Product ... breakdown.md       the spreadsheet as a Markdown table
      Group Product Cost Grid.md                the PDF's text
```

`email.md` starts with a machine-readable header block (subject, from, to, cc,
date, message id, attachment list) followed by the message body converted to
Markdown — including quoted earlier messages in the thread.

`attachments-as-text/` holds readable versions of spreadsheets (`.xlsx`, `.csv`),
Word documents (`.docx`), PDFs and text files, so an AI can read their contents
directly. The originals are always kept alongside.

At the top of your library folder, **`email-index.csv`** grows with one row per
email — date, sender, recipients, subject, category, folder and message id. It is
the table of contents for the whole library, and it's how the tool knows not to
file the same email twice.

## Good to know

- **Duplicates are skipped.** Emails are identified by their Message-ID, so
  re-dropping the same email (or the same zip) won't create a second copy.
- **Automatic sorting** (optional checkbox): routes each email to a category whose
  name appears in the sender, recipients or subject. Leave it off to send
  everything to the category you picked.
- **Cloud attachments.** If a sender used a OneDrive/SharePoint link instead of
  attaching the file, the file is not inside the email. The tool lists those links
  in `email.md` under "Cloud links in this email" so you can grab them by hand.
- **Encrypted / "Do not forward" emails** can't be saved as .eml or .msg at all —
  that's a Microsoft restriction, not a tool limitation. Handle those separately.
- **Firefox and Safari** can't write folders from a web page. There, everything you
  drop is packaged into one `email-context.zip` with the same folder layout — unzip
  it into your library folder.
- **A tip that improves quality:** `.eml` from Outlook keeps the message text as
  real text, so conversion is exact. Scanned PDF attachments have no text inside
  them; the tool saves the original and tells you it couldn't read any text.

## The older PDF tool

`email-pdf-to-markdown.html` is the earlier tool that converts emails you already
printed to PDF, using OCR, and pulls matching attachments from a folder. Keep using
it for the backlog of PDFs you've already saved. For anything new, the .eml route
above is faster and lossless. See `README-pdf-tool.md`.

## Rebuilding (for developers)

`src/context-app.html` is the source; `src/build-context.mjs` inlines the library
bundle and pdf.js into the single distributable file. The header of
`build-context.mjs` lists the exact npm install and esbuild commands.
