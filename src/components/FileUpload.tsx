import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import {
  Upload,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  Send,
  Loader2,
  X,
  Eye,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabaseClient';

const REPLY_TO = 'scott.thomas@carynhealth.com';

// ── Types ────────────────────────────────────────────────────────────
interface ParsedMember {
  name: string;
  delinquent_days: number;
  agency_email: string;
}

interface SendResult {
  member: string;
  recipient: string;
  email_id: string;
  status: string;
}

interface SendError {
  member: string;
  recipient: string;
  error: any;
}

interface BatchResponse {
  success: boolean;
  message: string;
  sent: SendResult[];
  failed: SendError[];
}

// ── Column name constants ────────────────────────────────────────────
const COL_AGENCY_EMAIL = 'Agency Email Address';
const COL_FIRST_NAME = 'memberFirstName';
const COL_LAST_NAME = 'memberLastName';
const COL_DELINQUENT = 'delinquent_days';
const REQUIRED_COLUMNS = [COL_AGENCY_EMAIL, COL_FIRST_NAME, COL_LAST_NAME, COL_DELINQUENT];

// ── Helpers ──────────────────────────────────────────────────────────

/** Turn a raw row object (keyed by header) into a ParsedMember. */
function mapRow(row: Record<string, any>): ParsedMember | null {
  const first = String(row[COL_FIRST_NAME] ?? '').trim();
  const last = String(row[COL_LAST_NAME] ?? '').trim();
  const email = String(row[COL_AGENCY_EMAIL] ?? '').trim();
  const days = Number(row[COL_DELINQUENT]);

  if (!first || !email || isNaN(days)) return null;

  return {
    name: last ? `${first} ${last}` : first,
    delinquent_days: days,
    agency_email: email,
  };
}

/** Parse a CSV file via PapaParse and return rows. */
function parseCSVFile(file: File): Promise<Record<string, any>[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h: string) => h.trim(),
      complete: (results) => resolve(results.data as Record<string, any>[]),
      error: (err) => reject(new Error(err.message)),
    });
  });
}

/** Parse an Excel file via SheetJS and return rows. */
function parseExcelFile(file: File): Promise<Record<string, any>[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<Record<string, any>>(firstSheet, {
          defval: '',
        });
        resolve(rows);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
}

// ── Component ────────────────────────────────────────────────────────

export function FileUpload() {
  const [fileName, setFileName] = useState<string | null>(null);
  const [members, setMembers] = useState<ParsedMember[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [missingCols, setMissingCols] = useState<string[]>([]);
  const [skippedRows, setSkippedRows] = useState(0);

  const [sending, setSending] = useState(false);
  const [batchResult, setBatchResult] = useState<BatchResponse | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);

  // ── Drop handler ─────────────────────────────────────────────────
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    // Reset state
    setFileName(file.name);
    setMembers([]);
    setParseError(null);
    setMissingCols([]);
    setSkippedRows(0);
    setBatchResult(null);
    setSendError(null);

    try {
      const ext = file.name.split('.').pop()?.toLowerCase();
      let rawRows: Record<string, any>[];

      if (ext === 'csv') {
        rawRows = await parseCSVFile(file);
      } else if (ext === 'xlsx' || ext === 'xls') {
        rawRows = await parseExcelFile(file);
      } else {
        throw new Error('Unsupported file type. Please upload .csv or .xlsx');
      }

      if (rawRows.length === 0) {
        throw new Error('File is empty or contains no data rows');
      }

      // Check for required columns
      const headers = Object.keys(rawRows[0]);
      const missing = REQUIRED_COLUMNS.filter(
        (col) => !headers.includes(col)
      );

      if (missing.length > 0) {
        setMissingCols(missing);
        throw new Error(`Missing required columns: ${missing.join(', ')}`);
      }

      // Map rows
      let skipped = 0;
      const mapped: ParsedMember[] = [];

      for (const row of rawRows) {
        const member = mapRow(row);
        if (member) {
          mapped.push(member);
        } else {
          skipped++;
        }
      }

      if (mapped.length === 0) {
        throw new Error('No valid member rows found after parsing');
      }

      setMembers(mapped);
      setSkippedRows(skipped);
    } catch (err) {
      setParseError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, []);

  // ── Dropzone config ──────────────────────────────────────────────
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls', '.csv'],
    },
    maxFiles: 1,
    disabled: sending,
  });

  // ── Send batch ───────────────────────────────────────────────────
  const handleSendBatch = async () => {
    if (members.length === 0) return;

    setSending(true);
    setSendError(null);
    setBatchResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('send-batch-email', {
        body: {
          reply_to: REPLY_TO,
          member_list: members,
        },
      });

      if (error) {
        throw new Error(error.message || 'Edge Function invocation failed');
      }

      const result = data as BatchResponse;
      setBatchResult(result);

      if (result.success) {
        toast.success(`${result.sent.length} email${result.sent.length !== 1 ? 's' : ''} sent successfully`);
      } else {
        toast.warning(result.message);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to send batch';
      setSendError(msg);
      toast.error(msg);
    } finally {
      setSending(false);
    }
  };

  // ── Clear everything ─────────────────────────────────────────────
  const handleClear = () => {
    setFileName(null);
    setMembers([]);
    setParseError(null);
    setMissingCols([]);
    setSkippedRows(0);
    setBatchResult(null);
    setSendError(null);
  };

  // ── Derived state ────────────────────────────────────────────────
  const hasParsedData = members.length > 0;
  const previewRows = members.slice(0, 5);

  // ── Render ───────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* ─── Dropzone Card ──────────────────────────────────────── */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Upload Member File
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Drag &amp; drop a <strong>.csv</strong> or{' '}
              <strong>.xlsx</strong> file with delinquent member data
            </p>
          </div>
          {fileName && (
            <Button variant="outline" size="sm" onClick={handleClear}>
              <X className="w-4 h-4 mr-1" />
              Clear
            </Button>
          )}
        </div>

        {/* Drop area */}
        <div
          {...getRootProps()}
          className={cn(
            'border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-colors',
            isDragActive && 'border-slate-400 bg-slate-50',
            !isDragActive && !parseError && !hasParsedData && 'border-slate-300 hover:border-slate-400',
            hasParsedData && 'border-green-300 bg-green-50/50',
            parseError && 'border-red-300 bg-red-50/50',
            sending && 'cursor-not-allowed opacity-60'
          )}
        >
          <input {...getInputProps()} />

          <div className="flex justify-center mb-3">
            {!fileName && <Upload className="w-10 h-10 text-slate-400" />}
            {fileName && !parseError && (
              <CheckCircle2 className="w-10 h-10 text-green-600" />
            )}
            {parseError && <AlertCircle className="w-10 h-10 text-red-500" />}
          </div>

          {!fileName && (
            <>
              <p className="text-sm font-medium text-slate-700">
                {isDragActive
                  ? 'Drop the file here'
                  : 'Drag & drop file here, or click to browse'}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                .csv or .xlsx accepted
              </p>
            </>
          )}

          {fileName && !parseError && (
            <>
              <div className="flex items-center justify-center gap-2 text-green-700">
                <FileSpreadsheet className="w-5 h-5" />
                <span className="text-sm font-medium">{fileName}</span>
              </div>
              <p className="text-xs text-green-600 mt-1">
                {members.length} member{members.length !== 1 ? 's' : ''} parsed
                {skippedRows > 0 && (
                  <span className="text-amber-600 ml-1">
                    ({skippedRows} row{skippedRows !== 1 ? 's' : ''} skipped)
                  </span>
                )}
              </p>
            </>
          )}

          {parseError && (
            <>
              <p className="text-sm font-medium text-red-700">{parseError}</p>
              {missingCols.length > 0 && (
                <p className="text-xs text-red-500 mt-2">
                  Expected columns:{' '}
                  {REQUIRED_COLUMNS.map((c) => (
                    <span
                      key={c}
                      className={cn(
                        'inline-block px-1.5 py-0.5 rounded font-mono text-xs mr-1 mb-1',
                        missingCols.includes(c)
                          ? 'bg-red-200 text-red-800'
                          : 'bg-green-200 text-green-800'
                      )}
                    >
                      {c}
                    </span>
                  ))}
                </p>
              )}
            </>
          )}
        </div>
      </div>

      {/* ─── Preview Table ──────────────────────────────────────── */}
      {hasParsedData && (
        <div className="bg-white rounded-lg border border-slate-200">
          <div className="p-6 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-slate-600" />
              <h2 className="text-lg font-semibold text-slate-900">
                Preview
              </h2>
              <span className="text-sm text-slate-500">
                (showing {previewRows.length} of {members.length})
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    #
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Member Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Days Past Due
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Agency Email
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {previewRows.map((m, i) => (
                  <tr key={i} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-slate-400">{i + 1}</td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-900">
                      {m.name}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={cn(
                          'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium',
                          m.delinquent_days > 60 && 'bg-red-100 text-red-700',
                          m.delinquent_days > 30 &&
                            m.delinquent_days <= 60 &&
                            'bg-amber-100 text-amber-700',
                          m.delinquent_days <= 30 && 'bg-slate-100 text-slate-600'
                        )}
                      >
                        {m.delinquent_days} days
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {m.agency_email}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {members.length > 5 && (
            <div className="px-6 py-3 border-t border-slate-200 bg-slate-50">
              <p className="text-xs text-slate-500">
                + {members.length - 5} more member
                {members.length - 5 !== 1 ? 's' : ''} not shown
              </p>
            </div>
          )}
        </div>
      )}

      {/* ─── Send Batch Button ──────────────────────────────────── */}
      {hasParsedData && !batchResult && (
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-900">
                Ready to send {members.length} notification
                {members.length !== 1 ? 's' : ''}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Each member's agency will receive a "Past Due Account
                Notification" email. Reply-To is set to{' '}
                <span className="font-medium">{REPLY_TO}</span>.
              </p>
            </div>
            <Button onClick={handleSendBatch} disabled={sending}>
              {sending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Send Batch
                </>
              )}
            </Button>
          </div>

          {sendError && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">
                <strong>Error:</strong> {sendError}
              </p>
            </div>
          )}
        </div>
      )}

      {/* ─── Batch Results ──────────────────────────────────────── */}
      {batchResult && (
        <div className="bg-white rounded-lg border border-slate-200 p-6 space-y-4">
          <div
            className={cn(
              'flex items-center gap-3 p-4 rounded-lg',
              batchResult.success
                ? 'bg-green-50 border border-green-200'
                : 'bg-amber-50 border border-amber-200'
            )}
          >
            {batchResult.success ? (
              <CheckCircle2 className="w-6 h-6 text-green-600 shrink-0" />
            ) : (
              <AlertCircle className="w-6 h-6 text-amber-600 shrink-0" />
            )}
            <div>
              <p
                className={cn(
                  'text-sm font-semibold',
                  batchResult.success ? 'text-green-800' : 'text-amber-800'
                )}
              >
                {batchResult.message}
              </p>
            </div>
          </div>

          {/* Sent list */}
          {batchResult.sent.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-slate-900 mb-2">
                Sent Successfully
              </h3>
              <div className="space-y-1">
                {batchResult.sent.map((s, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 text-sm text-slate-600 px-3 py-2 bg-slate-50 rounded"
                  >
                    <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                    <span className="font-medium text-slate-800">
                      {s.member}
                    </span>
                    <span className="text-slate-400">&rarr;</span>
                    <span>{s.recipient}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Failed list */}
          {batchResult.failed.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-red-700 mb-2">
                Failed
              </h3>
              <div className="space-y-1">
                {batchResult.failed.map((f, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 text-sm text-red-600 px-3 py-2 bg-red-50 rounded"
                  >
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span className="font-medium">{f.member}</span>
                    <span className="text-red-400">&rarr;</span>
                    <span>{f.recipient}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
