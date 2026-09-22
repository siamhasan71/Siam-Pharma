import React, { useState, useRef } from 'react';
import {
  Upload,
  FileSpreadsheet,
  Download,
  AlertCircle,
  CheckCircle2,
  X,
  FileText,
  AlertTriangle,
  ArrowRight,
  Database,
  RefreshCw,
  Package,
  ShieldCheck,
} from 'lucide-react';
import { Medicine } from '../types';
import {
  parseMedicinesFromCSV,
  downloadSampleCsv,
  validateCsvFile,
} from '../utils/csvHelper';
import { ErrorBoundary } from './ErrorBoundary';

interface ImportCsvModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: (count: number) => void;
  onSaveToDatabase: (
    medicines: Array<Omit<Medicine, 'id'>>,
    onProgress?: (progress: { loaded: number; total: number; percent: number }) => void
  ) => number | Promise<number>;
}

export const ImportCsvModal: React.FC<ImportCsvModalProps> = ({
  isOpen,
  onClose,
  onImportSuccess,
  onSaveToDatabase,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [parsedMedicines, setParsedMedicines] = useState<Array<Omit<Medicine, 'id'>>>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [totalRows, setTotalRows] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [importProgress, setImportProgress] = useState<{ loaded: number; total: number; percent: number } | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const resetState = () => {
    setFile(null);
    setParsedMedicines([]);
    setParseErrors([]);
    setTotalRows(0);
    setIsProcessing(false);
    setIsImporting(false);
    setImportProgress(null);
    setSuccessMessage(null);
    setErrorMessage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClose = () => {
    if (isImporting) return; // Prevent closing during active batch write
    resetState();
    onClose();
  };

  /**
   * Safe file handler with validation, try/catch, and error notification
   */
  const handleFile = (selectedFile: unknown) => {
    try {
      setErrorMessage(null);
      setSuccessMessage(null);

      // 1. Validate file object and format before any state updates
      const validation = validateCsvFile(selectedFile);
      if (!validation.valid) {
        setErrorMessage(validation.error || 'Invalid CSV file format.');
        setParseErrors([validation.error || 'Invalid file.']);
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }

      const validFile = selectedFile as File;
      setFile(validFile);
      setIsProcessing(true);
      setParseErrors([]);

      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const text = e.target?.result;
          if (typeof text !== 'string' || !text.trim()) {
            throw new Error('The selected CSV file contains no readable text content.');
          }

          // Parse with standard PapaParse and default fallbacks
          const result = parseMedicinesFromCSV(text);

          if (!result || !Array.isArray(result.medicines)) {
            throw new Error('Parser returned an unexpected data structure.');
          }

          if (result.medicines.length === 0) {
            const errorReason =
              result.errors.length > 0
                ? result.errors.join(' | ')
                : 'No recognizable medicine data could be extracted from this CSV.';
            setErrorMessage(errorReason);
            setParseErrors(result.errors);
            setParsedMedicines([]);
            setTotalRows(result.totalRowsCount || 0);
          } else {
            setParsedMedicines(result.medicines);
            setParseErrors(result.errors || []);
            setTotalRows(result.totalRowsCount || result.medicines.length);
          }
        } catch (innerErr: any) {
          console.error('CSV parse error:', innerErr);
          const msg = innerErr?.message || 'Failed to parse CSV file content. Please check file structure.';
          setErrorMessage(msg);
          setParseErrors([msg]);
          setParsedMedicines([]);
        } finally {
          setIsProcessing(false);
        }
      };

      reader.onerror = () => {
        setIsProcessing(false);
        const readErr = 'Error reading the file from your computer.';
        setErrorMessage(readErr);
        setParseErrors([readErr]);
      };

      reader.readAsText(validFile);
    } catch (outerErr: any) {
      console.error('File selection error:', outerErr);
      setIsProcessing(false);
      const errTxt = outerErr?.message || 'An unexpected error occurred while processing the selected file.';
      setErrorMessage(errTxt);
      setParseErrors([errTxt]);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    try {
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handleFile(e.dataTransfer.files[0]);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to receive dropped file.');
    }
  };

  const handleCommitImport = async () => {
    if (!parsedMedicines || parsedMedicines.length === 0) {
      setErrorMessage('No valid medicine rows to import.');
      return;
    }

    setIsImporting(true);
    setErrorMessage(null);
    setImportProgress({ loaded: 0, total: parsedMedicines.length, percent: 0 });

    try {
      const now = Date.now();
      // Ensure every single parsed medicine item is assigned a guaranteed unique string primary key id
      const sanitizedMedicinesWithIds = parsedMedicines.map((item, index) => ({
        ...item,
        id: (item as any).id || `med_${now}_${index}_${Math.random().toString(36).substring(2, 6)}`,
        name: item.name != null ? String(item.name).trim() : '',
        genericName: item.genericName != null ? String(item.genericName).trim() : (item.name ? String(item.name).trim() : ''),
        category: item.category || 'Tablet',
        manufacturer: item.manufacturer != null ? String(item.manufacturer).trim() : 'General Pharma',
        barcode: (item as any).barcode != null ? String((item as any).barcode).trim() : '',
      }));

      // Save all medicines to the database safely (IndexedDB via Dexie with chunking & UI yield)
      const count = await Promise.resolve(
        onSaveToDatabase(sanitizedMedicinesWithIds as any, (p) => {
          setImportProgress(p);
        })
      );
      const finalCount = typeof count === 'number' && count > 0 ? count : sanitizedMedicinesWithIds.length;

      if (finalCount > 0) {
        setSuccessMessage(`Successfully saved ${finalCount.toLocaleString()} medicines to IndexedDB!`);
        setIsImporting(false);
        setImportProgress(null);

        setTimeout(() => {
          onImportSuccess(finalCount);
          handleClose();
        }, 1200);
      } else {
        throw new Error('No medicines could be written to database storage.');
      }
    } catch (err: any) {
      console.error('Database bulk insert error:', err);
      const isQuota =
        err?.message?.includes('quota') ||
        err?.name === 'QuotaExceededError' ||
        err?.code === 22;

      setErrorMessage(
        isQuota
          ? 'Storage Quota Alert: Storage reached its limit. Please clear unused records and try again.'
          : err?.message || 'Error occurred while saving medicines to the database.'
      );
      setIsImporting(false);
      setImportProgress(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in"
      onClick={(e) => e.target === e.currentTarget && handleClose()}
    >
      <div className="bg-[#0b2b27] border border-[#1d5c54] rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-white animate-in zoom-in-95">
        {/* Header */}
        <div className="px-6 py-4 bg-[#11433d] border-b border-[#1d5c54] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-950 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-inner">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                <span>Import Medicines from CSV</span>
                <span className="text-[10px] font-semibold bg-emerald-900/90 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-600/40 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  PapaParse Protected
                </span>
              </h2>
              <p className="text-xs text-teal-200/80">
                Safely upload and bulk-save medicines to your inventory database
              </p>
            </div>
          </div>

          <button
            id="btn-close-import-modal"
            onClick={handleClose}
            className="p-2 rounded-xl text-teal-300 hover:text-white hover:bg-[#18554e] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body wrapped in ErrorBoundary to protect UI from crashes */}
        <ErrorBoundary
          fallbackTitle="CSV Preview Error"
          fallbackMessage="The modal encountered an unexpected format error while displaying the CSV. You can reset and try with the sample CSV template."
          onReset={resetState}
        >
          <div className="p-6 overflow-y-auto space-y-5 flex-1 custom-scrollbar">
            {/* Error Notification Toast / Banner */}
            {errorMessage && (
              <div className="p-4 bg-rose-950/90 border border-rose-500/80 rounded-xl flex items-start gap-3 text-rose-200 animate-in fade-in">
                <AlertCircle className="w-5 h-5 shrink-0 text-rose-400 mt-0.5" />
                <div className="flex-1 text-xs">
                  <div className="font-bold text-rose-300">File Processing Notice</div>
                  <div className="mt-0.5 text-rose-200/90 leading-relaxed">{errorMessage}</div>
                </div>
                <button
                  onClick={() => setErrorMessage(null)}
                  className="text-rose-400 hover:text-rose-200 p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Success Toast */}
            {successMessage && (
              <div className="p-4 bg-emerald-950/90 border border-emerald-500/80 rounded-xl flex items-center gap-3 text-emerald-300 animate-in fade-in">
                <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
                <div className="text-xs font-semibold">{successMessage}</div>
              </div>
            )}

            {/* Live Chunked Ingestion Progress Bar */}
            {isImporting && importProgress && (
              <div className="p-4 bg-[#0d342f] border border-emerald-500/60 rounded-xl space-y-2.5 animate-in fade-in shadow-lg">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-emerald-300 flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
                    Saving to IndexedDB Database...
                  </span>
                  <span className="font-mono text-emerald-200 font-bold text-xs">
                    {importProgress.percent}% ({importProgress.loaded.toLocaleString()} / {importProgress.total.toLocaleString()} rows)
                  </span>
                </div>
                <div className="w-full h-3 bg-[#08201d] rounded-full overflow-hidden border border-emerald-800/60 p-0.5">
                  <div
                    className="h-full bg-linear-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-150 ease-out"
                    style={{ width: `${Math.max(2, importProgress.percent)}%` }}
                  />
                </div>
                <p className="text-[11px] text-teal-300/80 flex items-center justify-between">
                  <span>Chunk batching (500 items/batch) with UI thread micro-delay</span>
                  <span className="text-emerald-400 font-medium">UI Non-blocking</span>
                </p>
              </div>
            )}

            {/* Upload Dropzone */}
            {!file && (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                  isDragging
                    ? 'border-emerald-400 bg-emerald-950/40 scale-[1.01]'
                    : 'border-[#21675e] bg-[#0d342f] hover:border-emerald-400 hover:bg-[#103d37]'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv,application/vnd.ms-excel,text/plain"
                  className="hidden"
                  onChange={(e) => {
                    try {
                      if (e.target.files && e.target.files.length > 0) {
                        handleFile(e.target.files[0]);
                      }
                    } catch (err: any) {
                      setErrorMessage(err?.message || 'Could not access selected file.');
                    }
                  }}
                />
                <div className="w-14 h-14 mx-auto rounded-2xl bg-[#144942] border border-[#237066] flex items-center justify-center text-emerald-400 mb-3 shadow-md">
                  <Upload className="w-7 h-7" />
                </div>
                <h3 className="text-base font-bold text-white mb-1">
                  Drag & drop your CSV file here, or <span className="text-emerald-400 underline">browse</span>
                </h3>
                <p className="text-xs text-teal-300/80 max-w-md mx-auto mb-4">
                  Supports standard CSV files with headers for Name, Generic, Batch, Expiry, Prices, Stock, and Category.
                </p>

                {/* Sample Template Download CTA */}
                <div
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#09221f] border border-[#1b5850] text-xs font-medium text-teal-200 hover:text-white hover:border-emerald-500/50 transition-all shadow-xs cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    downloadSampleCsv();
                  }}
                >
                  <Download className="w-4 h-4 text-emerald-400" />
                  <span>Download Sample CSV Template (.csv)</span>
                </div>
              </div>
            )}

            {/* Processing Spinner */}
            {isProcessing && (
              <div className="p-8 text-center bg-[#0d342f] rounded-2xl border border-[#1a554d] space-y-3">
                <div className="w-10 h-10 border-3 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs font-semibold text-teal-200">Parsing and validating CSV contents...</p>
              </div>
            )}

            {/* File Selected & Preview State */}
            {file && !isProcessing && (
              <div className="space-y-4">
                {/* File Info Bar */}
                <div className="bg-[#103d37] border border-[#1d5c54] rounded-xl p-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-[#195b53] flex items-center justify-center text-emerald-300 shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-white truncate">{file.name || 'document.csv'}</p>
                      <p className="text-[11px] text-teal-300/80">
                        {(Math.max(0, file.size || 0) / 1024).toFixed(1)} KB • CSV Document
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={downloadSampleCsv}
                      className="p-2 rounded-lg bg-[#0c2e29] hover:bg-[#144740] text-teal-300 hover:text-white border border-[#1d5c54] text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                      title="Download sample template"
                    >
                      <Download className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="hidden sm:inline">Sample CSV</span>
                    </button>
                    <button
                      onClick={resetState}
                      className="p-2 rounded-lg bg-[#0c2e29] hover:bg-rose-900/40 text-neutral-300 hover:text-rose-300 border border-[#1d5c54] text-xs flex items-center gap-1 transition-colors cursor-pointer"
                      title="Choose a different file"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Change File</span>
                    </button>
                  </div>
                </div>

                {/* Summary Stats Badges */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-[#0e3530] border border-[#1a554d] p-3 rounded-xl flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-950 border border-emerald-600/40 flex items-center justify-center text-emerald-400 font-bold text-xs">
                      {parsedMedicines.length}
                    </div>
                    <div>
                      <span className="text-[11px] text-teal-300/80 block">Valid Medicines</span>
                      <span className="text-sm font-bold text-emerald-400">
                        {parsedMedicines.length > 0 ? 'Ready to Save' : 'None Valid'}
                      </span>
                    </div>
                  </div>

                  <div className="bg-[#0e3530] border border-[#1a554d] p-3 rounded-xl flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#18534c] flex items-center justify-center text-teal-200 font-bold text-xs">
                      {totalRows}
                    </div>
                    <div>
                      <span className="text-[11px] text-teal-300/80 block">Total Rows in File</span>
                      <span className="text-sm font-bold text-white">Parsed Rows</span>
                    </div>
                  </div>

                  <div className="bg-[#0e3530] border border-[#1a554d] p-3 rounded-xl flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                        parseErrors.length > 0
                          ? 'bg-amber-950 text-amber-400 border border-amber-600/40'
                          : 'bg-[#18534c] text-teal-300'
                      }`}
                    >
                      {parseErrors.length}
                    </div>
                    <div>
                      <span className="text-[11px] text-teal-300/80 block">Warnings / Notes</span>
                      <span className={`text-sm font-bold ${parseErrors.length > 0 ? 'text-amber-400' : 'text-teal-200'}`}>
                        {parseErrors.length > 0 ? `${parseErrors.length} Noted` : 'Zero Errors'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Warnings / Parse Notes List */}
                {parseErrors.length > 0 && (
                  <div className="p-3 bg-amber-950/50 border border-amber-700/50 rounded-xl space-y-1.5 text-xs text-amber-200">
                    <div className="flex items-center gap-1.5 font-bold text-amber-300">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>Parser Notes ({parseErrors.length})</span>
                    </div>
                    <ul className="list-disc pl-5 space-y-0.5 text-[11px] text-amber-300/90 max-h-24 overflow-y-auto">
                      {parseErrors.slice(0, 5).map((err, idx) => (
                        <li key={idx}>{String(err || '')}</li>
                      ))}
                      {parseErrors.length > 5 && (
                        <li className="italic">...and {parseErrors.length - 5} more note(s)</li>
                      )}
                    </ul>
                  </div>
                )}

                {/* Safe Preview Table */}
                {parsedMedicines.length > 0 ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-teal-200">
                      <span className="font-semibold flex items-center gap-1.5">
                        <Package className="w-4 h-4 text-emerald-400" />
                        Data Preview (Showing first {Math.min(parsedMedicines.length, 6)} of {parsedMedicines.length} items)
                      </span>
                      <span className="text-[11px] text-teal-300/70 font-mono">
                        Safe defaults applied
                      </span>
                    </div>

                    <div className="border border-[#1d5c54] rounded-xl overflow-hidden bg-[#09221f]">
                      <div className="overflow-x-auto max-h-56 overflow-y-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-[#113f39] text-teal-200 text-[10px] font-bold uppercase tracking-wider sticky top-0 border-b border-[#1d5c54]">
                            <tr>
                              <th className="py-2.5 px-3">#</th>
                              <th className="py-2.5 px-3">Medicine Name</th>
                              <th className="py-2.5 px-3">Generic Name</th>
                              <th className="py-2.5 px-3">Category</th>
                              <th className="py-2.5 px-3">Batch & Expiry</th>
                              <th className="py-2.5 px-3 text-right">Cost Price</th>
                              <th className="py-2.5 px-3 text-right">Sell Price</th>
                              <th className="py-2.5 px-3 text-center">Initial Stock</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#174842] text-neutral-200 text-xs">
                            {parsedMedicines.slice(0, 8).map((med, idx) => {
                              // Safe values guarantee no undefined or toFixed crash
                              const purchasePrice = Number(med?.purchasePrice) || 0;
                              const sellingPrice = Number(med?.sellingPrice) || 0;
                              const stockQty = Number(med?.stockQuantity) || 0;
                              const name = med?.name || 'Unnamed Medicine';
                              const generic = med?.genericName || name;
                              const category = med?.category || 'Tablet';
                              const batch = med?.batchNumber || 'BATCH-GEN';
                              const expiry = med?.expiryDate || 'N/A';
                              const unit = med?.unit || 'Box';

                              return (
                                <tr key={idx} className="hover:bg-[#103d37] transition-colors">
                                  <td className="py-2 px-3 font-mono text-[10px] text-teal-400">{idx + 1}</td>
                                  <td className="py-2 px-3 font-semibold text-white">
                                    <div>{name}</div>
                                    {med?.strength && (
                                      <span className="text-[10px] text-teal-300/70 font-normal">{med.strength}</span>
                                    )}
                                  </td>
                                  <td className="py-2 px-3 text-teal-200/90 max-w-[120px] truncate">{generic}</td>
                                  <td className="py-2 px-3">
                                    <span className="px-2 py-0.5 rounded-md bg-[#134e47] text-emerald-300 text-[10px] border border-[#206e64]">
                                      {category}
                                    </span>
                                  </td>
                                  <td className="py-2 px-3 text-[11px] font-mono">
                                    <div>{batch}</div>
                                    <div className="text-teal-400/80 text-[10px]">{expiry}</div>
                                  </td>
                                  <td className="py-2 px-3 text-right font-mono text-teal-200">
                                    ৳{purchasePrice.toFixed(2)}
                                  </td>
                                  <td className="py-2 px-3 text-right font-mono font-semibold text-emerald-400">
                                    ৳{sellingPrice.toFixed(2)}
                                  </td>
                                  <td className="py-2 px-3 text-center font-bold text-white">
                                    <span className="px-2 py-0.5 rounded-md bg-emerald-950 border border-emerald-700/50 text-emerald-300">
                                      {stockQty} {unit}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-6 bg-[#0c2e29] border border-[#1a554d] rounded-xl text-center text-teal-200/90 text-xs">
                    <p>No valid medicine rows were detected. Please verify your CSV header columns or download the sample template.</p>
                  </div>
                )}
              </div>
            )}

            {/* Ingestion Info Callout */}
            <div className="bg-[#09221f] rounded-xl p-3.5 border border-[#18534b] text-[11px] text-teal-200/80 space-y-1">
              <p className="font-bold text-white flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-emerald-400" />
                Direct Database Synchronization:
              </p>
              <p className="leading-relaxed">
                When you click <strong>Save Medicines to Database</strong>, all rows are assigned safe unique identifiers and saved directly into your local database. They will immediately become searchable in the POS, Product List, and Inventory screens.
              </p>
            </div>
          </div>
        </ErrorBoundary>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-[#11433d] border-t border-[#1d5c54] flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 rounded-xl bg-[#0c2e29] hover:bg-[#15463f] text-teal-200 hover:text-white border border-[#1d5c54] text-xs font-semibold transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            {!file ? (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-emerald-950/50 transition-all cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                <span>Select CSV File</span>
              </button>
            ) : (
              <button
                id="btn-confirm-csv-import"
                type="button"
                disabled={parsedMedicines.length === 0 || isImporting || isProcessing}
                onClick={handleCommitImport}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-md transition-all cursor-pointer ${
                  parsedMedicines.length > 0 && !isImporting && !isProcessing
                    ? 'bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white shadow-emerald-950/60'
                    : 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
                }`}
              >
                {isImporting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Saving to Database...</span>
                  </>
                ) : (
                  <>
                    <Database className="w-4 h-4" />
                    <span>Save {parsedMedicines.length} Medicines to Database</span>
                    <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
