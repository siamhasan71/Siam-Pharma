import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { usePharmacy } from '../context/PharmacyContext';
import {
  ArrowLeft,
  Eye,
  EyeOff,
  Calendar,
  Camera,
  Upload,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  LogOut,
  ShieldCheck,
  User as UserIcon,
  Mail,
  Phone,
  Lock,
  Globe,
  MapPin,
  Building,
} from 'lucide-react';
import {
  fetchUserProfileFromBackend,
  saveUserProfileToBackend,
} from '../services/userProfileService';
import { UserProfile } from '../types';

interface EditProfileViewProps {
  onBack: () => void;
}

const PRESET_AVATARS = [
  { id: '3d_beard', label: '3D Portrait (Siam)', url: '/src/assets/images/profile_avatar_3d_1789066596560.jpg' },
  { id: 'pharmacist_male', label: 'Doctor / Pharmacist', url: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=300&auto=format&fit=crop&q=80' },
  { id: 'pharmacist_female', label: 'Clinical Chemist', url: 'https://images.unsplash.com/photo-1594824813739-c5c4e7ec89f0?w=300&auto=format&fit=crop&q=80' },
  { id: 'executive', label: 'Store Director', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80' },
];

const INITIAL_FORM_STATE = {
  name: '',
  email: '',
  phoneCountryCode: '+880',
  phone: '',
  password: '••••••••',
  dateOfBirth: '',
  country: 'BD',
  district: '',
  thana: '',
  postOffice: '',
  village: '',
  avatarUrl: '',
  businessName: 'Siam Pharmacy',
  qualification: 'B.Pharm, Professional Registered Pharmacist (Reg No: A-19482)',
  licenseNumber: 'DL-DHK-2024-88291',
  address: 'Dhaka, Bangladesh',
};

export const EditProfileView: React.FC<EditProfileViewProps> = ({ onBack }) => {
  const { user, logout } = useAuth();
  const { updateUserProfile } = usePharmacy();

  // Dynamic Form State bound to active user
  const [formData, setFormData] = useState(INITIAL_FORM_STATE);

  // Status & UI States
  const [isLoadingProfile, setIsLoadingProfile] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const [showPassword, setShowPassword] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dateInputRef = useRef<HTMLInputElement>(null);

  // Automatically fetch profile details of currently authenticated user on mount / account switch
  useEffect(() => {
    if (!user || !user.uid) {
      // Clear all state when logged out or when user is null
      setFormData(INITIAL_FORM_STATE);
      setIsLoadingProfile(false);
      return;
    }

    let isSubscribed = true;
    setIsLoadingProfile(true);
    setErrorMessage(null);

    // Dynamic API call to fetch user profile from Firebase Firestore / Backend
    fetchUserProfileFromBackend(user.uid, user)
      .then((profileData: UserProfile) => {
        if (isSubscribed) {
          setFormData({
            name: profileData.name || '',
            email: profileData.email || user.email || '',
            phoneCountryCode: profileData.phoneCountryCode || '+880',
            phone: profileData.phone || '',
            password: profileData.password || '••••••••',
            dateOfBirth: profileData.dateOfBirth || '',
            country: profileData.country || 'BD',
            district: profileData.district || '',
            thana: profileData.thana || '',
            postOffice: profileData.postOffice || '',
            village: profileData.village || '',
            avatarUrl: profileData.avatarUrl || '',
            businessName: profileData.businessName || 'Siam Pharmacy',
            qualification: profileData.qualification || 'B.Pharm, Professional Registered Pharmacist (Reg No: A-19482)',
            licenseNumber: profileData.licenseNumber || 'DL-DHK-2024-88291',
            address: profileData.address || 'Dhaka, Bangladesh',
          });
          setIsLoadingProfile(false);
        }
      })
      .catch((err: any) => {
        console.error('Error fetching dynamic user profile:', err);
        if (isSubscribed) {
          setErrorMessage(err?.message || 'Failed to fetch user profile from backend database.');
          setIsLoadingProfile(false);
        }
      });

    return () => {
      isSubscribed = false;
    };
  }, [user?.uid]);

  // Re-fetch helper for manual sync button
  const handleManualSync = async () => {
    if (!user?.uid) return;
    setIsLoadingProfile(true);
    setErrorMessage(null);
    try {
      const freshData = await fetchUserProfileFromBackend(user.uid, user);
      setFormData({
        name: freshData.name || '',
        email: freshData.email || user.email || '',
        phoneCountryCode: freshData.phoneCountryCode || '+880',
        phone: freshData.phone || '',
        password: freshData.password || '••••••••',
        dateOfBirth: freshData.dateOfBirth || '',
        country: freshData.country || 'BD',
        district: freshData.district || '',
        thana: freshData.thana || '',
        postOffice: freshData.postOffice || '',
        village: freshData.village || '',
        avatarUrl: freshData.avatarUrl || '',
        businessName: freshData.businessName || 'Siam Pharmacy',
        qualification: freshData.qualification || 'B.Pharm, Professional Registered Pharmacist (Reg No: A-19482)',
        licenseNumber: freshData.licenseNumber || 'DL-DHK-2024-88291',
        address: freshData.address || 'Dhaka, Bangladesh',
      });
      setSuccessToast('Profile synchronized with database!');
      setTimeout(() => setSuccessToast(null), 2500);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to sync latest profile data.');
    } finally {
      setIsLoadingProfile(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setFormData((prev) => ({ ...prev, avatarUrl: result }));
        setShowAvatarModal(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !user.uid) {
      setErrorMessage('No active user session. Please log in.');
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      // 1. Persist to Firestore database / RTDB / Firebase Auth
      const updatedProfile = await saveUserProfileToBackend(user.uid, formData);

      // 2. Update global application context
      updateUserProfile(updatedProfile);

      setSuccessToast('Profile changes saved to cloud database successfully!');
      setTimeout(() => {
        setSuccessToast(null);
      }, 3000);
    } catch (err: any) {
      console.error('Failed to save profile changes:', err);
      setErrorMessage(err?.message || 'Failed to save changes to database. Please check your connection.');
    } finally {
      setIsSaving(false);
    }
  };

  // If unauthenticated / logged out state
  if (!user) {
    return (
      <div className="min-h-screen bg-[#0e2724] text-white flex flex-col items-center justify-center p-4">
        <div className="bg-[#133531] border border-[#23534d] p-6 rounded-2xl max-w-sm w-full text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-teal-500/20 text-teal-300 flex items-center justify-center mx-auto">
            <UserIcon className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-white">No Active User Session</h2>
          <p className="text-xs text-teal-200/80 leading-relaxed">
            Please log in with your pharmacy account to access and edit your personalized profile details.
          </p>
          <button
            onClick={onBack}
            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md"
          >
            Return to Login / Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0e2724] text-white flex flex-col items-center select-none pb-12">
      {/* Phone container matching exact screenshots */}
      <div className="w-full max-w-md bg-[#133531] min-h-screen flex flex-col shadow-2xl border-x border-[#23534d]/60 relative">
        
        {/* Toast Notification */}
        {successToast && (
          <div className="fixed top-4 z-50 left-1/2 -translate-x-1/2 bg-emerald-700 text-white px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-2 border border-emerald-400 text-xs font-bold animate-in fade-in slide-in-from-top-4">
            <CheckCircle2 className="w-4 h-4 text-emerald-200 shrink-0" />
            <span>{successToast}</span>
          </div>
        )}

        {/* Error Notification */}
        {errorMessage && (
          <div className="fixed top-4 z-50 left-1/2 -translate-x-1/2 bg-rose-900/90 text-white px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-2 border border-rose-400 text-xs font-medium animate-in fade-in slide-in-from-top-4">
            <AlertCircle className="w-4 h-4 text-rose-300 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Top Header Bar */}
        <header className="px-4 pt-5 pb-3 flex items-center justify-between sticky top-0 bg-[#133531] z-20 border-b border-[#1b443e]/50 backdrop-blur-xs">
          <button
            id="edit-profile-back-btn"
            onClick={onBack}
            className="w-10 h-10 rounded-xl bg-[#1b443e] hover:bg-[#235650] border border-[#275c55] flex items-center justify-center text-teal-200 transition-colors shadow-xs active:scale-95"
            title="Back"
          >
            <ArrowLeft className="w-5 h-5 stroke-[2.2]" />
          </button>

          <div className="text-center">
            <h1 className="text-base font-bold text-white tracking-wide">
              Edit Profile
            </h1>
            <p className="text-[10px] text-teal-300/80 font-medium">
              Dynamic User Session
            </p>
          </div>

          <div className="flex items-center gap-1">
            <button
              id="profile-refresh-btn"
              onClick={handleManualSync}
              disabled={isLoadingProfile}
              className="w-10 h-10 rounded-xl bg-[#1b443e] hover:bg-[#235650] border border-[#275c55] flex items-center justify-center text-teal-200 transition-colors shadow-xs active:scale-95 disabled:opacity-50"
              title="Sync profile from database"
            >
              <RefreshCw className={`w-4 h-4 ${isLoadingProfile ? 'animate-spin text-emerald-400' : ''}`} />
            </button>
            <button
              id="profile-logout-btn"
              onClick={() => {
                if (window.confirm('Log out from this account? Current profile state will clear.')) {
                  logout();
                  onBack();
                }
              }}
              className="w-10 h-10 rounded-xl bg-red-900/30 hover:bg-red-800/50 border border-red-700/40 flex items-center justify-center text-red-300 transition-colors shadow-xs active:scale-95"
              title="Log Out / Switch Account"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Dynamic Authenticated Session Banner */}
        <div className="mx-4 mt-3 p-3 bg-[#0d2724] border border-[#21514a] rounded-2xl flex items-center justify-between text-xs text-teal-200/90 shadow-inner">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-300 shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-white text-xs truncate">
                  {user.email || 'Authenticated User'}
                </span>
                <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 font-bold text-[9px] uppercase tracking-wider">
                  {user.role || 'Pharmacist'}
                </span>
              </div>
              <p className="text-[10px] text-teal-400/70 truncate">
                UID: {user.uid} • Firestore Synced
              </p>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <main className="flex-1 px-4 py-4 overflow-y-auto">
          {isLoadingProfile ? (
            /* Loading Skeleton */
            <div className="py-12 flex flex-col items-center justify-center space-y-4">
              <div className="w-20 h-20 rounded-full bg-[#1b443e] animate-pulse flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-teal-300 animate-spin" />
              </div>
              <div className="text-center space-y-1">
                <p className="text-sm font-semibold text-white">Loading profile data...</p>
                <p className="text-xs text-teal-300/70">Connecting to cloud database for {user.email}</p>
              </div>
            </div>
          ) : (
            <>
              {/* Profile Avatar Card with Circular Framing matching screenshot */}
              <div className="flex flex-col items-center justify-center pt-2 pb-5">
                <div className="relative group">
                  {/* Circular Avatar Container with border */}
                  <div className="w-28 h-28 rounded-full p-1 bg-[#1a403a] border-2 border-teal-500/30 shadow-xl flex items-center justify-center overflow-hidden">
                    {formData.avatarUrl ? (
                      <img
                        src={formData.avatarUrl}
                        alt={formData.name || 'User Profile'}
                        className="w-full h-full object-cover rounded-full"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-full h-full rounded-full bg-[#1b443e] flex items-center justify-center text-teal-200 text-2xl font-bold">
                        {(formData.name || user.email || 'U').charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>

                  {/* Circular Camera Badge */}
                  <button
                    id="profile-avatar-camera-btn"
                    type="button"
                    onClick={() => setShowAvatarModal(true)}
                    className="absolute bottom-0 right-0 w-9 h-9 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white border-2 border-[#133531] shadow-lg flex items-center justify-center transition-transform hover:scale-105 active:scale-95 cursor-pointer"
                    title="Change Profile Photo"
                  >
                    <Camera className="w-4 h-4 stroke-[2.2]" />
                  </button>
                </div>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept="image/*"
                  className="hidden"
                />

                <div className="text-center mt-3">
                  <h2 className="text-base font-bold text-white tracking-tight">
                    {formData.name || 'No Name Set'}
                  </h2>
                  <p className="text-xs text-teal-300/80 font-medium">
                    {formData.email || user.email}
                  </p>
                </div>
              </div>

              {/* Edit Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                
                {/* 1. Name Field */}
                <div className="space-y-1.5">
                  <label htmlFor="profile-name-input" className="block text-xs font-semibold text-teal-200">
                    Full Name
                  </label>
                  <div className="relative">
                    <input
                      id="profile-name-input"
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      placeholder="Enter your full name"
                      className="w-full px-4 py-3.5 rounded-xl bg-[#0f2c29] border border-[#21514a] text-teal-50 placeholder-teal-600/60 text-sm focus:outline-none focus:border-teal-400 transition-colors shadow-inner"
                    />
                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-teal-500/50">
                      <UserIcon className="w-4 h-4" />
                    </div>
                  </div>
                </div>

                {/* 2. Email Address Field */}
                <div className="space-y-1.5">
                  <label htmlFor="profile-email-input" className="block text-xs font-semibold text-teal-200">
                    Email Address
                  </label>
                  <div className="relative">
                    <input
                      id="profile-email-input"
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      placeholder="user@example.com"
                      className="w-full px-4 py-3.5 rounded-xl bg-[#0f2c29] border border-[#21514a] text-teal-50 placeholder-teal-600/60 text-sm focus:outline-none focus:border-teal-400 transition-colors shadow-inner"
                    />
                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-teal-500/50">
                      <Mail className="w-4 h-4" />
                    </div>
                  </div>
                </div>

                {/* 3. Phone Number Field (with BD Flag / Country Code Prefix) */}
                <div className="space-y-1.5">
                  <label htmlFor="profile-phone-input" className="block text-xs font-semibold text-teal-200">
                    Phone Number
                  </label>
                  <div className="flex items-center gap-2">
                    {/* Country Code Pill */}
                    <div className="flex items-center gap-1 px-3 py-3.5 rounded-xl bg-[#0f2c29] border border-[#21514a] text-teal-100 text-sm shrink-0 shadow-inner">
                      <span className="text-base leading-none">🇧🇩</span>
                      <select
                        value={formData.phoneCountryCode}
                        onChange={(e) => handleInputChange('phoneCountryCode', e.target.value)}
                        className="bg-transparent text-teal-100 text-xs font-semibold focus:outline-none cursor-pointer"
                      >
                        <option value="+880" className="bg-[#0f2c29] text-white">+880</option>
                        <option value="+1" className="bg-[#0f2c29] text-white">+1</option>
                        <option value="+44" className="bg-[#0f2c29] text-white">+44</option>
                        <option value="+91" className="bg-[#0f2c29] text-white">+91</option>
                      </select>
                    </div>

                    {/* Phone Number Input */}
                    <div className="relative flex-1">
                      <input
                        id="profile-phone-input"
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        placeholder="01XXXXXXXXX"
                        className="w-full px-4 py-3.5 rounded-xl bg-[#0f2c29] border border-[#21514a] text-teal-50 placeholder-teal-600/60 text-sm focus:outline-none focus:border-teal-400 transition-colors shadow-inner font-mono tracking-wide"
                      />
                      <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-teal-500/50">
                        <Phone className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 4. Password Field */}
                <div className="space-y-1.5">
                  <label htmlFor="profile-password-input" className="block text-xs font-semibold text-teal-200">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="profile-password-input"
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={(e) => handleInputChange('password', e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-4 py-3.5 pr-12 rounded-xl bg-[#0f2c29] border border-[#21514a] text-teal-50 placeholder-teal-600/60 text-sm focus:outline-none focus:border-teal-400 transition-colors shadow-inner"
                    />
                    <button
                      type="button"
                      id="profile-toggle-password-btn"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-teal-400 hover:text-teal-200 transition-colors"
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* 5. Date of Birth Field */}
                <div className="space-y-1.5">
                  <label htmlFor="profile-dob-input" className="block text-xs font-semibold text-teal-200">
                    Date of Birth
                  </label>
                  <div className="relative">
                    <input
                      id="profile-dob-input"
                      type="date"
                      ref={dateInputRef}
                      value={formData.dateOfBirth}
                      onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                      className="w-full px-4 py-3.5 pr-12 rounded-xl bg-[#0f2c29] border border-[#21514a] text-teal-50 placeholder-teal-600/60 text-sm focus:outline-none focus:border-teal-400 transition-colors shadow-inner"
                    />
                    <button
                      type="button"
                      onClick={() => dateInputRef.current?.showPicker?.()}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-teal-400 hover:text-teal-200 transition-colors"
                      title="Open calendar"
                    >
                      <Calendar className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* 6. Country Field */}
                <div className="space-y-1.5">
                  <label htmlFor="profile-country-input" className="block text-xs font-semibold text-teal-200">
                    Country
                  </label>
                  <div className="relative">
                    <select
                      id="profile-country-input"
                      value={formData.country}
                      onChange={(e) => handleInputChange('country', e.target.value)}
                      className="w-full px-4 py-3.5 rounded-xl bg-[#0f2c29] border border-[#21514a] text-teal-50 text-sm focus:outline-none focus:border-teal-400 transition-colors shadow-inner appearance-none cursor-pointer"
                    >
                      <option value="BD" className="bg-[#0f2c29] text-white">Bangladesh (BD)</option>
                      <option value="US" className="bg-[#0f2c29] text-white">United States (US)</option>
                      <option value="UK" className="bg-[#0f2c29] text-white">United Kingdom (UK)</option>
                      <option value="IN" className="bg-[#0f2c29] text-white">India (IN)</option>
                      <option value="CA" className="bg-[#0f2c29] text-white">Canada (CA)</option>
                    </select>
                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-teal-400">
                      <Globe className="w-4 h-4" />
                    </div>
                  </div>
                </div>

                {/* Address Group Heading */}
                <div className="pt-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-teal-300 uppercase tracking-wider">
                    <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Address & Location Details</span>
                  </div>
                </div>

                {/* 7. District */}
                <div className="space-y-1.5">
                  <label htmlFor="profile-district-input" className="block text-xs font-semibold text-teal-200">
                    District
                  </label>
                  <input
                    id="profile-district-input"
                    type="text"
                    value={formData.district}
                    onChange={(e) => handleInputChange('district', e.target.value)}
                    placeholder="e.g. Dhaka, Chittagong, Sylhet"
                    className="w-full px-4 py-3.5 rounded-xl bg-[#0f2c29] border border-[#21514a] text-teal-50 placeholder-teal-600/60 text-sm focus:outline-none focus:border-teal-400 transition-colors shadow-inner"
                  />
                </div>

                {/* 8. Thana / Upazila */}
                <div className="space-y-1.5">
                  <label htmlFor="profile-thana-input" className="block text-xs font-semibold text-teal-200">
                    Thana / Upazila
                  </label>
                  <input
                    id="profile-thana-input"
                    type="text"
                    value={formData.thana}
                    onChange={(e) => handleInputChange('thana', e.target.value)}
                    placeholder="e.g. Dhanmondi, Mirpur, Gulshan"
                    className="w-full px-4 py-3.5 rounded-xl bg-[#0f2c29] border border-[#21514a] text-teal-50 placeholder-teal-600/60 text-sm focus:outline-none focus:border-teal-400 transition-colors shadow-inner"
                  />
                </div>

                {/* 9. Post Office */}
                <div className="space-y-1.5">
                  <label htmlFor="profile-post-office-input" className="block text-xs font-semibold text-teal-200">
                    Post Office
                  </label>
                  <input
                    id="profile-post-office-input"
                    type="text"
                    value={formData.postOffice}
                    onChange={(e) => handleInputChange('postOffice', e.target.value)}
                    placeholder="e.g. Mohammadpur - 1207"
                    className="w-full px-4 py-3.5 rounded-xl bg-[#0f2c29] border border-[#21514a] text-teal-50 placeholder-teal-600/60 text-sm focus:outline-none focus:border-teal-400 transition-colors shadow-inner"
                  />
                </div>

                {/* 10. Village / Street */}
                <div className="space-y-1.5">
                  <label htmlFor="profile-village-input" className="block text-xs font-semibold text-teal-200">
                    Village / Street Road
                  </label>
                  <input
                    id="profile-village-input"
                    type="text"
                    value={formData.village}
                    onChange={(e) => handleInputChange('village', e.target.value)}
                    placeholder="e.g. Road 12, Block D"
                    className="w-full px-4 py-3.5 rounded-xl bg-[#0f2c29] border border-[#21514a] text-teal-50 placeholder-teal-600/60 text-sm focus:outline-none focus:border-teal-400 transition-colors shadow-inner"
                  />
                </div>

                {/* Section Header: Business & Pharmacy Details */}
                <div className="pt-3 pb-1 border-t border-[#1b443e]">
                  <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Building className="w-4 h-4" />
                    <span>Pharmacy & Business Credentials</span>
                  </h3>
                  <p className="text-[11px] text-teal-300/70 mt-0.5">
                    Official license, education, and store dispatch address
                  </p>
                </div>

                {/* Pharmacy / Business Name */}
                <div className="space-y-1.5">
                  <label htmlFor="profile-business-name-input" className="block text-xs font-semibold text-teal-200">
                    Pharmacy / Business Name
                  </label>
                  <input
                    id="profile-business-name-input"
                    type="text"
                    value={formData.businessName}
                    onChange={(e) => handleInputChange('businessName', e.target.value)}
                    placeholder="e.g. Siam Pharmacy"
                    className="w-full px-4 py-3.5 rounded-xl bg-[#0f2c29] border border-[#21514a] text-teal-50 placeholder-teal-600/60 text-sm focus:outline-none focus:border-teal-400 transition-colors shadow-inner"
                  />
                </div>

                {/* Qualification / Education */}
                <div className="space-y-1.5">
                  <label htmlFor="profile-qualification-input" className="block text-xs font-semibold text-teal-200">
                    Education / Pharmacist Qualification
                  </label>
                  <input
                    id="profile-qualification-input"
                    type="text"
                    value={formData.qualification}
                    onChange={(e) => handleInputChange('qualification', e.target.value)}
                    placeholder="e.g. B.Pharm, Professional Registered Pharmacist"
                    className="w-full px-4 py-3.5 rounded-xl bg-[#0f2c29] border border-[#21514a] text-teal-50 placeholder-teal-600/60 text-sm focus:outline-none focus:border-teal-400 transition-colors shadow-inner"
                  />
                </div>

                {/* License Number */}
                <div className="space-y-1.5">
                  <label htmlFor="profile-license-input" className="block text-xs font-semibold text-teal-200">
                    Govt. Drug License Number
                  </label>
                  <input
                    id="profile-license-input"
                    type="text"
                    value={formData.licenseNumber}
                    onChange={(e) => handleInputChange('licenseNumber', e.target.value)}
                    placeholder="e.g. DL-DHK-2024-88291"
                    className="w-full px-4 py-3.5 rounded-xl bg-[#0f2c29] border border-[#21514a] text-teal-50 placeholder-teal-600/60 text-sm focus:outline-none focus:border-teal-400 transition-colors shadow-inner font-mono"
                  />
                </div>

                {/* Store Address */}
                <div className="space-y-1.5">
                  <label htmlFor="profile-address-input" className="block text-xs font-semibold text-teal-200">
                    Store / License Address
                  </label>
                  <input
                    id="profile-address-input"
                    type="text"
                    value={formData.address}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    placeholder="e.g. Dhaka, Bangladesh"
                    className="w-full px-4 py-3.5 rounded-xl bg-[#0f2c29] border border-[#21514a] text-teal-50 placeholder-teal-600/60 text-sm focus:outline-none focus:border-teal-400 transition-colors shadow-inner"
                  />
                </div>

                {/* Save Changes Button */}
                <div className="pt-4 pb-8">
                  <button
                    id="profile-save-changes-btn"
                    type="submit"
                    disabled={isSaving}
                    className="w-full py-3.5 px-6 rounded-xl bg-[#52897e] hover:bg-[#5f9d90] active:scale-[0.99] text-[#0c2622] font-bold text-base shadow-md transition-all text-center flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Saving to Database...</span>
                      </>
                    ) : (
                      <span>Save Changes</span>
                    )}
                  </button>
                </div>
              </form>
            </>
          )}
        </main>
      </div>

      {/* Choose / Add Icon Avatar Modal */}
      {showAvatarModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-[#143934] border border-[#255e55] rounded-3xl w-full max-w-sm p-5 text-white shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#21514a]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-teal-500/20 flex items-center justify-center text-teal-300 border border-teal-500/30">
                  <Camera className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white tracking-tight">Profile Photo & Avatar</h2>
                  <p className="text-[10px] text-teal-300/70">Upload or choose a character icon</p>
                </div>
              </div>
              <button
                onClick={() => setShowAvatarModal(false)}
                className="text-xs text-teal-300 hover:text-white px-2 py-1 rounded-lg bg-white/5"
              >
                Cancel
              </button>
            </div>

            {/* Quick Upload from Device */}
            <div className="space-y-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors shadow-sm cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                <span>Upload Custom Photo from Device</span>
              </button>
            </div>

            {/* Preset Avatars Selection */}
            <div className="space-y-2 pt-1">
              <span className="text-xs font-semibold text-teal-200">Or Select Avatar Preset:</span>
              <div className="grid grid-cols-2 gap-2.5">
                {PRESET_AVATARS.map((preset) => {
                  const isSelected = formData.avatarUrl === preset.url;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => {
                        setFormData((prev) => ({ ...prev, avatarUrl: preset.url }));
                        setShowAvatarModal(false);
                      }}
                      className={`p-2.5 rounded-2xl border flex flex-col items-center gap-2 text-center transition-all ${
                        isSelected
                          ? 'border-emerald-400 bg-emerald-500/20 ring-2 ring-emerald-400/40'
                          : 'border-[#235850] bg-[#102d29] hover:bg-[#18443e]'
                      }`}
                    >
                      <div className="w-14 h-14 rounded-full overflow-hidden border border-white/20">
                        <img
                          src={preset.url}
                          alt={preset.label}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <span className="text-[11px] font-medium text-teal-100 truncate w-full">
                        {preset.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
