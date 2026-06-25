import { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import * as pdfjsLib from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import {
  Upload, FileText, Download, Copy, Check, Loader2, X,
  ChevronDown, ChevronUp, Plus, Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

// ── Types ─────────────────────────────────────────────────────────────────────

interface PdfTextItem {
  str: string;
  transform: number[];
  height: number;
  width: number;
  fontName: string;
  hasEOL: boolean;
}

interface TextLine {
  y: number;
  height: number;
  text: string;
  x: number;
}

interface Correction {
  id: string;
  find: string;
  replace: string;
  enabled: boolean;
}

// ── PDF extraction ─────────────────────────────────────────────────────────────

function groupItemsIntoLines(items: PdfTextItem[]): TextLine[] {
  if (items.length === 0) return [];

  const sorted = [...items].sort((a, b) => b.transform[5] - a.transform[5]);
  const lines: TextLine[] = [];
  let group: PdfTextItem[] = [sorted[0]];
  let groupY = sorted[0].transform[5];

  const flush = () => {
    // Drop zero-width filler items that the PDF emits between glyph runs.
    const its = group
      .filter(it => it.str.length > 0)
      .sort((a, b) => a.transform[4] - b.transform[4]);
    if (its.length === 0) return;

    // Remove avatar initials (e.g. Otter.ai colored circles): a single uppercase
    // letter sitting to the left of a name that starts with the same letter,
    // separated by a large x-gap.  "A" + "Amani" → keep only "Amani".
    let start = 0;
    if (
      its.length > 1 &&
      its[0].str.length === 1 &&
      /^[A-Z]$/.test(its[0].str) &&
      its[1].str.startsWith(its[0].str)
    ) {
      const itemRight = its[0].transform[4] + (its[0].width || its[0].height);
      const nextLeft = its[1].transform[4];
      if (nextLeft - itemRight > (its[0].width || its[0].height) * 1.5) {
        start = 1;
      }
    }

    const rel = its.slice(start);
    const hs = rel.map(it => it.height).filter(h => h > 0);
    const maxHeight = hs.length ? Math.max(...hs) : 12;
    const minX = Math.min(...rel.map(it => it.transform[4]));
    const text = rel.map(it => it.str).join('').trim();
    if (text) lines.push({ y: groupY, height: maxHeight, text, x: minX });
  };

  for (let i = 1; i < sorted.length; i++) {
    const item = sorted[i];
    const refHeight = group[0].height || 12;
    if (Math.abs(item.transform[5] - groupY) < refHeight * 0.6) {
      group.push(item);
    } else {
      flush();
      group = [item];
      groupY = item.transform[5];
    }
  }
  flush();
  return lines;
}

// Speaker turn: "Amani 00:42", "Sean-Michael 09:31", "Speaker 1 08:34"
const SPEAKER_RE = /^([A-Za-z][A-Za-z0-9 .'-]{0,38})\s+(\d{1,2}:\d{2})$/;
const TIME_ONLY_RE = /^\d{1,2}:\d{2}$/;

function linesToMarkdown(allPageLines: TextLine[][]): string {
  const heights: number[] = [];
  for (const lines of allPageLines)
    for (const line of lines)
      if (line.text && line.height > 0) heights.push(line.height);
  heights.sort((a, b) => a - b);
  const median = heights[Math.floor(heights.length * 0.5)] ?? 12;

  const sections: string[] = [];
  const pushBlock = (s: string) => { sections.push('', s, ''); };

  for (const lines of allPageLines) {
    let prevY: number | null = null;
    let prevHeight = median;
    let paragraph: string[] = [];

    const flushParagraph = () => {
      if (paragraph.length > 0) { sections.push(paragraph.join(' ')); paragraph = []; }
    };

    for (const line of lines) {
      const text = line.text;
      if (!text) continue;

      let gapBreak = false;
      if (prevY !== null) {
        const gap = prevY - line.y;
        if (gap > Math.min(prevHeight, line.height) * 1.5) gapBreak = true;
      }

      const speaker = SPEAKER_RE.exec(text);
      const isHeading = !speaker && line.height > median * 1.4;
      const isLabel =
        !speaker && !isHeading &&
        text.length <= 40 &&
        /^[A-Z][A-Z0-9 &/.,'-]+$/.test(text) &&
        text === text.toUpperCase();

      if (speaker) {
        flushParagraph();
        pushBlock(`**${speaker[1].trim()}** (${speaker[2]})`);
      } else if (TIME_ONLY_RE.test(text)) {
        flushParagraph();
        pushBlock(`**(${text})**`);
      } else if (isHeading) {
        flushParagraph();
        pushBlock(`# ${text}`);
      } else if (isLabel) {
        flushParagraph();
        pushBlock(`## ${text}`);
      } else if (/^[•·▪▸►]\s*/.test(text)) {
        flushParagraph();
        sections.push(`- ${text.replace(/^[•·▪▸►]\s*/, '')}`);
      } else if (/^\d+[.)]\s/.test(text)) {
        flushParagraph();
        sections.push(text);
      } else {
        if (gapBreak) flushParagraph();
        paragraph.push(text);
      }

      prevY = line.y;
      prevHeight = line.height;
    }
    flushParagraph();
  }

  return sections.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

async function pdfFileToMarkdown(
  file: File,
  onProgress: (page: number, total: number) => void,
): Promise<string> {
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  const total = pdf.numPages;
  const allPageLines: TextLine[][] = [];

  for (let pageNum = 1; pageNum <= total; pageNum++) {
    onProgress(pageNum, total);
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    const textItems = (content.items as unknown[]).filter(
      (it): it is PdfTextItem => typeof it === 'object' && it !== null && 'str' in it,
    );
    allPageLines.push(groupItemsIntoLines(textItems));
  }

  return linesToMarkdown(allPageLines);
}

// ── Corrections ────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'pdf-md-corrections';

function loadCorrections(): Correction[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Correction[];
  } catch { /* ignore */ }
  return [];
}

function saveCorrections(corrections: Correction[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(corrections));
}

function applyCorrections(text: string, corrections: Correction[]): string {
  let result = text;
  for (const c of corrections) {
    if (!c.enabled || !c.find.trim()) continue;
    const escaped = c.find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    result = result.replace(new RegExp(escaped, 'gi'), c.replace);
  }
  return result;
}

function newCorrection(): Correction {
  return { id: `${Date.now()}-${Math.random()}`, find: '', replace: '', enabled: true };
}

// ── Component ──────────────────────────────────────────────────────────────────

type Status = 'idle' | 'processing' | 'done' | 'error';

export default function PdfToMarkdown() {
  const [status, setStatus] = useState<Status>('idle');
  const [progress, setProgress] = useState({ page: 0, total: 0 });
  const [fileName, setFileName] = useState('');
  const [rawMarkdown, setRawMarkdown] = useState('');   // straight from PDF
  const [markdown, setMarkdown] = useState('');          // with corrections applied
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const [corrections, setCorrections] = useState<Correction[]>(loadCorrections);
  const [showCorrections, setShowCorrections] = useState(false);

  // Persist corrections and re-apply whenever they change.
  useEffect(() => {
    saveCorrections(corrections);
    if (rawMarkdown) setMarkdown(applyCorrections(rawMarkdown, corrections));
  }, [corrections, rawMarkdown]);

  const process = useCallback(async (file: File) => {
    setFileName(file.name);
    setStatus('processing');
    setRawMarkdown('');
    setMarkdown('');
    setError('');
    try {
      const md = await pdfFileToMarkdown(file, (page, total) =>
        setProgress({ page, total }),
      );
      setRawMarkdown(md);
      // corrections effect fires immediately after rawMarkdown state update
      setStatus('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse PDF');
      setStatus('error');
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'application/pdf': ['.pdf'] },
    multiple: false,
    onDropAccepted: ([file]) => process(file),
  });

  const download = () => {
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName.replace(/\.pdf$/i, '.md');
    a.click();
    URL.revokeObjectURL(url);
  };

  const copy = async () => {
    await navigator.clipboard.writeText(markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const reset = () => {
    setStatus('idle');
    setRawMarkdown('');
    setMarkdown('');
    setFileName('');
    setError('');
  };

  const addCorrection = () =>
    setCorrections(prev => [...prev, newCorrection()]);

  const updateCorrection = (id: string, patch: Partial<Correction>) =>
    setCorrections(prev => prev.map(c => (c.id === id ? { ...c, ...patch } : c)));

  const removeCorrection = (id: string) =>
    setCorrections(prev => prev.filter(c => c.id !== id));

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-3">
        <FileText className="w-6 h-6 text-blue-600" />
        <h1 className="text-xl font-semibold text-gray-900">PDF to Markdown</h1>
      </header>

      <main className="flex-1 flex flex-col gap-6 p-6 max-w-5xl mx-auto w-full">

        {/* Drop zone */}
        {status === 'idle' && (
          <>
            <div
              {...getRootProps()}
              className={cn(
                'border-2 border-dashed rounded-xl p-12 flex flex-col items-center gap-4 cursor-pointer transition-colors',
                isDragActive
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 bg-white hover:border-blue-400 hover:bg-gray-50',
              )}
            >
              <input {...getInputProps()} />
              <Upload className="w-12 h-12 text-gray-400" />
              <div className="text-center">
                <p className="text-lg font-medium text-gray-700">
                  {isDragActive ? 'Drop your PDF here' : 'Drag & drop a PDF'}
                </p>
                <p className="text-sm text-gray-500 mt-1">or click to browse</p>
              </div>
            </div>
            <CorrectionsPanel
              corrections={corrections}
              show={showCorrections}
              onToggle={() => setShowCorrections(v => !v)}
              onAdd={addCorrection}
              onUpdate={updateCorrection}
              onRemove={removeCorrection}
            />
          </>
        )}

        {/* Processing */}
        {status === 'processing' && (
          <div className="bg-white rounded-xl border border-gray-200 p-10 flex flex-col items-center gap-4">
            <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
            <p className="text-gray-700 font-medium">Converting {fileName}…</p>
            {progress.total > 0 && (
              <>
                <div className="w-64 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(progress.page / progress.total) * 100}%` }}
                  />
                </div>
                <p className="text-sm text-gray-500">
                  Page {progress.page} of {progress.total}
                </p>
              </>
            )}
          </div>
        )}

        {/* Error */}
        {status === 'error' && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 flex items-start gap-3">
            <X className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-medium text-red-800">Conversion failed</p>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
            <button
              onClick={reset}
              className="text-sm text-red-600 hover:text-red-800 underline"
            >
              Try again
            </button>
          </div>
        )}

        {/* Result */}
        {status === 'done' && (
          <div className="flex flex-col gap-4 flex-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <FileText className="w-4 h-4" />
                <span className="font-medium">{fileName}</span>
                <span className="text-gray-400">→</span>
                <span>{fileName.replace(/\.pdf$/i, '.md')}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={reset}
                  className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  New file
                </button>
                <button
                  onClick={copy}
                  className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 text-green-600" />
                      <span className="text-green-600">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
                <button
                  onClick={download}
                  className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Download .md
                </button>
              </div>
            </div>

            <textarea
              className="flex-1 min-h-[50vh] font-mono text-sm p-4 rounded-xl border border-gray-200 bg-white resize-y focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={markdown}
              onChange={e => setMarkdown(e.target.value)}
              spellCheck={false}
            />
            <p className="text-xs text-gray-400 text-right">
              {markdown.split('\n').length} lines · {markdown.length} chars · editable before download
            </p>

            <CorrectionsPanel
              corrections={corrections}
              show={showCorrections}
              onToggle={() => setShowCorrections(v => !v)}
              onAdd={addCorrection}
              onUpdate={updateCorrection}
              onRemove={removeCorrection}
            />
          </div>
        )}
      </main>
    </div>
  );
}

// ── Corrections panel ──────────────────────────────────────────────────────────

interface CorrectionsPanelProps {
  corrections: Correction[];
  show: boolean;
  onToggle: () => void;
  onAdd: () => void;
  onUpdate: (id: string, patch: Partial<Correction>) => void;
  onRemove: (id: string) => void;
}

function CorrectionsPanel({
  corrections, show, onToggle, onAdd, onUpdate, onRemove,
}: CorrectionsPanelProps) {
  const activeCount = corrections.filter(c => c.enabled && c.find.trim()).length;

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
      >
        <span className="flex items-center gap-2">
          Auto-corrections
          {activeCount > 0 && (
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-normal">
              {activeCount} active
            </span>
          )}
        </span>
        {show ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>

      {show && (
        <div className="border-t border-gray-100 px-4 py-3 flex flex-col gap-2">
          <p className="text-xs text-gray-500 mb-1">
            Applied case-insensitively to every converted file. Saved automatically.
          </p>

          {corrections.length === 0 && (
            <p className="text-xs text-gray-400 italic py-2">No corrections yet.</p>
          )}

          {corrections.map(c => (
            <div key={c.id} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={c.enabled}
                onChange={e => onUpdate(c.id, { enabled: e.target.checked })}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 cursor-pointer flex-shrink-0"
              />
              <input
                type="text"
                placeholder="Find…"
                value={c.find}
                onChange={e => onUpdate(c.id, { find: e.target.value })}
                className="flex-1 min-w-0 text-sm px-2 py-1.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
              <span className="text-gray-400 text-sm flex-shrink-0">→</span>
              <input
                type="text"
                placeholder="Replace with…"
                value={c.replace}
                onChange={e => onUpdate(c.id, { replace: e.target.value })}
                className="flex-1 min-w-0 text-sm px-2 py-1.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
              <button
                onClick={() => onRemove(c.id)}
                className="flex-shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}

          <button
            onClick={onAdd}
            className="mt-1 flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 self-start"
          >
            <Plus className="w-4 h-4" />
            Add correction
          </button>
        </div>
      )}
    </div>
  );
}
