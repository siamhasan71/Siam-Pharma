import React, { useState, useMemo } from 'react';
import { usePharmacy } from '../context/PharmacyContext';
import { isToday, isLast7Days, isLast30Days } from '../utils/dateUtils';
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  Calendar,
  Download,
  Percent,
  Package,
  CreditCard,
  Printer,
} from 'lucide-react';
import { formatCurrency } from '../utils/formatters';

type TimeRange = 'today' | 'week' | 'month' | 'all';

export const ReportsAnalytics: React.FC = () => {
  const { sales, medicines } = usePharmacy();
  const [timeRange, setTimeRange] = useState<TimeRange>('month');

  // Filter sales based on selected range
  const filteredSales = useMemo(() => {
    if (!Array.isArray(sales)) return [];

    return sales.filter((sale) => {
      if (!sale) return false;
      if (timeRange === 'today') {
        return isToday(sale.date);
      } else if (timeRange === 'week') {
        return isLast7Days(sale.date);
      } else if (timeRange === 'month') {
        return isLast30Days(sale.date);
      }
      return true; // 'all'
    });
  }, [sales, timeRange]);

  // Financial aggregates
  const totalRevenue = useMemo(() => {
    return filteredSales.reduce((sum, s) => sum + (s.grandTotal || 0), 0);
  }, [filteredSales]);

  const totalCostOfGoods = useMemo(() => {
    return filteredSales.reduce((sum, s) => {
      const saleCost = (s.items || []).reduce((itemSum, item) => itemSum + (item.costPrice || 0) * (item.quantity || 1), 0);
      return sum + saleCost;
    }, 0);
  }, [filteredSales]);

  const grossProfit = Math.max(0, totalRevenue - totalCostOfGoods);
  const profitMarginPercent = totalRevenue > 0 ? ((grossProfit / totalRevenue) * 100).toFixed(1) : '0';
  const averageOrderValue = filteredSales.length > 0 ? (totalRevenue / filteredSales.length).toFixed(2) : '0.00';

  // Product sales breakdown
  const medicinePerformance = useMemo(() => {
    const map = new Map<string, { name: string; quantity: number; revenue: number; profit: number }>();

    filteredSales.forEach((sale) => {
      (sale.items || []).forEach((item) => {
        if (!item) return;
        const medicineKey = item.medicineId || item.medicineName || 'unknown';
        const existing = map.get(medicineKey) || {
          name: item.medicineName || 'Unknown Medicine',
          quantity: 0,
          revenue: 0,
          profit: 0,
        };
        const cost = item.costPrice || 0;
        const price = item.unitPrice || 0;
        const qty = item.quantity || 1;
        const itemProfit = (price - cost) * qty;

        map.set(medicineKey, {
          name: item.medicineName || existing.name,
          quantity: existing.quantity + qty,
          revenue: existing.revenue + (item.totalPrice || price * qty),
          profit: existing.profit + itemProfit,
        });
      });
    });

    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
  }, [filteredSales]);

  // Payment method distribution
  const paymentBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredSales.forEach((s) => {
      counts[s.paymentMethod] = (counts[s.paymentMethod] || 0) + s.grandTotal;
    });
    return Object.entries(counts).map(([method, total]) => ({
      method,
      total,
      percent: totalRevenue > 0 ? ((total / totalRevenue) * 100).toFixed(0) : '0',
    }));
  }, [filteredSales, totalRevenue]);

  // Export CSV
  const handleExportCSV = () => {
    const headers = ['Invoice No', 'Date', 'Customer', 'Cashier', 'Payment Method', 'Items Count', 'Subtotal', 'Tax', 'Grand Total'];
    const rows = filteredSales.map((s) => [
      s.invoiceNumber,
      new Date(s.date).toLocaleString(),
      `"${s.customerName}"`,
      `"${s.cashierName}"`,
      s.paymentMethod,
      s.items.length,
      s.subtotal.toFixed(2),
      s.taxAmount.toFixed(2),
      s.grandTotal.toFixed(2),
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `siam_pharma_sales_report_${timeRange}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Sales Reports & Profit Margin Analytics
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Audit pharmacy performance, revenue stream breakdowns, and cost of goods sold (COGS).
          </p>
        </div>

        {/* Time range selector & export */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold">
            <button
              onClick={() => setTimeRange('today')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                timeRange === 'today' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Daily
            </button>
            <button
              onClick={() => setTimeRange('week')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                timeRange === 'week' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Weekly
            </button>
            <button
              onClick={() => setTimeRange('month')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                timeRange === 'month' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setTimeRange('all')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                timeRange === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Time
            </button>
          </div>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition-colors shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Report</span>
          </button>
        </div>
      </div>

      {/* Financial Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Gross Revenue */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Gross Sales Revenue</span>
          <h3 className="text-2xl font-bold text-slate-900 mt-2">{formatCurrency(totalRevenue)}</h3>
          <p className="text-xs text-slate-500 mt-1">Across {filteredSales.length} completed transactions</p>
        </div>

        {/* COGS (Cost of Goods Sold) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cost of Goods (COGS)</span>
          <h3 className="text-2xl font-bold text-slate-700 mt-2">{formatCurrency(totalCostOfGoods)}</h3>
          <p className="text-xs text-slate-500 mt-1">Wholesale medicine acquisition cost</p>
        </div>

        {/* Net Profit */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Net Gross Profit</span>
          <h3 className="text-2xl font-bold text-emerald-600 mt-2">{formatCurrency(grossProfit)}</h3>
          <p className="text-xs text-slate-500 mt-1">Earnings after medicine wholesale cost</p>
        </div>

        {/* Margin % & AOV */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Profit Margin %</span>
          <h3 className="text-2xl font-bold text-indigo-600 mt-2">{profitMarginPercent}%</h3>
          <p className="text-xs text-slate-500 mt-1">Avg Basket Value: {formatCurrency(averageOrderValue)}</p>
        </div>
      </div>

      {/* Breakdown Row: Top Selling Medicines & Payment Methods */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Top Selling Medicines (8 Cols) */}
        <div className="lg:col-span-8 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Top Dispensed Medicines & Margins</h2>
              <p className="text-xs text-slate-500">Ranked by gross sales volume and profit generation</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-3 py-2.5">Medicine</th>
                  <th className="px-3 py-2.5 text-center">Units Sold</th>
                  <th className="px-3 py-2.5 text-right">Gross Sales</th>
                  <th className="px-3 py-2.5 text-right">Gross Profit</th>
                  <th className="px-3 py-2.5 text-right">Margin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {medicinePerformance.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      No prescription items recorded in this timeframe.
                    </td>
                  </tr>
                ) : (
                  medicinePerformance.map((item, index) => {
                    const margin = item.revenue > 0 ? ((item.profit / item.revenue) * 100).toFixed(0) : '0';
                    return (
                      <tr key={index} className="hover:bg-slate-50 transition-colors">
                        <td className="px-3 py-2.5 font-bold text-slate-900">{item.name}</td>
                        <td className="px-3 py-2.5 text-center font-mono font-semibold">{item.quantity}</td>
                        <td className="px-3 py-2.5 text-right font-bold text-slate-900 font-mono">
                          {formatCurrency(item.revenue)}
                        </td>
                        <td className="px-3 py-2.5 text-right font-bold text-emerald-600 font-mono">
                          {formatCurrency(item.profit)}
                        </td>
                        <td className="px-3 py-2.5 text-right font-semibold text-indigo-600">
                          {margin}%
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Payment Methods Breakdown (4 Cols) */}
        <div className="lg:col-span-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 mb-1">Payment Method Distribution</h2>
            <p className="text-xs text-slate-500 mb-4">Customer payment preference breakdown</p>

            <div className="space-y-3">
              {paymentBreakdown.map((pm, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold text-slate-700">
                    <span>{pm.method}</span>
                    <span className="font-mono">{formatCurrency(pm.total)} ({pm.percent}%)</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                      style={{ width: `${pm.percent}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1">
            <div className="flex justify-between font-medium">
              <span>Audited Period:</span>
              <span className="font-bold text-slate-900 capitalize">{timeRange}</span>
            </div>
            <div className="flex justify-between font-medium">
              <span>Prescriptions Dispensed:</span>
              <span className="font-bold text-slate-900">{filteredSales.length}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
