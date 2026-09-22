import React from 'react';
import { Customer, Sale } from '../types';
import { Printer, X, FileText, ShieldCheck } from 'lucide-react';
import { formatCurrency } from '../utils/formatters';

interface PrintableStatementModalProps {
  customer: Customer;
  sales: Sale[];
  onClose: () => void;
}

export const PrintableStatementModal: React.FC<PrintableStatementModalProps> = ({
  customer,
  sales,
  onClose,
}) => {
  const handlePrint = () => {
    window.print();
  };

  const totalInvoiced = customer.totalSpent || 0;
  const currentDue = customer.dueAmount || 0;
  const totalPaid = Math.max(0, totalInvoiced - currentDue);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white text-slate-900 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Action Header (hidden in print) */}
        <div className="no-print bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-400" />
            <span className="font-semibold text-sm">Customer Ledger & Due Statement</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm"
              title="Print Statement (Ctrl+P)"
            >
              <Printer className="w-3.5 h-3.5" />
              Print Statement
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Statement Container */}
        <div id="printable-statement" className="p-8 bg-white text-slate-900 text-xs font-mono space-y-6">
          {/* Pharmacy Header */}
          <div className="text-center pb-4 border-b border-dashed border-slate-300">
            <h1 className="text-lg font-bold tracking-tight text-slate-900">
              SIAM HASAN SANTO PHARMACY
            </h1>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Govt. Reg # DGDA-DH-48201 • Model Pharmacy & Healthcare
            </p>
            <p className="text-[11px] text-slate-500">
              Station Road, Mirpur-10, Dhaka-1216 • Helpline: +880 1700-000000
            </p>
            <div className="mt-2 inline-block px-3 py-1 bg-slate-100 rounded-full text-[10px] font-bold text-slate-700 uppercase tracking-wider">
              Official Customer Account Ledger Statement
            </div>
          </div>

          {/* Customer Details Box */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <p className="text-[10px] text-slate-500 font-bold uppercase">Customer Profile</p>
              <p className="text-sm font-bold text-slate-900 mt-0.5">{customer.name}</p>
              <p className="text-xs text-slate-700 mt-0.5">Customer ID: <span className="font-bold">{customer.id}</span></p>
              <p className="text-xs text-slate-600">Contact: {customer.phone}</p>
              {customer.address && <p className="text-xs text-slate-600">Address: {customer.address}</p>}
            </div>
            <div className="text-right">
              <p className="text-[10px] text-slate-500 font-bold uppercase">Statement Details</p>
              <p className="text-xs text-slate-700 mt-0.5">
                Date: {new Date().toLocaleDateString('en-US', { dateStyle: 'medium' })}
              </p>
              <p className="text-xs text-slate-700">
                Time: {new Date().toLocaleTimeString('en-US', { timeStyle: 'short' })}
              </p>
              <p className="text-xs text-slate-700">
                Account Type: <span className="font-bold">{customer.isOneTime ? 'One-time Due' : 'Regular Account'}</span>
              </p>
              <p className="text-xs text-slate-700">
                Total Invoices: <span className="font-bold">{sales.length}</span>
              </p>
            </div>
          </div>

          {/* Financial Overview Metrics */}
          <div className="grid grid-cols-3 gap-3 p-3 bg-slate-100/70 rounded-xl border border-slate-200 text-center">
            <div>
              <span className="text-[10px] text-slate-500 font-bold uppercase">Total Invoiced</span>
              <p className="text-sm font-bold text-slate-900">{formatCurrency(totalInvoiced)}</p>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 font-bold uppercase">Total Settled</span>
              <p className="text-sm font-bold text-emerald-700">{formatCurrency(totalPaid)}</p>
            </div>
            <div>
              <span className="text-[10px] text-rose-600 font-bold uppercase">Balance Outstanding</span>
              <p className="text-base font-black text-rose-700">{formatCurrency(currentDue)}</p>
            </div>
          </div>

          {/* Invoices Breakdown Table */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-xs text-slate-900 uppercase">Itemized Credit & Sales History</span>
              <span className="text-[10px] text-slate-500">All amounts in BDT (৳)</span>
            </div>
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-[11px]">
                <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 uppercase font-bold text-[10px]">
                  <tr>
                    <th className="p-2">Invoice #</th>
                    <th className="p-2">Date</th>
                    <th className="p-2">Items</th>
                    <th className="p-2 text-right">Grand Total</th>
                    <th className="p-2 text-right">Paid</th>
                    <th className="p-2 text-right">Outstanding</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sales.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-4 text-center text-slate-500">
                        No sales transactions recorded.
                      </td>
                    </tr>
                  ) : (
                    sales.map((sale) => {
                      const dueAmt = Math.max(0, (sale.grandTotal || sale.totalAmount || 0) - (sale.paidAmount || 0));
                      const paidAmt = sale.paidAmount !== undefined ? sale.paidAmount : ((sale.grandTotal || 0) - dueAmt);

                      return (
                        <tr key={sale.id} className="hover:bg-slate-50">
                          <td className="p-2 font-bold text-slate-900">{sale.invoiceNumber}</td>
                          <td className="p-2 text-slate-600">
                            {new Date(sale.date).toLocaleDateString()}
                          </td>
                          <td className="p-2 text-slate-600 max-w-[150px] truncate">
                            {sale.items.map((i) => `${i.medicineName} (${i.quantity})`).join(', ')}
                          </td>
                          <td className="p-2 text-right font-bold text-slate-800 font-mono">
                            {formatCurrency(sale.grandTotal || sale.totalAmount || 0)}
                          </td>
                          <td className="p-2 text-right font-bold text-emerald-700 font-mono">
                            {formatCurrency(paidAmt)}
                          </td>
                          <td className="p-2 text-right font-bold text-rose-600 font-mono">
                            {formatCurrency(dueAmt)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Statement Footer */}
          <div className="pt-6 border-t border-dashed border-slate-300 flex justify-between items-end text-[10px] text-slate-500">
            <div className="space-y-1">
              <p className="flex items-center gap-1 font-semibold text-slate-700">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Verified & Isolated Ledger Record
              </p>
              <p>System Generated Account Report • Siam Hasan Santo Pharmacy POS</p>
            </div>
            <div className="text-center">
              <div className="w-36 border-b border-slate-400 pb-1 mb-1" />
              <p className="font-semibold text-slate-700">Authorized Signature & Seal</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
