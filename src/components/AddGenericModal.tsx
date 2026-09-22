import React, { useState, useRef } from 'react';
import {
  Pill,
  Trash2,
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Search,
  X,
  FileText,
} from 'lucide-react';
import { safeLocalStorageGet, safeLocalStorageSet } from '../utils/persistentStorage';
import {
  parseGenericsFromCSV,
  downloadSampleGenericsCsv,
  validateCsvFile,
} from '../utils/csvHelper';

interface AddGenericModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'single' | 'csv';
}

const DEFAULT_INITIAL_GENERICS = [
  'Paracetamol',
  'Esomeprazole',
  'Omeprazole',
  'Ciprofloxacin',
  'Azithromycin',
  'Montelukast',
  'Metformin HCl',
  'Amlodipine',
  'Cetirizine HCl',
  'Pantoprazole',
];

export const AddGenericModal: React.FC<AddGenericModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'single',
}) => {
  const [activeTab, setActiveTab] = useState<'single' | 'csv'>(initialTab);
  const [genericName, setGenericName] = useState('');
  const [generics, setGenerics] = useState<string[]>(() => {
    return safeLocalStorageGet<string[]>('pharmapulse_generics_v1', DEFAULT_INITIAL_GENERICS);
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // CSV Import State
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [parsedGenerics, setParsedGenerics] = useState<string[]>([]);
  const [skippedDuplicatesCount, setSkippedDuplicatesCount] = useState(0);
  const [csvParseErrors, setCsvParseErrors] = useState<string[]>([]);
  const [isParsingCsv, setIsParsingCsv] = useState(false);
  const [pasteMode, setPasteMode] = useState(false);
  const [pastedCsvText, setPastedCsvText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3000);
  };

  const notifyGenericsUpdated = (updated: string[]) => {
    try {
      window.dispatchEvent(new CustomEvent('pharmapulse:generics-updated', { detail: updated }));
    } catch {
      // ignore
    }
  };

  const handleSingleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = genericName.trim();
    if (!trimmed) {
      showToast('Please enter a generic name.', 'error');
      return;
    }

    if (generics.some((g) => g.toLowerCase() === trimmed.toLowerCase())) {
      showToast(`"${trimmed}" already exists in database.`, 'error');
      return;
    }

    const updated = [trimmed, ...generics];
    setGenerics(updated);
    safeLocalStorageSet('pharmapulse_generics_v1', updated);
    notifyGenericsUpdated(updated);
    showToast(`Generic "${trimmed}" added successfully!`);
    setGenericName('');
  };

  const handleDelete = (name: string) => {
    const updated = generics.filter((g) => g !== name);
    setGenerics(updated);
    safeLocalStorageSet('pharmapulse_generics_v1', updated);
    notifyGenericsUpdated(updated);
  };

  // Process raw CSV string
  const processCsvContent = (content: string) => {
    setIsParsingCsv(true);
    setCsvParseErrors([]);
    try {
      const parsed = parseGenericsFromCSV(content, generics);
      setParsedGenerics(parsed.generics);
      setSkippedDuplicatesCount(parsed.skippedDuplicates);
      setCsvParseErrors(parsed.errors);

      if (parsed.generics.length === 0 && parsed.skippedDuplicates === 0) {
        showToast('No valid generic names found in this CSV.', 'error');
      } else if (parsed.generics.length === 0 && parsed.skippedDuplicates > 0) {
        showToast(`All ${parsed.skippedDuplicates} generics in file already exist in database.`, 'error');
      }
    } catch (err: any) {
      setCsvParseErrors([err?.message || 'Failed to process CSV']);
      showToast('Failed to parse CSV.', 'error');
    } finally {
      setIsParsingCsv(false);
    }
  };

  // Handle uploaded file
  const handleFileSelected = (fileObj: unknown) => {
    const validation = validateCsvFile(fileObj);
    if (!validation.valid) {
      showToast(validation.error || 'Invalid file format', 'error');
      setCsvParseErrors([validation.error || 'Invalid file format']);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const validFile = fileObj as File;
    setCsvFile(validFile);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = (e.target?.result as string) || '';
      processCsvContent(text);
    };
    reader.onerror = () => {
      showToast('Error reading the CSV file.', 'error');
    };
    reader.readAsText(validFile);
  };

  // Drag & drop handlers
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
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFileSelected(files[0]);
    }
  };

  // Confirm Bulk Import
  const handleConfirmBulkImport = () => {
    if (parsedGenerics.length === 0) return;

    // Deduplicate against existing generics again
    const existingLower = new Set(generics.map((g) => g.toLowerCase()));
    const reallyNew = parsedGenerics.filter((g) => !existingLower.has(g.toLowerCase()));

    if (reallyNew.length === 0) {
      showToast('All parsed generics are already saved in the database.', 'error');
      return;
    }

    const updated = [...reallyNew, ...generics];
    setGenerics(updated);
    safeLocalStorageSet('pharmapulse_generics_v1', updated);
    notifyGenericsUpdated(updated);

    showToast(`Successfully imported ${reallyNew.length} generic medicines!`);

    // Reset CSV state
    setParsedGenerics([]);
    setCsvFile(null);
    setPastedCsvText('');
    setSkippedDuplicatesCount(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const filteredGenerics = generics.filter((g) =>
    g.toLowerCase().includes(searchTerm.trim().toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-xs select-none animate-in fade-in duration-200">
      <div className="absolute inset-0" onClick={onClose} />

      <div
        className="relative w-full max-w-lg bg-[#143934] border-t border-[#235851] rounded-t-3xl shadow-2xl p-5 pb-8 text-white z-10 animate-in slide-in-from-bottom duration-300 max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-12 h-1 bg-teal-200/40 rounded-full mx-auto mb-3 shrink-0" />

        {/* Header with Title & Close */}
        <div className="flex items-center justify-between pb-2 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-teal-500/20 border border-teal-400/30 flex items-center justify-center text-teal-300">
              <Pill className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-teal-100 tracking-tight">Add Generic</h2>
              <p className="text-[11px] text-teal-300/70">Single entry or Bulk Import via CSV</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-[#0f2c29] hover:bg-[#1a4a44] text-teal-300 flex items-center justify-center transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Segmented Control */}
        <div className="p-1 bg-[#0f2c29] rounded-xl flex border border-[#27645b] my-2 shrink-0">
          <button
            id="tab-single-generic"
            type="button"
            onClick={() => setActiveTab('single')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'single'
                ? 'bg-[#51877b] text-white shadow-xs'
                : 'text-teal-300/80 hover:text-teal-100'
            }`}
          >
            Single Entry
          </button>
          <button
            id="tab-csv-generic"
            type="button"
            onClick={() => setActiveTab('csv')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'csv'
                ? 'bg-[#51877b] text-white shadow-xs'
                : 'text-teal-300/80 hover:text-teal-100'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Bulk Import (CSV)</span>
          </button>
        </div>

        {/* Notification Banner */}
        {toastMessage && (
          <div
            className={`mb-3 p-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2 shrink-0 animate-in fade-in ${
              toastMessage.type === 'error'
                ? 'bg-rose-950/90 border-rose-500 text-rose-200'
                : 'bg-emerald-950/90 border-emerald-400 text-emerald-200'
            }`}
          >
            {toastMessage.type === 'error' ? (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            ) : (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            )}
            <span>{toastMessage.text}</span>
          </div>
        )}

        {/* Tab 1: Single Entry */}
        {activeTab === 'single' && (
          <form onSubmit={handleSingleSave} className="space-y-3 shrink-0">
            <div>
              <label className="text-[11px] font-semibold text-teal-200/90 uppercase tracking-wider block mb-1.5">
                Generic Name
              </label>
              <input
                id="generic-name-input"
                type="text"
                autoFocus
                value={genericName}
                onChange={(e) => setGenericName(e.target.value)}
                placeholder="e.g. Paracetamol, Esomeprazole, Ciprofloxacin..."
                className="w-full px-4 py-3 rounded-xl bg-[#0f2c29] border border-[#27645b] text-teal-50 placeholder-teal-600/70 text-sm focus:outline-none focus:border-teal-400 transition-colors shadow-inner"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={onClose}
                className="text-xs text-teal-400 hover:text-teal-200 px-3 py-2 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                id="save-generic-btn"
                type="submit"
                className="px-6 py-2 rounded-xl bg-[#51877b] hover:bg-[#5f9c8f] active:scale-95 text-white font-bold text-sm shadow-md transition-all cursor-pointer"
              >
                Save Generic
              </button>
            </div>
          </form>
        )}

        {/* Tab 2: Bulk Import via CSV */}
        {activeTab === 'csv' && (
          <div className="space-y-3 shrink-0">
            {/* Top Toolbar: Sample Download & Mode Toggle */}
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={downloadSampleGenericsCsv}
                className="text-[11px] font-semibold text-teal-300 hover:text-white flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#0f2c29] border border-[#27645b] transition-colors cursor-pointer"
                title="Download standard Generic CSV sample template"
              >
                <Download className="w-3.5 h-3.5 text-teal-400" />
                <span>Sample CSV Template</span>
              </button>

              <button
                type="button"
                onClick={() => setPasteMode(!pasteMode)}
                className="text-[11px] font-semibold text-teal-300 hover:text-white flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#0f2c29] border border-[#27645b] transition-colors cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5 text-teal-400" />
                <span>{pasteMode ? 'Upload File' : 'Paste Text'}</span>
              </button>
            </div>

            {/* Paste text mode */}
            {pasteMode ? (
              <div className="space-y-2">
                <textarea
                  value={pastedCsvText}
                  onChange={(e) => setPastedCsvText(e.target.value)}
                  placeholder="Paste CSV rows here, e.g.:&#10;Generic Name,Category&#10;Paracetamol,Analgesic&#10;Esomeprazole,PPI&#10;Azithromycin,Antibiotic"
                  rows={4}
                  className="w-full p-3 rounded-xl bg-[#0f2c29] border border-[#27645b] text-teal-50 placeholder-teal-600/70 text-xs font-mono focus:outline-none focus:border-teal-400"
                />
                <button
                  type="button"
                  onClick={() => processCsvContent(pastedCsvText)}
                  disabled={!pastedCsvText.trim() || isParsingCsv}
                  className="w-full py-2 bg-[#286358] hover:bg-[#347c6e] disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Parse Pasted Generics
                </button>
              </div>
            ) : (
              /* File Drag & Drop */
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`p-4 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                  isDragging
                    ? 'border-emerald-400 bg-emerald-950/40'
                    : 'border-[#27645b] bg-[#0f2c29]/70 hover:border-teal-400'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv,text/plain,application/vnd.ms-excel"
                  className="hidden"
                  onChange={(e) => {
                    const files = e.target.files;
                    if (files && files.length > 0) {
                      handleFileSelected(files[0]);
                    }
                  }}
                />
                <Upload className="w-7 h-7 text-teal-400 mb-1" />
                <p className="text-xs font-bold text-teal-100">
                  {csvFile ? csvFile.name : 'Upload Generics CSV File'}
                </p>
                <p className="text-[11px] text-teal-300/70 mt-0.5">
                  Drag and drop your .csv here or click to browse
                </p>
              </div>
            )}

            {/* Error alerts */}
            {csvParseErrors.length > 0 && (
              <div className="p-2.5 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-200 text-xs space-y-1">
                {csvParseErrors.map((err, idx) => (
                  <div key={idx} className="flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                    <span>{err}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Parsed Preview & Confirm Import */}
            {parsedGenerics.length > 0 && (
              <div className="bg-[#0e2724] border border-[#27645b] rounded-2xl p-3 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-teal-200 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>{parsedGenerics.length} New Generics Ready</span>
                  </span>
                  {skippedDuplicatesCount > 0 && (
                    <span className="text-[10px] text-teal-400/80 font-mono">
                      ({skippedDuplicatesCount} duplicates skipped)
                    </span>
                  )}
                </div>

                <div className="max-h-24 overflow-y-auto flex flex-wrap gap-1.5 p-1">
                  {parsedGenerics.slice(0, 30).map((g, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 bg-[#17443e] border border-[#2d6c62] text-[11px] text-teal-100 rounded-lg"
                    >
                      {g}
                    </span>
                  ))}
                  {parsedGenerics.length > 30 && (
                    <span className="px-2 py-0.5 text-[11px] text-teal-300 font-mono">
                      +{parsedGenerics.length - 30} more
                    </span>
                  )}
                </div>

                <button
                  id="btn-import-generics-csv"
                  type="button"
                  onClick={handleConfirmBulkImport}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Import {parsedGenerics.length} Generics to Database</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Bottom Section: Existing Generics Database List */}
        <div className="mt-4 pt-3 border-t border-[#1d4842] flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="flex items-center justify-between mb-2 shrink-0">
            <span className="text-[11px] font-bold text-teal-300/80 uppercase tracking-wider">
              Existing Generics ({generics.length})
            </span>
          </div>

          {/* Search bar */}
          <div className="relative mb-2 shrink-0">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-teal-400/60" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search existing generics..."
              className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-[#0f2d29] border border-[#1e4842] text-xs text-teal-100 placeholder-teal-600/70 focus:outline-none focus:border-teal-400"
            />
          </div>

          {/* Scrollable list */}
          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 min-h-[90px]">
            {filteredGenerics.length === 0 ? (
              <p className="text-center text-xs text-teal-500/70 py-4">No generics match your search</p>
            ) : (
              filteredGenerics.map((g) => (
                <div
                  key={g}
                  className="flex items-center justify-between p-2 rounded-xl bg-[#0f2d29] border border-[#1e4842] text-xs text-teal-100"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Pill className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                    <span className="truncate font-medium">{g}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDelete(g)}
                    className="text-teal-500 hover:text-rose-400 p-1 transition-colors cursor-pointer"
                    title={`Delete ${g}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
