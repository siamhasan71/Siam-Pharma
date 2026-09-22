import React from 'react';
import { usePharmacy } from '../context/PharmacyContext';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Truck,
  Users,
  BarChart3,
  Database,
  Lock,
  ChevronRight,
  Smartphone,
  AlertOctagon,
  FileSpreadsheet,
  Wallet,
  ShoppingBag,
  ListIndentIncrease,
  User,
  Settings,
  Receipt,
  History,
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const { currentRole, lowStockMedicines, expiredMedicines, expiringSoonMedicines, onlineOrders } = usePharmacy();

  const isPharmacist = currentRole === 'pharmacist';
  const totalStockAlerts = lowStockMedicines.length + expiredMedicines.length + expiringSoonMedicines.length;
  const pendingOrders = onlineOrders.filter((o) => o.status === 'Pending').length;

  const navItems = [
    {
      id: 'app-home',
      label: 'App Interface (Screenshot)',
      icon: Smartphone,
      adminOnly: false,
      badge: 'Main',
      badgeColor: 'bg-emerald-500 text-slate-950',
    },
    {
      id: 'pos',
      label: 'Point of Sale (Sales)',
      icon: ShoppingCart,
      adminOnly: false,
      badge: 'Billing',
    },
    {
      id: 'purchase',
      label: 'Purchase (Stock In)',
      icon: ShoppingBag,
      adminOnly: false,
      badge: 'Stock In',
      badgeColor: 'bg-emerald-600 text-white',
    },
    {
      id: 'purchase_history',
      label: 'Purchase History',
      icon: History,
      adminOnly: false,
      badge: 'Ledger',
      badgeColor: 'bg-teal-900/60 text-teal-300 border border-teal-700/50',
    },
    {
      id: 'inventory',
      label: 'Product List (Stock)',
      icon: Package,
      adminOnly: false,
      badge: totalStockAlerts > 0 ? `${totalStockAlerts}` : null,
      badgeColor: 'bg-amber-100 text-amber-800',
    },
    {
      id: 'expired_list',
      label: 'Expired List',
      icon: AlertOctagon,
      adminOnly: false,
      badge: expiredMedicines.length > 0 ? `${expiredMedicines.length}` : null,
      badgeColor: 'bg-rose-100 text-rose-800',
    },
    {
      id: 'due_list',
      label: 'Due List (Ledger)',
      icon: FileSpreadsheet,
      adminOnly: false,
      badge: null,
    },
    {
      id: 'suppliers',
      label: 'Purchase & Suppliers',
      icon: Truck,
      adminOnly: true,
      badge: null,
    },
    {
      id: 'account',
      label: 'Account & Cash Drawer',
      icon: Wallet,
      adminOnly: false,
      badge: null,
    },
    {
      id: 'sales_orders',
      label: 'Sales Order List',
      icon: Receipt,
      adminOnly: false,
      badge: null,
    },
    {
      id: 'online_order',
      label: 'Online Order Delivery',
      icon: ShoppingBag,
      adminOnly: false,
      badge: pendingOrders > 0 ? `${pendingOrders}` : null,
      badgeColor: 'bg-purple-100 text-purple-800',
    },
    {
      id: 'customers',
      label: 'Customer Directory',
      icon: Users,
      adminOnly: false,
      badge: null,
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings,
      adminOnly: false,
      badge: null,
    },
    {
      id: 'reports',
      label: 'Report & Analytics',
      icon: BarChart3,
      adminOnly: false,
      badge: null,
    },
    {
      id: 'dashboard',
      label: 'Analytics Dashboard',
      icon: LayoutDashboard,
      adminOnly: false,
      badge: 'D3.js',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40',
    },
    {
      id: 'dev-guide',
      label: 'DB Schema & Architecture',
      icon: Database,
      adminOnly: false,
      badge: 'Guide',
      badgeColor: 'bg-indigo-100 text-indigo-800',
    },
  ];

  return (
    <aside className="w-64 bg-black text-neutral-300 flex flex-col shrink-0 border-r border-neutral-800 select-none min-h-[calc(100vh-61px)]">
      {/* Brand Header */}
      <div className="p-3 border-b border-neutral-800/80">
        <button
          onClick={() => setActiveTab('app-home')}
          className="w-full flex items-center gap-3 p-2 rounded-xl bg-[#0c100e] border border-neutral-800 hover:border-emerald-500/40 transition-all text-left group"
        >
          <div className="w-9 h-9 rounded-xl overflow-hidden bg-white p-0.5 ring-1 ring-emerald-500/40 shrink-0 flex items-center justify-center">
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
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-black text-white tracking-tight group-hover:text-emerald-400 transition-colors">
              Siam Pharma
            </span>
            <span className="text-[10px] text-emerald-400/80 font-medium truncate">
              Pharmacy POS & ERP
            </span>
          </div>
        </button>
      </div>

      {/* Navigation Links */}
      <div className="p-3 space-y-1">
        <div className="px-3 pt-2 pb-1 text-[11px] font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-2">
          <ListIndentIncrease className="w-3.5 h-3.5 text-emerald-400" />
          <span>Core Modules</span>
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          const isRestricted = item.adminOnly && isPharmacist;

          return (
            <button
              key={item.id}
              disabled={isRestricted}
              onClick={() => {
                if (!isRestricted) setActiveTab(item.id);
              }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all text-left group ${
                isActive
                  ? 'bg-neutral-900 text-white border border-neutral-800 shadow-sm'
                  : isRestricted
                  ? 'opacity-40 cursor-not-allowed text-neutral-500'
                  : 'text-neutral-300 hover:bg-neutral-900 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon
                  className={`w-4 h-4 ${
                    isActive ? 'text-emerald-400' : isRestricted ? 'text-neutral-600' : 'text-emerald-400 group-hover:scale-110 transition-transform'
                  }`}
                />
                <span>{item.label}</span>
              </div>

              <div className="flex items-center gap-1.5">
                {isRestricted ? (
                  <span className="flex items-center gap-1 text-[10px] text-amber-400 font-normal">
                    <Lock className="w-3 h-3 text-emerald-400" />
                    Admin
                  </span>
                ) : item.badge ? (
                  <span
                    className={`px-1.5 py-0.5 text-[10px] font-bold rounded-full ${
                      isActive ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : item.badgeColor || 'bg-neutral-900 text-emerald-400 border border-neutral-800'
                    }`}
                  >
                    {item.badge}
                  </span>
                ) : null}
              </div>
            </button>
          );
        })}
      </div>

      {/* Role Notice Card in Sidebar */}
      <div className="mt-auto p-4 border-t border-neutral-800">
        <div className="bg-[#0c100e] rounded-xl p-3 border border-neutral-800">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-white uppercase tracking-wider">
              {currentRole === 'admin' ? 'Admin Privileges' : 'Cashier Mode'}
            </span>
            <span
              className={`w-2 h-2 rounded-full ${
                currentRole === 'admin' ? 'bg-emerald-400' : 'bg-emerald-500'
              }`}
            />
          </div>
          <p className="text-[11px] text-neutral-400 leading-relaxed">
            {currentRole === 'admin'
              ? 'Full unrestricted access to inventory costs, profit reports, and vendor orders.'
              : 'Restricted to POS checkout, customer search, and view-only inventory.'}
          </p>
          <button
            onClick={() => setActiveTab('edit_profile')}
            className="w-full mt-2.5 flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-black hover:bg-neutral-900 border border-emerald-500/40 text-emerald-400 hover:text-white text-xs font-semibold transition-colors"
          >
            <User className="w-3.5 h-3.5 text-emerald-400" />
            <span>Edit Profile</span>
          </button>
        </div>
      </div>
    </aside>
  );
};
