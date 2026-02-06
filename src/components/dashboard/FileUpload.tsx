import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, AlertCircle, CheckCircle2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { parseCSV, validateCSVHeaders, type CSVParseResult } from '@/utils/csvParser';

interface FileUploadProps {
  onUploadComplete?: (result: CSVParseResult) => void;
  onUploadError?: (error: Error) => void;
}

export function FileUpload({ onUploadComplete, onUploadError }: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [parseResult, setParseResult] = useState<CSVParseResult | null>(null);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;

      setUploadedFile(file);
      setUploading(true);
      setUploadStatus('idle');
      setErrorMessage('');

      try {
        // Validate headers first
        const validation = await validateCSVHeaders(file);
        if (!validation.valid) {
          throw new Error(
            `Missing required columns: ${validation.missingHeaders.join(', ')}`
          );
        }

        // Parse the CSV
        const result = await parseCSV(file);
        setParseResult(result);

        if (result.errors.length > 0) {
          console.warn(`Parsed with ${result.errors.length} errors`, result.errors);
        }

        setUploadStatus('success');
        onUploadComplete?.(result);
      } catch (error) {
        const err = error as Error;
        setUploadStatus('error');
        setErrorMessage(err.message);
        onUploadError?.(err);
      } finally {
        setUploading(false);
      }
    },
    [onUploadComplete, onUploadError]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.csv'],
    },
    maxFiles: 1,
    disabled: uploading,
  });

  const handleClear = () => {
    setUploadedFile(null);
    setUploadStatus('idle');
    setErrorMessage('');
    setParseResult(null);
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Upload CSV File</h2>
          <p className="text-sm text-slate-500 mt-1">
            Import delinquent member data from CSV files
          </p>
        </div>
        {uploadedFile && uploadStatus === 'success' && (
          <Button variant="outline" size="sm" onClick={handleClear}>
            <X className="w-4 h-4 mr-2" />
            Clear
          </Button>
        )}
      </div>

      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={cn(
          'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
          isDragActive && 'border-slate-400 bg-slate-50',
          !isDragActive && uploadStatus === 'idle' && 'border-slate-300 hover:border-slate-400',
          uploadStatus === 'success' && 'border-green-300 bg-green-50',
          uploadStatus === 'error' && 'border-red-300 bg-red-50',
          uploading && 'cursor-not-allowed opacity-60'
        )}
      >
        <input {...getInputProps()} />

        {/* Upload Icon */}
        <div className="flex justify-center mb-4">
          {uploading && (
            <div className="w-12 h-12 border-4 border-slate-200 border-t-slate-600 rounded-full animate-spin" />
          )}
          {!uploading && uploadStatus === 'idle' && (
            <Upload className="w-12 h-12 text-slate-400" />
          )}
          {!uploading && uploadStatus === 'success' && (
            <CheckCircle2 className="w-12 h-12 text-green-600" />
          )}
          {!uploading && uploadStatus === 'error' && (
            <AlertCircle className="w-12 h-12 text-red-600" />
          )}
        </div>

        {/* Status Text */}
        {uploading && (
          <div>
            <p className="text-sm font-medium text-slate-900">Processing file...</p>
            <p className="text-xs text-slate-500 mt-1">Parsing CSV data</p>
          </div>
        )}

        {!uploading && !uploadedFile && (
          <div>
            <p className="text-sm font-medium text-slate-900">
              {isDragActive ? 'Drop the file here' : 'Drag & drop CSV file here'}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              or click to browse files
            </p>
            <p className="text-xs text-slate-400 mt-2">
              Supports .csv files only
            </p>
          </div>
        )}

        {!uploading && uploadedFile && uploadStatus === 'success' && (
          <div>
            <div className="flex items-center justify-center gap-2 text-green-700 mb-2">
              <FileText className="w-5 h-5" />
              <p className="text-sm font-medium">{uploadedFile.name}</p>
            </div>
            <p className="text-xs text-green-600">
              Successfully uploaded and parsed
            </p>
          </div>
        )}

        {!uploading && uploadStatus === 'error' && (
          <div>
            <p className="text-sm font-medium text-red-700 mb-2">Upload failed</p>
            <p className="text-xs text-red-600">{errorMessage}</p>
          </div>
        )}
      </div>

      {/* Parse Results Summary */}
      {parseResult && uploadStatus === 'success' && (
        <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-semibold text-slate-900">
                {parseResult.totalMembers}
              </p>
              <p className="text-xs text-slate-600 mt-1">Members</p>
            </div>
            <div>
              <p className="text-2xl font-semibold text-slate-900">
                {parseResult.totalAgencies}
              </p>
              <p className="text-xs text-slate-600 mt-1">Agencies</p>
            </div>
            <div>
              <p className="text-2xl font-semibold text-slate-900">
                {parseResult.errors.length}
              </p>
              <p className="text-xs text-slate-600 mt-1">Errors</p>
            </div>
          </div>

          {parseResult.errors.length > 0 && (
            <div className="mt-3 pt-3 border-t border-slate-200">
              <p className="text-xs text-amber-600 font-medium">
                ⚠️ {parseResult.errors.length} row(s) skipped due to errors
              </p>
            </div>
          )}
        </div>
      )}

      {/* Required Format Info */}
      <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
        <p className="text-xs font-medium text-slate-700 mb-2">Required CSV Format:</p>
        <div className="space-y-1">
          <p className="text-xs text-slate-600">
            <span className="font-medium">Required columns:</span> Member Name, Amount, Agency
          </p>
          <p className="text-xs text-slate-600">
            <span className="font-medium">Optional columns:</span> Agency Email, Days Late, Member ID, Phone, Email
          </p>
        </div>
      </div>
    </div>
  );
}
