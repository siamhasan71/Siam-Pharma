import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Lock,
  KeyRound,
  Mail,
  Eye,
  EyeOff,
  User,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Loader2,
  Pill,
  ArrowRight,
  Globe,
  UserPlus,
  ArrowLeft,
} from 'lucide-react';

export const LoginScreen: React.FC = () => {
  const { login, signUp, resetPassword, loginDemo } = useAuth();

  // Language state: defaults to 'bn' to fulfill explicit Bangla UI requirements, with 'en' toggle
  const [lang, setLang] = useState<'bn' | 'en'>('bn');

  // Mode: 'login' | 'signup' | 'forgot'
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>('login');

  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Status & Feedback
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Email format validator
  const isValidEmail = (val: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
  };

  const getErrorMessage = (err: any): string => {
    const code = err?.code || '';
    if (lang === 'bn') {
      if (code === 'auth/user-not-found') {
        return 'এই ইমেইল দিয়ে কোনো অ্যাকাউন্ট খুঁজে পাওয়া যায়নি।';
      }
      if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        return 'ইমেইল বা পাসওয়ার্ড সঠিক নয়। অনুগ্রহ করে আবার যাচাই করুন।';
      }
      if (code === 'auth/email-already-in-use') {
        return 'এই ইমেইলটি ইতিমধ্যেই ব্যবহৃত হচ্ছে';
      }
      if (code === 'auth/invalid-email') {
        return 'ইমেইল ঠিকানার ফরম্যাট সঠিক নয়।';
      }
      if (code === 'auth/weak-password') {
        return 'পাসওয়ার্ডটি অত্যন্ত দুর্বল। কমপক্ষে ৬টি অক্ষরের শক্তিশালী পাসওয়ার্ড দিন।';
      }
      if (code === 'auth/too-many-requests') {
        return 'অতিরিক্ত ভুলের কারণে অ্যাকাউন্টটি সাময়িক ব্লক করা হয়েছে। কিছুক্ষণ পর চেষ্টা করুন।';
      }
      if (code === 'auth/network-request-failed') {
        return 'ইন্টারনেট সংযোগে ত্রুটি দেখা দিয়েছে। অনুগ্রহ করে আপনার নেটওয়ার্ক চেক করুন।';
      }
      return err?.message || 'লগইন বা রেজিস্ট্রেশন করতে সমস্যা হয়েছে। অনুগ্রহ করে পুনরায় চেষ্টা করুন।';
    }

    // English messages
    if (code === 'auth/user-not-found') {
      return 'No account found with this email address.';
    }
    if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
      return 'Incorrect email or password. Please verify and try again.';
    }
    if (code === 'auth/email-already-in-use') {
      return 'This email address is already in use.';
    }
    if (code === 'auth/invalid-email') {
      return 'The email address format is invalid.';
    }
    if (code === 'auth/weak-password') {
      return 'Password is too weak. Please use at least 6 characters.';
    }
    if (code === 'auth/too-many-requests') {
      return 'Too many failed attempts. Access temporarily locked. Please try again later.';
    }
    if (code === 'auth/network-request-failed') {
      return 'Network connection error. Please check your internet connectivity.';
    }
    return err?.message || 'Authentication failed. Please try again.';
  };

  const handleModeChange = (newMode: 'login' | 'signup' | 'forgot') => {
    setMode(newMode);
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const trimmedEmail = email.trim();

    // Validation: Email
    if (!trimmedEmail) {
      setErrorMessage(
        lang === 'bn'
          ? 'অনুগ্রহ করে আপনার ইমেইল ঠিকানা লিখুন।'
          : 'Please enter your email address.'
      );
      return;
    }
    if (!isValidEmail(trimmedEmail)) {
      setErrorMessage(
        lang === 'bn'
          ? 'সঠিক ফরম্যাটের ইমেইল প্রদান করুন (যেমন: user@example.com)।'
          : 'Please enter a valid email address (e.g., user@example.com).'
      );
      return;
    }

    // Flow 2: Forgot Password Reset Flow
    if (mode === 'forgot') {
      setIsLoading(true);
      try {
        await resetPassword(trimmedEmail);
        setSuccessMessage(
          lang === 'bn'
            ? 'আপনার ইমেইলে পাসওয়ার্ড রিসেট করার লিঙ্ক পাঠানো হয়েছে। ইমেইল চেক করুন।'
            : 'A password reset link has been sent to your email. Please check your inbox.'
        );
      } catch (err: any) {
        setErrorMessage(getErrorMessage(err));
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // Password validation for login / signup
    if (!password) {
      setErrorMessage(
        lang === 'bn'
          ? 'অনুগ্রহ করে আপনার পাসওয়ার্ড প্রদান করুন।'
          : 'Please enter your password.'
      );
      return;
    }
    if (password.length < 6) {
      setErrorMessage(
        lang === 'bn'
          ? 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।'
          : 'Password must be at least 6 characters.'
      );
      return;
    }

    // Flow 1: Sign-Up (Registration) Flow
    if (mode === 'signup') {
      if (password !== confirmPassword) {
        setErrorMessage(
          lang === 'bn'
            ? 'পাসওয়ার্ড মিলছে না'
            : 'Passwords do not match.'
        );
        return;
      }

      setIsLoading(true);
      try {
        await signUp(trimmedEmail, password, fullName.trim() || undefined);
        setSuccessMessage(
          lang === 'bn'
            ? 'আপনার অ্যাকাউন্ট সফলভাবে তৈরি হয়েছে! ড্যাশবোর্ডে প্রবেশ করানো হচ্ছে...'
            : 'Account created successfully! Redirecting to dashboard...'
        );
      } catch (err: any) {
        setErrorMessage(getErrorMessage(err));
      } finally {
        setIsLoading(false);
      }
    } else {
      // Flow 3: Standard Login
      setIsLoading(true);
      try {
        await login(trimmedEmail, password);
        setSuccessMessage(
          lang === 'bn'
            ? 'লগইন সফল হয়েছে! ড্যাশবোর্ডে প্রবেশ করা হচ্ছে...'
            : 'Login successful! Entering dashboard...'
        );
      } catch (err: any) {
        setErrorMessage(getErrorMessage(err));
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#0d3b36] flex flex-col justify-center items-center px-4 py-8 sm:px-6 relative overflow-hidden font-sans select-none">
      {/* Background Decorative Lighting Gradients */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-teal-400/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-600/5 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container Card */}
      <div className="w-full max-w-md z-10">
        <div className="bg-[#123631]/95 backdrop-blur-md border border-[#205149] rounded-3xl p-6 sm:p-8 shadow-2xl transition-all relative">
          
          {/* Top Language Toggle Switch */}
          <div className="absolute top-5 right-5 flex items-center gap-1.5 bg-[#0e2c28] border border-[#245b53] rounded-full p-1 text-[11px]">
            <Globe className="w-3.5 h-3.5 text-teal-400 ml-1" />
            <button
              type="button"
              onClick={() => setLang('bn')}
              className={`px-2 py-0.5 rounded-full font-semibold transition-colors ${
                lang === 'bn'
                  ? 'bg-emerald-500 text-white shadow-xs'
                  : 'text-teal-300/70 hover:text-white'
              }`}
            >
              বাংলা
            </button>
            <button
              type="button"
              onClick={() => setLang('en')}
              className={`px-2 py-0.5 rounded-full font-semibold transition-colors ${
                lang === 'en'
                  ? 'bg-emerald-500 text-white shadow-xs'
                  : 'text-teal-300/70 hover:text-white'
              }`}
            >
              EN
            </button>
          </div>

          {/* Top Mode Segmented Selector */}
          <div className="mb-6 p-1 bg-[#0b2420] border border-[#1b433c] rounded-2xl flex items-center gap-1">
            <button
              type="button"
              onClick={() => handleModeChange('login')}
              className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                mode === 'login'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-teal-300/70 hover:text-white hover:bg-[#123631]'
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>{lang === 'bn' ? 'লগইন' : 'Login'}</span>
            </button>
            <button
              type="button"
              id="mode-signup-tab"
              onClick={() => handleModeChange('signup')}
              className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                mode === 'signup'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-teal-300/70 hover:text-white hover:bg-[#123631]'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>{lang === 'bn' ? 'সাইন আপ' : 'Sign Up'}</span>
            </button>
            <button
              type="button"
              id="mode-forgot-tab"
              onClick={() => handleModeChange('forgot')}
              className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                mode === 'forgot'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-teal-300/70 hover:text-white hover:bg-[#123631]'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>{lang === 'bn' ? 'রিসেট' : 'Reset'}</span>
            </button>
          </div>

          {/* Top Illustration Section */}
          <div className="flex flex-col items-center text-center mb-6">
            {/* Dynamic Badge per mode */}
            <div className="relative mb-3">
              <div className="w-18 h-18 rounded-2xl bg-gradient-to-tr from-[#0a2723] to-[#1a4a43] border border-[#2c655b] flex items-center justify-center shadow-lg relative group">
                <div className="w-13 h-13 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-400/10 flex items-center justify-center border border-emerald-500/30">
                  {mode === 'forgot' ? (
                    <KeyRound className="w-6 h-6 text-amber-400" />
                  ) : mode === 'signup' ? (
                    <UserPlus className="w-6 h-6 text-emerald-400" />
                  ) : (
                    <Lock className="w-6 h-6 text-emerald-400" />
                  )}
                </div>
                {/* Accent Icon badge */}
                <div className="absolute -bottom-2 -right-2 bg-gradient-to-br from-amber-400 to-amber-600 p-1.5 rounded-lg shadow-md border border-amber-300/40">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#0d3b36]" />
                </div>
              </div>
              <div className="absolute inset-0 rounded-2xl bg-emerald-400/20 blur-md -z-10" />
            </div>

            {/* Brand Logo & Name */}
            <div className="flex items-center gap-2 mb-1">
              <div className="p-1 rounded-md bg-emerald-500/20 border border-emerald-500/30">
                <Pill className="w-4 h-4 text-emerald-300" />
              </div>
              <h1 className="text-xl font-bold text-white tracking-wide">
                {lang === 'bn' ? 'সিয়াম ফার্মা' : 'Siam Pharma'}
              </h1>
              <span className="text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                PRO
              </span>
            </div>

            {/* Title / Subtitle */}
            <h2 className="text-sm font-semibold text-teal-100 mt-0.5">
              {lang === 'bn'
                ? mode === 'forgot'
                  ? 'পাসওয়ার্ড রিসেট করুন (Reset Password)'
                  : mode === 'signup'
                  ? 'নতুন অ্যাকাউন্ট তৈরি করুন (Sign Up)'
                  : 'অ্যাপ ব্যবহার চালিয়ে যেতে লগইন করুন'
                : mode === 'forgot'
                ? 'Reset Your Password'
                : mode === 'signup'
                ? 'Create a New Account'
                : 'Please log in to continue'}
            </h2>
            <p className="text-xs text-teal-400/70 mt-1 max-w-xs">
              {lang === 'bn'
                ? mode === 'forgot'
                  ? 'আপনার নিবন্ধিত ইমেইল ঠিকানা দিন, আমরা একটি রিসেট লিঙ্ক পাঠাবো।'
                  : mode === 'signup'
                  ? 'ফার্মেসি স্টক ও সেলস ব্যবস্থাপনায় নতুন অ্যাকাউন্ট তৈরি করুন'
                  : 'ফার্মেসি স্টক, সেলস ও ক্লাউড ডাটাবেজ নিরাপদ রাখতে লগইন করুন'
                : mode === 'forgot'
                ? 'Enter your registered email address and we will send a reset link.'
                : mode === 'signup'
                ? 'Register your account to manage pharmacy stock & POS sales.'
                : 'Secure access to pharmacy inventory, POS sales & cloud database.'}
            </p>
          </div>

          {/* Feedback Messages */}
          {errorMessage && (
            <div className="mb-5 p-3.5 bg-red-950/80 border border-red-500/50 rounded-2xl flex items-start gap-3 text-red-200 text-xs animate-in fade-in duration-200 shadow-md">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div className="leading-relaxed font-medium">{errorMessage}</div>
            </div>
          )}

          {successMessage && (
            <div className="mb-5 p-3.5 bg-emerald-950/80 border border-emerald-500/50 rounded-2xl flex items-start gap-3 text-emerald-200 text-xs animate-in fade-in duration-200 shadow-md">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div className="leading-relaxed font-medium">{successMessage}</div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Full Name ("নাম") - Sign Up flow */}
            {mode === 'signup' && (
              <div>
                <label className="block text-xs font-semibold text-teal-200 mb-1.5">
                  {lang === 'bn' ? 'নাম' : 'Full Name'}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-teal-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    id="signup-name-input"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder={lang === 'bn' ? 'যেমন: সিয়াম আহমেদ' : 'e.g. Siam Ahmed'}
                    className="w-full pl-10 pr-4 py-2.5 bg-[#0e2c28] border border-[#245b53] rounded-xl text-sm text-white placeholder-teal-600/70 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 transition-colors"
                  />
                </div>
              </div>
            )}

            {/* Email Field ("ইমেইল") */}
            <div>
              <label className="block text-xs font-semibold text-teal-200 mb-1.5">
                {lang === 'bn' ? 'ইমেইল' : 'Email Address'}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-teal-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  id="auth-email-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={
                    lang === 'bn'
                      ? mode === 'forgot'
                        ? 'আপনার নিবন্ধিত ইমেইল অ্যাড্রেস লিখুন'
                        : 'যেমন: name@example.com'
                      : 'Enter your email address'
                  }
                  className="w-full pl-10 pr-4 py-2.5 bg-[#0e2c28] border border-[#245b53] rounded-xl text-sm text-white placeholder-teal-600/70 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 transition-colors"
                  required
                />
              </div>
            </div>

            {/* Password Field ("পাসওয়ার্ড") - Login & Signup only */}
            {mode !== 'forgot' && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-teal-200">
                    {lang === 'bn' ? 'পাসওয়ার্ড' : 'Password'}
                  </label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      id="forgot-password-link"
                      onClick={() => handleModeChange('forgot')}
                      className="text-[11px] font-medium text-emerald-400 hover:text-emerald-300 transition-colors"
                    >
                      {lang === 'bn' ? 'পাসওয়ার্ড ভুলে গেছেন?' : 'Forgot password?'}
                    </button>
                  )}
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-teal-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="auth-password-input"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={
                      lang === 'bn'
                        ? 'কমপক্ষে ৬ অক্ষরের পাসওয়ার্ড'
                        : 'Enter password (min 6 characters)'
                    }
                    className="w-full pl-10 pr-11 py-2.5 bg-[#0e2c28] border border-[#245b53] rounded-xl text-sm text-white placeholder-teal-600/70 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 transition-colors"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-teal-400 hover:text-teal-200 transition-colors focus:outline-none"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Confirm Password ("পাসওয়ার্ড নিশ্চিত করুন") - Sign Up only */}
            {mode === 'signup' && (
              <div>
                <label className="block text-xs font-semibold text-teal-200 mb-1.5">
                  {lang === 'bn' ? 'পাসওয়ার্ড নিশ্চিত করুন' : 'Confirm Password'}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-teal-400">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    id="signup-confirm-password-input"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder={lang === 'bn' ? 'পাসওয়ার্ড পুনরায় লিখুন' : 'Re-enter password'}
                    className="w-full pl-10 pr-11 py-2.5 bg-[#0e2c28] border border-[#245b53] rounded-xl text-sm text-white placeholder-teal-600/70 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 transition-colors"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-teal-400 hover:text-teal-200 transition-colors focus:outline-none"
                    aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Primary Action Button */}
            <button
              type="submit"
              id="auth-submit-btn"
              disabled={isLoading}
              className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-[0.99] text-white text-sm font-bold rounded-xl shadow-lg shadow-emerald-950/40 flex items-center justify-center gap-2 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>
                    {lang === 'bn'
                      ? mode === 'forgot'
                        ? 'লিঙ্ক পাঠানো হচ্ছে...'
                        : mode === 'signup'
                        ? 'অ্যাকাউন্ট তৈরি হচ্ছে...'
                        : 'যাচাই করা হচ্ছে...'
                      : 'Processing...'}
                  </span>
                </>
              ) : mode === 'forgot' ? (
                <>
                  <span>{lang === 'bn' ? 'পাসওয়ার্ড রিসেট লিঙ্ক পাঠান' : 'Send Password Reset Link'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              ) : mode === 'signup' ? (
                <>
                  <span>{lang === 'bn' ? 'সাইন আপ করুন' : 'Sign Up'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              ) : (
                <>
                  <span>{lang === 'bn' ? 'লগইন' : 'Login'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Access Bar */}
          {mode === 'login' && (
            <div className="mt-5 pt-4 border-t border-[#1d4c44] flex flex-col items-center">
              <div className="flex items-center gap-2 w-full mb-3">
                <div className="h-px bg-[#1f524a] flex-1" />
                <span className="text-[11px] text-teal-400/80 font-medium">
                  {lang === 'bn' ? 'অথবা দ্রুত পরীক্ষা করতে' : 'or quick test access'}
                </span>
                <div className="h-px bg-[#1f524a] flex-1" />
              </div>
              <button
                type="button"
                id="demo-login-btn"
                onClick={() => loginDemo('admin')}
                className="w-full py-2 px-3 bg-[#0d2e29] hover:bg-[#133e38] border border-[#255e54] text-xs font-semibold text-teal-200 hover:text-white rounded-xl flex items-center justify-center gap-2 transition-colors shadow-xs"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>{lang === 'bn' ? 'এক ক্লিকে অ্যাডমিন ডেমো লগইন' : 'One-Click Admin Demo Login'}</span>
              </button>
            </div>
          )}

          {/* Bottom Switcher Toggle Links */}
          <div className="mt-5 text-center">
            {mode === 'forgot' ? (
              <button
                type="button"
                id="back-to-login-btn"
                onClick={() => handleModeChange('login')}
                className="text-xs font-medium text-emerald-400 hover:text-emerald-300 inline-flex items-center gap-1 underline underline-offset-4 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>{lang === 'bn' ? 'লগইনে ফিরে যান' : 'Back to Login'}</span>
              </button>
            ) : mode === 'login' ? (
              <p className="text-xs text-teal-300/80">
                {lang === 'bn' ? 'একটি অ্যাকাউন্ট নেই? ' : "Don't have an account? "}
                <button
                  type="button"
                  id="switch-to-signup-btn"
                  onClick={() => handleModeChange('signup')}
                  className="font-bold text-emerald-400 hover:text-emerald-300 underline underline-offset-4 transition-colors"
                >
                  {lang === 'bn' ? 'সাইন আপ করুন' : 'Sign Up'}
                </button>
              </p>
            ) : (
              <p className="text-xs text-teal-300/80">
                {lang === 'bn' ? 'ইতিমধ্যে একটি অ্যাকাউন্ট আছে? ' : 'Already have an account? '}
                <button
                  type="button"
                  id="switch-to-login-btn"
                  onClick={() => handleModeChange('login')}
                  className="font-bold text-emerald-400 hover:text-emerald-300 underline underline-offset-4 transition-colors"
                >
                  {lang === 'bn' ? 'লগইন করুন' : 'Log In'}
                </button>
              </p>
            )}
          </div>

        </div>

        {/* Footer info */}
        <p className="text-center text-[11px] text-teal-400/50 mt-4">
          {lang === 'bn'
            ? 'সিয়াম ফার্মা ম্যানেজমেন্ট সিস্টেম • সিকিউর ফায়ারবেস ক্লাউড অথেন্টিকেশন'
            : 'Siam Pharma Management System • Secure Firebase Cloud Authentication'}
        </p>
      </div>
    </div>
  );
};


