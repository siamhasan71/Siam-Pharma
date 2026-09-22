import React, { useState, useMemo } from 'react';
import { usePharmacy } from '../context/PharmacyContext';
import { Customer, Sale } from '../types';
import {
  Users,
  Search,
  Plus,
  Phone,
  Mail,
  Calendar,
  DollarSign,
  History,
  FileText,
  Printer,
  ChevronRight,
} from 'lucide-react';
import { PrintableInvoiceModal } from './PrintableInvoiceModal';
import { formatCurrency } from '../utils/formatters';

export const CustomerManagement: React.FC = () => {
  const { customers, sales, addCustomer } = usePharmacy();

  const [searchTerm, setSearchTerm] = useState('');
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [selectedCustomerForHistory, setSelectedCustomerForHistory] = useState<Customer | null>(null);
  const [viewInvoice, setViewInvoice] = useState<Sale | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [customId, setCustomId] = useState('');
  const [isRegular, setIsRegular] = useState(true);
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');

  const filteredCustomers = useMemo(() => {
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.phone.includes(searchTerm) ||
        c.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.email && c.email.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [customers, searchTerm]);

  // Customer purchase history
  const customerSales = useMemo(() => {
    if (!selectedCustomerForHistory) return [];
    return sales.filter(
      (s) =>
        s.customerId === selectedCustomerForHistory.id ||
        s.customerPhone === selectedCustomerForHistory.phone ||
        s.customerName.toLowerCase() === selectedCustomerForHistory.name.toLowerCase()
    );
  }, [sales, selectedCustomerForHistory]);

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return;

    addCustomer({
      id: customId.trim() || undefined,
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim() || undefined,
      address: address.trim() || undefined,
      isOneTime: !isRegular,
    });

    setName('');
    setCustomId('');
    setIsRegular(true);
    setPhone('');
    setEmail('');
    setAddress('');
    setShowAddCustomerModal(false);
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Customer Directory & Purchase History
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Store patient and customer contact details, view historical prescriptions and dispensed receipts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddCustomerModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Customer</span>
          </button>
        </div>
      </div>

      {/* Search Bar & Stats */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search customers by name or phone..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex items-center gap-4 text-xs text-slate-600">
          <span>
            Total Registered: <strong className="text-slate-900">{customers.length}</strong>
          </span>
          <span>
            Lifetime Spent:{' '}
            <strong className="text-emerald-700 font-mono">
              {formatCurrency(customers.reduce((sum, c) => sum + c.totalSpent, 0))}
            </strong>
          </span>
        </div>
      </div>

      {/* Customers List Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-4 py-3">Customer Name</th>
                <th className="px-4 py-3">Phone Number</th>
                <th className="px-4 py-3">Email / Address</th>
                <th className="px-4 py-3 text-center">Orders</th>
                <th className="px-4 py-3 text-right">Total Spent</th>
                <th className="px-4 py-3">Last Visit</th>
                <th className="px-4 py-3 text-right">History</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No customers found matching search term.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((cust) => (
                  <tr key={cust.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-900">{cust.name}</div>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <span className="text-[10px] font-mono font-semibold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200">
                          {cust.id}
                        </span>
                        {cust.isOneTime ? (
                          <span className="text-[9px] font-bold bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded border border-amber-200">
                            One-Time
                          </span>
                        ) : (
                          <span className="text-[9px] font-bold bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded border border-emerald-200">
                            Regular
                          </span>
                        )}
                        {(cust.dueAmount || 0) > 0 && (
                          <span className="text-[9px] font-bold bg-rose-50 text-rose-700 px-1.5 py-0.5 rounded border border-rose-200">
                            Due: {formatCurrency(cust.dueAmount || 0)}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-700">{cust.phone}</td>
                    <td className="px-4 py-3 text-slate-500">
                      <div>{cust.email || '—'}</div>
                      <div className="text-[10px] text-slate-400 truncate max-w-[180px]">
                        {cust.address || ''}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="px-2 py-0.5 font-bold font-mono bg-slate-100 rounded-md">
                        {cust.totalPurchases}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-emerald-700 font-mono">
                      {formatCurrency(cust.totalSpent)}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {new Date(cust.lastVisit).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setSelectedCustomerForHistory(cust)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold transition-colors"
                      >
                        <History className="w-3.5 h-3.5 text-slate-600" />
                        <span>View Receipts</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CUSTOMER PURCHASE HISTORY MODAL */}
      {selectedCustomerForHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-2xl p-6">
            <div className="flex items-start justify-between pb-3 border-b border-slate-200">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Purchase History: {selectedCustomerForHistory.name}
                </h2>
                <p className="text-xs text-slate-500">
                  Phone: {selectedCustomerForHistory.phone} • Lifetime Orders: {customerSales.length}
                </p>
              </div>
              <button
                onClick={() => setSelectedCustomerForHistory(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="py-4 space-y-3 max-h-[420px] overflow-y-auto">
              {customerSales.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  No recorded transactions yet for this customer profile.
                </div>
              ) : (
                customerSales.map((sale) => (
                  <div
                    key={sale.id}
                    className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-xs">{sale.invoiceNumber}</span>
                        <span className="text-[11px] text-slate-500">
                          {new Date(sale.date).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 font-mono text-sm">
                          {formatCurrency(sale.grandTotal)}
                        </span>
                        <button
                          onClick={() => setViewInvoice(sale)}
                          className="flex items-center gap-1 px-2 py-1 bg-white border border-slate-300 hover:bg-slate-100 rounded-md text-[11px] font-semibold text-slate-700 shadow-xs"
                        >
                          <Printer className="w-3 h-3 text-slate-500" />
                          <span>Receipt</span>
                        </button>
                      </div>
                    </div>

                    {/* Purchased Items List */}
                    <div className="divide-y divide-slate-100 bg-white p-2 rounded-lg border border-slate-200/60 text-xs">
                      {sale.items.map((item, idx) => (
                        <div key={idx} className="py-1 flex justify-between text-[11px] text-slate-600">
                          <span>
                            {item.medicineName}{' '}
                            <span className="text-slate-400">
                              (Batch: {item.batchNumber}) × {item.quantity}
                            </span>
                          </span>
                          <span className="font-medium text-slate-800">{formatCurrency(item.totalPrice)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-200">
              <button
                onClick={() => setSelectedCustomerForHistory(null)}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold"
              >
                Close History
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD CUSTOMER MODAL */}
      {showAddCustomerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md p-6">
            <h2 className="text-base font-bold text-slate-900 mb-1">Add Customer Record</h2>
            <p className="text-xs text-slate-500 mb-4">
              Enter customer contact information for loyalty & history
            </p>

            <form onSubmit={handleAddSubmit} className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Customer Full Name *</label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. Eleanor Vance"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Customer ID (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder={`e.g. CUST-${1000 + customers.length + 1}`}
                    value={customId}
                    onChange={(e) => setCustomId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 p-2.5 bg-emerald-50/70 border border-emerald-200 rounded-lg">
                <input
                  type="checkbox"
                  id="isRegularCust"
                  checked={isRegular}
                  onChange={(e) => setIsRegular(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                />
                <label htmlFor="isRegularCust" className="text-xs font-semibold text-emerald-900 cursor-pointer">
                  Regular Customer (Enables linked due balance & permanent transaction history)
                </label>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Phone Number *</label>
                <input
                  required
                  type="tel"
                  placeholder="+1 (555) 012-3456"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  placeholder="eleanor@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Residential Address</label>
                <input
                  type="text"
                  placeholder="Street Address, City"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddCustomerModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl font-semibold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow-xs"
                >
                  Save Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invoice modal when previewing receipt */}
      {viewInvoice && (
        <PrintableInvoiceModal
          sale={viewInvoice}
          onClose={() => setViewInvoice(null)}
        />
      )}
    </div>
  );
};
