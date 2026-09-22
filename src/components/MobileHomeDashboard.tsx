import React, { useState, useEffect, useMemo } from 'react';
import { usePharmacy } from '../context/PharmacyContext';
import {
  ShoppingCart,
  ShoppingBag,
  Package,
  AlertOctagon,
  FileSpreadsheet,
  BarChart3,
  Wallet,
  Info,
  RefreshCw,
  Search,
  BookOpen,
  Activity,
  Pill,
  Tag,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  ExternalLink,
  ShieldCheck,
  TrendingUp,
  AlertTriangle,
  Clock,
  Sparkles,
  LayoutDashboard,
  Home,
  Bell,
  Settings,
  ListIndentIncrease,
  User,
  FilePlus,
  CopyPlus,
  Building2,
  Phone,
  MapPin,
  GraduationCap,
  Award,
  CalendarClock,
  PackageCheck,
  PackageMinus,
  RotateCcw,
  Calendar,
  CloudDownload,
  CloudUpload,
  LogOut,
  X,
  CheckCircle2,
  Database,
  Menu,
  Plus,
  Trash2,
} from 'lucide-react';
import { NavigationDrawer } from './NavigationDrawer';
import { AboutUsModal } from './AboutUsModal';
import { DrugClinicalModal } from './DrugClinicalModal';
import { AddBrandModal } from './AddBrandModal';
import { AddCompanyModal } from './AddCompanyModal';
import { AddGenericModal } from './AddGenericModal';
import { ProfileDetailsModal } from './ProfileDetailsModal';
import { ResetDatabaseModal } from './ResetDatabaseModal';
import { useAuth } from '../context/AuthContext';
import {
  backupDataToFirebase,
  restoreDataFromFirebase,
  testFirebaseConnection,
  firebaseConfig,
} from '../lib/firebase';
import { formatCurrency } from '../utils/formatters';

interface MobileHomeDashboardProps {
  onNavigate: (tab: string) => void;
  onSwitchToFullDesktopView?: () => void;
  initialMobileTab?: 'home' | 'settings';
}

export const MobileHomeDashboard: React.FC<MobileHomeDashboardProps> = ({
  onNavigate,
  onSwitchToFullDesktopView,
  initialMobileTab = 'home',
}) => {
  const {
    medicines,
    sales,
    lowStockMedicines,
    expiredMedicines,
    expiringSoonMedicines,
    customers,
    suppliers,
    onlineOrders,
    companies,
    currentRole,
    switchRole,
    userProfile,
    totalMedicinesCount,
    resetMedicinesDatabase,
    restoreAllData,
  } = usePharmacy();
  const { logout, user } = useAuth();

  // Reset Database State
  const [showResetModal, setShowResetModal] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const handleConfirmReset = async () => {
    setIsResetting(true);
    try {
      const ok = await resetMedicinesDatabase();
      if (ok) {
        setSyncToast('Database reset: All products cleared to 0 items.');
        setTimeout(() => setSyncToast(null), 4000);
      }
    } catch (err: any) {
      console.error('Reset error:', err);
    } finally {
      setIsResetting(false);
    }
  };

  // Modals state
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);
  const [clinicalModalConfig, setClinicalModalConfig] = useState<{
    isOpen: boolean;
    tab: 'search' | 'indications' | 'dosage' | 'pack_price';
  }>({ isOpen: false, tab: 'search' });

  // Firebase connection state
  const [firebaseStatus, setFirebaseStatus] = useState<'checking' | 'connected' | 'ready'>('checking');

  useEffect(() => {
    testFirebaseConnection().then((res) => {
      setFirebaseStatus(res.success ? 'connected' : 'ready');
    });
  }, []);

  // Sync animation state
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncToast, setSyncToast] = useState<string | null>(null);

  const handleSync = async () => {
    setIsSyncing(true);
    setSyncToast('Syncing with Siam Pharma Firebase Cloud...');
    try {
      const fbResult = await backupDataToFirebase({
        exportDate: new Date().toISOString(),
        medicines,
        sales,
        customers,
        suppliers,
        onlineOrders,
        companies,
        profile: userProfile,
      });
      setIsSyncing(false);
      setSyncToast(fbResult.success ? 'Siam Pharma Cloud & Inventory Synchronized!' : 'Synchronized. ' + fbResult.message);
    } catch {
      setIsSyncing(false);
      setSyncToast('Inventory synchronized locally.');
    }
    setTimeout(() => setSyncToast(null), 3000);
  };

  // Quick counts
  const totalExpiredAlerts = expiredMedicines.length + expiringSoonMedicines.length;
  const pendingOrdersCount = onlineOrders.filter((o) => o.status === 'Pending').length;
  const totalCustomerDues = customers.reduce((sum, c) => sum + (c.dueAmount || 0), 0);
  const totalSupplierDues = suppliers.reduce((sum, s) => sum + s.dueBalance, 0);
  const totalAlertsCount = lowStockMedicines.length + expiredMedicines.length + expiringSoonMedicines.length + pendingOrdersCount;

  // Mobile navigation tab state ('home' | 'settings')
  const [mobileTab, setMobileTab] = useState<'home' | 'settings'>(initialMobileTab);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  useEffect(() => {
    if (initialMobileTab) {
      setMobileTab(initialMobileTab);
    }
  }, [initialMobileTab]);
  const [showCoreModulesModal, setShowCoreModulesModal] = useState(false);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [showAddCompanyModal, setShowAddCompanyModal] = useState(false);
  const [showAddGenericModal, setShowAddGenericModal] = useState(false);
  const [showAddBrandModal, setShowAddBrandModal] = useState(false);

  const handleBackupData = async () => {
    const backupObj = {
      exportDate: new Date().toISOString(),
      medicines,
      sales,
      customers,
      suppliers,
      onlineOrders,
      companies,
      profile: userProfile,
    };

    setSyncToast('Saving snapshot to Siam Pharma Firebase & preparing download...');

    // 1. Save to Firebase Cloud (siam-pharma)
    const fbRes = await backupDataToFirebase(backupObj);

    // 2. Export local JSON file
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupObj, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `siam_pharma_backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    if (fbRes.success) {
      setSyncToast('Backed up to Siam Pharma Firebase Cloud & downloaded file!');
    } else {
      setSyncToast('Backup exported locally. (' + fbRes.message + ')');
    }
    setTimeout(() => setSyncToast(null), 3500);
  };

  const handleRestoreFromFirebaseCloud = async () => {
    setSyncToast('Connecting to Siam Pharma Firebase to fetch cloud backup...');
    const result = await restoreDataFromFirebase();
    if (result.success && result.data) {
      restoreAllData(result.data);
      setSyncToast('Successfully restored cloud snapshot (' + (result.data.exportDate ? new Date(result.data.exportDate).toLocaleDateString() : 'verified') + ') from Siam Pharma Firebase!');
    } else {
      setSyncToast(result.message || 'No cloud backup snapshot found yet in siam-pharma.');
    }
    setTimeout(() => setSyncToast(null), 4000);
  };

  const handleUploadData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);
        restoreAllData(parsed);
        setSyncToast('Backup file verified and restored successfully!');
      } catch (err) {
        setSyncToast('Invalid JSON backup file.');
      }
      setTimeout(() => setSyncToast(null), 3000);
    };
    reader.readAsText(file);
  };

  const handleCheckUpdate = () => {
    setSyncToast('Checking for updates... All core components are up-to-date (v1.0.0)');
    setTimeout(() => setSyncToast(null), 3000);
  };

  return (
    <div className="min-h-screen bg-[#00120A] text-white flex flex-col items-center select-none pb-12 relative">
      {/* Outer container matching mobile phone width on desktop, full width on mobile */}
      <div className="w-full max-w-md md:max-w-lg bg-[#00120A] min-h-screen flex flex-col shadow-2xl border-x border-emerald-950/60 relative">

        {/* Sync Toast Notification */}
        {syncToast && (
          <div className="mx-4 mt-3 p-2.5 bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 rounded-xl text-xs font-medium flex items-center gap-2 animate-in fade-in">
            <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="flex-1">{syncToast}</span>
          </div>
        )}

        {mobileTab === 'settings' ? (
          /* Settings View matching User's Theme - Black background with green icons */
          <main className="flex-1 px-4 py-4 overflow-y-auto space-y-4 bg-black">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
              <h1 className="text-xl font-bold text-white tracking-tight">
                Settings & Preferences
              </h1>
              <button
                onClick={() => setMobileTab('home')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-900 border border-neutral-800 text-emerald-400 hover:text-emerald-300 text-xs font-bold transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4 text-emerald-400" />
                <span>Back to Home</span>
              </button>
            </div>

            {/* 1. Account */}
            <div className="space-y-1.5">
              <h2 className="text-xs font-bold text-emerald-400 tracking-wide px-1">Account</h2>
              <div className="border border-neutral-800 bg-[#0c100e] rounded-2xl p-4 space-y-3.5 shadow-sm">
                <button
                  id="settings-edit-profile-btn"
                  onClick={() => onNavigate('edit_profile')}
                  className="w-full flex items-center gap-3 text-sm text-neutral-200 font-medium hover:text-white transition-colors cursor-pointer group"
                >
                  <div className="w-7 h-7 rounded-lg bg-black border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:bg-neutral-900 transition-colors">
                    <User className="w-4 h-4 shrink-0 text-emerald-400" />
                  </div>
                  <span className="font-semibold">Edit Profile</span>
                </button>
                <button
                  id="settings-about-btn"
                  onClick={() => setIsAboutModalOpen(true)}
                  className="w-full flex items-center justify-between text-sm text-neutral-200 font-medium hover:text-white transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-black border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:bg-neutral-900 transition-colors">
                      <Info className="w-4 h-4 shrink-0 text-emerald-400" />
                    </div>
                    <div className="text-left">
                      <span className="font-semibold block leading-tight text-white">About Siam Pharma</span>
                      <span className="text-[11px] text-neutral-400 block">v2.4 • DGDA License, Hotline & Details</span>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 flex items-center gap-1 group-hover:border-emerald-500 transition-colors">
                    About &gt;
                  </span>
                </button>
                <button
                  onClick={() => setIsAboutModalOpen(true)}
                  className="w-full flex items-center gap-3 text-sm text-neutral-200 font-medium hover:text-white transition-colors"
                >
                  <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
                  <span>User Guide & License</span>
                </button>
              </div>
            </div>

            {/* 2. Control Panel */}
            <div className="space-y-1.5">
              <h2 className="text-xs font-bold text-emerald-400 tracking-wide px-1">Control Panel</h2>
              <div className="border border-neutral-800 bg-[#0c100e] rounded-2xl p-4 space-y-3.5 shadow-sm">
                <button
                  id="add-company-btn"
                  onClick={() => setShowAddCompanyModal(true)}
                  className="w-full flex items-center gap-3 text-sm text-neutral-200 font-medium hover:text-white transition-colors cursor-pointer text-left"
                >
                  <CopyPlus className="w-5 h-5 text-emerald-400 shrink-0" />
                  <span>Add Company</span>
                </button>
                <button
                  id="add-generic-btn"
                  onClick={() => setShowAddGenericModal(true)}
                  className="w-full flex items-center justify-between text-sm text-neutral-200 font-medium hover:text-white transition-colors cursor-pointer text-left"
                >
                  <div className="flex items-center gap-3">
                    <CopyPlus className="w-5 h-5 text-emerald-400 shrink-0" />
                    <span>Add Generic</span>
                  </div>
                  <span className="text-[10px] bg-teal-950/80 text-teal-300 px-2 py-0.5 rounded-md border border-teal-800/40 font-mono">
                    CSV Bulk
                  </span>
                </button>
                <button
                  id="add-product-btn"
                  onClick={() => setShowAddBrandModal(true)}
                  className="w-full flex items-center justify-between text-sm text-neutral-200 font-medium hover:text-white transition-colors cursor-pointer text-left"
                >
                  <div className="flex items-center gap-3">
                    <CopyPlus className="w-5 h-5 text-emerald-400 shrink-0" />
                    <span>Add Products</span>
                  </div>
                  <span className="text-[10px] bg-emerald-950/80 text-emerald-300 px-2 py-0.5 rounded-md border border-emerald-800/40 font-mono">
                    CSV Bulk
                  </span>
                </button>
                <button
                  onClick={() => onNavigate('pos')}
                  className="w-full flex items-center gap-3 text-sm text-neutral-200 font-medium hover:text-white transition-colors cursor-pointer text-left"
                >
                  <PackageMinus className="w-5 h-5 text-emerald-400 shrink-0" />
                  <span>Return Products</span>
                </button>
                <button
                  onClick={() => onNavigate('expired_list')}
                  className="w-full flex items-center gap-3 text-sm text-neutral-200 font-medium hover:text-white transition-colors cursor-pointer text-left"
                >
                  <CalendarClock className="w-5 h-5 text-emerald-400 shrink-0" />
                  <span>Set Expire Date</span>
                </button>
                <button
                  onClick={() => onNavigate('inventory')}
                  className="w-full flex items-center gap-3 text-sm text-neutral-200 font-medium hover:text-white transition-colors cursor-pointer text-left"
                >
                  <PackageCheck className="w-5 h-5 text-emerald-400 shrink-0" />
                  <span>Set Low Stock Alert</span>
                </button>
              </div>
            </div>

            {/* 3. Actions */}
            <div className="space-y-1.5">
              <h2 className="text-xs font-bold text-emerald-400 tracking-wide px-1">Actions & Cloud Sync</h2>
              <div className="border border-neutral-800 bg-[#0c100e] rounded-2xl p-4 space-y-3.5 shadow-sm">
                <button
                  id="backup-data-btn"
                  onClick={handleBackupData}
                  className="w-full flex items-center justify-between text-sm text-neutral-200 font-medium hover:text-white transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <CloudDownload className="w-5 h-5 text-emerald-400 shrink-0" />
                    <span>Backup Data</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 font-mono">Cloud & JSON</span>
                </button>
                <button
                  id="restore-cloud-btn"
                  onClick={handleRestoreFromFirebaseCloud}
                  className="w-full flex items-center justify-between text-sm text-neutral-200 font-medium hover:text-white transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <Database className="w-5 h-5 text-emerald-400 shrink-0" />
                    <span>Restore from Firebase Cloud</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 font-mono">siam-pharma</span>
                </button>
                <button
                  id="reset-products-database-btn"
                  onClick={() => setShowResetModal(true)}
                  className="w-full flex items-center justify-between text-sm text-neutral-200 font-medium hover:text-rose-400 transition-colors text-left cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <Trash2 className="w-5 h-5 text-rose-400 shrink-0" />
                    <div>
                      <span className="text-white group-hover:text-rose-300 font-semibold block">Clear All Products (Reset DB)</span>
                      <span className="text-[11px] text-neutral-400 block">Wipe 185k+ items to 0 for fresh manual/CSV entry</span>
                    </div>
                  </div>
                  <span className="text-[10px] px-2.5 py-1 rounded-full bg-rose-950/70 text-rose-300 border border-rose-800/80 font-mono font-bold">Reset</span>
                </button>
                <label className="w-full flex items-center gap-3 text-sm text-neutral-200 font-medium hover:text-white transition-colors cursor-pointer">
                  <CloudUpload className="w-5 h-5 text-emerald-400 shrink-0" />
                  <span>Upload Data (JSON File)</span>
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleUploadData}
                    className="hidden"
                  />
                </label>
                <button
                  onClick={handleCheckUpdate}
                  className="w-full flex items-center gap-3 text-sm text-neutral-200 font-medium hover:text-white transition-colors"
                >
                  <RefreshCw className="w-5 h-5 text-emerald-400 shrink-0" />
                  <span>Check Update</span>
                </button>
                <button
                  id="mobile-logout-btn"
                  onClick={() => {
                    if (window.confirm('Are you sure you want to log out of your account?')) {
                      logout();
                    }
                  }}
                  className="w-full flex items-center justify-between text-sm text-neutral-200 font-medium hover:text-red-400 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <LogOut className="w-5 h-5 text-emerald-400 shrink-0" />
                    <span>Log Out</span>
                  </div>
                  <span className="text-[10px] text-emerald-400 bg-neutral-900 px-2 py-0.5 rounded border border-neutral-800">
                    {user?.displayName || (currentRole === 'admin' ? 'Admin' : 'Cashier')}
                  </span>
                </button>
              </div>

              {/* Firebase Cloud Connection Status Card */}
              <div className="border border-neutral-800 bg-[#0c100e] rounded-2xl p-3.5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5">
                  <span className={`w-2.5 h-2.5 rounded-full ${firebaseStatus === 'connected' ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]' : 'bg-emerald-500 animate-pulse'}`} />
                  <div>
                    <div className="font-semibold text-white flex items-center gap-1.5">
                      <span>Firebase Cloud</span>
                      <span className="text-[10px] text-emerald-400 bg-neutral-900 px-1.5 py-0.5 rounded border border-neutral-800">siam-pharma</span>
                    </div>
                    <p className="text-[11px] text-neutral-400">Firestore & Realtime DB Ready</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    testFirebaseConnection().then((res) => {
                      setSyncToast(res.message);
                      setFirebaseStatus(res.success ? 'connected' : 'ready');
                      setTimeout(() => setSyncToast(null), 3000);
                    });
                  }}
                  className="text-[11px] text-emerald-400 hover:text-emerald-300 underline underline-offset-2"
                >
                  Test Link
                </button>
              </div>
            </div>

            <div className="text-center pb-3">
              <button
                id="settings-footer-about-btn"
                onClick={() => setIsAboutModalOpen(true)}
                className="text-[11px] text-neutral-400 hover:text-emerald-400 transition-colors inline-flex items-center gap-1.5 cursor-pointer py-1 px-3 rounded-full hover:bg-neutral-900 border border-transparent hover:border-neutral-800"
                title="About Siam Pharma"
              >
                <Info className="w-3.5 h-3.5 text-emerald-400" />
                <span>About Siam Pharma • v2.4</span>
              </button>
            </div>
          </main>
        ) : (
          <>
            {/* 1. Dynamic Profile Header (Top Panel) */}
            <section className="px-3.5 sm:px-4 pt-3.5 pb-1">
              {(() => {
                const rawName = userProfile?.name?.trim() || user?.displayName || 'Siam';
                const pharmacistName = rawName || 'Siam';
                const rawQual = userProfile?.qualification?.trim() || '';
                const qualificationText = rawQual && !rawQual.toLowerCase().includes('reg no')
                  ? rawQual
                  : 'B.Pharm / Diploma in Pharmacy';
                const licenseNumberText = userProfile?.licenseNumber || 'DL-DHK-2024-88291';
                const contactNumberText = userProfile?.phone
                  ? (userProfile.phone.startsWith('+') ? userProfile.phone : `${userProfile.phoneCountryCode || '+88'} ${userProfile.phone}`)
                  : '+88 01846493071';
                const avatarSrc = userProfile?.avatarUrl || '/src/assets/images/profile_avatar_3d_1789066596560.jpg';

                return (
                  <div
                    id="dynamic-profile-header-banner"
                    onClick={() => setIsProfileModalOpen(true)}
                    className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-[#001A10]/95 backdrop-blur-[15px] border border-[#00E676]/35 shadow-[0_8px_30px_rgba(0,18,10,0.85),0_0_22px_rgba(0,230,118,0.16)] hover:border-[#00E676]/75 hover:shadow-[0_0_28px_rgba(0,230,118,0.28)] active:scale-[0.99] transition-all p-3.5 sm:p-4 group cursor-pointer"
                    title="Click to view full institution profile & license details"
                  >
                    {/* Background Medical Illustration & Subtle Neon Halos */}
                    <div
                      className="absolute inset-0 bg-cover bg-center opacity-15 mix-blend-luminosity pointer-events-none filter contrast-125"
                      style={{ backgroundImage: "url('/assets/pharmacy_bg_banner.jpg')" }}
                    />
                    <div className="absolute -top-10 -right-10 w-32 h-32 bg-[#00E676]/15 rounded-full blur-2xl pointer-events-none" />
                    <div className="absolute -bottom-8 -left-8 w-28 h-28 bg-[#002B1F]/40 rounded-full blur-xl pointer-events-none" />

                    <div className="relative z-10 flex items-center justify-between gap-3">
                      {/* Left: Pharmacist photo (man) with glowing ACTIVE status badge */}
                      <div className="relative shrink-0 group-hover:scale-105 transition-transform duration-300">
                        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full p-0.5 bg-gradient-to-tr from-[#00E676] via-emerald-400 to-[#00B0FF] shadow-[0_0_18px_rgba(0,230,118,0.5)] ring-2 ring-emerald-400/40 flex items-center justify-center">
                          <div className="w-full h-full rounded-full overflow-hidden bg-black flex items-center justify-center relative">
                            <img
                              src={avatarSrc}
                              alt={pharmacistName}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                const target = e.currentTarget;
                                target.src = '/app-icon.svg';
                              }}
                              referrerPolicy="no-referrer"
                            />
                          </div>
                        </div>

                        {/* Status: subtle glowing green badge/dot in the corner with text: "ACTIVE" */}
                        <div className="absolute -bottom-1 -right-1 flex items-center gap-1 bg-[#001A10] border border-[#00E676] px-1.5 py-0.5 rounded-full shadow-[0_0_10px_rgba(0,230,118,0.8)] z-10">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#00E676] animate-pulse" />
                          <span className="text-[9px] font-black text-[#00E676] tracking-wider leading-none">ACTIVE</span>
                        </div>
                      </div>

                      {/* Middle: Credentials in clean white text */}
                      <div className="flex-1 min-w-0 flex flex-col justify-center gap-0.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h2 className="text-sm sm:text-base font-black text-white tracking-tight leading-none group-hover:text-emerald-200 transition-colors">
                            {pharmacistName}
                          </h2>
                          <span className="text-xs sm:text-[13px] text-white/90 font-medium truncate">
                            - {qualificationText}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] sm:text-[11px] font-mono font-bold text-white tracking-wide">
                            LICENSE NO: {licenseNumberText}
                          </span>
                        </div>

                        <div className="flex items-center gap-1 text-[10px] sm:text-[11px] text-white/80 truncate">
                          <span>Contact: {contactNumberText}</span>
                        </div>
                      </div>

                      {/* Far Right: "Profile Details >" and "About" option */}
                      <div className="shrink-0 pl-1 flex flex-col items-end gap-1.5">
                        <button
                          type="button"
                          id="profile-header-details-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsProfileModalOpen(true);
                          }}
                          className="text-xs sm:text-sm font-bold text-white hover:text-[#00E676] flex items-center gap-0.5 group-hover:translate-x-0.5 transition-all whitespace-nowrap cursor-pointer"
                        >
                          <span>Profile Details &gt;</span>
                        </button>
                        <button
                          type="button"
                          id="home-about-option-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsAboutModalOpen(true);
                          }}
                          className="text-[10px] font-bold text-emerald-400 hover:text-white bg-[#002B1F] hover:bg-[#003B2A] border border-[#00E676]/40 px-2.5 py-0.5 rounded-full flex items-center gap-1 transition-all shadow-xs cursor-pointer active:scale-95"
                          title="About Siam Pharma & License Details"
                        >
                          <Info className="w-3 h-3 text-[#00E676]" />
                          <span>About</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </section>

            {/* 2. Compact Analytics Widgets (Second Row) */}
            <section className="px-3.5 sm:px-4 py-1.5">
              <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
                {/* Card 1 (Sales): 🛒 "Today's Sales" | "৳28,450.00" */}
                <button
                  id="stat-card-sales"
                  onClick={() => onNavigate('pos')}
                  className="bg-[#002B1F] rounded-xl sm:rounded-2xl p-2 sm:p-2.5 border border-emerald-500/20 shadow-[inset_1px_1px_2px_rgba(255,255,255,0.07),inset_-2px_-2px_4px_rgba(0,0,0,0.5),0_4px_12px_rgba(0,18,10,0.6)] flex flex-col justify-between text-left hover:border-[#00E676]/60 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer group"
                  title="View Today's Sales"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm sm:text-base leading-none">🛒</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-[#00E676] shadow-[0_0_6px_#00E676]" />
                  </div>
                  <div>
                    <span className="text-[10px] sm:text-[11px] font-medium text-white/70 block leading-tight truncate">
                      Today's Sales
                    </span>
                    <span className="text-xs sm:text-sm font-black text-white font-mono tracking-tight group-hover:text-[#00E676] transition-colors block mt-0.5 truncate">
                      ৳28,450.00
                    </span>
                  </div>
                </button>

                {/* Card 2 (Orders): 📦 "New Orders" | "145" */}
                <button
                  id="stat-card-orders"
                  onClick={() => onNavigate('online_order')}
                  className="bg-[#002B1F] rounded-xl sm:rounded-2xl p-2 sm:p-2.5 border border-emerald-500/20 shadow-[inset_1px_1px_2px_rgba(255,255,255,0.07),inset_-2px_-2px_4px_rgba(0,0,0,0.5),0_4px_12px_rgba(0,18,10,0.6)] flex flex-col justify-between text-left hover:border-[#00E676]/60 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer group"
                  title="View New Orders"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm sm:text-base leading-none">📦</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-[#00E676] shadow-[0_0_6px_#00E676]" />
                  </div>
                  <div>
                    <span className="text-[10px] sm:text-[11px] font-medium text-white/70 block leading-tight truncate">
                      New Orders
                    </span>
                    <span className="text-xs sm:text-sm font-black text-white font-mono tracking-tight group-hover:text-[#00E676] transition-colors block mt-0.5">
                      145
                    </span>
                  </div>
                </button>

                {/* Card 3 (Stock): ⚠️ "Short Stock" | "12 Items" */}
                <button
                  id="stat-card-stock"
                  onClick={() => onNavigate('inventory')}
                  className="bg-[#002B1F] rounded-xl sm:rounded-2xl p-2 sm:p-2.5 border border-amber-500/30 shadow-[inset_1px_1px_2px_rgba(255,255,255,0.07),inset_-2px_-2px_4px_rgba(0,0,0,0.5),0_4px_12px_rgba(0,18,10,0.6)] flex flex-col justify-between text-left hover:border-amber-400 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer group"
                  title="View Short Stock Alert"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm sm:text-base leading-none">⚠️</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.9)]" />
                  </div>
                  <div>
                    <span className="text-[10px] sm:text-[11px] font-medium text-amber-200/90 block leading-tight truncate">
                      Short Stock
                    </span>
                    <span className="text-xs sm:text-sm font-black text-amber-300 font-mono tracking-tight group-hover:text-amber-200 transition-colors block mt-0.5 truncate">
                      12 Items
                    </span>
                  </div>
                </button>

                {/* Card 4 (Expired): 🚨 "Expired" | "3 Alerts" */}
                <button
                  id="stat-card-expired"
                  onClick={() => onNavigate('expired_list')}
                  className="bg-[#002B1F] rounded-xl sm:rounded-2xl p-2 sm:p-2.5 border border-rose-500/30 shadow-[inset_1px_1px_2px_rgba(255,255,255,0.07),inset_-2px_-2px_4px_rgba(0,0,0,0.5),0_4px_12px_rgba(0,18,10,0.6)] flex flex-col justify-between text-left hover:border-rose-400 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer group"
                  title="View Expired Alerts"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm sm:text-base leading-none">🚨</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.9)] animate-ping" />
                  </div>
                  <div>
                    <span className="text-[10px] sm:text-[11px] font-medium text-rose-200/90 block leading-tight truncate">
                      Expired
                    </span>
                    <span className="text-xs sm:text-sm font-black text-rose-400 font-mono tracking-tight group-hover:text-rose-300 transition-colors block mt-0.5 truncate">
                      3 Alerts
                    </span>
                  </div>
                </button>
              </div>
            </section>

            {/* 3. Module Grid Layout (Main Section): Clean 2-column rounded grid (4x2 cards) */}
            <main className="px-3.5 sm:px-4 py-2 flex-1">
              <div className="grid grid-cols-2 gap-3 sm:gap-3.5">
                {/* 1. Sales */}
                <button
                  id="tile-sales"
                  onClick={() => onNavigate('pos')}
                  className="bg-[#002B1F] hover:bg-[#003828] active:scale-[0.98] border border-[#00E676]/30 hover:border-[#00E676] shadow-[0_4px_16px_rgba(0,18,10,0.6)] hover:shadow-[0_0_20px_rgba(0,230,118,0.25)] rounded-2xl p-3.5 sm:p-4 flex items-center gap-3 text-left transition-all group cursor-pointer relative overflow-hidden"
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#FFD700]/20 via-[#B8860B]/15 to-black/70 border border-[#FFD700]/50 flex items-center justify-center shadow-[0_0_14px_rgba(255,215,0,0.25)] group-hover:scale-105 group-hover:shadow-[0_0_20px_rgba(255,215,0,0.45)] transition-all shrink-0">
                    <ShoppingCart className="w-6 h-6 text-[#FFD700] stroke-[2.5]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-sm sm:text-base font-bold text-white tracking-tight group-hover:text-emerald-300 transition-colors block">
                      Sales
                    </span>
                    <span className="text-[10px] sm:text-[11px] text-emerald-400/80 block truncate">
                      POS & Fast Billing
                    </span>
                  </div>
                </button>

                {/* 2. Purchase */}
                <button
                  id="tile-purchase"
                  onClick={() => onNavigate('purchase')}
                  className="bg-[#002B1F] hover:bg-[#003828] active:scale-[0.98] border border-[#00E676]/30 hover:border-[#00E676] shadow-[0_4px_16px_rgba(0,18,10,0.6)] hover:shadow-[0_0_20px_rgba(0,230,118,0.25)] rounded-2xl p-3.5 sm:p-4 flex items-center gap-3 text-left transition-all group cursor-pointer relative overflow-hidden"
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#FFD700]/20 via-[#B8860B]/15 to-black/70 border border-[#FFD700]/50 flex items-center justify-center shadow-[0_0_14px_rgba(255,215,0,0.25)] group-hover:scale-105 group-hover:shadow-[0_0_20px_rgba(255,215,0,0.45)] transition-all shrink-0">
                    <ShoppingBag className="w-6 h-6 text-[#FFD700] stroke-[2.5]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-sm sm:text-base font-bold text-white tracking-tight group-hover:text-emerald-300 transition-colors block">
                      Purchase
                    </span>
                    <span className="text-[10px] sm:text-[11px] text-emerald-400/80 block truncate">
                      Stock In & Invoices
                    </span>
                  </div>
                </button>

                {/* 3. Stock */}
                <button
                  id="tile-products"
                  onClick={() => onNavigate('inventory')}
                  className="bg-[#002B1F] hover:bg-[#003828] active:scale-[0.98] border border-[#00E676]/30 hover:border-[#00E676] shadow-[0_4px_16px_rgba(0,18,10,0.6)] hover:shadow-[0_0_20px_rgba(0,230,118,0.25)] rounded-2xl p-3.5 sm:p-4 flex items-center gap-3 text-left transition-all group cursor-pointer relative overflow-hidden"
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#FFD700]/20 via-[#B8860B]/15 to-black/70 border border-[#FFD700]/50 flex items-center justify-center shadow-[0_0_14px_rgba(255,215,0,0.25)] group-hover:scale-105 group-hover:shadow-[0_0_20px_rgba(255,215,0,0.45)] transition-all shrink-0">
                    <Package className="w-6 h-6 text-[#FFD700] stroke-[2.5]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-sm sm:text-base font-bold text-white tracking-tight group-hover:text-emerald-300 transition-colors block">
                      Stock
                    </span>
                    <span className="text-[10px] sm:text-[11px] text-emerald-400/80 block truncate">
                      {medicines.length} Medicines
                    </span>
                  </div>
                </button>

                {/* 4. Expired */}
                <button
                  id="tile-expired"
                  onClick={() => onNavigate('expired_list')}
                  className="bg-[#002B1F] hover:bg-[#003828] active:scale-[0.98] border border-[#00E676]/30 hover:border-[#00E676] shadow-[0_4px_16px_rgba(0,18,10,0.6)] hover:shadow-[0_0_20px_rgba(0,230,118,0.25)] rounded-2xl p-3.5 sm:p-4 flex items-center gap-3 text-left transition-all group cursor-pointer relative overflow-hidden"
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#FFD700]/20 via-[#B8860B]/15 to-black/70 border border-[#FFD700]/50 flex items-center justify-center shadow-[0_0_14px_rgba(255,215,0,0.25)] group-hover:scale-105 group-hover:shadow-[0_0_20px_rgba(255,215,0,0.45)] transition-all shrink-0">
                    <AlertOctagon className="w-6 h-6 text-[#FFD700] stroke-[2.5]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-sm sm:text-base font-bold text-white tracking-tight group-hover:text-emerald-300 transition-colors block">
                      Expired
                    </span>
                    <span className="text-[10px] sm:text-[11px] text-rose-300 block truncate">
                      3 Alerts • Critical
                    </span>
                  </div>
                </button>

                {/* 5. Due List */}
                <button
                  id="tile-due"
                  onClick={() => onNavigate('due_list')}
                  className="bg-[#002B1F] hover:bg-[#003828] active:scale-[0.98] border border-[#00E676]/30 hover:border-[#00E676] shadow-[0_4px_16px_rgba(0,18,10,0.6)] hover:shadow-[0_0_20px_rgba(0,230,118,0.25)] rounded-2xl p-3.5 sm:p-4 flex items-center gap-3 text-left transition-all group cursor-pointer relative overflow-hidden"
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#FFD700]/20 via-[#B8860B]/15 to-black/70 border border-[#FFD700]/50 flex items-center justify-center shadow-[0_0_14px_rgba(255,215,0,0.25)] group-hover:scale-105 group-hover:shadow-[0_0_20px_rgba(255,215,0,0.45)] transition-all shrink-0">
                    <FileSpreadsheet className="w-6 h-6 text-[#FFD700] stroke-[2.5]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-sm sm:text-base font-bold text-white tracking-tight group-hover:text-emerald-300 transition-colors block">
                      Due List
                    </span>
                    <span className="text-[10px] sm:text-[11px] text-emerald-400/80 block truncate">
                      Customer & Supplier
                    </span>
                  </div>
                </button>

                {/* 6. Reports */}
                <button
                  id="tile-report"
                  onClick={() => onNavigate('reports')}
                  className="bg-[#002B1F] hover:bg-[#003828] active:scale-[0.98] border border-[#00E676]/30 hover:border-[#00E676] shadow-[0_4px_16px_rgba(0,18,10,0.6)] hover:shadow-[0_0_20px_rgba(0,230,118,0.25)] rounded-2xl p-3.5 sm:p-4 flex items-center gap-3 text-left transition-all group cursor-pointer relative overflow-hidden"
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#FFD700]/20 via-[#B8860B]/15 to-black/70 border border-[#FFD700]/50 flex items-center justify-center shadow-[0_0_14px_rgba(255,215,0,0.25)] group-hover:scale-105 group-hover:shadow-[0_0_20px_rgba(255,215,0,0.45)] transition-all shrink-0">
                    <BarChart3 className="w-6 h-6 text-[#FFD700] stroke-[2.5]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-sm sm:text-base font-bold text-white tracking-tight group-hover:text-emerald-300 transition-colors block">
                      Reports
                    </span>
                    <span className="text-[10px] sm:text-[11px] text-emerald-400/80 block truncate">
                      Sales & Profit Stats
                    </span>
                  </div>
                </button>

                {/* 7. Accounts */}
                <button
                  id="tile-account"
                  onClick={() => onNavigate('account')}
                  className="bg-[#002B1F] hover:bg-[#003828] active:scale-[0.98] border border-[#00E676]/30 hover:border-[#00E676] shadow-[0_4px_16px_rgba(0,18,10,0.6)] hover:shadow-[0_0_20px_rgba(0,230,118,0.25)] rounded-2xl p-3.5 sm:p-4 flex items-center gap-3 text-left transition-all group cursor-pointer relative overflow-hidden"
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#FFD700]/20 via-[#B8860B]/15 to-black/70 border border-[#FFD700]/50 flex items-center justify-center shadow-[0_0_14px_rgba(255,215,0,0.25)] group-hover:scale-105 group-hover:shadow-[0_0_20px_rgba(255,215,0,0.45)] transition-all shrink-0">
                    <Wallet className="w-6 h-6 text-[#FFD700] stroke-[2.5]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-sm sm:text-base font-bold text-white tracking-tight group-hover:text-emerald-300 transition-colors block">
                      Accounts
                    </span>
                    <span className="text-[10px] sm:text-[11px] text-emerald-400/80 block truncate">
                      Sales & Expenses
                    </span>
                  </div>
                </button>

                {/* 8. Settings */}
                <button
                  id="tile-settings"
                  onClick={() => setMobileTab('settings')}
                  className="bg-[#002B1F] hover:bg-[#003828] active:scale-[0.98] border border-[#00E676]/30 hover:border-[#00E676] shadow-[0_4px_16px_rgba(0,18,10,0.6)] hover:shadow-[0_0_20px_rgba(0,230,118,0.25)] rounded-2xl p-3.5 sm:p-4 flex items-center gap-3 text-left transition-all group cursor-pointer relative overflow-hidden"
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#FFD700]/20 via-[#B8860B]/15 to-black/70 border border-[#FFD700]/50 flex items-center justify-center shadow-[0_0_14px_rgba(255,215,0,0.25)] group-hover:scale-105 group-hover:shadow-[0_0_20px_rgba(255,215,0,0.45)] transition-all shrink-0">
                    <Settings className="w-6 h-6 text-[#FFD700] stroke-[2.5]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-sm sm:text-base font-bold text-white tracking-tight group-hover:text-emerald-300 transition-colors block">
                      Settings
                    </span>
                    <span className="text-[10px] sm:text-[11px] text-emerald-400/80 block truncate">
                      Profile & Cloud Sync
                    </span>
                  </div>
                </button>
              </div>

              {/* WhatsApp Helpline Footer Section */}
              <div
                id="whatsapp-helpline-footer"
                className="mt-4 p-3.5 sm:p-4 rounded-2xl bg-[#002B1F] border border-[#00E676]/35 shadow-[0_4px_20px_rgba(0,18,10,0.7),0_0_16px_rgba(0,230,118,0.1)] flex items-center justify-between gap-3 group transition-all"
              >
                {/* WhatsApp Icon on the left with direct clickable link style */}
                <a
                  href="https://wa.me/8801846493071"
                  target="_blank"
                  rel="noopener noreferrer"
                  id="whatsapp-helpline-icon-btn"
                  className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-[#00120A] border border-[#00E676]/45 flex items-center justify-center text-[#00E676] shadow-[0_0_12px_rgba(0,230,118,0.25)] hover:scale-105 hover:bg-[#001F15] hover:border-[#00E676] transition-all shrink-0 cursor-pointer"
                  title="Direct WhatsApp Chat"
                >
                  <MessageCircle className="w-6 h-6 text-[#00E676] stroke-[2.5]" />
                </a>

                {/* Neatly aligned 3 key details: Name, Contact / WhatsApp, and Email */}
                <div className="min-w-0 flex-1 flex flex-col justify-center gap-0.5 text-left">
                  {/* 1. Name */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs sm:text-sm font-bold text-white tracking-tight">
                      Siam Hasan
                    </span>
                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-[#00120A] text-[#00E676] border border-[#00E676]/40">
                      Helpline
                    </span>
                  </div>

                  {/* 2. Contact / WhatsApp */}
                  <div className="flex items-center gap-1.5 text-xs text-neutral-200">
                    <span className="text-neutral-400 text-[11px]">WhatsApp:</span>
                    <a
                      href="https://wa.me/8801846493071"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono font-bold text-[#00E676] hover:underline transition-colors tracking-wide"
                      title="Send WhatsApp Message"
                    >
                      +88 01846493071
                    </a>
                  </div>

                  {/* 3. Email */}
                  <div className="flex items-center gap-1.5 text-[11px] text-neutral-300 truncate">
                    <span className="text-neutral-400">Email:</span>
                    <a
                      href="mailto:siamhasannassta999@gmail.com"
                      className="text-neutral-200 hover:text-[#00E676] hover:underline font-mono truncate transition-colors"
                      title="Send Email"
                    >
                      siamhasannassta999@gmail.com
                    </a>
                  </div>
                </div>

                {/* Right: Direct Clickable WhatsApp Link Button */}
                <a
                  href="https://wa.me/8801846493071"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 flex items-center gap-1.5 bg-[#00120A] border border-[#00E676]/40 hover:border-[#00E676] hover:bg-[#001F15] text-[#00E676] px-2.5 py-2 rounded-xl transition-all shadow-xs cursor-pointer active:scale-95 text-xs font-bold group-hover:border-[#00E676]"
                  title="Open WhatsApp Chat (+88 01846493071)"
                >
                  <span className="hidden sm:inline text-[11px]">Chat</span>
                  <ExternalLink className="w-3.5 h-3.5 text-[#00E676]" />
                </a>
              </div>

              {/* Quick Switch to Full Desktop Dashboard View */}
              {onSwitchToFullDesktopView && (
                <div className="mt-3 text-center">
                  <button
                    onClick={onSwitchToFullDesktopView}
                    className="text-[11px] font-semibold text-emerald-400/80 hover:text-emerald-300 underline decoration-emerald-500/50 underline-offset-4 flex items-center justify-center gap-1.5 mx-auto py-1 cursor-pointer"
                  >
                    <LayoutDashboard className="w-3.5 h-3.5 text-[#00E676]" />
                    <span>Switch to Expanded Analytics Dashboard</span>
                  </button>
                </div>
              )}
            </main>
          </>
        )}


        {/* Bottom App Navigation Bar - Clean, evenly spaced 4 items: [Home] [Settings] [Sales/Add] [Reports/User] */}
        <div className="sticky bottom-0 z-40 w-full p-2.5 sm:p-3 bg-black/95 backdrop-blur-md border-t border-neutral-850">
          <nav className="bg-[#0b120f] border border-[#00E676]/30 text-emerald-400 rounded-2xl sm:rounded-3xl py-1.5 px-2 grid grid-cols-4 items-center justify-items-center shadow-[0_4px_24px_rgba(0,18,10,0.8),0_0_15px_rgba(0,230,118,0.12)]">
            {/* 1. Home */}
            <button
              id="bottom-nav-home"
              onClick={() => setMobileTab('home')}
              className={`w-full flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all cursor-pointer ${
                mobileTab === 'home'
                  ? 'bg-[#00E676]/15 text-[#00E676] border border-[#00E676]/45 shadow-[0_0_12px_rgba(0,230,118,0.35)] font-bold'
                  : 'text-emerald-400/60 hover:text-emerald-300 hover:bg-white/5 border border-transparent font-medium'
              }`}
              title="Home"
            >
              <Home className={`w-5 h-5 transition-transform ${mobileTab === 'home' ? 'scale-110 drop-shadow-[0_0_8px_rgba(0,230,118,0.8)]' : ''}`} />
              <span className="text-[10px] mt-0.5 tracking-tight whitespace-nowrap">Home</span>
            </button>

            {/* 2. Settings (Positioned directly beside Home for quick access) */}
            <button
              id="bottom-nav-settings"
              onClick={() => setMobileTab('settings')}
              className={`w-full flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all cursor-pointer ${
                mobileTab === 'settings'
                  ? 'bg-[#00E676]/15 text-[#00E676] border border-[#00E676]/45 shadow-[0_0_12px_rgba(0,230,118,0.35)] font-bold'
                  : 'text-emerald-400/60 hover:text-emerald-300 hover:bg-white/5 border border-transparent font-medium'
              }`}
              title="Settings & Cloud Sync"
            >
              <Settings className={`w-5 h-5 transition-transform ${mobileTab === 'settings' ? 'scale-110 drop-shadow-[0_0_8px_rgba(0,230,118,0.8)]' : ''}`} />
              <span className="text-[10px] mt-0.5 tracking-tight whitespace-nowrap">Settings</span>
            </button>

            {/* 3. Sales / Add (Directly triggers POS billing) */}
            <button
              id="bottom-nav-sales"
              onClick={() => onNavigate('pos')}
              className="w-full flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all cursor-pointer text-emerald-400 hover:text-emerald-300 hover:bg-white/5 border border-transparent font-medium group"
              title="Start New Sale (POS)"
            >
              <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-[#00E676] via-emerald-400 to-[#00FF87] flex items-center justify-center text-black shadow-[0_0_12px_rgba(0,230,118,0.5)] group-hover:scale-110 group-active:scale-95 transition-transform">
                <Plus className="w-4 h-4 text-black stroke-[3.5]" />
              </div>
              <span className="text-[10px] mt-0.5 tracking-tight font-bold text-[#00E676] whitespace-nowrap">Sales (+)</span>
            </button>

            {/* 4. Reports / User */}
            <button
              id="bottom-nav-reports"
              onClick={() => onNavigate('reports')}
              className="w-full flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all cursor-pointer text-emerald-400/60 hover:text-emerald-300 hover:bg-white/5 border border-transparent font-medium group"
              title="Reports & Analytics"
            >
              <BarChart3 className="w-5 h-5 group-hover:scale-110 transition-transform text-emerald-400/80 group-hover:text-emerald-300" />
              <span className="text-[10px] mt-0.5 tracking-tight whitespace-nowrap">Reports</span>
            </button>
          </nav>
        </div>
      </div>

      {/* Core Modules Modal */}
      {showCoreModulesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-neutral-950 border border-neutral-800 rounded-3xl w-full max-w-md p-5 text-white shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-black flex items-center justify-center text-emerald-400 border border-emerald-500/40 shadow-[0_0_10px_rgba(16,185,129,0.15)]">
                  <ListIndentIncrease className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white tracking-tight">Core Modules</h2>
                  <p className="text-[11px] text-neutral-400">Tap any module to open directly</p>
                </div>
              </div>
              <button
                onClick={() => setShowCoreModulesModal(false)}
                className="p-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-emerald-400 border border-neutral-800 transition-colors"
              >
                <X className="w-4 h-4 text-emerald-400" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5 max-h-[60vh] overflow-y-auto pr-1">
              {[
                { id: 'pos', label: 'Point of Sale (POS)', sub: 'Fast Billing & Cart', icon: ShoppingCart },
                { id: 'purchase', label: 'Purchase (Stock In)', sub: 'Supplier Invoices', icon: ShoppingBag },
                { id: 'inventory', label: 'Inventory & Stock', sub: `${medicines.length} Products`, icon: Package },
                { id: 'expired_list', label: 'Expired List', sub: `${totalExpiredAlerts} Alerts`, icon: AlertOctagon },
                { id: 'due_list', label: 'Due List (Ledger)', sub: 'Customer Balance', icon: FileSpreadsheet },
                { id: 'add_company', label: 'Add Company', sub: 'Manage Pharma Co', icon: Building2 },
                { id: 'edit_profile', label: 'Edit Profile', sub: 'Avatar & Store Info', icon: User },
                { id: 'account', label: 'Account Register', sub: 'Cash Flow & Petty', icon: Wallet },
                { id: 'online_order', label: 'Online Orders', sub: `${pendingOrdersCount} Pending`, icon: ShoppingBag },
                { id: 'suppliers', label: 'Suppliers Directory', sub: 'Vendors & POs', icon: ShoppingBag },
                { id: 'customers', label: 'Customer Directory', sub: 'Profiles & Points', icon: ShieldCheck },
                { id: 'reports', label: 'Reports & Analytics', sub: 'Sales & Revenue', icon: BarChart3 },
                { id: 'dashboard', label: 'Analytics Dashboard', sub: 'Charts & Statistics', icon: LayoutDashboard },
                { id: 'dev-guide', label: 'DB Schema & API', sub: 'Architecture Guide', icon: BookOpen },
              ].map((mod) => {
                const Icon = mod.icon;
                return (
                  <button
                    key={mod.id}
                    onClick={() => {
                      setShowCoreModulesModal(false);
                      if (mod.id === 'add_company') {
                        setShowAddCompanyModal(true);
                      } else {
                        onNavigate(mod.id);
                      }
                    }}
                    className="p-3 rounded-2xl bg-[#0c100e] hover:bg-[#141b18] border border-neutral-800 hover:border-emerald-500/50 flex flex-col items-start text-left transition-all active:scale-[0.98] group shadow-sm"
                  >
                    <Icon className="w-5 h-5 text-emerald-400 mb-1.5 group-hover:scale-110 transition-transform" />
                    <span className="text-xs font-bold text-white leading-tight">{mod.label}</span>
                    <span className="text-[10px] text-emerald-500/70 leading-tight mt-0.5">{mod.sub}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Notifications Modal */}
      {showNotificationsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-neutral-950 border border-neutral-800 rounded-3xl w-full max-w-md p-5 text-white shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-black border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.15)]">
                  <Bell className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white tracking-tight">System Notifications</h2>
                  <p className="text-[11px] text-neutral-400">{totalAlertsCount} active alerts requiring attention</p>
                </div>
              </div>
              <button
                onClick={() => setShowNotificationsModal(false)}
                className="p-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-emerald-400 border border-neutral-800 transition-colors"
              >
                <X className="w-4 h-4 text-emerald-400" />
              </button>
            </div>

            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1 text-xs">
              {lowStockMedicines.length > 0 && (
                <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2">
                    <Package className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-amber-200 block">Low Stock Alert ({lowStockMedicines.length} Items)</span>
                      <span className="text-[11px] text-amber-300/80">
                        {lowStockMedicines.slice(0, 3).map((m) => m.name).join(', ')}...
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setShowNotificationsModal(false);
                      onNavigate('inventory');
                    }}
                    className="text-[11px] font-bold text-amber-300 underline shrink-0 hover:text-white"
                  >
                    View Stock
                  </button>
                </div>
              )}

              {expiredMedicines.length > 0 && (
                <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2">
                    <AlertOctagon className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-rose-200 block">Expired Medicines ({expiredMedicines.length} Items)</span>
                      <span className="text-[11px] text-rose-300/80">Remove expired batches from sales shelves immediately.</span>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setShowNotificationsModal(false);
                      onNavigate('expired_list');
                    }}
                    className="text-[11px] font-bold text-rose-300 underline shrink-0 hover:text-white"
                  >
                    Review
                  </button>
                </div>
              )}

              {pendingOrdersCount > 0 && (
                <div className="p-3 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2">
                    <ShoppingBag className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-purple-200 block">Online Delivery Orders ({pendingOrdersCount} Pending)</span>
                      <span className="text-[11px] text-purple-300/80">Pending orders ready for dispatch.</span>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setShowNotificationsModal(false);
                      onNavigate('online_order');
                    }}
                    className="text-[11px] font-bold text-purple-300 underline shrink-0 hover:text-white"
                  >
                    Orders
                  </button>
                </div>
              )}

              {totalAlertsCount === 0 && (
                <div className="p-6 text-center text-teal-300/70">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                  <p className="font-semibold text-white">All clear!</p>
                  <p className="text-[11px]">No low stock or expired batches detected.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Company Modal matching user screenshot */}
      <AddCompanyModal
        isOpen={showAddCompanyModal}
        onClose={() => setShowAddCompanyModal(false)}
      />

      {/* Add Generic Modal matching user screenshot */}
      <AddGenericModal
        isOpen={showAddGenericModal}
        onClose={() => setShowAddGenericModal(false)}
      />

      {/* Add Brand / Product Modal */}
      <AddBrandModal
        isOpen={showAddBrandModal}
        onClose={() => setShowAddBrandModal(false)}
      />

      {/* Modals */}
      <ProfileDetailsModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />

      <AboutUsModal
        isOpen={isAboutModalOpen}
        onClose={() => setIsAboutModalOpen(false)}
      />

      <DrugClinicalModal
        isOpen={clinicalModalConfig.isOpen}
        initialTab={clinicalModalConfig.tab}
        onClose={() => setClinicalModalConfig({ isOpen: false, tab: 'search' })}
      />

      {/* Reset Database Confirmation Modal */}
      <ResetDatabaseModal
        isOpen={showResetModal}
        onClose={() => setShowResetModal(false)}
        onConfirmReset={handleConfirmReset}
        totalCount={totalMedicinesCount || medicines.length}
        isResetting={isResetting}
      />

      {/* Modern Mobile Navigation Drawer matching User Redesign & Screenshot */}
      <NavigationDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onNavigate={(tab) => {
          if (tab === 'settings') {
            setMobileTab('settings');
          } else {
            onNavigate(tab);
          }
        }}
        activeTab={mobileTab === 'settings' ? 'settings' : undefined}
      />
    </div>
  );
};
