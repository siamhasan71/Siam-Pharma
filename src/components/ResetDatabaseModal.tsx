import React, { useState } from 'react';
import {
  AlertTriangle,
  Trash2,
  X,
  CheckCircle2,
  Database,
  Loader2,
  ShieldAlert,
  RotateCcw,
} from 'lucide-react';

interface ResetDatabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmReset: () => Promise<void>;
  totalCount: number;
  isResetting?: boolean;
}

export const ResetDatabaseModal: React.FC<ResetDatabaseModalProps> = ({
  isOpen,
  onClose,
  onConfirmReset,
  totalCount,
  isResetting = false,
}) => {
  const [confirmText, setConfirmText] = useState('');
  const [hasConfirmedCheckbox, setHasConfirmedCheckbox] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const isRequirementMet =
    confirmText.trim().toUpperCase() === 'CLEAR' ||
    confirmText.trim().toUpperCase() === 'RESET' ||
    hasConfirmedCheckbox;

  const handleExecuteReset = async () => {
    if (!isRequirementMet) {
      setErrorMsg('Please type CLEAR or check the box to confirm deletion.');
      return;
    }
    setErrorMsg(null);
    try {
      await onConfirmReset();
      setConfirmText('');
      setHasConfirmedCheckbox(false);
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to complete database reset.');
    }
  };

  const handleCancel = () => {
    if (isResetting) return;
    setConfirmText('');
    setHasConfirmedCheckbox(false);
    setErrorMsg(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#0b332f] border border-rose-500/40 rounded-2xl w-full max-w-lg shadow-2xl shadow-rose-950/50 overflow-hidden text-slate-100 relative">
        {/* Header Alert Banner */}
        <div className="bg-gradient-to-r from-rose-950/90 via-rose-900/60 to-[#0b332f] p-4 sm:p-5 border-b border-rose-500/30 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-mono font-bold tracking-wider px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40">
                  Danger Zone
                </span>
                <span className="text-xs text-rose-200/70 font-mono">
                  {totalCount > 0 ? `${totalCount.toLocaleString()} items` : '0 items'}
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-white leading-tight mt-1">
                Clear All Products & Reset Database
              </h2>
            </div>
          </div>
          <button
            onClick={handleCancel}
            disabled={isResetting}
            className="p-1.5 rounded-lg text-teal-300 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 space-y-4">
          <p className="text-xs text-slate-300 leading-relaxed">
            Are you sure you want to delete all current medicine inventory items and reset the database to <strong className="text-white font-bold">0 products</strong>?
          </p>

          {/* Scope list */}
          <div className="bg-[#082623] border border-teal-800/60 rounded-xl p-3.5 space-y-2 text-xs">
            <div className="font-semibold text-teal-200 flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-teal-400" />
              <span>What will be cleared:</span>
            </div>
            <ul className="space-y-1.5 text-slate-300 text-[11px]">
              <li className="flex items-center gap-2">
                <Trash2 className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                <span>All {totalCount > 0 ? totalCount.toLocaleString() : 'sample/demo'} medicine records, batches, and price data</span>
              </li>
              <li className="flex items-center gap-2">
                <Trash2 className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                <span>IndexedDB local database table (<code className="text-teal-300">pharmacyDb.medicines</code>)</span>
              </li>
              <li className="flex items-center gap-2">
                <Trash2 className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                <span>Browser LocalStorage inventory cache & Firebase cloud backup</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="text-emerald-300">Customers, Suppliers, and Sales invoices are kept safe</span>
              </li>
            </ul>
          </div>

          <div className="bg-amber-950/40 border border-amber-500/30 rounded-xl p-3 text-xs text-amber-200/90 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="leading-normal text-[11px]">
              After clearing, you will have an empty database ready to add your own fresh medicine catalog manually or via CSV spreadsheet upload.
            </p>
          </div>

          {/* Safety Safeguard: Type CLEAR or check confirmation */}
          <div className="space-y-2.5 pt-1">
            <label className="block text-xs font-semibold text-slate-200">
              To prevent accidental clicks, type <span className="font-mono text-rose-300 font-bold bg-rose-950/60 px-1.5 py-0.5 rounded border border-rose-500/30">CLEAR</span> below:
            </label>
            <input
              id="input-confirm-clear-database"
              type="text"
              placeholder="Type CLEAR to confirm"
              value={confirmText}
              onChange={(e) => {
                setConfirmText(e.target.value);
                setErrorMsg(null);
              }}
              disabled={isResetting}
              className="w-full bg-[#082623] border border-rose-500/50 rounded-xl px-3.5 py-2 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-rose-400 focus:ring-1 focus:ring-rose-400"
            />

            <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
              <input
                id="checkbox-confirm-clear"
                type="checkbox"
                checked={hasConfirmedCheckbox}
                onChange={(e) => {
                  setHasConfirmedCheckbox(e.target.checked);
                  setErrorMsg(null);
                }}
                disabled={isResetting}
                className="w-4 h-4 rounded border-teal-700 text-rose-500 focus:ring-rose-400 bg-[#082623]"
              />
              <span className="text-[11px] text-slate-300">
                I understand this will delete all {totalCount > 0 ? totalCount.toLocaleString() : '185k+'} medicine items and cannot be undone.
              </span>
            </label>
          </div>

          {errorMsg && (
            <p className="text-xs text-rose-400 bg-rose-950/50 border border-rose-800 rounded-lg p-2.5">
              {errorMsg}
            </p>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 bg-[#082623] border-t border-teal-800/60 flex items-center justify-between gap-3">
          <button
            id="btn-cancel-reset-modal"
            onClick={handleCancel}
            disabled={isResetting}
            className="px-4 py-2 rounded-xl bg-teal-900/40 hover:bg-teal-900/80 border border-teal-700/60 text-xs font-semibold text-teal-200 hover:text-white transition-all cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            id="btn-confirm-delete-all-products"
            onClick={handleExecuteReset}
            disabled={!isRequirementMet || isResetting}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-md cursor-pointer ${
              isRequirementMet && !isResetting
                ? 'bg-rose-600 hover:bg-rose-500 active:scale-95 text-white shadow-rose-950/40'
                : 'bg-rose-950/40 border border-rose-800/40 text-rose-300/40 cursor-not-allowed'
            }`}
          >
            {isResetting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Resetting Database...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear All Products ({totalCount > 0 ? totalCount.toLocaleString() : '0'})</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
