import React, { useState, useMemo, useEffect, useRef } from 'react';
import { usePharmacy } from '../context/PharmacyContext';
import { Medicine, MedicineCategory } from '../types';
import {
  ArrowLeft,
  Home,
  Plus,
  Check,
  X,
  Upload,
  Download,
  FileSpreadsheet,
  FileText,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Package,
} from 'lucide-react';
import { safeLocalStorageGet } from '../utils/persistentStorage';
import {
  parseMedicinesFromCSV,
  downloadSampleCsv,
  validateCsvFile,
} from '../utils/csvHelper';

interface AddBrandModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGoHome?: () => void;
  onProductAdded?: (productName: string) => void;
  initialTab?: 'Brands' | 'Other Products' | 'CSV Import';
}

const DEFAULT_GENERICS = [
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
  'Salbutamol',
  'Ibuprofen',
  'Rosuvastatin',
  'Levocetirizine',
  'Fexofenadine',
];

const DEFAULT_COMPANIES = [
  'Square Pharmaceuticals Ltd.',
  'Beximco Pharmaceuticals Ltd.',
  'Incepta Pharmaceuticals Ltd.',
  'Opsonin Pharma Ltd.',
  'Renata Limited',
  'ACI Limited',
  'Healthcare Pharmaceuticals',
  'Eskayef (SK+F) Pharmaceuticals',
  'Aristopharma Ltd.',
  'The ACME Laboratories Ltd.',
  'DBL Pharmaceuticals',
  'Popular Pharmaceuticals',
];

const DEFAULT_FORMS = [
  'Tablet',
  'Capsule',
  'Syrup',
  'Suspension',
  'Injection',
  'Ointment',
  'Cream',
  'Drops',
  'Inhaler',
  'Suppository',
  'Sachet',
];

export const AddBrandModal: React.FC<AddBrandModalProps> = ({
  isOpen,
  onClose,
  onGoHome,
  onProductAdded,
  initialTab = 'Brands',
}) => {
  const { addMedicine, bulkAddMedicines, companies, addCompany } = usePharmacy();

  const [activeTab, setActiveTab] = useState<'Brands' | 'Other Products' | 'CSV Import'>(initialTab);

  // Dynamic dropdown lists
  const [genericsList, setGenericsList] = useState<string[]>(() => {
    return safeLocalStorageGet<string[]>('pharmapulse_generics_v1', DEFAULT_GENERICS);
  });

  // Listen for generics updates
  useEffect(() => {
    const handleGenericsUpdated = (e: any) => {
      if (e?.detail && Array.isArray(e.detail)) {
        setGenericsList(e.detail);
      }
    };
    window.addEventListener('pharmapulse:generics-updated', handleGenericsUpdated);
    return () => window.removeEventListener('pharmapulse:generics-updated', handleGenericsUpdated);
  }, []);

  const companiesList = useMemo(() => {
    const list = companies.map((c) => c.name);
    return Array.from(new Set([...list, ...DEFAULT_COMPANIES]));
  }, [companies]);

  // Quick Add Generic inline prompt
  const [showAddGenericPrompt, setShowAddGenericPrompt] = useState(false);
  const [newGenericInput, setNewGenericInput] = useState('');

  // Quick Add Company inline prompt
  const [showAddCompanyPrompt, setShowAddCompanyPrompt] = useState(false);
  const [newCompanyInput, setNewCompanyInput] = useState('');

  // Brand Form State
  const [generic, setGeneric] = useState<string>(DEFAULT_GENERICS[0]);
  const [company, setCompany] = useState<string>(DEFAULT_COMPANIES[0]);
  const [brandName, setBrandName] = useState('');
  const [form, setForm] = useState('Tablet');
  const [strength, setStrength] = useState('');
  const [packSize, setPackSize] = useState('');
  const [price, setPrice] = useState('');

  // Other Products Form State
  const [otherCompany, setOtherCompany] = useState<string>(DEFAULT_COMPANIES[0]);
  const [otherBrandName, setOtherBrandName] = useState('');
  const [otherPackSize, setOtherPackSize] = useState('');
  const [otherPrice, setOtherPrice] = useState('');

  // Status & Feedback
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // CSV Bulk Import State
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [parsedMedicines, setParsedMedicines] = useState<Array<Omit<Medicine, 'id'>>>([]);
  const [csvErrors, setCsvErrors] = useState<string[]>([]);
  const [totalCsvRows, setTotalCsvRows] = useState(0);
  const [isProcessingCsv, setIsProcessingCsv] = useState(false);
  const [isImportingToDb, setIsImportingToDb] = useState(false);
  const [importProgress, setImportProgress] = useState<{ loaded: number; total: number; percent: number } | null>(null);
  const [pasteMode, setPasteMode] = useState(false);
  const [pastedCsvText, setPastedCsvText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleAddNewGeneric = () => {
    if (!newGenericInput.trim()) return;
    const trimmed = newGenericInput.trim();
    if (!genericsList.includes(trimmed)) {
      const updated = [trimmed, ...genericsList];
      setGenericsList(updated);
      try {
        window.dispatchEvent(new CustomEvent('pharmapulse:generics-updated', { detail: updated }));
      } catch {
        // ignore
      }
    }
    setGeneric(trimmed);
    setNewGenericInput('');
    setShowAddGenericPrompt(false);
  };

  const handleAddNewCompany = () => {
    if (!newCompanyInput.trim()) return;
    const trimmed = newCompanyInput.trim();
    addCompany(trimmed);
    if (activeTab === 'Brands') {
      setCompany(trimmed);
    } else {
      setOtherCompany(trimmed);
    }
    setNewCompanyInput('');
    setShowAddCompanyPrompt(false);
  };

  const mapFormToCategory = (formValue: string): MedicineCategory => {
    const lower = formValue.toLowerCase();
    if (lower.includes('tab')) return 'Tablet';
    if (lower.includes('cap')) return 'Capsule';
    if (lower.includes('syr') || lower.includes('susp')) return 'Syrup';
    if (lower.includes('inj')) return 'Injection';
    if (lower.includes('drop')) return 'Drops';
    if (lower.includes('inh')) return 'Inhaler';
    if (lower.includes('oint') || lower.includes('cream')) return 'Ointment';
    return 'Other';
  };

  const handleSaveBrand = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!brandName.trim()) {
      setErrorMessage('Please enter the Brand name.');
      return;
    }

    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum <= 0) {
      setErrorMessage('Please enter a valid selling price.');
      return;
    }

    const costPrice = Math.round(priceNum * 0.75 * 100) / 100;
    const randomBatch = 'B' + Math.floor(1000 + Math.random() * 9000);

    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 2);
    const expiryDateStr = futureDate.toISOString().split('T')[0];

    addMedicine({
      name: brandName.trim(),
      genericName: generic,
      manufacturer: company,
      category: mapFormToCategory(form),
      form: form.trim() || 'Tablet',
      strength: strength.trim(),
      packSize: packSize.trim(),
      sellingPrice: priceNum,
      purchasePrice: costPrice,
      stockQuantity: 100,
      minStockThreshold: 15,
      batchNumber: randomBatch,
      expiryDate: expiryDateStr,
      shelfLocation: 'Counter A-1',
      dosage: strength ? `${strength} as directed` : undefined,
    });

    const savedName = brandName.trim();
    setSuccessMessage(`Successfully added "${savedName}" to your product list!`);
    onProductAdded?.(savedName);

    setBrandName('');
    setStrength('');
    setPackSize('');
    setPrice('');

    setTimeout(() => {
      setSuccessMessage(null);
      onClose();
    }, 1200);
  };

  const handleSaveOtherProduct = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!otherBrandName.trim()) {
      setErrorMessage('Please enter the product name.');
      return;
    }

    const priceNum = parseFloat(otherPrice);
    if (isNaN(priceNum) || priceNum <= 0) {
      setErrorMessage('Please enter a valid selling price.');
      return;
    }

    const costPrice = Math.round(priceNum * 0.75 * 100) / 100;
    const randomBatch = 'OTH' + Math.floor(1000 + Math.random() * 9000);

    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 2);
    const expiryDateStr = futureDate.toISOString().split('T')[0];

    addMedicine({
      name: otherBrandName.trim(),
      genericName: 'Non-Pharma Product',
      manufacturer: otherCompany,
      category: 'Other',
      form: 'Item',
      strength: '',
      packSize: otherPackSize.trim(),
      sellingPrice: priceNum,
      purchasePrice: costPrice,
      stockQuantity: 50,
      minStockThreshold: 10,
      batchNumber: randomBatch,
      expiryDate: expiryDateStr,
      shelfLocation: 'Counter B-2',
    });

    const savedName = otherBrandName.trim();
    setSuccessMessage(`Successfully added "${savedName}" to products!`);
    onProductAdded?.(savedName);

    setOtherBrandName('');
    setOtherPackSize('');
    setOtherPrice('');

    setTimeout(() => {
      setSuccessMessage(null);
      onClose();
    }, 1200);
  };

  // CSV Parsing
  const processCsvText = (text: string) => {
    setIsProcessingCsv(true);
    setCsvErrors([]);
    setErrorMessage(null);

    try {
      const result = parseMedicinesFromCSV(text);
      setParsedMedicines(result.medicines);
      setTotalCsvRows(result.totalRowsCount);
      setCsvErrors(result.errors);

      if (result.medicines.length === 0) {
        setErrorMessage('No valid medicine records could be extracted from this CSV.');
      }
    } catch (err: any) {
      setCsvErrors([err?.message || 'Failed to parse CSV file.']);
      setErrorMessage('Failed to parse CSV content.');
    } finally {
      setIsProcessingCsv(false);
    }
  };

  const handleFile = (fileObj: unknown) => {
    const validation = validateCsvFile(fileObj);
    if (!validation.valid) {
      setErrorMessage(validation.error || 'Invalid CSV file format.');
      setCsvErrors([validation.error || 'Invalid CSV file.']);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const validFile = fileObj as File;
    setCsvFile(validFile);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = (e.target?.result as string) || '';
      processCsvText(text);
    };
    reader.onerror = () => {
      setErrorMessage('Failed to read selected CSV file.');
    };
    reader.readAsText(validFile);
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
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleRemoveParsedItem = (index: number) => {
    setParsedMedicines((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Bulk Import to Database
  const handleBulkImportToDb = async () => {
    if (parsedMedicines.length === 0 || isImportingToDb) return;

    try {
      setIsImportingToDb(true);
      setErrorMessage(null);

      // Auto-register any new manufacturers/companies detected in CSV
      const existingCompanyNames = new Set(companies.map((c) => c.name.toLowerCase()));
      parsedMedicines.forEach((med) => {
        if (med.manufacturer && !existingCompanyNames.has(med.manufacturer.toLowerCase())) {
          existingCompanyNames.add(med.manufacturer.toLowerCase());
          addCompany(med.manufacturer);
        }
      });

      // Call bulkAddMedicines which writes in batches directly into IndexedDB without UI freezes
      const count = await bulkAddMedicines(parsedMedicines, (progress) => {
        setImportProgress(progress);
      });

      const importedCount = count || parsedMedicines.length;
      setSuccessMessage(`Successfully imported ${importedCount} products into database!`);
      onProductAdded?.(`${importedCount} products`);

      // Clear CSV state
      setTimeout(() => {
        setParsedMedicines([]);
        setCsvFile(null);
        setPastedCsvText('');
        setImportProgress(null);
        setIsImportingToDb(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }, 1000);
    } catch (err: any) {
      console.error('Error importing CSV products:', err);
      setErrorMessage(err?.message || 'Failed to save products to database.');
      setIsImportingToDb(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-2 sm:p-4">
      {/* Backdrop */}
      <div className="absolute inset-0" onClick={isImportingToDb ? undefined : onClose} />

      {/* Main Container */}
      <div
        className="relative w-full max-w-lg bg-[#143934] rounded-3xl shadow-2xl border border-[#235851] flex flex-col max-h-[94vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="p-4 flex items-center justify-between border-b border-[#21514a] shrink-0">
          <button
            onClick={isImportingToDb ? undefined : onClose}
            className="w-10 h-10 rounded-xl bg-[#1d4642] hover:bg-[#255651] text-teal-200 flex items-center justify-center transition-colors cursor-pointer"
            title="Go Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <h2 className="text-base sm:text-lg font-bold text-white tracking-wide text-center">
            {activeTab === 'Brands'
              ? 'Add Brand'
              : activeTab === 'Other Products'
              ? 'Add Other Product'
              : 'Bulk Import Products (CSV)'}
          </h2>

          <button
            onClick={isImportingToDb ? undefined : (onGoHome || onClose)}
            className="w-10 h-10 rounded-xl bg-[#1d4642] hover:bg-[#255651] text-teal-200 flex items-center justify-center transition-colors cursor-pointer"
            title="Go to Home"
          >
            <Home className="w-5 h-5" />
          </button>
        </div>

        {/* Segmented Switcher */}
        <div className="p-3 pb-2 shrink-0">
          <div className="p-1 bg-[#1a433e] rounded-xl flex border border-[#285850] gap-1">
            <button
              id="tab-brand-products"
              type="button"
              onClick={() => setActiveTab('Brands')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'Brands'
                  ? 'bg-[#9cb8b0] text-[#12332e] shadow-xs'
                  : 'text-[#8ca8a0] hover:text-white'
              }`}
            >
              Brands
            </button>
            <button
              id="tab-other-products"
              type="button"
              onClick={() => setActiveTab('Other Products')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'Other Products'
                  ? 'bg-[#9cb8b0] text-[#12332e] shadow-xs'
                  : 'text-[#8ca8a0] hover:text-white'
              }`}
            >
              Other Products
            </button>
            <button
              id="tab-csv-products"
              type="button"
              onClick={() => setActiveTab('CSV Import')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'CSV Import'
                  ? 'bg-[#9cb8b0] text-[#12332e] shadow-xs'
                  : 'text-[#8ca8a0] hover:text-white'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Bulk Import (CSV)</span>
            </button>
          </div>
        </div>

        {/* Notification Banners */}
        {successMessage && (
          <div className="mx-4 my-2 p-3 bg-emerald-900/80 border border-emerald-400/60 rounded-xl text-emerald-100 text-xs flex items-center gap-2 shrink-0 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="mx-4 my-2 p-3 bg-rose-900/80 border border-rose-400/60 rounded-xl text-rose-100 text-xs flex items-center gap-2 shrink-0 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Tab 1: Brands Form */}
        {activeTab === 'Brands' && (
          <form onSubmit={handleSaveBrand} className="p-4 space-y-3.5 flex-1 overflow-y-auto">
            {/* Generic Row with Dropdown & [+] Button */}
            <div>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <select
                    value={generic}
                    onChange={(e) => setGeneric(e.target.value)}
                    className="w-full bg-[#183e39] text-white text-xs sm:text-sm rounded-xl border border-[#2a5d55] px-3.5 py-3 appearance-none focus:outline-hidden focus:border-emerald-400 font-medium"
                  >
                    {genericsList.map((g) => (
                      <option key={g} value={g} className="bg-[#163b36] text-white">
                        {g}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-teal-400">
                    ▼
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowAddGenericPrompt(!showAddGenericPrompt)}
                  className="w-11 h-11 rounded-xl bg-[#1d4642] hover:bg-[#255651] text-emerald-300 border border-[#2a5d55] flex items-center justify-center shrink-0 transition-colors cursor-pointer"
                  title="Add new Generic"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>

              {/* Inline Quick Add Generic */}
              {showAddGenericPrompt && (
                <div className="mt-2 p-3 bg-[#112d29] rounded-xl border border-[#2c655b] flex gap-2">
                  <input
                    type="text"
                    placeholder="New Generic Name"
                    value={newGenericInput}
                    onChange={(e) => setNewGenericInput(e.target.value)}
                    className="flex-1 bg-[#193f39] text-white text-xs rounded-lg px-3 py-2 border border-[#2a5d55] placeholder-[#789c94] focus:outline-hidden focus:border-emerald-400"
                  />
                  <button
                    type="button"
                    onClick={handleAddNewGeneric}
                    className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold cursor-pointer"
                  >
                    Add
                  </button>
                </div>
              )}
            </div>

            {/* Company Row with Dropdown & [+] Button */}
            <div>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <select
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    className="w-full bg-[#183e39] text-white text-xs sm:text-sm rounded-xl border border-[#2a5d55] px-3.5 py-3 appearance-none focus:outline-hidden focus:border-emerald-400 font-medium"
                  >
                    {companiesList.map((c) => (
                      <option key={c} value={c} className="bg-[#163b36] text-white">
                        {c}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-teal-400">
                    ▼
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowAddCompanyPrompt(!showAddCompanyPrompt)}
                  className="w-11 h-11 rounded-xl bg-[#1d4642] hover:bg-[#255651] text-emerald-300 border border-[#2a5d55] flex items-center justify-center shrink-0 transition-colors cursor-pointer"
                  title="Add new Company"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>

              {/* Inline Quick Add Company */}
              {showAddCompanyPrompt && (
                <div className="mt-2 p-3 bg-[#112d29] rounded-xl border border-[#2c655b] flex gap-2">
                  <input
                    type="text"
                    placeholder="New Company / Manufacturer"
                    value={newCompanyInput}
                    onChange={(e) => setNewCompanyInput(e.target.value)}
                    className="flex-1 bg-[#193f39] text-white text-xs rounded-lg px-3 py-2 border border-[#2a5d55] placeholder-[#789c94] focus:outline-hidden focus:border-emerald-400"
                  />
                  <button
                    type="button"
                    onClick={handleAddNewCompany}
                    className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold cursor-pointer"
                  >
                    Add
                  </button>
                </div>
              )}
            </div>

            {/* Brand name */}
            <div>
              <input
                id="brand-name-input"
                type="text"
                placeholder="Brand name (e.g. Napa, Seclo, Maxpro)"
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                className="w-full bg-[#183e39] text-white text-xs sm:text-sm rounded-xl border border-[#2a5d55] px-3.5 py-3 placeholder-[#789c94] focus:outline-hidden focus:border-emerald-400 font-medium"
              />
            </div>

            {/* Form & Strength */}
            <div className="grid grid-cols-2 gap-3">
              <div className="relative">
                <select
                  value={form}
                  onChange={(e) => setForm(e.target.value)}
                  className="w-full bg-[#183e39] text-white text-xs sm:text-sm rounded-xl border border-[#2a5d55] px-3.5 py-3 appearance-none focus:outline-hidden focus:border-emerald-400 font-medium"
                >
                  {DEFAULT_FORMS.map((f) => (
                    <option key={f} value={f} className="bg-[#163b36] text-white">
                      {f}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-teal-400">
                  ▼
                </div>
              </div>

              <div>
                <input
                  type="text"
                  placeholder="Strength (e.g. 500mg)"
                  value={strength}
                  onChange={(e) => setStrength(e.target.value)}
                  className="w-full bg-[#183e39] text-white text-xs sm:text-sm rounded-xl border border-[#2a5d55] px-3.5 py-3 placeholder-[#789c94] focus:outline-hidden focus:border-emerald-400 font-medium"
                />
              </div>
            </div>

            {/* Pack size & Selling Price */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <input
                  type="text"
                  placeholder="Pack size (e.g. 10x10)"
                  value={packSize}
                  onChange={(e) => setPackSize(e.target.value)}
                  className="w-full bg-[#183e39] text-white text-xs sm:text-sm rounded-xl border border-[#2a5d55] px-3.5 py-3 placeholder-[#789c94] focus:outline-hidden focus:border-emerald-400 font-medium"
                />
              </div>
              <div>
                <input
                  id="brand-price-input"
                  type="number"
                  step="0.01"
                  placeholder="Selling Price (৳)"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full bg-[#183e39] text-white text-xs sm:text-sm rounded-xl border border-[#2a5d55] px-3.5 py-3 placeholder-[#789c94] focus:outline-hidden focus:border-emerald-400 font-medium"
                />
              </div>
            </div>

            {/* Save Button */}
            <div className="pt-2">
              <button
                id="save-brand-btn"
                type="submit"
                className="w-full py-3 bg-[#69988d] hover:bg-[#78a99d] active:scale-[0.98] text-[#0d2724] font-bold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Save Product</span>
              </button>
            </div>
          </form>
        )}

        {/* Tab 2: Other Products Form */}
        {activeTab === 'Other Products' && (
          <form onSubmit={handleSaveOtherProduct} className="p-4 space-y-3.5 flex-1 overflow-y-auto">
            {/* Company Row */}
            <div>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <select
                    value={otherCompany}
                    onChange={(e) => setOtherCompany(e.target.value)}
                    className="w-full bg-[#183e39] text-white text-xs sm:text-sm rounded-xl border border-[#2a5d55] px-3.5 py-3 appearance-none focus:outline-hidden focus:border-emerald-400 font-medium"
                  >
                    {companiesList.map((c) => (
                      <option key={c} value={c} className="bg-[#163b36] text-white">
                        {c}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-teal-400">
                    ▼
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowAddCompanyPrompt(!showAddCompanyPrompt)}
                  className="w-11 h-11 rounded-xl bg-[#1d4642] hover:bg-[#255651] text-emerald-300 border border-[#2a5d55] flex items-center justify-center shrink-0 transition-colors cursor-pointer"
                  title="Add new Company"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>

              {showAddCompanyPrompt && (
                <div className="mt-2 p-3 bg-[#112d29] rounded-xl border border-[#2c655b] flex gap-2">
                  <input
                    type="text"
                    placeholder="New Company"
                    value={newCompanyInput}
                    onChange={(e) => setNewCompanyInput(e.target.value)}
                    className="flex-1 bg-[#193f39] text-white text-xs rounded-lg px-3 py-2 border border-[#2a5d55] placeholder-[#789c94] focus:outline-hidden focus:border-emerald-400"
                  />
                  <button
                    type="button"
                    onClick={handleAddNewCompany}
                    className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold cursor-pointer"
                  >
                    Add
                  </button>
                </div>
              )}
            </div>

            {/* Brand name */}
            <div>
              <input
                type="text"
                placeholder="Product name (e.g. Diapers, Baby Lotion, Savlon)"
                value={otherBrandName}
                onChange={(e) => setOtherBrandName(e.target.value)}
                className="w-full bg-[#183e39] text-white text-xs sm:text-sm rounded-xl border border-[#2a5d55] px-3.5 py-3 placeholder-[#789c94] focus:outline-hidden focus:border-emerald-400 font-medium"
              />
            </div>

            {/* Pack size */}
            <div>
              <input
                type="text"
                placeholder="Pack size / Specification (e.g. 500ml, Pack of 50)"
                value={otherPackSize}
                onChange={(e) => setOtherPackSize(e.target.value)}
                className="w-full bg-[#183e39] text-white text-xs sm:text-sm rounded-xl border border-[#2a5d55] px-3.5 py-3 placeholder-[#789c94] focus:outline-hidden focus:border-emerald-400 font-medium"
              />
            </div>

            {/* Price */}
            <div>
              <input
                type="number"
                step="0.01"
                placeholder="Selling Price (৳)"
                value={otherPrice}
                onChange={(e) => setOtherPrice(e.target.value)}
                className="w-full bg-[#183e39] text-white text-xs sm:text-sm rounded-xl border border-[#2a5d55] px-3.5 py-3 placeholder-[#789c94] focus:outline-hidden focus:border-emerald-400 font-medium"
              />
            </div>

            {/* Save Button */}
            <div className="pt-2">
              <button
                type="submit"
                className="w-full py-3 bg-[#69988d] hover:bg-[#78a99d] active:scale-[0.98] text-[#0d2724] font-bold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Save Product</span>
              </button>
            </div>
          </form>
        )}

        {/* Tab 3: Bulk Import via CSV */}
        {activeTab === 'CSV Import' && (
          <div className="p-4 space-y-3.5 flex-1 overflow-y-auto flex flex-col">
            {/* Top Toolbar: Sample Download & Toggle Paste */}
            <div className="flex items-center justify-between gap-2 shrink-0">
              <button
                type="button"
                onClick={downloadSampleCsv}
                className="text-xs font-semibold text-teal-200 hover:text-white flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#183e39] border border-[#2a5d55] transition-colors cursor-pointer"
                title="Download sample CSV template for medicine products"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400" />
                <span>Sample CSV Template</span>
              </button>

              <button
                type="button"
                onClick={() => setPasteMode(!pasteMode)}
                className="text-xs font-semibold text-teal-200 hover:text-white flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#183e39] border border-[#2a5d55] transition-colors cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5 text-emerald-400" />
                <span>{pasteMode ? 'Upload File' : 'Paste CSV Text'}</span>
              </button>
            </div>

            {/* Paste Mode or File Drag/Drop */}
            {pasteMode ? (
              <div className="space-y-2 shrink-0">
                <textarea
                  value={pastedCsvText}
                  onChange={(e) => setPastedCsvText(e.target.value)}
                  placeholder="Paste CSV rows here with columns: Name, Generic, Category, Manufacturer, MRP, Cost Price, Stock, Expiry..."
                  rows={4}
                  className="w-full p-3 rounded-xl bg-[#0f2c29] border border-[#27645b] text-teal-50 placeholder-teal-600/70 text-xs font-mono focus:outline-none focus:border-teal-400"
                />
                <button
                  type="button"
                  onClick={() => processCsvText(pastedCsvText)}
                  disabled={!pastedCsvText.trim() || isProcessingCsv}
                  className="w-full py-2 bg-[#286358] hover:bg-[#347c6e] disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  {isProcessingCsv ? 'Parsing Products...' : 'Parse Pasted CSV Content'}
                </button>
              </div>
            ) : (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`p-5 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer transition-all shrink-0 ${
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
                      handleFile(files[0]);
                    }
                  }}
                />
                <Upload className="w-8 h-8 text-emerald-400 mb-1" />
                <p className="text-sm font-bold text-white">
                  {csvFile ? csvFile.name : 'Upload Products CSV File'}
                </p>
                <p className="text-xs text-teal-300/70 mt-1">
                  Drag & drop .csv file here, or click to browse
                </p>
                <span className="text-[10px] text-teal-400/60 font-mono mt-1">
                  Supports Name, Generic, Manufacturer, MRP, Cost, Stock, Batch, Expiry
                </span>
              </div>
            )}

            {/* Error alerts */}
            {csvErrors.length > 0 && (
              <div className="p-2.5 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-200 text-xs space-y-1 shrink-0">
                {csvErrors.slice(0, 3).map((err, idx) => (
                  <div key={idx} className="flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                    <span>{err}</span>
                  </div>
                ))}
                {csvErrors.length > 3 && (
                  <span className="text-[10px] text-rose-300 font-mono">
                    +{csvErrors.length - 3} more minor warnings
                  </span>
                )}
              </div>
            )}

            {/* Parsed Products Summary & Preview Table */}
            {parsedMedicines.length > 0 && (
              <div className="flex-1 flex flex-col min-h-0 space-y-2.5">
                {/* Header summary count */}
                <div className="flex items-center justify-between text-xs bg-[#0f2c29] p-2.5 rounded-xl border border-[#27645b] shrink-0">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="font-bold text-teal-100">
                      {parsedMedicines.length} Products Ready to Import
                    </span>
                  </div>
                  <span className="text-[11px] text-teal-300/80 font-mono">
                    Total Rows: {totalCsvRows}
                  </span>
                </div>

                {/* Progress bar during import */}
                {isImportingToDb && importProgress && (
                  <div className="p-2.5 bg-[#0e2724] border border-emerald-500/40 rounded-xl space-y-1.5 shrink-0">
                    <div className="flex items-center justify-between text-[11px] text-emerald-300 font-mono">
                      <span>Writing products to database...</span>
                      <span>{importProgress.percent}% ({importProgress.loaded}/{importProgress.total})</span>
                    </div>
                    <div className="w-full bg-[#183e39] h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-emerald-400 h-full transition-all duration-150"
                        style={{ width: `${importProgress.percent}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Scrollable Preview Table */}
                <div className="flex-1 border border-[#27645b] rounded-xl bg-[#0e2724] overflow-hidden flex flex-col min-h-[140px]">
                  <div className="bg-[#173e38] px-3 py-1.5 border-b border-[#27645b] flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-teal-200 shrink-0">
                    <span>Product Preview ({parsedMedicines.length})</span>
                    <span>Scroll to review</span>
                  </div>
                  <div className="flex-1 overflow-y-auto divide-y divide-[#1e4a44]">
                    {parsedMedicines.map((med, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 hover:bg-[#143d37] transition-colors flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white truncate">{med.name}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-[#1e4842] text-teal-200 border border-[#2b5e56]">
                              {med.category}
                            </span>
                            {med.strength && (
                              <span className="text-[10px] text-teal-300 font-mono">{med.strength}</span>
                            )}
                          </div>
                          <div className="text-[11px] text-teal-300/80 truncate mt-0.5">
                            <span>{med.genericName}</span>
                            <span className="mx-1 text-teal-500">•</span>
                            <span>{med.manufacturer}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0 text-right">
                          <div>
                            <div className="font-bold text-emerald-300 font-mono text-xs">
                              ৳{med.sellingPrice.toFixed(2)}
                            </div>
                            <div className="text-[10px] text-teal-400/80 font-mono">
                              Qty: {med.stockQuantity}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveParsedItem(idx)}
                            className="text-teal-500 hover:text-rose-400 p-1 transition-colors cursor-pointer"
                            title="Remove from import"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Import Action Button */}
                <button
                  id="btn-import-products-csv"
                  type="button"
                  onClick={handleBulkImportToDb}
                  disabled={isImportingToDb || parsedMedicines.length === 0}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 active:scale-[0.98] text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
                >
                  <Package className="w-4 h-4" />
                  <span>
                    {isImportingToDb
                      ? 'Saving Products to Database...'
                      : `Import ${parsedMedicines.length} Products to Database`}
                  </span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
