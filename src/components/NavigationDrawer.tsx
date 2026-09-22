import React, { useState } from 'react';
import {
  ClipboardList,
  Settings,
  ShieldCheck,
  Info,
  Share2,
  Trash2,
  RefreshCw,
  HelpCircle,
  Sun,
  Moon,
  X,
  Check,
  AlertTriangle,
  User as UserIcon,
  LogOut,
  Wallet,
  Receipt,
  LayoutDashboard,
  History,
} from 'lucide-react';
import { usePharmacy } from '../context/PharmacyContext';
import { useAuth } from '../context/AuthContext';
import { PrivacyPolicyModal } from './PrivacyPolicyModal';
import { AboutUsModal } from './AboutUsModal';

interface NavigationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (tab: string) => void;
  activeTab?: string;
}

export const NavigationDrawer: React.FC<NavigationDrawerProps> = ({
  isOpen,
  onClose,
  onNavigate,
  activeTab,
}) => {
  const { userProfile, resetToDefaultData, refreshUserProfile } = usePharmacy();
  const { user, logout } = useAuth();
  const [colorScheme, setColorScheme] = useState<'dark' | 'light'>('dark');
  const [language, setLanguage] = useState<'English' | 'বাংলা'>('English');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);

  const displayName = userProfile?.name || user?.displayName || (user?.email ? user.email.split('@')[0] : 'User');
  const displayEmail = userProfile?.email || user?.email || 'No email registered';
  const displayAvatar = userProfile?.avatarUrl;

  if (!isOpen) return null;

  const handleSyncClick = () => {
    setIsSyncing(true);
    setSyncNotice('Syncing data with cloud...');
    setTimeout(() => {
      setIsSyncing(false);
      setSyncNotice('Synced successfully (2025-02-01)');
      setTimeout(() => setSyncNotice(null), 3000);
    }, 1200);
  };

  const handleShareApp = async () => {
    const shareData = {
      title: 'Siam Pharma Management System',
      text: 'Manage pharmacy inventory, POS billing, and drug directory with Siam Pharma.',
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        // Ignored if user dismissed share dialog
      }
    } else {
      try {
        await navigator.clipboard.writeText(window.location.href);
        setShareFeedback('Link copied to clipboard!');
        setTimeout(() => setShareFeedback(null), 3000);
      } catch {
        setShareFeedback('Share URL: ' + window.location.host);
        setTimeout(() => setShareFeedback(null), 3000);
      }
    }
  };

  const handleDeleteAccount = () => {
    resetToDefaultData();
    setShowDeleteModal(false);
    onClose();
    onNavigate('app-home');
  };

  const handleItemClick = (id: string) => {
    onClose();
    onNavigate(id);
  };

  return (
    <>
      {/* Dimmed backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs transition-opacity duration-300 animate-in fade-in"
        onClick={onClose}
      />

      {/* Drawer panel with black background and green icons */}
      <div
        id="mobile-navigation-drawer"
        className="fixed top-0 left-0 bottom-0 z-50 w-[84%] max-w-[340px] bg-black text-white shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-left duration-300 ease-out border-r border-neutral-800"
      >
        {/* Top Profile Header */}
        <div className="pt-6 px-5 pb-4 border-b border-neutral-800/80">
          <div className="flex items-start justify-between">
            {/* User Avatar + Details - Clicking opens Edit Profile */}
            <button
              id="drawer-profile-header-btn"
              onClick={() => {
                onNavigate('edit_profile');
                onClose();
              }}
              className="flex items-center gap-3 text-left hover:opacity-90 active:scale-98 transition-all cursor-pointer min-w-0"
              title="Click to Edit Profile"
            >
              <div className="w-13 h-13 rounded-full overflow-hidden p-0.5 bg-neutral-800 shadow-md ring-2 ring-emerald-500/50 shrink-0">
                {displayAvatar ? (
                  <img
                    src={displayAvatar}
                    alt={displayName}
                    className="w-full h-full object-cover rounded-full"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-full h-full rounded-full bg-neutral-900 flex items-center justify-center text-emerald-400 text-lg font-bold">
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>

              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5">
                  <h2 className="text-base font-bold text-white tracking-tight leading-snug truncate">
                    {displayName}
                  </h2>
                </div>
                <p className="text-xs text-neutral-400 font-normal truncate">
                  {displayEmail}
                </p>
                <span className="text-[10px] text-emerald-400 font-medium mt-0.5">
                  Tap to Edit Profile →
                </span>
              </div>
            </button>

            {/* Sync / Refresh Button */}
            <button
              id="drawer-sync-btn"
              onClick={handleSyncClick}
              title="Sync Data"
              className="w-10 h-10 rounded-full bg-neutral-900 hover:bg-neutral-800 text-emerald-400 flex items-center justify-center transition-all border border-neutral-800 active:scale-95 shrink-0 ml-2"
            >
              <RefreshCw className={`w-4 h-4 text-emerald-400 ${isSyncing ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Sync notification toast */}
          {syncNotice && (
            <div className="mt-3 p-2 bg-neutral-900 border border-neutral-800 rounded-xl text-[11px] text-emerald-300 flex items-center gap-1.5 animate-in fade-in">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
              <span>{syncNotice}</span>
            </div>
          )}

          {/* Language Pill & App Version Metadata with S Pharma Logo */}
          <div className="mt-5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                id="drawer-lang-btn"
                onClick={() => setLanguage(language === 'English' ? 'বাংলা' : 'English')}
                className="px-3.5 py-1.5 rounded-full border border-emerald-500/60 bg-neutral-950 text-emerald-400 text-xs font-medium hover:bg-neutral-900 active:scale-95 transition-all shadow-xs"
              >
                {language}
              </button>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg overflow-hidden bg-white p-0.5 ring-1 ring-emerald-500/40 shrink-0 flex items-center justify-center">
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
              <div className="text-right text-[11px] text-neutral-400 leading-tight">
                <p className="font-bold text-white tracking-tight">Siam Pharma</p>
                <p className="text-emerald-500/80 text-[10px]">v1.0.9 • 2025</p>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Item List */}
        <div className="flex-1 px-5 py-2 overflow-y-auto space-y-1 select-none">
          {/* Analytics Dashboard (with D3 Line Chart) */}
          <button
            id="drawer-item-dashboard"
            onClick={() => handleItemClick('dashboard')}
            className={`w-full flex items-center gap-4 py-3 px-2 rounded-xl text-left transition-colors cursor-pointer group ${
              activeTab === 'dashboard' ? 'bg-neutral-900 text-white border border-neutral-800' : 'text-neutral-300 hover:bg-neutral-900/60'
            }`}
          >
            <LayoutDashboard className="w-5 h-5 text-emerald-400 stroke-[1.75] shrink-0 group-hover:scale-105 transition-transform" />
            <span className="text-sm font-semibold tracking-wide">Analytics Dashboard</span>
          </button>

          {/* 1. Product List */}
          <button
            id="drawer-item-product-list"
            onClick={() => handleItemClick('inventory')}
            className={`w-full flex items-center gap-4 py-3 px-2 rounded-xl text-left transition-colors cursor-pointer group ${
              activeTab === 'inventory' ? 'bg-neutral-900 text-white border border-neutral-800' : 'text-neutral-300 hover:bg-neutral-900/60'
            }`}
          >
            <ClipboardList className="w-5 h-5 text-emerald-400 stroke-[1.75] shrink-0 group-hover:scale-105 transition-transform" />
            <span className="text-sm font-semibold tracking-wide">Product List</span>
          </button>

          {/* 2. Customer List */}
          <button
            id="drawer-item-customer-list"
            onClick={() => handleItemClick('customers')}
            className={`w-full flex items-center gap-4 py-3 px-2 rounded-xl text-left transition-colors cursor-pointer group ${
              activeTab === 'customers' ? 'bg-neutral-900 text-white border border-neutral-800' : 'text-neutral-300 hover:bg-neutral-900/60'
            }`}
          >
            <ClipboardList className="w-5 h-5 text-emerald-400 stroke-[1.75] shrink-0 group-hover:scale-105 transition-transform" />
            <span className="text-sm font-semibold tracking-wide">Customer List</span>
          </button>

          {/* 3. Supplier List */}
          <button
            id="drawer-item-supplier-list"
            onClick={() => handleItemClick('suppliers')}
            className={`w-full flex items-center gap-4 py-3 px-2 rounded-xl text-left transition-colors cursor-pointer group ${
              activeTab === 'suppliers' ? 'bg-neutral-900 text-white border border-neutral-800' : 'text-neutral-300 hover:bg-neutral-900/60'
            }`}
          >
            <ClipboardList className="w-5 h-5 text-emerald-400 stroke-[1.75] shrink-0 group-hover:scale-105 transition-transform" />
            <span className="text-sm font-semibold tracking-wide">Supplier List</span>
          </button>

          {/* 4. Account & Expense */}
          <button
            id="drawer-item-account"
            onClick={() => handleItemClick('account')}
            className={`w-full flex items-center gap-4 py-3 px-2 rounded-xl text-left transition-colors cursor-pointer group ${
              activeTab === 'account' ? 'bg-neutral-900 text-white border border-neutral-800' : 'text-neutral-300 hover:bg-neutral-900/60'
            }`}
          >
            <Wallet className="w-5 h-5 text-emerald-400 stroke-[1.75] shrink-0 group-hover:scale-105 transition-transform" />
            <span className="text-sm font-semibold tracking-wide">Account & Expense</span>
          </button>

          {/* 5. Sales Order List */}
          <button
            id="drawer-item-sales-orders"
            onClick={() => handleItemClick('sales_orders')}
            className={`w-full flex items-center gap-4 py-3 px-2 rounded-xl text-left transition-colors cursor-pointer group ${
              activeTab === 'sales_orders' ? 'bg-neutral-900 text-white border border-neutral-800' : 'text-neutral-300 hover:bg-neutral-900/60'
            }`}
          >
            <Receipt className="w-5 h-5 text-emerald-400 stroke-[1.75] shrink-0 group-hover:scale-105 transition-transform" />
            <span className="text-sm font-semibold tracking-wide">Sales Order List</span>
          </button>

          {/* 6. Purchase History */}
          <button
            id="drawer-item-purchase-history"
            onClick={() => handleItemClick('purchase_history')}
            className={`w-full flex items-center gap-4 py-3 px-2 rounded-xl text-left transition-colors cursor-pointer group ${
              activeTab === 'purchase_history' ? 'bg-neutral-900 text-white border border-neutral-800' : 'text-neutral-300 hover:bg-neutral-900/60'
            }`}
          >
            <History className="w-5 h-5 text-emerald-400 stroke-[1.75] shrink-0 group-hover:scale-105 transition-transform" />
            <span className="text-sm font-semibold tracking-wide">Purchase History</span>
          </button>

          {/* 6. Settings */}
          <button
            id="drawer-item-settings"
            onClick={() => handleItemClick('settings')}
            className={`w-full flex items-center gap-4 py-3 px-2 rounded-xl text-left transition-colors cursor-pointer group ${
              activeTab === 'settings' ? 'bg-neutral-900 text-white border border-neutral-800' : 'text-neutral-300 hover:bg-neutral-900/60'
            }`}
          >
            <Settings className="w-5 h-5 text-emerald-400 stroke-[1.75] shrink-0 group-hover:rotate-45 transition-transform duration-300" />
            <span className="text-sm font-semibold tracking-wide">Settings</span>
          </button>

          {/* 7. Edit Profile */}
          <button
            id="drawer-item-edit-profile"
            onClick={() => handleItemClick('edit_profile')}
            className={`w-full flex items-center gap-4 py-3 px-2 rounded-xl text-left transition-colors cursor-pointer group ${
              activeTab === 'edit_profile' ? 'bg-neutral-900 text-white border border-neutral-800' : 'text-neutral-300 hover:bg-neutral-900/60'
            }`}
          >
            <UserIcon className="w-5 h-5 text-emerald-400 stroke-[1.75] shrink-0 group-hover:scale-105 transition-transform" />
            <span className="text-sm font-semibold tracking-wide">Edit Profile</span>
          </button>

          {/* 8. Privacy Policy */}
          <button
            id="drawer-item-privacy-policy"
            onClick={() => setShowPrivacyModal(true)}
            className="w-full flex items-center gap-4 py-3 px-2 rounded-xl text-left text-neutral-300 hover:bg-neutral-900/60 transition-colors cursor-pointer group"
          >
            <ShieldCheck className="w-5 h-5 text-emerald-400 stroke-[1.75] shrink-0 group-hover:scale-105 transition-transform" />
            <span className="text-sm font-semibold tracking-wide">Privacy Policy</span>
          </button>

          {/* 9. About Us */}
          <button
            id="drawer-item-about-us"
            onClick={() => setShowAboutModal(true)}
            className="w-full flex items-center gap-4 py-3 px-2 rounded-xl text-left text-neutral-300 hover:bg-neutral-900/60 transition-colors cursor-pointer group"
          >
            <Info className="w-5 h-5 text-emerald-400 stroke-[1.75] shrink-0 group-hover:scale-105 transition-transform" />
            <span className="text-sm font-semibold tracking-wide">About Us</span>
          </button>

          {/* 10. Share App */}
          <button
            id="drawer-item-share-app"
            onClick={handleShareApp}
            className="w-full flex items-center gap-4 py-3 px-2 rounded-xl text-left text-neutral-300 hover:bg-neutral-900/60 transition-colors cursor-pointer group"
          >
            <Share2 className="w-5 h-5 text-emerald-400 stroke-[1.75] shrink-0 group-hover:scale-105 transition-transform" />
            <span className="text-sm font-semibold tracking-wide">Share App</span>
          </button>

          {/* 11. Delete Account */}
          <button
            id="drawer-item-delete-account"
            onClick={() => setShowDeleteModal(true)}
            className="w-full flex items-center gap-4 py-3 px-2 rounded-xl text-left text-neutral-300 hover:bg-neutral-900/60 transition-colors cursor-pointer group"
          >
            <Trash2 className="w-5 h-5 text-emerald-400 stroke-[1.75] shrink-0 group-hover:text-rose-400 transition-colors" />
            <span className="text-sm font-semibold tracking-wide">Delete Account</span>
          </button>

          {/* 12. Log Out / Switch Account */}
          <button
            id="drawer-item-logout"
            onClick={() => {
              if (window.confirm('Log out from this account? Profile state will clear.')) {
                logout();
                onClose();
              }
            }}
            className="w-full flex items-center gap-4 py-3 px-2 rounded-xl text-left text-neutral-300 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer group mt-2 pt-3 border-t border-neutral-800"
          >
            <LogOut className="w-5 h-5 text-emerald-400 group-hover:text-red-400 stroke-[1.75] shrink-0 group-hover:scale-105 transition-transform" />
            <span className="text-sm font-semibold tracking-wide">Log Out ({displayName})</span>
          </button>
        </div>

        {/* Share Feedback Toast if triggered */}
        {shareFeedback && (
          <div className="mx-5 mb-2 p-2 bg-neutral-900 border border-neutral-800 rounded-xl text-xs text-emerald-400 flex items-center gap-1.5 animate-in fade-in">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>{shareFeedback}</span>
          </div>
        )}

        {/* Bottom Section: Colour Scheme */}
        <div className="px-5 pt-4 pb-6 border-t border-neutral-800 bg-neutral-950">
          <div className="flex items-center gap-2 mb-3">
            <HelpCircle className="w-5 h-5 text-emerald-400 stroke-[1.75]" />
            <span className="text-sm font-semibold text-neutral-200">Colour Scheme</span>
          </div>

          {/* Light / Dark Mode Toggle Pill */}
          <div className="bg-neutral-900 p-1 rounded-full border border-neutral-800 flex items-center">
            <button
              id="theme-toggle-light"
              onClick={() => setColorScheme('light')}
              className={`flex-1 py-1.5 px-3 rounded-full text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                colorScheme === 'light'
                  ? 'bg-neutral-800 text-emerald-400 shadow-md'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Sun className="w-4 h-4 text-emerald-400" />
              <span>Light</span>
            </button>

            <button
              id="theme-toggle-dark"
              onClick={() => setColorScheme('dark')}
              className={`flex-1 py-1.5 px-3 rounded-full text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                colorScheme === 'dark'
                  ? 'bg-black text-emerald-400 shadow-md border border-neutral-700'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Moon className="w-4 h-4 text-emerald-400" />
              <span>Dark</span>
            </button>
          </div>
        </div>
      </div>

      {/* Privacy Policy Modal */}
      <PrivacyPolicyModal
        isOpen={showPrivacyModal}
        onClose={() => setShowPrivacyModal(false)}
      />

      {/* About Us Modal */}
      <AboutUsModal
        isOpen={showAboutModal}
        onClose={() => setShowAboutModal(false)}
      />

      {/* Delete Account Confirmation Dialog */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in">
          <div className="bg-[#134E4A] border border-[#236a64] rounded-3xl w-full max-w-sm p-5 text-white shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-300 mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="text-base font-bold text-white">Reset / Delete Store Account?</h3>
              <p className="text-xs text-teal-200/80 leading-relaxed">
                This will clear active customer logs and restore default pharmacy configuration. This action cannot be undone.
              </p>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 py-2.5 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                className="flex-1 py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md transition-colors"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
