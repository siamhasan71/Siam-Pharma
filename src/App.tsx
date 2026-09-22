import React, { useState, useEffect } from 'react';
import { PharmacyProvider, usePharmacy } from './context/PharmacyContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginScreen } from './components/LoginScreen';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { POSBilling } from './components/POSBilling';
import { InventoryManagement } from './components/InventoryManagement';
import { SupplierManagement } from './components/SupplierManagement';
import { CustomerManagement } from './components/CustomerManagement';
import { ReportsAnalytics } from './components/ReportsAnalytics';
import { ReportScreen } from './components/ReportScreen';
import { SchemaAndDevGuide } from './components/SchemaAndDevGuide';
import { MobileHomeDashboard } from './components/MobileHomeDashboard';
import { ExpiredListView } from './components/ExpiredListView';
import { DueListView } from './components/DueListView';
import { AccountView } from './components/AccountView';
import { SalesOrderListView } from './components/SalesOrderListView';
import { OnlineOrdersView } from './components/OnlineOrdersView';
import { EasySalesView } from './components/EasySalesView';
import { PurchaseView } from './components/PurchaseView';
import { PurchaseHistoryView } from './components/PurchaseHistoryView';
import { MedicineList } from './components/MedicineList';
import { EditProfileView } from './components/EditProfileView';
import { NavigationDrawer } from './components/NavigationDrawer';
import { ErrorBoundary } from './components/ErrorBoundary';
import { StorageToast } from './components/StorageToast';
import { Menu, X, ShoppingCart, Lock, ArrowLeft, Home, Smartphone, Monitor, ListIndentIncrease } from 'lucide-react';

const MainLayout: React.FC = () => {
  const { currentRole } = usePharmacy();
  const [activeTab, setActiveTab] = useState<string>('app-home');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState<boolean>(false);
  const [posMode, setPosMode] = useState<'easy' | 'full'>('easy');

  // If role switches to pharmacist and active tab was an admin-only module, switch gracefully to app-home or POS
  useEffect(() => {
    if (currentRole === 'pharmacist' && (activeTab === 'dashboard' || activeTab === 'suppliers')) {
      setActiveTab('app-home');
    }
  }, [currentRole, activeTab]);

  return (
    <div className="min-h-screen bg-black flex flex-col font-sans text-neutral-200">
      {/* Sub-bar for navigating back to App Home from sub-modules */}
      {activeTab !== 'app-home' && (
        <div className="bg-black text-white px-4 py-2.5 flex items-center justify-between border-b border-neutral-800 sticky top-0 z-30">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('app-home')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to App Home</span>
            </button>

            <button
              onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
              className="md:hidden flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 bg-neutral-900 border border-neutral-800 text-emerald-400 rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer"
            >
              {mobileSidebarOpen ? <X className="w-3.5 h-3.5 text-emerald-400" /> : <ListIndentIncrease className="w-4 h-4 text-emerald-400" />}
              <span>{mobileSidebarOpen ? 'Close Menu' : 'Core Modules'}</span>
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-neutral-400 hidden sm:inline">Active View:</span>
            <span className="font-bold uppercase tracking-wider text-emerald-400 bg-neutral-900 px-2.5 py-0.5 rounded-md border border-neutral-800">
              {activeTab.replace('_', ' ')}
            </span>
          </div>
        </div>
      )}

      {/* Content Layout: Sidebar + Main Area */}
      <div className="flex-1 flex flex-row overflow-hidden relative">
        {/* Desktop Sidebar */}
        <div className="hidden md:block">
          <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
        </div>

        {/* Mobile Slide-over Navigation Drawer */}
        <NavigationDrawer
          isOpen={mobileSidebarOpen}
          onClose={() => setMobileSidebarOpen(false)}
          onNavigate={(tab) => {
            setActiveTab(tab);
            setMobileSidebarOpen(false);
          }}
          activeTab={activeTab}
        />

        {/* Dynamic Main Workspace Tab */}
        <main className="flex-1 overflow-y-auto min-h-[calc(100vh-45px)]">
          {activeTab === 'app-home' && (
            <MobileHomeDashboard
              onNavigate={setActiveTab}
              onSwitchToFullDesktopView={() => setActiveTab('dashboard')}
            />
          )}

          {activeTab === 'settings' && (
            <MobileHomeDashboard
              initialMobileTab="settings"
              onNavigate={setActiveTab}
              onSwitchToFullDesktopView={() => setActiveTab('dashboard')}
            />
          )}

          {activeTab === 'dashboard' && (
            <Dashboard onNavigateTab={setActiveTab} />
          )}

          {activeTab === 'pos' && (
            posMode === 'easy' ? (
              <EasySalesView
                onBack={() => setActiveTab('app-home')}
                onGoHome={() => setActiveTab('app-home')}
                onSwitchToDesktopPOS={() => setPosMode('full')}
              />
            ) : (
              <div>
                <div className="bg-[#153835] text-teal-200 px-4 py-2 border-b border-[#255651] flex items-center justify-between">
                  <span className="text-xs font-medium">Advanced Multi-Column Desktop POS Mode</span>
                  <button
                    onClick={() => setPosMode('easy')}
                    className="flex items-center gap-1.5 px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all"
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>Switch to Easy Mobile Sales View</span>
                  </button>
                </div>
                <POSBilling />
              </div>
            )
          )}

          {activeTab === 'purchase' && (
            <PurchaseView
              onBack={() => setActiveTab('app-home')}
              onGoHome={() => setActiveTab('app-home')}
              onNavigateToHistory={() => setActiveTab('purchase_history')}
            />
          )}

          {activeTab === 'purchase_history' && (
            <PurchaseHistoryView
              onBack={() => setActiveTab('purchase')}
              onGoHome={() => setActiveTab('app-home')}
              onNavigateToStockIn={() => setActiveTab('purchase')}
            />
          )}

          {activeTab === 'inventory' && (
            <MedicineList onBack={() => setActiveTab('app-home')} />
          )}

          {activeTab === 'expired_list' && (
            <ExpiredListView onBack={() => setActiveTab('app-home')} />
          )}

          {activeTab === 'due_list' && (
            <DueListView onBack={() => setActiveTab('app-home')} />
          )}

          {activeTab === 'account' && (
            <AccountView onBack={() => setActiveTab('app-home')} />
          )}

          {activeTab === 'sales_orders' && (
            <SalesOrderListView
              onBack={() => setActiveTab('account')}
              onGoHome={() => setActiveTab('app-home')}
            />
          )}

          {activeTab === 'edit_profile' && (
            <EditProfileView onBack={() => setActiveTab('app-home')} />
          )}

          {activeTab === 'online_order' && (
            <OnlineOrdersView onBack={() => setActiveTab('app-home')} />
          )}

          {activeTab === 'suppliers' && (
            currentRole === 'admin' ? (
              <SupplierManagement />
            ) : (
              <div className="p-8 text-center max-w-md mx-auto mt-12 bg-white rounded-2xl border border-slate-200">
                <Lock className="w-10 h-10 text-amber-500 mx-auto mb-2" />
                <h3 className="font-bold text-slate-900 text-base">Wholesale Suppliers Restricted</h3>
                <p className="text-xs text-slate-500 mt-1 mb-4">
                  Only administrators can create purchase orders and view accounts payable.
                </p>
                <button
                  onClick={() => setActiveTab('pos')}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl"
                >
                  Return to POS
                </button>
              </div>
            )
          )}

          {activeTab === 'customers' && <CustomerManagement />}

          {activeTab === 'reports' && (
            <ReportScreen onBack={() => setActiveTab('app-home')} />
          )}

          {activeTab === 'dev-guide' && <SchemaAndDevGuide />}
        </main>
      </div>
    </div>
  );
};

const AppEntry: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const [forceRender, setForceRender] = useState(false);

  useEffect(() => {
    // Safety guard: ensure the app never remains blocked on loading
    const timer = setTimeout(() => setForceRender(true), 300);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading && !forceRender) {
    return (
      <div className="min-h-screen bg-[#0d3b36] flex flex-col items-center justify-center text-teal-100 font-sans">
        <div className="w-16 h-16 rounded-2xl bg-[#143934] border border-[#23534d] flex items-center justify-center mb-4 shadow-xl">
          <div className="w-8 h-8 border-3 border-emerald-400 border-t-transparent rounded-full animate-spin" />
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <p className="text-sm font-medium text-teal-200">Loading application...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  return <MainLayout />;
};

export default function App() {
  return (
    <ErrorBoundary
      fallbackTitle="Application Recovery"
      fallbackMessage="An unexpected error occurred. Click reload to refresh the pharmacy workspace."
    >
      <AuthProvider>
        <PharmacyProvider>
          <AppEntry />
          <StorageToast />
        </PharmacyProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
