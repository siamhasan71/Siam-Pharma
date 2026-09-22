import React, { useMemo, useState } from 'react';
import { usePharmacy } from '../context/PharmacyContext';
import {
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Clock,
  Package,
  ShoppingCart,
  ShieldAlert,
  ArrowUpRight,
  Plus,
  Eye,
  Calendar,
} from 'lucide-react';
import { PrintableInvoiceModal } from './PrintableInvoiceModal';
import { D3DailySalesChart } from './D3DailySalesChart';
import { Sale } from '../types';
import { formatCurrency } from '../utils/formatters';

interface DashboardProps {
  onNavigateTab: (tab: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigateTab }) => {
  const {
    sales,
    medicines,
    totalMedicinesCount,
    lowStockMedicines,
    expiredMedicines,
    expiringSoonMedicines,
    currentRole,
  } = usePharmacy();

  const [selectedReceipt, setSelectedReceipt] = useState<Sale | null>(null);

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Today's metrics
  const todaySales = useMemo(() => {
    return sales.filter((s) => s.date.startsWith(todayStr));
  }, [sales, todayStr]);

  const todayRevenue = useMemo(() => {
    return todaySales.reduce((sum, s) => sum + s.grandTotal, 0);
  }, [todaySales]);

  // Overall metrics
  const totalRevenue = useMemo(() => {
    return sales.reduce((sum, s) => sum + s.grandTotal, 0);
  }, [sales]);

  const totalCost = useMemo(() => {
    return sales.reduce((sum, s) => {
      const saleCost = s.items.reduce((itemSum, item) => itemSum + item.costPrice * item.quantity, 0);
      return sum + saleCost;
    }, 0);
  }, [sales]);

  const totalProfit = Math.max(0, totalRevenue - totalCost);
  const profitMarginPercent = totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : '0';

  const totalStockUnits = useMemo(() => {
    return medicines.reduce((sum, m) => sum + m.stockQuantity, 0);
  }, [medicines]);

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Welcome Banner & Quick Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 text-white p-6 rounded-2xl shadow-sm">
        <div>
          <span className="px-2.5 py-1 text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 rounded-full border border-emerald-500/30">
            Real-Time Pharmacy Metrics
          </span>
          <h1 className="text-xl sm:text-2xl font-bold mt-2 tracking-tight">
            Pharmacy Executive Overview
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Monitoring daily revenue, prescription dispensing, inventory margins, and product expiries.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onNavigateTab('pos')}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Launch POS Billing</span>
          </button>

          {currentRole === 'admin' && (
            <button
              onClick={() => onNavigateTab('inventory')}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-colors"
            >
              <Package className="w-4 h-4" />
              <span>Manage Inventory</span>
            </button>
          )}
        </div>
      </div>

      {/* Primary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today's Sales */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Today's Revenue</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-bold text-slate-900">{formatCurrency(todayRevenue)}</h3>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1 font-medium">
              <span className="text-emerald-700 font-semibold">{todaySales.length} orders</span>
              <span>dispensed today</span>
            </p>
          </div>
        </div>

        {/* Total Gross Revenue */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Sales</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-bold text-slate-900">{formatCurrency(totalRevenue)}</h3>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1 font-medium">
              <span>Lifetime sales across {sales.length} transactions</span>
            </p>
          </div>
        </div>

        {/* Estimated Profit & Margin */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Net Gross Profit</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-bold text-indigo-700">{formatCurrency(totalProfit)}</h3>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1 font-medium">
              <span className="text-indigo-700 font-bold">{profitMarginPercent}%</span>
              <span>average gross margin</span>
            </p>
          </div>
        </div>

        {/* Total Stock in Inventory */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Inventory</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-bold text-slate-900">{totalStockUnits} <span className="text-xs font-normal text-slate-500">units</span></h3>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1 font-medium">
              <span>{totalMedicinesCount ? totalMedicinesCount.toLocaleString() : medicines.length} catalog medicines</span>
            </p>
          </div>
        </div>
      </div>

      {/* Critical Alert Banners */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Low-Stock Alert Card */}
        <div className="bg-white rounded-2xl border border-amber-200 p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-amber-100">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">Low-Stock Warnings</h2>
                <p className="text-[11px] text-slate-500">Medicines below reorder threshold</p>
              </div>
            </div>
            <span className="px-2.5 py-0.5 text-xs font-bold bg-amber-100 text-amber-900 rounded-full">
              {lowStockMedicines.length} Item{lowStockMedicines.length !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="mt-3 divide-y divide-slate-100 max-h-48 overflow-y-auto">
            {lowStockMedicines.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">
                All inventory items are currently above safety thresholds.
              </p>
            ) : (
              lowStockMedicines.map((med, idx) => (
                <div key={`${med.id}-${idx}`} className="py-2 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-slate-900">{med.name}</span>
                    <span className="text-slate-500 text-[11px] block">{med.genericName}</span>
                  </div>
                  <div className="text-right">
                    <span className="px-2 py-0.5 rounded font-bold text-amber-800 bg-amber-50">
                      {med.stockQuantity} left (Min: {med.minStockThreshold})
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {currentRole === 'admin' && (
            <button
              onClick={() => onNavigateTab('suppliers')}
              className="w-full mt-3 py-2 text-xs font-semibold text-amber-900 bg-amber-50 hover:bg-amber-100 rounded-xl transition-colors border border-amber-200/70"
            >
              Order Stock from Suppliers →
            </button>
          )}
        </div>

        {/* Expiry & Quarantine Alert Card */}
        <div className="bg-white rounded-2xl border border-rose-200 p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-rose-100">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center">
                <ShieldAlert className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">Expiry Surveillance</h2>
                <p className="text-[11px] text-slate-500">Expired or soon-to-expire batches</p>
              </div>
            </div>
            <span className="px-2.5 py-0.5 text-xs font-bold bg-rose-100 text-rose-900 rounded-full">
              {expiredMedicines.length + expiringSoonMedicines.length} Item(s)
            </span>
          </div>

          <div className="mt-3 divide-y divide-slate-100 max-h-48 overflow-y-auto">
            {expiredMedicines.map((med, idx) => (
              <div key={`${med.id}-${idx}`} className="py-2 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-slate-900">{med.name}</span>
                  <span className="text-slate-400 text-[11px] block">Batch: {med.batchNumber}</span>
                </div>
                <div className="text-right">
                  <span className="px-2 py-0.5 rounded font-bold text-rose-700 bg-rose-50 border border-rose-200">
                    EXPIRED ({med.expiryDate})
                  </span>
                </div>
              </div>
            ))}

            {expiringSoonMedicines.map((med, idx) => (
              <div key={`${med.id}-${idx}`} className="py-2 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-slate-900">{med.name}</span>
                  <span className="text-slate-400 text-[11px] block">Batch: {med.batchNumber}</span>
                </div>
                <div className="text-right">
                  <span className="px-2 py-0.5 rounded font-semibold text-amber-700 bg-amber-50">
                    Exp: {med.expiryDate} (~60d)
                  </span>
                </div>
              </div>
            ))}

            {expiredMedicines.length === 0 && expiringSoonMedicines.length === 0 && (
              <p className="text-xs text-slate-500 py-4 text-center">
                No expired or near-expiry batches detected.
              </p>
            )}
          </div>

          <button
            onClick={() => onNavigateTab('inventory')}
            className="w-full mt-3 py-2 text-xs font-semibold text-rose-900 bg-rose-50 hover:bg-rose-100 rounded-xl transition-colors border border-rose-200/70"
          >
            Review Batches in Inventory →
          </button>
        </div>
      </div>

      {/* Lower Row: Sales Visualizer & Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* D3.js 7-Day Daily Sales Revenue Line Chart (7 Cols) */}
        <D3DailySalesChart sales={sales} className="lg:col-span-7" />

        {/* Recent Invoices Table (5 Cols) */}
        <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Recent Invoices</h2>
                <p className="text-xs text-slate-500">Latest dispensed sales</p>
              </div>
              <button
                onClick={() => onNavigateTab('reports')}
                className="text-xs text-emerald-700 font-semibold hover:underline"
              >
                All Reports →
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {sales.slice(0, 4).map((sale) => (
                <div key={sale.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-slate-900">{sale.invoiceNumber}</span>
                      <span className="text-[10px] text-slate-500">({sale.paymentMethod})</span>
                    </div>
                    <p className="text-[11px] text-slate-500 truncate max-w-[170px]">
                      {sale.customerName} • {sale.items.length} item(s)
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">{formatCurrency(sale.grandTotal)}</span>
                    <button
                      onClick={() => setSelectedReceipt(sale)}
                      className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded"
                      title="View & Print Invoice"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={() => onNavigateTab('pos')}
            className="w-full mt-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>Process New POS Prescription</span>
          </button>
        </div>
      </div>

      {/* Invoice Modal if viewing past receipt */}
      {selectedReceipt && (
        <PrintableInvoiceModal
          sale={selectedReceipt}
          onClose={() => setSelectedReceipt(null)}
        />
      )}
    </div>
  );
};
