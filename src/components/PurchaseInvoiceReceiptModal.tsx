import React from 'react';
import { PurchaseOrder } from '../types';
import { Printer, X, CheckCircle2, Building2, Calendar, FileText, CloudCheck, Copy, Check } from 'lucide-react';
import { formatCurrency } from '../utils/formatters';

interface PurchaseInvoiceReceiptModalProps {
  order: PurchaseOrder | null;
  isOpen: boolean;
  onClose: () => void;
}

export const PurchaseInvoiceReceiptModal: React.FC<PurchaseInvoiceReceiptModalProps> = ({
  order,
  isOpen,
  onClose,
}) => {
  const [copied, setCopied] = React.useState(false);

  if (!isOpen || !order) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleCopyInvoiceNumber = () => {
    if (order.poNumber) {
      navigator.clipboard.writeText(order.poNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formattedDate = new Date(order.orderDate).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const dueAmount = Math.max(0, order.totalAmount - (order.paidAmount || 0));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-[#121212] text-neutral-100 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden border border-[#2a2a2a] my-auto">
        {/* Modal Top Bar (hidden in print) */}
        <div className="no-print bg-[#181818] border-b border-[#262626] px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-950/60 border border-emerald-800/60 flex items-center justify-center text-emerald-400">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-white">Purchase Invoice Details</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-700/60 text-emerald-300">
                  {order.poNumber}
                </span>
              </div>
              <p className="text-[11px] text-neutral-400">Wholesale stock-in &amp; supplier transaction record</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyInvoiceNumber}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#222] hover:bg-[#2c2c2c] text-neutral-300 hover:text-white text-xs font-medium rounded-lg border border-[#333] transition-colors cursor-pointer"
              title="Copy Invoice Number"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy No'}</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm cursor-pointer"
              title="Print / Reprint Invoice (Ctrl+P)"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Reprint Invoice</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-[#252525] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Invoice Container */}
        <div id="printable-purchase-receipt" className="p-6 sm:p-8 bg-[#141414] print:bg-white print:text-black font-mono text-xs leading-relaxed space-y-5">
          {/* Pharmacy Header & Brand */}
          <div className="text-center pb-4 border-b border-dashed border-[#333] print:border-slate-400">
            <div className="flex items-center justify-center gap-2 mb-1">
              <img
                src="/app-icon.svg"
                alt="Siam Pharma"
                className="w-8 h-8 rounded-lg object-contain inline-block bg-emerald-950 p-1 print:bg-transparent"
                onError={(e) => {
                  const target = e.currentTarget;
                  if (target.src !== '/app-icon.jpg') {
                    target.src = '/app-icon.jpg';
                  }
                }}
                referrerPolicy="no-referrer"
              />
              <h2 className="text-lg font-black tracking-tight text-white print:text-black">
                SIAM PHARMA &amp; HEALTHCARE
              </h2>
            </div>
            <p className="text-[11px] text-neutral-400 print:text-slate-600">
              Licensed Pharmacy &amp; Wholesale Surgical Supply
            </p>
            <p className="text-[10px] text-neutral-500 print:text-slate-500">
              Plot #12, Road #4, Dhanmondi, Dhaka • Hotline: +880 1700-000000
            </p>
            <div className="mt-2 inline-block px-3 py-0.5 rounded-md bg-[#1f1f1f] print:bg-slate-100 border border-[#2f2f2f] print:border-slate-300 text-[10px] font-bold uppercase tracking-wider text-emerald-400 print:text-emerald-700">
              WHOLESALE PURCHASE MEMORANDUM (STOCK IN)
            </div>
          </div>

          {/* Invoice & Supplier Metadata Grid */}
          <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-[#1a1a1a] print:bg-slate-50 border border-[#2a2a2a] print:border-slate-200 text-xs">
            <div className="space-y-1">
              <div>
                <span className="text-neutral-500 print:text-slate-500 text-[10px] uppercase font-semibold block">
                  Invoice / Memo No
                </span>
                <span className="font-bold text-white print:text-black text-sm">{order.poNumber}</span>
              </div>
              <div className="pt-1">
                <span className="text-neutral-500 print:text-slate-500 text-[10px] uppercase font-semibold block">
                  Purchase Date
                </span>
                <span className="text-neutral-200 print:text-slate-800">{formattedDate}</span>
              </div>
            </div>

            <div className="space-y-1 text-right">
              <div>
                <span className="text-neutral-500 print:text-slate-500 text-[10px] uppercase font-semibold block">
                  Supplier / Wholesaler
                </span>
                <span className="font-bold text-emerald-400 print:text-emerald-700 text-sm">
                  {order.supplierName}
                </span>
              </div>
              <div className="pt-1">
                <span className="text-neutral-500 print:text-slate-500 text-[10px] uppercase font-semibold block">
                  Payment Status
                </span>
                <span
                  className={`font-bold inline-block px-2 py-0.5 rounded text-[11px] ${
                    order.paymentStatus === 'Paid'
                      ? 'bg-emerald-950 text-emerald-400 print:bg-emerald-100 print:text-emerald-800'
                      : order.paymentStatus === 'Partial'
                      ? 'bg-amber-950 text-amber-400 print:bg-amber-100 print:text-amber-800'
                      : 'bg-rose-950 text-rose-400 print:bg-rose-100 print:text-rose-800'
                  }`}
                >
                  {order.paymentStatus}
                </span>
              </div>
            </div>
          </div>

          {/* Purchased Items Table */}
          <div className="space-y-2">
            <div className="text-[11px] font-bold text-neutral-300 print:text-slate-700 uppercase tracking-wider flex items-center justify-between">
              <span>Restocked Products ({order.items?.length || 0})</span>
              <span className="text-[10px] text-neutral-500 print:text-slate-500 font-normal">
                Batch &amp; Expiry Tracked
              </span>
            </div>

            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#2e2e2e] print:border-slate-300 text-[10px] uppercase text-neutral-400 print:text-slate-600">
                  <th className="py-1.5 font-semibold">#</th>
                  <th className="py-1.5 font-semibold">Medicine Description</th>
                  <th className="py-1.5 font-semibold">Batch / Exp</th>
                  <th className="py-1.5 text-center font-semibold">Qty</th>
                  <th className="py-1.5 text-right font-semibold">Unit Cost</th>
                  <th className="py-1.5 text-right font-semibold">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#222] print:divide-slate-200 text-xs">
                {order.items?.map((item, idx) => (
                  <tr key={idx} className="hover:bg-neutral-900/30 print:hover:bg-transparent">
                    <td className="py-2 text-neutral-500 print:text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                    <td className="py-2 pr-2">
                      <div className="font-semibold text-white print:text-black">{item.medicineName}</div>
                    </td>
                    <td className="py-2 text-[10px] text-neutral-400 print:text-slate-600 font-mono">
                      <div>{item.batchNumber || 'N/A'}</div>
                      <div className="text-neutral-500 print:text-slate-400">Exp: {item.expiryDate || 'N/A'}</div>
                    </td>
                    <td className="py-2 text-center font-bold text-neutral-200 print:text-slate-800">
                      {item.quantity}
                    </td>
                    <td className="py-2 text-right font-mono text-neutral-300 print:text-slate-700">
                      {formatCurrency(item.purchasePrice)}
                    </td>
                    <td className="py-2 text-right font-mono font-bold text-emerald-400 print:text-emerald-700">
                      {formatCurrency(item.totalCost)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Financial Totals */}
          <div className="border-t-2 border-dashed border-[#333] print:border-slate-300 pt-3 space-y-1.5">
            <div className="flex justify-between text-neutral-400 print:text-slate-600">
              <span>Subtotal Amount:</span>
              <span className="font-mono">{formatCurrency(order.totalAmount)}</span>
            </div>
            <div className="flex justify-between text-neutral-400 print:text-slate-600">
              <span>Paid Amount:</span>
              <span className="font-mono text-teal-400 print:text-teal-700">
                {formatCurrency(order.paidAmount || 0)}
              </span>
            </div>
            {dueAmount > 0 && (
              <div className="flex justify-between text-rose-400 print:text-rose-700 font-semibold">
                <span>Outstanding Balance Due:</span>
                <span className="font-mono">{formatCurrency(dueAmount)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-black text-white print:text-black pt-2 border-t border-[#262626] print:border-slate-200">
              <span>NET TOTAL:</span>
              <span className="font-mono text-emerald-400 print:text-emerald-700">
                {formatCurrency(order.totalAmount)}
              </span>
            </div>
          </div>

          {/* Sync & Security Stamp */}
          <div className="pt-3 border-t border-[#222] print:border-slate-200 flex flex-col sm:flex-row items-center justify-between text-[10px] text-neutral-500 print:text-slate-500 gap-2">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>Verified &amp; Synced to Cloud (Firestore: purchase_history)</span>
            </div>
            <div className="font-mono">
              Stock In Status: <span className="text-neutral-300 print:text-slate-700 font-semibold">{order.status}</span>
            </div>
          </div>

          {/* Authorized Signature (for physical invoice reprinting) */}
          <div className="pt-8 hidden print:flex justify-between items-end text-[10px] text-slate-600">
            <div className="border-t border-slate-400 pt-1 w-40 text-center">
              Received By (Store Keeper)
            </div>
            <div className="border-t border-slate-400 pt-1 w-40 text-center">
              Authorized Signature
            </div>
          </div>
        </div>

        {/* Modal Bottom Actions (hidden in print) */}
        <div className="no-print bg-[#181818] border-t border-[#262626] px-5 py-3 flex items-center justify-between">
          <span className="text-xs text-neutral-400 font-mono">
            Invoice: <strong className="text-white">{order.poNumber}</strong>
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Reprint</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-[#222] hover:bg-[#2c2c2c] text-neutral-300 hover:text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
