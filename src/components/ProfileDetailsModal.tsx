import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Building2,
  Phone,
  MapPin,
  ShieldCheck,
  GraduationCap,
  FileBadge,
  Camera,
  Upload,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Edit3,
  Eye,
  Sparkles,
  RefreshCw,
  User as UserIcon,
  Check,
} from 'lucide-react';
import { usePharmacy } from '../context/PharmacyContext';
import { useAuth } from '../context/AuthContext';
import { UserProfile } from '../types';

interface ProfileDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'view' | 'edit';
}

const PRESET_SHOP_LOGOS = [
  {
    id: 'siam_3d',
    label: '3D Avatar (Siam)',
    url: '/src/assets/images/profile_avatar_3d_1789066596560.jpg',
  },
  {
    id: 'rx_green',
    label: 'Clinical Green',
    url: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=300&auto=format&fit=crop&q=80',
  },
  {
    id: 'pharma_female',
    label: 'Pharmacist Chemist',
    url: 'https://images.unsplash.com/photo-1594824813739-c5c4e7ec89f0?w=300&auto=format&fit=crop&q=80',
  },
  {
    id: 'store_emblem',
    label: 'Executive Director',
    url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
  },
];

export const ProfileDetailsModal: React.FC<ProfileDetailsModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'view',
}) => {
  const { userProfile, updateUserProfile } = usePharmacy();
  const { user } = useAuth();

  const [mode, setMode] = useState<'view' | 'edit'>(initialMode);
  const [isSaving, setIsSaving] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form input states initialized from userProfile or default dummy values
  const [businessName, setBusinessName] = useState(userProfile?.businessName || 'Siam Pharmacy');
  const [qualification, setQualification] = useState(
    userProfile?.qualification || 'B.Pharm, Professional Registered Pharmacist (Reg No: A-19482)'
  );
  const [contactNumber, setContactNumber] = useState(
    userProfile?.phone
      ? userProfile.phone.startsWith('+')
        ? userProfile.phone
        : `+88 ${userProfile.phone}`
      : '+88 01846493071'
  );
  const [address, setAddress] = useState(
    userProfile?.address || (userProfile?.district ? `${userProfile.district}, Bangladesh` : 'Dhaka, Bangladesh')
  );
  const [licenseNumber, setLicenseNumber] = useState(
    userProfile?.licenseNumber || 'DL-DHK-2024-88291'
  );
  const [ownerName, setOwnerName] = useState(
    userProfile?.name || user?.displayName || 'Siam Hasan'
  );
  const [logoUrl, setLogoUrl] = useState(
    userProfile?.shopLogoUrl || userProfile?.avatarUrl || ''
  );
  const [imageTab, setImageTab] = useState<'upload' | 'url' | 'presets'>('upload');
  const [customUrlInput, setCustomUrlInput] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Synchronize modal state when userProfile loads or changes
  useEffect(() => {
    if (isOpen && userProfile) {
      setBusinessName(userProfile.businessName || 'Siam Pharmacy');
      setQualification(
        userProfile.qualification ||
          'B.Pharm, Professional Registered Pharmacist (Reg No: A-19482)'
      );
      setContactNumber(
        userProfile.phone
          ? userProfile.phone.startsWith('+')
            ? userProfile.phone
            : `${userProfile.phoneCountryCode || '+88'} ${userProfile.phone}`
          : '+88 01846493071'
      );
      setAddress(
        userProfile.address ||
          (userProfile.district ? `${userProfile.district}, Bangladesh` : 'Dhaka, Bangladesh')
      );
      setLicenseNumber(userProfile.licenseNumber || 'DL-DHK-2024-88291');
      setOwnerName(userProfile.name || user?.displayName || 'Siam Hasan');
      setLogoUrl(userProfile.shopLogoUrl || userProfile.avatarUrl || '');
      setMode(initialMode);
      setSuccessToast(null);
      setErrorMessage(null);
    }
  }, [isOpen, userProfile, initialMode, user?.displayName]);

  if (!isOpen) return null;

  // Handle local file upload with Base64 encoding
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMessage('Please select a valid image file (PNG, JPG, WEBP).');
      return;
    }

    // Limit image size to 4MB
    if (file.size > 4 * 1024 * 1024) {
      setErrorMessage('Image size is too large (max 4MB). Please choose a smaller image.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setLogoUrl(result);
      setErrorMessage(null);
    };
    reader.onerror = () => {
      setErrorMessage('Failed to read image file.');
    };
    reader.readAsDataURL(file);
  };

  // Handle saving profile changes
  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!businessName.trim()) {
      setErrorMessage('Pharmacy / Business Name cannot be empty.');
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      // Parse clean phone without duplicating country code if already present
      let cleanPhone = contactNumber.trim();
      let phoneCode = '+88';
      if (cleanPhone.startsWith('+880')) {
        cleanPhone = cleanPhone.replace('+880', '').trim();
        phoneCode = '+880';
      } else if (cleanPhone.startsWith('+88')) {
        cleanPhone = cleanPhone.replace('+88', '').trim();
        phoneCode = '+88';
      }

      const updates: Partial<UserProfile> = {
        businessName: businessName.trim(),
        qualification: qualification.trim(),
        licenseNumber: licenseNumber.trim(),
        address: address.trim(),
        phone: cleanPhone || contactNumber.trim(),
        phoneCountryCode: phoneCode,
        name: ownerName.trim() || userProfile?.name || 'Pharmacist',
        shopLogoUrl: logoUrl.trim(),
        avatarUrl: logoUrl.trim() || userProfile?.avatarUrl,
      };

      await updateUserProfile(updates);

      setSuccessToast('Profile details updated and saved successfully!');
      setTimeout(() => {
        setSuccessToast(null);
        setMode('view');
      }, 1200);
    } catch (err: any) {
      console.error('Error updating profile:', err);
      setErrorMessage(err?.message || 'Failed to update profile details.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto animate-fadeIn">
      <div
        id="profile-details-modal-container"
        className="relative w-full max-w-lg bg-[#0c100e] border border-emerald-500/40 rounded-2xl shadow-[0_0_35px_rgba(16,185,129,0.2)] flex flex-col max-h-[92vh] overflow-hidden text-neutral-200"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-neutral-800/80 bg-black/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-950/80 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
                Profile & Business Details
              </h3>
              <p className="text-[11px] text-neutral-400">
                Official pharmacy credentials & contact info
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* View / Edit Mode Switcher */}
            <div className="flex items-center bg-neutral-900 border border-neutral-800 rounded-lg p-0.5 text-xs mr-1">
              <button
                type="button"
                id="btn-switch-mode-view"
                onClick={() => setMode('view')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors flex items-center gap-1 ${
                  mode === 'view'
                    ? 'bg-emerald-500/20 text-emerald-300 font-semibold'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Eye className="w-3 h-3" />
                <span>View</span>
              </button>
              <button
                type="button"
                id="btn-switch-mode-edit"
                onClick={() => setMode('edit')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors flex items-center gap-1 ${
                  mode === 'edit'
                    ? 'bg-emerald-500/20 text-emerald-300 font-semibold'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Edit3 className="w-3 h-3" />
                <span>Edit</span>
              </button>
            </div>

            <button
              type="button"
              id="btn-close-profile-modal"
              onClick={onClose}
              className="w-7 h-7 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800/60 flex items-center justify-center transition-colors"
              title="Close modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Status Messages */}
        {successToast && (
          <div className="mx-4 mt-3 p-2.5 rounded-xl bg-emerald-950/80 border border-emerald-500/50 flex items-center gap-2 text-xs text-emerald-300 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successToast}</span>
          </div>
        )}

        {errorMessage && (
          <div className="mx-4 mt-3 p-2.5 rounded-xl bg-rose-950/80 border border-rose-500/50 flex items-center gap-2 text-xs text-rose-300 animate-fadeIn">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1">
          {mode === 'view' ? (
            /* VIEW MODE: High-fidelity Pharmacy Credential Card */
            <div className="space-y-4">
              {/* Header Preview Banner (Exact replica of top dashboard card) */}
              <div className="relative overflow-hidden rounded-2xl bg-[#070b09] border border-emerald-500/40 p-4 shadow-[0_0_20px_rgba(16,185,129,0.15)] group">
                <div className="absolute -top-12 -right-12 w-36 h-36 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
                <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />

                <div className="relative flex items-center gap-3.5">
                  {/* Shop Logo / Avatar */}
                  <div className="w-16 h-16 rounded-2xl bg-black border border-emerald-500/50 flex items-center justify-center shrink-0 relative overflow-hidden shadow-[0_0_15px_rgba(16,185,129,0.25)]">
                    {logoUrl ? (
                      <img
                        src={logoUrl}
                        alt={businessName}
                        className="w-full h-full object-cover rounded-2xl"
                        onError={(e) => {
                          (e.currentTarget as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <Building2 className="w-8 h-8 text-emerald-400" />
                    )}
                    <span className="absolute bottom-1 right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-black flex items-center justify-center">
                      <span className="w-1 h-1 rounded-full bg-white animate-pulse" />
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1.5 mb-1">
                      <span className="text-[10px] font-mono font-bold tracking-wider text-emerald-400 uppercase bg-emerald-950/90 px-2 py-0.5 rounded-md border border-emerald-800/80 truncate">
                        License No: {licenseNumber}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[10px] text-cyan-400 font-semibold shrink-0">
                        <ShieldCheck className="w-3 h-3 text-cyan-400" />
                        Govt. Registered
                      </span>
                    </div>

                    <h2 className="text-lg font-black tracking-tight text-white truncate">
                      {businessName}
                    </h2>

                    <p className="text-xs text-neutral-300 font-medium flex items-center gap-1.5 mt-0.5 truncate">
                      <Phone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>Contact Number: {contactNumber}</span>
                    </p>
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-neutral-800/80 flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-1.5 text-neutral-300 truncate">
                    <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span className="truncate">License Address: {address}</span>
                  </div>
                  <span className="text-[10px] text-emerald-400 font-semibold px-2 py-0.5 bg-emerald-950/60 rounded border border-emerald-800/50">
                    Verified
                  </span>
                </div>
              </div>

              {/* Detailed Credential Blocks */}
              <div className="grid grid-cols-1 gap-2.5">
                {/* Pharmacist & Qualification */}
                <div className="p-3 rounded-xl bg-neutral-900/70 border border-neutral-800/90 flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-950/60 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
                    <GraduationCap className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-[11px] uppercase tracking-wider text-neutral-400 font-bold block">
                      Education & Registered Qualification
                    </span>
                    <p className="text-sm font-semibold text-white mt-0.5">
                      {qualification}
                    </p>
                    <p className="text-xs text-neutral-400 mt-0.5">
                      Licensed In-Charge: <span className="text-emerald-300 font-medium">{ownerName}</span>
                    </p>
                  </div>
                </div>

                {/* Business & Drug License */}
                <div className="p-3 rounded-xl bg-neutral-900/70 border border-neutral-800/90 flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-cyan-950/60 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0 mt-0.5">
                    <FileBadge className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-[11px] uppercase tracking-wider text-neutral-400 font-bold block">
                      Official Drug License Reference
                    </span>
                    <p className="text-sm font-mono font-bold text-cyan-300 mt-0.5">
                      {licenseNumber}
                    </p>
                    <p className="text-xs text-neutral-400 mt-0.5">
                      Directorate General of Drug Administration (DGDA) Validated
                    </p>
                  </div>
                </div>

                {/* Contact & Dispatch Address */}
                <div className="p-3 rounded-xl bg-neutral-900/70 border border-neutral-800/90 flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-950/60 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-[11px] uppercase tracking-wider text-neutral-400 font-bold block">
                      Pharmacy Store Address & Dispatch
                    </span>
                    <p className="text-sm font-medium text-white mt-0.5">
                      {address}
                    </p>
                    <p className="text-xs text-neutral-400 mt-0.5 flex items-center gap-1.5">
                      <Phone className="w-3 h-3 text-emerald-400 inline" />
                      Direct Line: {contactNumber}
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons in View Mode */}
              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  id="btn-edit-profile-from-view"
                  onClick={() => setMode('edit')}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] font-bold text-white text-xs sm:text-sm flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all"
                >
                  <Edit3 className="w-4 h-4" />
                  <span>Edit Profile Details</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="py-2.5 px-4 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white font-medium text-xs sm:text-sm border border-neutral-800 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          ) : (
            /* EDIT MODE: Dynamic Form for Business & Profile Details */
            <form onSubmit={handleSave} className="space-y-4">
              {/* 1. Shop Logo / Profile Picture Section */}
              <div className="p-3.5 rounded-2xl bg-black/40 border border-neutral-800/90 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Pharmacy Logo / Profile Picture</span>
                  </label>
                  <span className="text-[10px] text-neutral-400">File upload or URL</span>
                </div>

                <div className="flex items-center gap-3.5">
                  {/* Avatar Preview */}
                  <div className="relative w-16 h-16 rounded-2xl bg-neutral-900 border border-emerald-500/40 flex items-center justify-center overflow-hidden shrink-0 shadow-md">
                    {logoUrl ? (
                      <img
                        src={logoUrl}
                        alt="Preview"
                        className="w-full h-full object-cover"
                        onError={() => setErrorMessage('Could not load image from URL.')}
                      />
                    ) : (
                      <Building2 className="w-7 h-7 text-emerald-400" />
                    )}
                  </div>

                  <div className="flex-1 space-y-2">
                    {/* Method Selector Tabs */}
                    <div className="flex rounded-lg bg-neutral-900 p-0.5 border border-neutral-800 text-[11px]">
                      <button
                        type="button"
                        onClick={() => setImageTab('upload')}
                        className={`flex-1 py-1 rounded-md font-semibold transition-colors flex items-center justify-center gap-1 ${
                          imageTab === 'upload'
                            ? 'bg-emerald-900/60 text-emerald-300'
                            : 'text-neutral-400 hover:text-white'
                        }`}
                      >
                        <Upload className="w-3 h-3" />
                        <span>Upload File</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setImageTab('url')}
                        className={`flex-1 py-1 rounded-md font-semibold transition-colors flex items-center justify-center gap-1 ${
                          imageTab === 'url'
                            ? 'bg-emerald-900/60 text-emerald-300'
                            : 'text-neutral-400 hover:text-white'
                        }`}
                      >
                        <span>Image URL</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setImageTab('presets')}
                        className={`flex-1 py-1 rounded-md font-semibold transition-colors flex items-center justify-center gap-1 ${
                          imageTab === 'presets'
                            ? 'bg-emerald-900/60 text-emerald-300'
                            : 'text-neutral-400 hover:text-white'
                        }`}
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>Presets</span>
                      </button>
                    </div>

                    {/* Sub-panels based on selected method */}
                    {imageTab === 'upload' && (
                      <div>
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handleFileUpload}
                          accept="image/png,image/jpeg,image/webp,image/jpg"
                          className="hidden"
                        />
                        <button
                          type="button"
                          id="btn-upload-logo-file"
                          onClick={() => fileInputRef.current?.click()}
                          className="w-full py-1.5 px-3 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-xs font-semibold text-neutral-200 flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <Upload className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Choose Image from Device</span>
                        </button>
                      </div>
                    )}

                    {imageTab === 'url' && (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="url"
                          value={customUrlInput}
                          onChange={(e) => setCustomUrlInput(e.target.value)}
                          placeholder="https://example.com/logo.png"
                          className="flex-1 bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (customUrlInput.trim()) {
                              setLogoUrl(customUrlInput.trim());
                              setCustomUrlInput('');
                            }
                          }}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white transition-colors shrink-0"
                        >
                          Apply
                        </button>
                      </div>
                    )}

                    {imageTab === 'presets' && (
                      <div className="grid grid-cols-4 gap-1.5 pt-0.5">
                        {PRESET_SHOP_LOGOS.map((preset) => (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() => setLogoUrl(preset.url)}
                            className={`p-1 rounded-lg border transition-all text-center group ${
                              logoUrl === preset.url
                                ? 'border-emerald-400 bg-emerald-950/60 shadow-[0_0_8px_rgba(16,185,129,0.3)]'
                                : 'border-neutral-800 bg-neutral-900 hover:border-neutral-700'
                            }`}
                            title={preset.label}
                          >
                            <img
                              src={preset.url}
                              alt={preset.label}
                              className="w-7 h-7 rounded-md object-cover mx-auto"
                            />
                            <span className="text-[9px] text-neutral-400 block truncate mt-0.5">
                              {preset.label.split(' ')[0]}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 2. Pharmacy / Business Name */}
              <div className="space-y-1">
                <label
                  htmlFor="input-profile-business-name"
                  className="block text-xs font-bold text-emerald-300 uppercase tracking-wider"
                >
                  Pharmacy / Business Name <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-emerald-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="input-profile-business-name"
                    type="text"
                    required
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="e.g. Siam Pharmacy"
                    className="w-full pl-9 pr-3 py-2 bg-black/60 border border-neutral-800 rounded-xl text-xs sm:text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-400 transition-colors"
                  />
                </div>
              </div>

              {/* 3. Education / Qualification */}
              <div className="space-y-1">
                <label
                  htmlFor="input-profile-qualification"
                  className="block text-xs font-bold text-emerald-300 uppercase tracking-wider"
                >
                  Education / Qualification
                </label>
                <div className="relative">
                  <GraduationCap className="w-4 h-4 text-emerald-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="input-profile-qualification"
                    type="text"
                    value={qualification}
                    onChange={(e) => setQualification(e.target.value)}
                    placeholder="e.g. B.Pharm, Pharmacist Registration No: A-19482"
                    className="w-full pl-9 pr-3 py-2 bg-black/60 border border-neutral-800 rounded-xl text-xs sm:text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-400 transition-colors"
                  />
                </div>
              </div>

              {/* 4. Contact Number & License Number */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label
                    htmlFor="input-profile-contact-number"
                    className="block text-xs font-bold text-emerald-300 uppercase tracking-wider"
                  >
                    Contact Number
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-emerald-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      id="input-profile-contact-number"
                      type="text"
                      value={contactNumber}
                      onChange={(e) => setContactNumber(e.target.value)}
                      placeholder="+88 01846493071"
                      className="w-full pl-9 pr-3 py-2 bg-black/60 border border-neutral-800 rounded-xl text-xs sm:text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-400 transition-colors"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label
                    htmlFor="input-profile-license-number"
                    className="block text-xs font-bold text-emerald-300 uppercase tracking-wider"
                  >
                    Drug License Number
                  </label>
                  <div className="relative">
                    <FileBadge className="w-4 h-4 text-emerald-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      id="input-profile-license-number"
                      type="text"
                      value={licenseNumber}
                      onChange={(e) => setLicenseNumber(e.target.value)}
                      placeholder="e.g. DL-DHK-2024-88291"
                      className="w-full pl-9 pr-3 py-2 bg-black/60 border border-neutral-800 rounded-xl text-xs sm:text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-400 font-mono transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* 5. Address */}
              <div className="space-y-1">
                <label
                  htmlFor="input-profile-address"
                  className="block text-xs font-bold text-emerald-300 uppercase tracking-wider"
                >
                  Pharmacy / Shop Address
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-emerald-400 absolute left-3 top-3" />
                  <textarea
                    id="input-profile-address"
                    rows={2}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="e.g. Dhaka, Bangladesh"
                    className="w-full pl-9 pr-3 py-2 bg-black/60 border border-neutral-800 rounded-xl text-xs sm:text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-400 transition-colors resize-none"
                  />
                </div>
              </div>

              {/* 6. Pharmacist In-Charge Name */}
              <div className="space-y-1">
                <label
                  htmlFor="input-profile-owner-name"
                  className="block text-xs font-bold text-neutral-400 uppercase tracking-wider"
                >
                  Licensed In-Charge / Pharmacist Name
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="input-profile-owner-name"
                    type="text"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    placeholder="Pharmacist Full Name"
                    className="w-full pl-9 pr-3 py-2 bg-black/60 border border-neutral-800 rounded-xl text-xs sm:text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-600 transition-colors"
                  />
                </div>
              </div>

              {/* Form Action Buttons */}
              <div className="pt-2 flex items-center gap-2">
                <button
                  type="submit"
                  id="btn-save-profile-details"
                  disabled={isSaving}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] font-bold text-white text-xs sm:text-sm flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.3)] disabled:opacity-50 transition-all cursor-pointer"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving to Storage...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Save & Apply Details</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  id="btn-cancel-profile-edit"
                  onClick={() => setMode('view')}
                  className="py-2.5 px-4 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white font-medium text-xs sm:text-sm border border-neutral-800 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
