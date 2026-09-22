import React from 'react';
import { X, Phone, Mail, MapPin, ShieldCheck, Award, MessageCircle, ExternalLink } from 'lucide-react';

interface AboutUsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutUsModal: React.FC<AboutUsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in">
      <div className="bg-neutral-950 text-white border border-neutral-800 w-full max-w-md rounded-3xl overflow-hidden shadow-2xl">
        {/* Header with App Icon */}
        <div className="relative bg-black p-6 text-center border-b border-neutral-800">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-neutral-900 text-emerald-400 hover:text-white hover:bg-neutral-800 border border-neutral-800 transition-colors"
          >
            <X className="w-5 h-5 text-emerald-400" />
          </button>

          <div className="w-20 h-20 mx-auto rounded-2xl bg-white p-1 shadow-xl ring-2 ring-emerald-400/60 mb-3 flex items-center justify-center">
            <img
              src="/app-icon.svg"
              alt="Siam Pharma"
              className="w-full h-full object-contain"
              onError={(e) => {
                const target = e.currentTarget;
                if (target.src !== '/app-icon.jpg') {
                  target.src = '/app-icon.jpg';
                }
              }}
              referrerPolicy="no-referrer"
            />
          </div>
          <h2 className="text-2xl font-black tracking-tight text-white flex items-center justify-center gap-2">
            Siam Pharma
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800/60">
              v2.4
            </span>
          </h2>
          <p className="text-sm font-semibold text-emerald-400 mt-0.5">Proprietor: Siam Hasan</p>
          <p className="text-xs text-neutral-400 mt-1">
            Intelligent Pharmacy Management, Drug Directory & POS System
          </p>
        </div>

        {/* Details & Credentials */}
        <div className="p-6 space-y-4 text-xs leading-relaxed bg-black">
          <div className="bg-[#0c100e] p-3.5 rounded-2xl border border-neutral-800 space-y-2">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Government Pharmacy Registration</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-neutral-200 pt-1 border-t border-neutral-800">
              <div>
                <span className="text-neutral-400 block text-[10px]">DRUG LICENSE NO.</span>
                <span className="font-mono font-bold text-white">DL-DHK-2024-88291</span>
              </div>
              <div>
                <span className="text-neutral-400 block text-[10px]">DGDA REGISTRATION</span>
                <span className="font-mono font-bold text-white">REG-PH-0924</span>
              </div>
            </div>
          </div>

          <div className="space-y-2.5 text-neutral-200">
            <div className="flex items-center gap-3 p-2.5 rounded-xl bg-[#0c100e] border border-neutral-800">
              <Phone className="w-4 h-4 text-emerald-400 shrink-0" />
              <div>
                <span className="text-emerald-500 text-[10px] block font-semibold">CONTACT / WHATSAPP</span>
                <span className="font-semibold text-sm text-white font-mono">+88 01846493071</span>
              </div>
            </div>

            <div className="flex items-center gap-3 p-2.5 rounded-xl bg-[#0c100e] border border-neutral-800">
              <Mail className="w-4 h-4 text-emerald-400 shrink-0" />
              <div>
                <span className="text-emerald-500 text-[10px] block font-semibold">DIRECT EMAIL</span>
                <span className="font-semibold text-white text-xs font-mono">siamhasannassta999@gmail.com</span>
              </div>
            </div>

            <div className="flex items-center gap-3 p-2.5 rounded-xl bg-[#0c100e] border border-neutral-800">
              <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
              <div>
                <span className="text-emerald-500 text-[10px] block font-semibold">LOCATION</span>
                <span className="font-medium text-white">Dhaka, Bangladesh</span>
              </div>
            </div>
          </div>

          {/* Quick WhatsApp Link Button */}
          <a
            href="https://wa.me/8801846493071"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#25D366] hover:bg-[#20ba59] text-white font-bold text-sm shadow-md transition-all active:scale-[0.98]"
          >
            <MessageCircle className="w-5 h-5 fill-white text-[#25D366]" />
            <span>Chat on WhatsApp (+88 01846493071)</span>
            <ExternalLink className="w-4 h-4 opacity-70" />
          </a>
        </div>

        {/* Footer */}
        <div className="bg-black px-6 py-3 border-t border-neutral-800 text-center text-[11px] text-neutral-400">
          © {new Date().getFullYear()} Siam Pharma • All Rights Reserved
        </div>
      </div>
    </div>
  );
};
