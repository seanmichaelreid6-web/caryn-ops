# Outlook Email → Markdown Archive

`email-pdf-to-markdown.html` is a single-file, offline tool that turns saved
Outlook emails into organized folders for your context system. Despite the old
filename (kept so existing links do not break), the recommended inputs are now
**`.eml` and `.msg`**, not PDF.

Each saved folder contains:

- A clean Markdown copy of the email, including From, Sent, To, Cc, subject,
  message text, and links to its attachments.
- The email's regular attachments, extracted automatically with their original
  contents and filenames.

The tool runs entirely in Chrome or Edge. Your work email and attachments never
leave your computer.

## The workflow

You no longer need to print the email, print each attachment, or match files on
your Desktop.

1. Save the complete message from Outlook as an `.eml` or `.msg` file.
2. Drop the file into this tool.
3. Pick a category and click **Save to folder**.

The tool creates the Markdown email and extracts its attachments into the same
folder in one step.

### Threads whose replies have different attachments

An Outlook `.msg` or `.eml` file contains only the attachments on that saved
message. The quoted earlier replies may be visible in its body, but their old
attachment files are not stored inside the newest message. No converter can
recover attachment bytes that are absent from the file.

For a thread whose attachments are spread across several replies, save each
message that has attachments. Select all those `.msg` or `.eml` files together
and drop them onto the tool in one action. Files with the same subject are
combined into one chronological Markdown thread and one folder containing all
attachments. You no longer need to feed the saved messages to the tool one by
one.

## Save a complete message from Outlook

### New Outlook for Windows

Open or select the message, choose **More actions (…) → Save as**, and save it
to your Desktop or Downloads folder. You can also drag a message from Outlook
to your Desktop; new Outlook normally creates an `.eml` file.

### Classic Outlook for Windows

Double-click the message, choose **File → Save As**, and keep the default
Outlook message format (`.msg`). Dragging a message from Outlook to your Desktop
also normally creates a `.msg` file.

### Outlook on the web

Open or select the message, choose **More actions (…) → Download**, then use the
downloaded `.eml` or `.msg` file.

Microsoft's current instructions are here:
[Save an Outlook message as a file](https://support.microsoft.com/en-US/Outlook/mail/save-an-outlook-message-as-a-eml-file-a-pdf-file-or-as-a-draft).

## One-time setup

1. Download `email-pdf-to-markdown.html` from this repository. On GitHub, open
   the file and click the **Download raw file** button (the down arrow).
2. Double-click the downloaded file to open it in Chrome or Edge.
3. Click **Choose folder** and select the folder that holds your email category
   folders. Click **Allow** when the browser asks for access.

## Archive an email

1. Drop one or more `.eml` or `.msg` files into the large drop area.
2. Review the proposed name. The default format is
   **`Date_From Sender_To Recipients_Subject_number of attachments`**.
3. Pick a preset category or choose **+ New category folder…**.
4. Click **Save to folder**.

The result looks like this:

```text
[chosen save folder]/
  September 1_From Mary Kate Ellis_To Tim_Rates and Cost_2 attachments/
      September 1_From Mary Kate Ellis_To Tim_Rates and Cost_2 attachments.md
      updated-rates.xlsx
      plan-summary.pdf
```

Embedded signature graphics and tracking/logo images are ignored so they do not
clutter the archive. Normal attachments are saved. Duplicate attachment names
are made unique automatically.

## PDF fallback

Old email PDFs still work. PDFs with real text convert immediately; image-only
PDFs are read with the built-in OCR engine. A PDF cannot contain the original
Outlook attachments, so only `.eml` or `.msg` gives you automatic attachment
extraction.

Firefox and Safari cannot create folders directly from a local webpage. In
those browsers the tool downloads a `.zip` containing the same Markdown and
attachment files. Chrome or Edge is recommended.

## Rebuilding the tool

The source is `src/app.html`. The build bundles the `.eml` and `.msg` parsers,
PDF reader, OCR runtime, and English OCR data into one offline HTML file.

```powershell
cd tools/src
npm install
Invoke-WebRequest `
  -Uri "https://tessdata.projectnaptha.com/4.0.0/eng.traineddata.gz" `
  -OutFile "eng.traineddata.gz"
npm run build
```

This rewrites `tools/email-pdf-to-markdown.html`.
