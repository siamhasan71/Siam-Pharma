import React, { useState } from 'react';
import { usePharmacy } from '../context/PharmacyContext';
import {
  ShoppingBag,
  ArrowLeft,
  Truck,
  CheckCircle2,
  Clock,
  Phone,
  MapPin,
  FileCheck,
  AlertCircle,
  Plus,
} from 'lucide-react';
import { OnlineOrder } from '../types';
import { formatCurrency } from '../utils/formatters';

interface OnlineOrdersViewProps {
  onBack: () => void;
}

export const OnlineOrdersView: React.FC<OnlineOrdersViewProps> = ({ onBack }) => {
  const { onlineOrders, updateOnlineOrderStatus } = usePharmacy();
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const filteredOrders = onlineOrders.filter((order) => {
    if (filterStatus === 'all') return true;
    return order.status.toLowerCase() === filterStatus.toLowerCase();
  });

  const handleUpdateStatus = (orderId: string, status: OnlineOrder['status']) => {
    updateOnlineOrderStatus(orderId, status);
    setSuccessMsg(`Order #${orderId} status updated to ${status}`);
    setTimeout(() => setSuccessMsg(null), 2500);
  };

  const getStatusBadge = (status: OnlineOrder['status']) => {
    switch (status) {
      case 'Pending':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">Pending Review</span>;
      case 'Accepted':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">Preparing Medicine</span>;
      case 'Out for Delivery':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200 flex items-center gap-1"><Truck className="w-3 h-3" /> Out for Delivery</span>;
      case 'Delivered':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Delivered</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700">{status}</span>;
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 text-slate-800">
      {/* Top Header */}
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
              <ShoppingBag className="w-6 h-6 text-purple-600" />
              <span>Online Orders & Home Delivery</span>
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Manage website prescription uploads, delivery dispatches, and mobile payment orders
            </p>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl self-start sm:self-auto overflow-x-auto">
          {['all', 'pending', 'accepted', 'out for delivery', 'delivered'].map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-colors whitespace-nowrap ${
                filterStatus === st
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-medium flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Orders Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredOrders.length === 0 ? (
          <div className="col-span-full py-16 text-center bg-white rounded-2xl border border-slate-200">
            <ShoppingBag className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="font-bold text-slate-700">No orders found in this category</p>
            <p className="text-xs text-slate-400 mt-1">Switch filter to view all customer delivery requests.</p>
          </div>
        ) : (
          filteredOrders.map((ord) => (
            <div
              key={ord.id}
              className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 flex flex-col justify-between space-y-4 hover:border-purple-300 transition-colors"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-sm text-purple-900 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-100">
                    {ord.orderNumber}
                  </span>
                  {getStatusBadge(ord.status)}
                </div>

                <div>
                  <h3 className="font-bold text-slate-900 text-sm">{ord.customerName}</h3>
                  <div className="flex items-center gap-1.5 text-slate-500 text-xs mt-0.5">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{ord.phone}</span>
                  </div>
                  <div className="flex items-start gap-1.5 text-slate-500 text-xs mt-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span className="line-clamp-2">{ord.address}</span>
                  </div>
                </div>

                {/* Items List */}
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Prescription Items ({ord.items.length})
                  </span>
                  {ord.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center text-slate-700">
                      <span>{item.quantity}x {item.medicineName}</span>
                      <span className="font-mono font-semibold">{formatCurrency(item.price * item.quantity)}</span>
                    </div>
                  ))}
                  <div className="border-t border-slate-200 pt-1.5 mt-1.5 flex justify-between items-center font-bold text-slate-900">
                    <span>Total Amount:</span>
                    <span className="font-mono text-purple-700 text-sm">{formatCurrency(ord.totalAmount)}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>Payment: <strong className="text-slate-800">{ord.paymentMethod}</strong></span>
                  {ord.prescriptionRequired && (
                    <span className="flex items-center gap-1 text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                      <FileCheck className="w-3 h-3" /> Rx Verified
                    </span>
                  )}
                </div>
              </div>

              {/* Status Action Buttons */}
              <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
                {ord.status === 'Pending' && (
                  <button
                    onClick={() => handleUpdateStatus(ord.id, 'Accepted')}
                    className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-xs transition-colors"
                  >
                    Accept & Prepare
                  </button>
                )}
                {ord.status === 'Accepted' && (
                  <button
                    onClick={() => handleUpdateStatus(ord.id, 'Out for Delivery')}
                    className="flex-1 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-xs transition-colors flex items-center justify-center gap-1"
                  >
                    <Truck className="w-3.5 h-3.5" />
                    <span>Dispatch Rider</span>
                  </button>
                )}
                {ord.status === 'Out for Delivery' && (
                  <button
                    onClick={() => handleUpdateStatus(ord.id, 'Delivered')}
                    className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs transition-colors flex items-center justify-center gap-1"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Mark Delivered</span>
                  </button>
                )}
                {ord.status === 'Delivered' && (
                  <div className="w-full py-2 rounded-xl bg-emerald-50 text-emerald-700 font-bold text-xs text-center border border-emerald-200">
                    ✓ Order Completed & Paid
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
