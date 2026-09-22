import React from 'react';
import { usePharmacy } from '../context/PharmacyContext';
import { useAuth } from '../context/AuthContext';
import {
  AlertTriangle,
  RotateCcw,
  LogOut,
} from 'lucide-react';

interface NavbarProps {
  onNavigateTab: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onNavigateTab }) => {
  const {
    currentRole,
    currentUser,
    lowStockMedicines,
    expiredMedicines,
    expiringSoonMedicines,
    resetToDefaultData,
  } = usePharmacy();
  const { logout } = useAuth();

  const totalAlerts = lowStockMedicines.length + expiredMedicines.length + expiringSoonMedicines.length;

  return (
    <header className="sticky top-0 z-30 bg-black/95 backdrop-blur border-b border-neutral-800 px-4 sm:px-6 py-3 transition-all shadow-md">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Logo & Brand */}
        <button
          onClick={() => onNavigateTab('app-home')}
          className="flex items-center gap-3 text-left group transition-all"
        >
          <div className="w-10 h-10 rounded-xl overflow-hidden bg-white p-0.5 shadow-sm ring-1 ring-neutral-700 group-hover:ring-emerald-500 transition-all flex items-center justify-center">
            <img
              src="/app-icon.svg"
              alt="S Pharma Logo"
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
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold tracking-tight text-white group-hover:text-emerald-400 transition-colors">
                Siam Pharma
              </span>
              <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800/60 rounded-full">
                v2.4 Pro
              </span>
            </div>
            <p className="text-xs text-neutral-400 font-medium hidden sm:block">
              Intelligent Pharmacy Management & POS System
            </p>
          </div>
        </button>

        {/* Action Controls */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Alerts quick badge */}
          {totalAlerts > 0 && (
            <button
              onClick={() => onNavigateTab('inventory')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-emerald-400 rounded-xl text-xs font-semibold transition-all"
              title={`${lowStockMedicines.length} Low Stock, ${expiredMedicines.length} Expired, ${expiringSoonMedicines.length} Expiring Soon`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-emerald-400" />
              <span>{totalAlerts} Alert{totalAlerts > 1 ? 's' : ''}</span>
            </button>
          )}

          {/* User Profile Pill */}
          <button
            id="navbar-profile-btn"
            onClick={() => onNavigateTab('edit_profile')}
            className="hidden md:flex items-center gap-2.5 pl-2 border-l border-neutral-800 hover:bg-neutral-900 py-1 px-2 rounded-xl transition-colors cursor-pointer group text-left"
            title="Edit Profile"
          >
            <div className="w-8 h-8 rounded-full overflow-hidden bg-neutral-800 border border-neutral-700 flex items-center justify-center shrink-0">
              {currentUser.avatarUrl ? (
                <img
                  src={currentUser.avatarUrl}
                  alt={currentUser.name}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span className="font-bold text-xs text-emerald-400">
                  {currentUser.name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .slice(0, 2)}
                </span>
              )}
            </div>
            <div className="text-left leading-tight">
              <p className="text-xs font-bold text-white group-hover:text-emerald-400 transition-colors">
                {currentUser.name}
              </p>
              <p className="text-[10px] text-neutral-400 capitalize">{currentRole} • Edit Profile</p>
            </div>
          </button>

          {/* Reset Demo Data Button */}
          <button
            onClick={() => {
              if (window.confirm('Reset all demo medicines, customers, and sales back to default initial state?')) {
                resetToDefaultData();
              }
            }}
            className="p-2 text-emerald-400 hover:text-emerald-300 hover:bg-neutral-900 rounded-lg transition-colors"
            title="Reset to default mock data"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Logout Button */}
          <button
            id="navbar-logout-btn"
            onClick={() => {
              if (window.confirm('Are you sure you want to log out?')) {
                logout();
              }
            }}
            className="p-2 text-emerald-400 hover:text-red-400 hover:bg-neutral-900 rounded-lg transition-colors"
            title="Log Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
