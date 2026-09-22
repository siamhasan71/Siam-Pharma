import React, { useState } from 'react';
import { usePharmacy } from '../context/PharmacyContext';
import { Supplier, PurchaseOrder } from '../types';
import { formatCurrency } from '../utils/formatters';
import {
  Truck,
  Plus,
  DollarSign,
  PackagePlus,
  Phone,
  Mail,
  MapPin,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
} from 'lucide-react';

export const SupplierManagement: React.FC = () => {
  const {
    suppliers,
    purchaseOrders,
    medicines,
    addSupplier,
    receivePurchaseStock,
    settleSupplierDue,
  } = usePharmacy();

  // Modals
  const [showAddSupplierModal, setShowAddSupplierModal] = useState(false);
  const [showReceiveStockModal, setShowReceiveStockModal] = useState(false);
  const [settleSupplier, setSettleSupplier] = useState<Supplier | null>(null);

  // New Supplier Form
  const [newSupName, setNewSupName] = useState('');
  const [newSupId, setNewSupId] = useState('');
  const [newSupContact, setNewSupContact] = useState('');
  const [newSupPhone, setNewSupPhone] = useState('');
  const [newSupEmail, setNewSupEmail] = useState('');
  const [newSupAddress, setNewSupAddress] = useState('');

  // Receive Stock Form
  const [selectedSupplierId, setSelectedSupplierId] = useState(suppliers[0]?.id || '');
  const [selectedMedicineId, setSelectedMedicineId] = useState(medicines[0]?.id || '');
  const [stockQuantity, setStockQuantity] = useState(50);
  const [purchasePrice, setPurchasePrice] = useState(5.0);
  const [batchNumber, setBatchNumber] = useState('BAT-2026-N');
  const [expiryDate, setExpiryDate] = useState('2028-01-01');
  const [amountPaidNow, setAmountPaidNow] = useState(250);

  // Settle Payment Form
  const [paymentAmount, setPaymentAmount] = useState(0);

  const totalDueAllSuppliers = suppliers.reduce((sum, s) => sum + s.dueBalance, 0);

  const handleAddSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSupName.trim() || !newSupPhone.trim()) return;

    addSupplier({
      id: newSupId.trim() || undefined,
      name: newSupName.trim(),
      contactPerson: newSupContact.trim() || 'Purchasing Rep',
      phone: newSupPhone.trim(),
      email: newSupEmail.trim() || 'orders@supplier.com',
      address: newSupAddress.trim() || 'Distributor Park',
      medicinesSupplied: [],
    });

    setNewSupName('');
    setNewSupId('');
    setNewSupContact('');
    setNewSupPhone('');
    setNewSupEmail('');
    setNewSupAddress('');
    setShowAddSupplierModal(false);
  };

  const handleReceiveStockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplierId || !selectedMedicineId) return;

    receivePurchaseStock(
      selectedSupplierId,
      selectedMedicineId,
      Number(stockQuantity),
      Number(purchasePrice),
      batchNumber,
      expiryDate,
      Number(amountPaidNow)
    );

    setShowReceiveStockModal(false);
  };

  const handleSettleDue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!settleSupplier || paymentAmount <= 0) return;

    settleSupplierDue(settleSupplier.id, paymentAmount);
    setSettleSupplier(null);
    setPaymentAmount(0);
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Supplier & Vendor Management
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Manage pharmaceutical wholesalers, process inbound stock shipments, and track accounts payable.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddSupplierModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl border border-slate-300 transition-colors shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Supplier</span>
          </button>

          <button
            onClick={() => {
              if (medicines.length > 0 && suppliers.length > 0) {
                setSelectedSupplierId(suppliers[0].id);
                setSelectedMedicineId(medicines[0].id);
                setPurchasePrice(medicines[0].purchasePrice);
                setAmountPaidNow(medicines[0].purchasePrice * 50);
              }
              setShowReceiveStockModal(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
          >
            <PackagePlus className="w-4 h-4" />
            <span>Receive Inbound Stock</span>
          </button>
        </div>
      </div>

      {/* Summary KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Active Wholesalers
          </span>
          <h3 className="text-2xl font-bold text-slate-900 mt-2">{suppliers.length}</h3>
          <p className="text-xs text-slate-500 mt-1">Contracted pharmaceutical vendors</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Total Outstanding Payable
          </span>
          <h3 className="text-2xl font-bold text-rose-600 mt-2">
            {formatCurrency(totalDueAllSuppliers)}
          </h3>
          <p className="text-xs text-slate-500 mt-1">Pending payments to vendors</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Purchase Orders Logged
          </span>
          <h3 className="text-2xl font-bold text-indigo-600 mt-2">{purchaseOrders.length}</h3>
          <p className="text-xs text-slate-500 mt-1">Inbound stock receipts recorded</p>
        </div>
      </div>

      {/* Suppliers Grid */}
      <div>
        <h2 className="text-base font-bold text-slate-900 mb-3">Suppliers Directory</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {suppliers.map((sup) => (
            <div
              key={sup.id}
              className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-slate-900 text-sm">{sup.name}</h3>
                      <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md border border-slate-200">
                        {sup.id}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">Contact: {sup.contactPerson}</p>
                  </div>
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
                    <Truck className="w-4 h-4" />
                  </div>
                </div>

                <div className="space-y-1.5 text-xs text-slate-600 py-3 border-y border-slate-100 my-2">
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{sup.phone}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span className="truncate">{sup.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{sup.address}</span>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <div className="flex items-center justify-between mb-3 text-xs">
                  <span className="text-slate-500 font-medium">Due Balance:</span>
                  <span
                    className={`font-bold font-mono text-sm ${
                      sup.dueBalance > 0 ? 'text-rose-600' : 'text-emerald-600'
                    }`}
                  >
                    {formatCurrency(sup.dueBalance)}
                  </span>
                </div>

                {sup.dueBalance > 0 ? (
                  <button
                    onClick={() => {
                      setSettleSupplier(sup);
                      setPaymentAmount(sup.dueBalance);
                    }}
                    className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition-colors"
                  >
                    Settle Payment
                  </button>
                ) : (
                  <div className="py-2 text-center text-xs font-semibold text-emerald-700 bg-emerald-50 rounded-xl">
                    All Invoices Paid
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Purchase Orders Log */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Purchase Orders & Inbound Stock History</h2>
            <p className="text-xs text-slate-500">Track shipment receipts, costs, and payment statuses</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-4 py-3">PO Number</th>
                <th className="px-4 py-3">Supplier</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Items Received</th>
                <th className="px-4 py-3 text-right">Total Cost</th>
                <th className="px-4 py-3 text-right">Paid</th>
                <th className="px-4 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {purchaseOrders.map((po) => (
                <tr key={po.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-bold font-mono text-slate-900">{po.poNumber}</td>
                  <td className="px-4 py-3 font-medium">{po.supplierName}</td>
                  <td className="px-4 py-3 text-slate-500">
                    {new Date(po.orderDate).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="space-y-0.5">
                      {po.items.map((item, i) => (
                        <div key={i} className="text-[11px]">
                          <span className="font-semibold text-slate-800">{item.medicineName}</span>{' '}
                          <span className="text-slate-500 font-mono">
                            × {item.quantity} units (Batch: {item.batchNumber})
                          </span>
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-slate-900 font-mono">
                    {formatCurrency(po.totalAmount)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-slate-600">
                    {formatCurrency(po.paidAmount)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        po.paymentStatus === 'Paid'
                          ? 'bg-emerald-100 text-emerald-800'
                          : po.paymentStatus === 'Partial'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {po.paymentStatus}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD SUPPLIER MODAL */}
      {showAddSupplierModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md p-6">
            <h2 className="text-base font-bold text-slate-900 mb-1">Add New Pharmaceutical Wholesaler</h2>
            <p className="text-xs text-slate-500 mb-4">Register distributor details for stock replenishments</p>

            <form onSubmit={handleAddSupplier} className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Company / Supplier Name *</label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. Novartis Distribution"
                    value={newSupName}
                    onChange={(e) => setNewSupName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Supplier ID (Optional)</label>
                  <input
                    type="text"
                    placeholder={`e.g. SUP-${Date.now().toString().slice(-4)}`}
                    value={newSupId}
                    onChange={(e) => setNewSupId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Contact Person</label>
                <input
                  type="text"
                  placeholder="e.g. John Miller"
                  value={newSupContact}
                  onChange={(e) => setNewSupContact(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Phone *</label>
                  <input
                    required
                    type="tel"
                    placeholder="+1 (800) 555-0100"
                    value={newSupPhone}
                    onChange={(e) => setNewSupPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    placeholder="orders@vendor.com"
                    value={newSupEmail}
                    onChange={(e) => setNewSupEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Warehouse Address</label>
                <input
                  type="text"
                  placeholder="e.g. 100 Industrial Pkwy"
                  value={newSupAddress}
                  onChange={(e) => setNewSupAddress(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddSupplierModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl font-semibold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow-xs"
                >
                  Save Supplier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RECEIVE INBOUND STOCK MODAL */}
      {showReceiveStockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg p-6">
            <h2 className="text-base font-bold text-slate-900 mb-1">Receive Inbound Stock Shipment</h2>
            <p className="text-xs text-slate-500 mb-4">
              Restocks medicine quantity immediately in the inventory and logs due balances.
            </p>

            <form onSubmit={handleReceiveStockSubmit} className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Select Supplier *</label>
                  <select
                    value={selectedSupplierId}
                    onChange={(e) => setSelectedSupplierId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-medium"
                  >
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Medicine to Restock *</label>
                  <select
                    value={selectedMedicineId}
                    onChange={(e) => {
                      setSelectedMedicineId(e.target.value);
                      const med = medicines.find((m) => m.id === e.target.value);
                      if (med) setPurchasePrice(med.purchasePrice);
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-medium"
                  >
                    {medicines.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} (Cur: {m.stockQuantity})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Quantity Received *</label>
                  <input
                    required
                    type="number"
                    min="1"
                    value={stockQuantity}
                    onChange={(e) => setStockQuantity(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Purchase Unit Price (৳) *</label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    min="0.1"
                    value={purchasePrice}
                    onChange={(e) => setPurchasePrice(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Batch Number *</label>
                  <input
                    required
                    type="text"
                    value={batchNumber}
                    onChange={(e) => setBatchNumber(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Expiry Date *</label>
                  <input
                    required
                    type="date"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                  />
                </div>
              </div>

              {/* Financial Calculation */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <div className="flex justify-between font-medium">
                  <span className="text-slate-600">Total Purchase Value:</span>
                  <span className="font-bold text-slate-900 font-mono">
                    {formatCurrency(stockQuantity * purchasePrice)}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                  <label className="font-semibold text-slate-700">Amount Paid Now (৳):</label>
                  <input
                    type="number"
                    step="0.01"
                    value={amountPaidNow}
                    onChange={(e) => setAmountPaidNow(parseFloat(e.target.value) || 0)}
                    className="w-28 px-2 py-1 bg-white border border-slate-300 rounded font-mono text-right text-xs"
                  />
                </div>
                <div className="flex justify-between text-[11px] pt-1 text-rose-600 font-semibold">
                  <span>Balance added to supplier account:</span>
                  <span className="font-mono">
                    {formatCurrency(Math.max(0, stockQuantity * purchasePrice - amountPaidNow))}
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowReceiveStockModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl font-semibold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow-xs"
                >
                  Confirm & Update Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SETTLE DUE PAYMENT MODAL */}
      {settleSupplier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-sm p-6">
            <h2 className="text-base font-bold text-slate-900 mb-1">Settle Supplier Balance</h2>
            <p className="text-xs text-slate-500 mb-3">
              Paying <strong className="text-slate-800">{settleSupplier.name}</strong>
            </p>

            <form onSubmit={handleSettleDue} className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-500 text-[11px] block">Current Outstanding Balance:</span>
                <span className="text-lg font-bold font-mono text-rose-600">
                  {formatCurrency(settleSupplier.dueBalance)}
                </span>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Payment Amount (৳)</label>
                <input
                  required
                  type="number"
                  step="0.01"
                  max={settleSupplier.dueBalance}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono text-base font-bold"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setSettleSupplier(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl font-semibold text-slate-700 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs shadow-xs"
                >
                  Record Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
