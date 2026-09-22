import React from 'react';
import { X, ShieldCheck, Lock, FileText, CheckCircle2 } from 'lucide-react';

interface PrivacyPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PrivacyPolicyModal: React.FC<PrivacyPolicyModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
      <div className="bg-[#134E4A] text-white border border-[#236a64] w-full max-w-md rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-[#236a64] flex items-center justify-between bg-[#114541]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-teal-200 border border-white/10">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">Privacy Policy</h2>
              <p className="text-xs text-teal-200/80">Siam Pharma Management System</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 text-teal-200 hover:text-white hover:bg-white/20 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs leading-relaxed text-teal-100">
          <div className="p-3.5 bg-[#0e3b37] rounded-2xl border border-[#236a64]/80 space-y-1.5">
            <div className="flex items-center gap-2 text-white font-semibold text-sm">
              <Lock className="w-4 h-4 text-emerald-400" />
              <span>Data Protection & Confidentiality</span>
            </div>
            <p className="text-teal-200/90 text-[11px]">
              Siam Pharma complies with medical privacy regulations. All patient prescription data, customer sales logs, and supplier invoices remain strictly protected.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="font-bold text-white text-sm">1. Information Collection</h3>
            <p className="text-teal-200/80">
              We store localized sales receipts, customer contact directories, inventory medicine batch records, and cashier operational logs solely for store management purposes.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="font-bold text-white text-sm">2. Offline & Cloud Security</h3>
            <p className="text-teal-200/80">
              Your database is stored securely in encrypted local browser storage with optional cloud backup to private Firebase Firestore instances. No patient records are shared with third-party advertising networks.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="font-bold text-white text-sm">3. Prescription & Drug Data</h3>
            <p className="text-teal-200/80">
              Drug monographs, indications, dosage schedules, and pack prices are referenced in adherence to national Directorate General of Drug Administration (DGDA) guidelines.
            </p>
          </div>

          <div className="pt-2 border-t border-[#236a64] flex items-center gap-2 text-emerald-300 font-medium text-[11px]">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Last Updated: February 2025 • Version 1.0.9</span>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#236a64] bg-[#114541] flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-white text-[#134E4A] font-bold text-xs hover:bg-teal-50 transition-colors shadow-sm"
          >
            I Understand
          </button>
        </div>
      </div>
    </div>
  );
};
