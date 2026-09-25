import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { api, setAuthToken } from '../../services/api';
import { ForgotPasswordModal } from '../../components/modals/ForgotPasswordModal';
import { 
  Mail, 
  Smartphone, 
  Lock, 
  Eye, 
  EyeOff, 
  ScanFace, 
  UserCheck, 
  CheckCircle2, 
  ArrowRight
} from 'lucide-react';

export const EmployeeLoginView: React.FC = () => {
  const { setAuthStep, triggerToast, setCurrentUser, invalidateAll, currentRole, setCurrentRole } = useApp();
  
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);

  // Standard Email / Mobile & Password Submit -> Enter Portal
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailOrPhone.trim() || !password.trim()) {
      triggerToast('✗ Please enter email and password');
      return;
    }
    setIsLoading(true);
    
    try {
      const authRes = await api.login(emailOrPhone.trim(), password.trim());
      if (authRes?.token) {
        setAuthToken(authRes.token);
        setCurrentUser(authRes.user);
        invalidateAll();
        setCurrentRole('telecaller');
        triggerToast(`✓ Welcome, ${authRes.user?.name || 'User'}! Access granted.`);
        setTimeout(() => {
          setIsLoading(false);
          setAuthStep('AUTHENTICATED');
        }, 300);
      } else {
        triggerToast('✗ Invalid email or password');
        setIsLoading(false);
      }
    } catch (err: any) {
      triggerToast(`✗ ${err.message || 'Invalid email or password'}`);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-between max-w-md mx-auto relative overflow-hidden font-sans text-slate-800 selection:bg-[#00C9A7]/20 pb-6">
      
      {/* 1. Official Trade Nexus Brand Top Header */}
      <div className="bg-gradient-to-b from-[#07192C] via-[#0A2540] to-[#0D3155] text-white pt-10 pb-14 px-6 rounded-b-[36px] shadow-xl relative overflow-hidden">
        {/* Subtle geometric background grid */}
        <div className="absolute inset-0 bg-[radial-gradient(rgba(0,201,167,0.2)_1px,transparent_1px)] [background-size:16px_16px] opacity-35" />

        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center gap-3">
            {/* Official Trade Nexus Emblem */}
            <div className="w-12 h-12 rounded-2xl overflow-hidden bg-[#0A2540] border-2 border-[#00C9A7]/50 shadow-lg shadow-[#00C9A7]/20 flex items-center justify-center flex-shrink-0 p-0.5">
              <img 
                src="/logo-icon.png" 
                alt="Trade Nexus" 
                className="w-full h-full object-cover rounded-xl"
              />
            </div>
            <div>
              <h1 className="font-display font-black text-xl text-white tracking-wider leading-tight">
                TRADE NEXUS
              </h1>
              <p className="text-xs text-[#00C9A7] font-bold tracking-wide">
                Employee
              </p>
            </div>
          </div>

          <div className="bg-[#00C9A7]/15 border border-[#00C9A7]/40 px-3 py-1 rounded-full text-[10px] font-mono font-extrabold flex items-center gap-1.5 text-[#38E1B7]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00C9A7] animate-pulse" />
            <span>EMPLOYEE</span>
          </div>
        </div>

        {/* Portal Switcher Tabs */}
        <div className="flex items-center justify-between bg-black/40 p-1 rounded-2xl border border-white/10 mt-4 text-[11px] font-bold relative z-10">
          <button
            onClick={() => setCurrentRole('telecaller')}
            className={`flex-1 py-1.5 rounded-xl transition-all ${currentRole === 'telecaller' ? 'bg-[#00C9A7] text-[#0A2540] shadow-xs' : 'text-slate-300 hover:text-white'}`}
          >
            Employee
          </button>
          <button
            onClick={() => setCurrentRole('team_leader')}
            className={`flex-1 py-1.5 rounded-xl transition-all ${currentRole === 'team_leader' ? 'bg-[#00C9A7] text-[#0A2540] shadow-xs' : 'text-slate-300 hover:text-white'}`}
          >
            TL
          </button>
          <button
            onClick={() => setCurrentRole('hr')}
            className={`flex-1 py-1.5 rounded-xl transition-all ${currentRole === 'hr' ? 'bg-[#00C9A7] text-[#0A2540] shadow-xs' : 'text-slate-300 hover:text-white'}`}
          >
            HR
          </button>
          <button
            onClick={() => setCurrentRole('admin')}
            className={`flex-1 py-1.5 rounded-xl transition-all ${currentRole === 'admin' ? 'bg-[#00C9A7] text-[#0A2540] shadow-xs' : 'text-slate-300 hover:text-white'}`}
          >
            Admin
          </button>
        </div>
      </div>

      {/* 2. Employee Login Card Body */}
      <div className="px-5 -mt-8 relative z-20 flex-1 flex flex-col justify-center">
        <div className="nexus-card p-6 bg-white border border-slate-200/80 shadow-2xl rounded-3xl space-y-4">
          
          <div className="text-center space-y-0.5">
            <h2 className="font-display font-black text-2xl text-[#0A2540] tracking-tight">
              Employee Login
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Enter your credentials to continue
            </p>
          </div>

          {/* Email / Mobile & Password Form */}
          <form onSubmit={handlePasswordSubmit} className="space-y-3.5 pt-1">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                Email or Mobile Number
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  type="text"
                  value={emailOrPhone}
                  onChange={(e) => setEmailOrPhone(e.target.value)}
                  placeholder="Enter telecaller email or mobile number"
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-4 py-3 text-xs text-slate-800 focus:outline-none focus:border-[#00C9A7] font-medium transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-10 py-3 text-xs text-slate-800 focus:outline-none focus:border-[#00C9A7] font-medium transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 p-0.5"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setIsForgotPasswordOpen(true)}
                className="text-[11px] font-bold text-[#00A88B] hover:underline cursor-pointer"
              >
                Forgot Password?
              </button>
            </div>

            {/* Primary Login Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 rounded-2xl bg-[#00C9A7] hover:bg-[#00B4D8] text-[#0A2540] font-black text-xs shadow-lg shadow-[#00C9A7]/25 flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
            >
              <span>{isLoading ? 'Verifying Credentials...' : 'Login as Telecaller'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <p className="text-[10px] text-slate-400 text-center leading-relaxed pt-1">
            By logging in, you agree to our <a href="#" className="underline text-slate-600">Terms &amp; Conditions</a> and <a href="#" className="underline text-slate-600">Privacy Policy</a>.
          </p>
        </div>
      </div>

      {/* 3. 3-Step "How Face Recognition Works" Infographic Footer */}
      <div className="px-5 mt-4">
        <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-sm">
          <span className="text-[11px] font-extrabold text-[#0A2540] uppercase tracking-wider block text-center mb-3">
            How Face Recognition Works
          </span>

          <div className="flex items-center justify-between text-center relative">
            {/* Step 1: Login */}
            <div 
              onClick={() => setAuthStep('LOGIN')}
              className="flex-1 flex flex-col items-center cursor-pointer hover:opacity-80 transition-all"
            >
              <div className="w-10 h-10 rounded-2xl bg-[#E6FAF6] border border-[#00C9A7]/40 flex items-center justify-center text-[#00A88B] relative mb-1.5 shadow-2xs">
                <UserCheck className="w-5 h-5" />
                <span className="w-4 h-4 rounded-full bg-[#00C9A7] text-[#0A2540] text-[9px] font-black absolute -top-1 -right-1 flex items-center justify-center">1</span>
              </div>
              <span className="font-display font-bold text-xs text-[#0A2540] block">Login</span>
              <span className="text-[9px] text-slate-400 leading-tight block">Portal credentials</span>
            </div>

            <div className="text-slate-300 font-bold px-1">➔</div>

            {/* Step 2: Face Scan */}
            <div 
              onClick={() => setAuthStep('FACE_SCAN')}
              className="flex-1 flex flex-col items-center cursor-pointer hover:opacity-80 transition-all"
            >
              <div className="w-10 h-10 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 relative mb-1.5 shadow-2xs">
                <ScanFace className="w-5 h-5" />
                <span className="w-4 h-4 rounded-full bg-[#0A2540] text-white font-black text-[9px] flex items-center justify-center">2</span>
              </div>
              <span className="font-display font-bold text-xs text-[#0A2540] block">Face Scan</span>
              <span className="text-[9px] text-slate-400 leading-tight block">Biometric kiosk</span>
            </div>

            <div className="text-slate-300 font-bold px-1">➔</div>

            {/* Step 3: Marked */}
            <div 
              onClick={() => setAuthStep('ATTENDANCE_SUCCESS')}
              className="flex-1 flex flex-col items-center cursor-pointer hover:opacity-80 transition-all"
            >
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 relative mb-1.5 shadow-2xs">
                <CheckCircle2 className="w-5 h-5" />
                <span className="w-4 h-4 rounded-full bg-emerald-600 text-white text-[9px] font-black flex items-center justify-center">3</span>
              </div>
              <span className="font-display font-bold text-xs text-[#0A2540] block">Marked</span>
              <span className="text-[9px] text-slate-400 leading-tight block">Shift active</span>
            </div>
          </div>
        </div>
      </div>

      {/* Forgot Password OTP Modal */}
      <ForgotPasswordModal
        isOpen={isForgotPasswordOpen}
        onClose={() => setIsForgotPasswordOpen(false)}
        role="telecaller"
        initialEmail={emailOrPhone}
        onPasswordResetSuccess={(newPass, email) => {
          if (newPass) setPassword(newPass);
          if (email) setEmailOrPhone(email);
        }}
      />

    </div>
  );
};
