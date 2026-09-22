import React, { useState, useRef } from 'react';
import { usePharmacy } from '../context/PharmacyContext';
import {
  Building2,
  Factory,
  ShieldPlus,
  Pill,
  Sparkles,
  Briefcase,
  Cross,
  Upload,
  Check,
  X,
  Plus,
  Trash2,
} from 'lucide-react';

interface AddCompanyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const COMPANY_ICON_OPTIONS = [
  { id: 'Building2', label: 'Corporate HQ', icon: Building2 },
  { id: 'Factory', label: 'Manufacturing Plant', icon: Factory },
  { id: 'ShieldPlus', label: 'Certified Lab', icon: ShieldPlus },
  { id: 'Pill', label: 'Formulations', icon: Pill },
  { id: 'Sparkles', label: 'Biotech', icon: Sparkles },
  { id: 'Briefcase', label: 'Distributor', icon: Briefcase },
  { id: 'Cross', label: 'Healthcare', icon: Cross },
];

export const AddCompanyModal: React.FC<AddCompanyModalProps> = ({ isOpen, onClose }) => {
  const { companies, addCompany, deleteCompany } = usePharmacy();
  const [companyName, setCompanyName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('Building2');
  const [customIconUrl, setCustomIconUrl] = useState<string | undefined>(undefined);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleCustomIconUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setCustomIconUrl(result);
        setShowIconPicker(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = companyName.trim();
    if (!trimmed) {
      setToastMessage('Please enter a company name.');
      setTimeout(() => setToastMessage(null), 2500);
      return;
    }

    addCompany(trimmed, selectedIcon, customIconUrl);
    setToastMessage(`Company "${trimmed}" saved successfully!`);
    setCompanyName('');
    setCustomIconUrl(undefined);
    setTimeout(() => {
      setToastMessage(null);
      onClose();
    }, 1200);
  };

  const SelectedIconComponent =
    COMPANY_ICON_OPTIONS.find((opt) => opt.id === selectedIcon)?.icon || Building2;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-xs select-none animate-in fade-in duration-200">
      {/* Background click to dismiss */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Bottom Sheet Container matching screenshot */}
      <div
        className="relative w-full max-w-md bg-[#143934] border-t border-[#235851] rounded-t-3xl shadow-2xl p-5 pb-8 text-white z-10 animate-in slide-in-from-bottom duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top drag handle */}
        <div className="w-12 h-1 bg-teal-200/40 rounded-full mx-auto mb-3" />

        {/* Title Header matching screenshot */}
        <div className="text-center">
          <h2 className="text-base font-bold text-teal-100 tracking-tight">Add Company</h2>
        </div>

        {/* Subtle dashed divider line matching screenshot */}
        <div className="border-b border-dashed border-[#235851] my-3.5" />

        {/* Toast feedback */}
        {toastMessage && (
          <div className="mb-3 p-2.5 rounded-xl bg-emerald-950/80 border border-emerald-400 text-emerald-200 text-xs font-semibold text-center animate-in fade-in">
            {toastMessage}
          </div>
        )}

        {/* Input Form matching screenshot */}
        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-2">
            {/* Input with Company Icon Button inside/beside */}
            <div className="flex items-center gap-2.5">
              {/* Interactive Company Icon Selector Button */}
              <button
                type="button"
                id="company-icon-picker-btn"
                onClick={() => setShowIconPicker(!showIconPicker)}
                className="w-12 h-12 rounded-xl bg-[#0f2d29] border border-[#27645b] hover:border-teal-400 flex items-center justify-center text-teal-300 hover:text-white transition-all shrink-0 relative group shadow-inner"
                title="Choose Company Icon / Logo"
              >
                {customIconUrl ? (
                  <img
                    src={customIconUrl}
                    alt="Company Icon"
                    className="w-8 h-8 rounded-lg object-contain"
                  />
                ) : (
                  <SelectedIconComponent className="w-6 h-6 text-teal-300 group-hover:scale-110 transition-transform" />
                )}
                <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-[#51877b] text-white rounded-full flex items-center justify-center text-[10px] font-black shadow-xs">
                  +
                </span>
              </button>

              {/* Enter Company Name input matching screenshot */}
              <input
                id="company-name-input"
                type="text"
                autoFocus
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Enter Company Name"
                className="flex-1 px-4 py-3.5 rounded-xl bg-[#0f2c29] border border-[#27645b] text-teal-50 placeholder-teal-600/70 text-sm focus:outline-none focus:border-teal-400 transition-colors shadow-inner"
              />
            </div>
          </div>

          {/* Company Icon Picker Dropdown / Palette */}
          {showIconPicker && (
            <div className="p-3 bg-[#0d2623] border border-[#21534c] rounded-2xl space-y-2.5 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-teal-200">Select Company Icon:</span>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-[11px] font-bold text-emerald-300 hover:text-emerald-200 flex items-center gap-1 bg-emerald-950/60 px-2 py-1 rounded-lg border border-emerald-500/30"
                >
                  <Upload className="w-3 h-3" />
                  <span>Upload Logo</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleCustomIconUpload}
                  className="hidden"
                />
              </div>

              <div className="grid grid-cols-4 gap-2">
                {COMPANY_ICON_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  const isSelected = selectedIcon === opt.id && !customIconUrl;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        setSelectedIcon(opt.id);
                        setCustomIconUrl(undefined);
                        setShowIconPicker(false);
                      }}
                      className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition-all ${
                        isSelected
                          ? 'bg-emerald-900/40 border-emerald-400 text-white'
                          : 'bg-[#143934] border-[#225049] text-teal-300 hover:text-white hover:bg-[#1a4640]'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="text-[9px] truncate max-w-full">{opt.label.split(' ')[0]}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Save Button matching exact placement and color in screenshot */}
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={onClose}
              className="text-xs text-teal-400 hover:text-teal-200 px-3 py-2 rounded-lg transition-colors"
            >
              Cancel
            </button>

            <button
              id="save-company-btn"
              type="submit"
              className="px-8 py-2.5 rounded-xl bg-[#51877b] hover:bg-[#5f9c8f] active:scale-95 text-white font-bold text-sm shadow-md transition-all cursor-pointer"
            >
              Save
            </button>
          </div>
        </form>

        {/* Existing Companies List with their Icons */}
        <div className="mt-5 pt-3 border-t border-[#1d4842]">
          <span className="text-[11px] font-bold text-teal-300/80 uppercase tracking-wider block mb-2">
            Existing Companies ({companies.length})
          </span>
          <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
            {companies.map((comp) => {
              const FoundIcon =
                COMPANY_ICON_OPTIONS.find((o) => o.id === comp.iconName)?.icon || Building2;
              return (
                <div
                  key={comp.id}
                  className="flex items-center justify-between p-2 rounded-xl bg-[#0f2d29] border border-[#1e4842] text-xs text-teal-100"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-6 h-6 rounded-lg bg-[#18423c] flex items-center justify-center text-teal-300 shrink-0">
                      {comp.customIconUrl ? (
                        <img
                          src={comp.customIconUrl}
                          alt={comp.name}
                          className="w-4 h-4 object-contain rounded"
                        />
                      ) : (
                        <FoundIcon className="w-3.5 h-3.5" />
                      )}
                    </div>
                    <span className="truncate font-medium">{comp.name}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => deleteCompany(comp.id)}
                    title="Delete Company"
                    className="text-teal-500 hover:text-rose-400 p-1 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
