import React, { useState, useMemo } from 'react';
import { usePharmacy } from '../context/PharmacyContext';
import {
  AlertTriangle,
  Calendar,
  Clock,
  Trash2,
  RotateCcw,
  ArrowLeft,
  Search,
  Filter,
  ShieldAlert,
  Download,
  CheckCircle2,
} from 'lucide-react';
import { formatCurrency } from '../utils/formatters';

interface ExpiredListViewProps {
  onBack: () => void;
}

export const ExpiredListView: React.FC<ExpiredListViewProps> = ({ onBack }) => {
  const { medicines, deleteMedicine, updateMedicine } = usePharmacy();
  const [filterType, setFilterType] = useState<'all' | 'expired' | '30days' | '60days'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  const today = useMemo(() => new Date(), []);
  const todayStr = useMemo(() => today.toISOString().split('T')[0], [today]);

  const thirtyDaysLater = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  }, []);

  const sixtyDaysLater = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 60);
    return d.toISOString().split('T')[0];
  }, []);

  // Filtered items
  const flaggedMedicines = useMemo(() => {
    return medicines
      .map((m) => {
        const expDate = new Date(m.expiryDate);
        const diffTime = expDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const isExpired = diffDays < 0;
        const isExpiringSoon = diffDays >= 0 && diffDays <= 60;

        return {
          ...m,
          diffDays,
          isExpired,
          isExpiringSoon,
        };
      })
      .filter((m) => m.isExpired || m.isExpiringSoon)
      .filter((m) => {
        if (filterType === 'expired') return m.isExpired;
        if (filterType === '30days') return m.expiryDate <= thirtyDaysLater && !m.isExpired;
        if (filterType === '60days') return m.expiryDate <= sixtyDaysLater && !m.isExpired;
        return true;
      })
      .filter((m) => {
        if (!searchTerm.trim()) return true;
        const term = searchTerm.toLowerCase();
        return (
          m.name.toLowerCase().includes(term) ||
          m.genericName.toLowerCase().includes(term) ||
          m.batchNumber.toLowerCase().includes(term) ||
          m.manufacturer.toLowerCase().includes(term)
        );
      });
  }, [medicines, today, filterType, searchTerm, thirtyDaysLater, sixtyDaysLater]);

  // Aggregate stats
  const totalExpiredCount = useMemo(
    () => medicines.filter((m) => m.expiryDate < todayStr).length,
    [medicines, todayStr]
  );

  const totalExpiringSoonCount = useMemo(
    () => medicines.filter((m) => m.expiryDate >= todayStr && m.expiryDate <= sixtyDaysLater).length,
    [medicines, todayStr, sixtyDaysLater]
  );

  const totalValueAtRisk = useMemo(() => {
    return flaggedMedicines.reduce((sum, m) => sum + m.purchasePrice * m.stockQuantity, 0);
  }, [flaggedMedicines]);

  const handleDisposeStock = (id: string, name: string) => {
    if (confirm(`Are you sure you want to write-off and dispose expired batch of ${name}?`)) {
      updateMedicine(id, { stockQuantity: 0 });
      setActionSuccessMessage(`Successfully disposed and wrote off stock for ${name}`);
      setTimeout(() => setActionSuccessMessage(null), 3000);
    }
  };

  const handleExportCSV = () => {
    const headers = ['Medicine Name', 'Generic Name', 'Batch', 'Expiry Date', 'Status', 'Days Left', 'Stock', 'Unit Cost', 'Total Value'];
    const rows = flaggedMedicines.map((m) => [
      `"${m.name}"`,
      `"${m.genericName}"`,
      m.batchNumber,
      m.expiryDate,
      m.isExpired ? 'EXPIRED' : 'Expiring Soon',
      m.diffDays,
      m.stockQuantity,
      m.purchasePrice.toFixed(2),
      (m.purchasePrice * m.stockQuantity).toFixed(2),
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', `siam_pharma_expired_list_${todayStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 text-slate-800">
      {/* Top Breadcrumb & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 shadow-xs transition-colors flex items-center gap-1.5 text-xs font-bold"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Home</span>
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <ShieldAlert className="w-6 h-6 text-rose-600" />
              <span>Expired & Near-Expiry Medicines List</span>
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Automated batch expiry tracking, quarantined inventory, and loss auditing
            </p>
          </div>
        </div>

        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold shadow-xs transition-colors self-start sm:self-auto"
        >
          <Download className="w-4 h-4" />
          <span>Export Expiry Audit (CSV)</span>
        </button>
      </div>

      {actionSuccessMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-medium flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionSuccessMessage}</span>
        </div>
      )}

      {/* Summary KPI Badges */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-rose-600 text-white flex items-center justify-center font-bold">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-rose-800">Critical: Already Expired</span>
            <p className="text-2xl font-black text-rose-950 mt-0.5">{totalExpiredCount} Medicines</p>
            <span className="text-[11px] text-rose-700 font-medium">Do not dispense to patients</span>
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-amber-800">Expiring in 60 Days</span>
            <p className="text-2xl font-black text-amber-950 mt-0.5">{totalExpiringSoonCount} Medicines</p>
            <span className="text-[11px] text-amber-700 font-medium">Prioritize dispensing or return</span>
          </div>
        </div>

        <div className="bg-slate-900 text-white border border-slate-800 rounded-2xl p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center font-bold text-lg">
            ৳
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Total Capital at Risk</span>
            <p className="text-2xl font-black text-white mt-0.5">{formatCurrency(totalValueAtRisk)}</p>
            <span className="text-[11px] text-slate-400 font-medium">Purchase cost valuation</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search medicine, generic, batch..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-emerald-500"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap ${
              filterType === 'all'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Alert Items ({flaggedMedicines.length})
          </button>
          <button
            onClick={() => setFilterType('expired')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap ${
              filterType === 'expired'
                ? 'bg-rose-600 text-white'
                : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
            }`}
          >
            Expired ({totalExpiredCount})
          </button>
          <button
            onClick={() => setFilterType('30days')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap ${
              filterType === '30days'
                ? 'bg-amber-500 text-white'
                : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
            }`}
          >
            &lt; 30 Days
          </button>
          <button
            onClick={() => setFilterType('60days')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap ${
              filterType === '60days'
                ? 'bg-blue-600 text-white'
                : 'bg-blue-50 text-blue-800 hover:bg-blue-100'
            }`}
          >
            &lt; 60 Days
          </button>
        </div>
      </div>

      {/* List Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-4 py-3.5">Medicine & Generic</th>
                <th className="px-4 py-3.5">Batch / Rack</th>
                <th className="px-4 py-3.5">Expiry Date</th>
                <th className="px-4 py-3.5">Status & Time</th>
                <th className="px-4 py-3.5 text-right">Stock Qty</th>
                <th className="px-4 py-3.5 text-right">Loss Valuation</th>
                <th className="px-4 py-3.5 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {flaggedMedicines.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                    <p className="font-semibold text-slate-700">No matching expired or expiring drugs found!</p>
                    <p className="text-[11px] text-slate-400">Your inventory is fresh and within safe shelf life dates.</p>
                  </td>
                </tr>
              ) : (
                flaggedMedicines.map((m, idx) => {
                  const isExp = m.isExpired;
                  return (
                    <tr key={`${m.id}-${idx}`} className={isExp ? 'bg-rose-50/40 hover:bg-rose-50/70' : 'hover:bg-slate-50'}>
                      <td className="px-4 py-3">
                        <span className="font-bold text-slate-900 block text-sm">{m.name}</span>
                        <span className="text-slate-500 text-[11px] italic">{m.genericName} • {m.category}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono font-semibold text-slate-800 block">{m.batchNumber}</span>
                        <span className="text-[10px] text-slate-400">{m.shelfLocation || 'Main Shelf'}</span>
                      </td>
                      <td className="px-4 py-3 font-mono font-medium text-slate-700">
                        {m.expiryDate}
                      </td>
                      <td className="px-4 py-3">
                        {isExp ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                            <AlertTriangle className="w-3 h-3" />
                            Expired {Math.abs(m.diffDays)} days ago
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            <Clock className="w-3 h-3" />
                            Expires in {m.diffDays} days
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-slate-900">
                        {m.stockQuantity} units
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-slate-900 font-mono">
                        {formatCurrency(m.purchasePrice * m.stockQuantity)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleDisposeStock(m.id, m.name)}
                            disabled={m.stockQuantity === 0}
                            className={`p-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1 transition-colors ${
                              m.stockQuantity === 0
                                ? 'opacity-40 cursor-not-allowed bg-slate-100 text-slate-400 border-slate-200'
                                : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                            }`}
                            title="Write-off / Dispose expired stock"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span className="hidden md:inline">Dispose</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
