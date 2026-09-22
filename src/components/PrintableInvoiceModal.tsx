import React from 'react';
import { Sale } from '../types';
import { Printer, X, CheckCircle2, ShieldCheck } from 'lucide-react';
import { formatCurrency } from '../utils/formatters';
import { usePharmacy } from '../context/PharmacyContext';

interface PrintableInvoiceModalProps {
  sale: Sale | null;
  onClose: () => void;
  isOpen?: boolean;
}

export const PrintableInvoiceModal: React.FC<PrintableInvoiceModalProps> = ({
  sale,
  onClose,
  isOpen,
}) => {
  const { clearCart } = usePharmacy();

  if (isOpen === false || !sale) return null;

  const handlePrint = () => {
    clearCart();
    window.print();
  };

  const handleClose = () => {
    clearCart();
    onClose();
  };

  const formattedDate = new Date(sale.date).toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white text-slate-900 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Action Header (hidden in print) */}
        <div className="no-print bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <span className="font-semibold text-sm">Sale Completed Successfully</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm"
              title="Print Receipt (Ctrl+P)"
            >
              <Printer className="w-3.5 h-3.5" />
              Print Receipt
            </button>
            <button
              onClick={handleClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Receipt Container */}
        <div id="printable-receipt" className="p-8 bg-white font-mono text-xs leading-relaxed">
          {/* Pharmacy Branding */}
          <div className="text-center pb-4 border-b border-dashed border-slate-300">
            <div className="flex items-center justify-center gap-2 mb-1">
              <img
                src="/app-icon.svg"
                alt="Siam Pharma"
                className="w-8 h-8 rounded-lg object-contain ring-1 ring-slate-200 inline-block bg-white"
                onError={(e) => {
                  const target = e.currentTarget;
                  if (target.src !== '/app-icon.jpg') {
                    target.src = '/app-icon.jpg';
                  }
                }}
                referrerPolicy="no-referrer"
              />
              <span className="text-xl font-bold tracking-tight text-slate-900 font-sans">
                Siam Pharma ⚕️
              </span>
            </div>
            <p className="font-sans font-medium text-slate-700 text-xs">Community Health & Pharmacy Care</p>
            <p className="text-slate-500 text-[11px]">100 Healthcare Way, Suite 4B, Metropolis</p>
            <p className="text-slate-500 text-[11px]">Tel: +1 (800) 555-0199 | Reg No: PH-88291</p>
            <p className="text-slate-500 text-[11px]">Tax ID / GST: 27AABCP1234F1Z9</p>
          </div>

          {/* Invoice Meta */}
          <div className="py-3 border-b border-dashed border-slate-300 space-y-1 text-slate-700">
            <div className="flex justify-between">
              <span className="text-slate-500">Invoice No:</span>
              <span className="font-bold text-slate-900">{sale.invoiceNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Date & Time:</span>
              <span>{formattedDate}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Cashier:</span>
              <span>{sale.cashierName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Customer:</span>
              <span className="font-semibold text-slate-900">{sale.customerName}</span>
            </div>
            {sale.customerPhone && sale.customerPhone !== 'N/A' && (
              <div className="flex justify-between">
                <span className="text-slate-500">Phone:</span>
                <span>{sale.customerPhone}</span>
              </div>
            )}
          </div>

          {/* Items Table */}
          <div className="py-3 border-b border-dashed border-slate-300">
            <div className="grid grid-cols-12 font-bold text-slate-900 pb-2 border-b border-slate-200">
              <div className="col-span-6">Item (Batch / Exp)</div>
              <div className="col-span-2 text-center">Qty</div>
              <div className="col-span-2 text-right">Price</div>
              <div className="col-span-2 text-right">Total</div>
            </div>

            <div className="divide-y divide-slate-100 py-1">
              {sale.items.map((item, index) => (
                <div key={index} className="grid grid-cols-12 py-2 text-slate-700">
                  <div className="col-span-6">
                    <p className="font-bold text-slate-900">{item.medicineName}</p>
                    <p className="text-[10px] text-slate-500">
                      B: {item.batchNumber} | Exp: {item.expiryDate}
                    </p>
                  </div>
                  <div className="col-span-2 text-center font-medium">{item.quantity}</div>
                  <div className="col-span-2 text-right">{formatCurrency(item.unitPrice)}</div>
                  <div className="col-span-2 text-right font-semibold text-slate-900">
                    {formatCurrency(item.totalPrice)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Financial Totals */}
          <div className="py-3 space-y-1.5 border-b border-dashed border-slate-300 text-slate-700">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>{formatCurrency(sale.subtotal)}</span>
            </div>
            {sale.discountAmount > 0 && (
              <div className="flex justify-between text-emerald-600">
                <span>Discount:</span>
                <span>-{formatCurrency(sale.discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Tax ({sale.taxRate}%):</span>
              <span>{formatCurrency(sale.taxAmount)}</span>
            </div>
            <div className="flex justify-between text-base font-bold text-slate-900 pt-1 border-t border-slate-200">
              <span>Grand Total:</span>
              <span>{formatCurrency(sale.grandTotal)}</span>
            </div>
          </div>

          {/* Payment Details */}
          <div className="py-3 space-y-1 text-slate-700 border-b border-dashed border-slate-300">
            <div className="flex justify-between">
              <span className="text-slate-500">Payment Mode:</span>
              <span className="font-semibold text-slate-900">{sale.paymentMethod}</span>
            </div>
            {sale.amountTendered !== undefined && (
              <div className="flex justify-between">
                <span className="text-slate-500">Tendered:</span>
                <span>{formatCurrency(sale.amountTendered)}</span>
              </div>
            )}
            {sale.changeDue !== undefined && sale.changeDue > 0 && (
              <div className="flex justify-between font-bold text-slate-900">
                <span>Change Returned:</span>
                <span>{formatCurrency(sale.changeDue)}</span>
              </div>
            )}
          </div>

          {/* Barcode Simulation & Footer */}
          <div className="pt-4 text-center space-y-2">
            <div className="inline-flex flex-col items-center">
              <div className="flex items-center gap-[2px] h-8 bg-slate-100 p-1 rounded">
                {[4, 2, 6, 3, 5, 2, 7, 3, 4, 6, 2, 8, 4, 3, 5, 2, 6, 4, 3].map((height, i) => (
                  <div
                    key={i}
                    className="w-[2px] bg-slate-900 rounded-sm"
                    style={{ height: `${height * 3.5}px` }}
                  />
                ))}
              </div>
              <span className="text-[10px] text-slate-500 mt-1 font-mono">{sale.invoiceNumber}</span>
            </div>

            <p className="text-[11px] text-slate-600 font-sans italic">
              "Thank you for choosing Siam Pharma! Please store medicines below 25°C away from direct sunlight."
            </p>
            <div className="flex items-center justify-center gap-1 text-[10px] text-slate-400 font-sans">
              <ShieldCheck className="w-3 h-3 text-emerald-500" />
              <span>Verified Registered Pharmacy • Keep out of reach of children</span>
            </div>
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="no-print bg-slate-50 px-6 py-3 border-t border-slate-200 flex justify-end gap-3">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 transition-colors"
          >
            Done & New Sale
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition-colors shadow-sm"
          >
            <Printer className="w-4 h-4" />
            Print Receipt
          </button>
        </div>
      </div>
    </div>
  );
};
