import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useApp } from '../../context/AppContext';
import { 
  X, 
  Mail, 
  KeyRound, 
  Lock, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  ArrowRight, 
  RefreshCw, 
  ShieldCheck, 
  AlertCircle 
} from 'lucide-react';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialEmail?: string;
  role: 'admin' | 'team_leader' | 'hr' | 'telecaller';
  onPasswordResetSuccess?: (newPassword?: string, email?: string) => void;
}

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({
  isOpen,
  onClose,
  initialEmail = '',
  role,
  onPasswordResetSuccess
}) => {
  const { triggerToast } = useApp();

  const [step, setStep] = useState<'EMAIL' | 'OTP' | 'NEW_PASSWORD' | 'SUCCESS'>('EMAIL');
  const [emailInput, setEmailInput] = useState('');
  const [verifiedEmail, setVerifiedEmail] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successInfo, setSuccessInfo] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  // Sync initial email when modal opens
  useEffect(() => {
    if (isOpen) {
      setEmailInput(initialEmail || '');
      setStep('EMAIL');
      setOtpInput('');
      setNewPassword('');
      setConfirmPassword('');
      setErrorMessage('');
      setSuccessInfo('');
      setResendCooldown(0);
    }
  }, [isOpen, initialEmail]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  if (!isOpen) return null;

  const roleLabels: Record<string, { label: string; badgeClass: string }> = {
    admin: { label: 'Super Admin', badgeClass: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30' },
    team_leader: { label: 'Team Leader', badgeClass: 'bg-cyan-500/15 text-cyan-800 border-cyan-500/30' },
    hr: { label: 'HR Management', badgeClass: 'bg-indigo-500/15 text-indigo-800 border-indigo-500/30' },
    telecaller: { label: 'Employee Portal', badgeClass: 'bg-teal-500/15 text-teal-800 border-teal-500/30' },
  };

  const currentRoleInfo = roleLabels[role] || roleLabels.telecaller;

  // Step 1: Send OTP to email
  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage('');
    const targetEmail = emailInput.trim();

    if (!targetEmail) {
      setErrorMessage('Please enter your registered email address or employee code');
      return;
    }

    setIsLoading(true);
    try {
      const res = await api.forgotPasswordSendOtp(targetEmail, role);
      setVerifiedEmail(res.email);
      setSuccessInfo(res.message);
      triggerToast(`✓ Verification code dispatched to ${res.email}`);
      setStep('OTP');
      setResendCooldown(60);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to dispatch verification code. Please verify credentials.');
      triggerToast(`✗ ${err.message || 'Failed to send OTP'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Verify 6-digit OTP
  const handleVerifyOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage('');
    const code = otpInput.trim().replace(/\D/g, '');

    if (code.length !== 6) {
      setErrorMessage('Please enter the 6-digit OTP received in your email');
      return;
    }

    setIsLoading(true);
    try {
      await api.forgotPasswordVerifyOtp(verifiedEmail, code);
      triggerToast('✓ OTP verified successfully! You may now set your new password.');
      setStep('NEW_PASSWORD');
    } catch (err: any) {
      setErrorMessage(err.message || 'Invalid or expired OTP. Please try again.');
      triggerToast(`✗ ${err.message || 'OTP verification failed'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Step 3: Set New Password
  const handleResetPassword = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage('');

    if (newPassword.length < 6) {
      setErrorMessage('New password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please verify both fields.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await api.forgotPasswordResetPassword(verifiedEmail, otpInput.trim(), newPassword);
      triggerToast('✓ Password updated successfully!');
      setSuccessInfo(res.message || 'Password has been updated. You can now login.');
      setStep('SUCCESS');
      if (onPasswordResetSuccess) {
        onPasswordResetSuccess(newPassword, verifiedEmail);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to reset password. Please restart process.');
      triggerToast(`✗ ${err.message || 'Reset password failed'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col relative transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-[#07192C] via-[#0A2540] to-[#0D3155] text-white px-6 py-5 relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#00C9A7]/20 border border-[#00C9A7]/40 flex items-center justify-center text-[#00C9A7]">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-display font-black text-lg text-white tracking-wide flex items-center gap-2">
                  TRADE NEXUS
                </h3>
                <p className="text-[11px] text-[#00C9A7] font-semibold">
                  Password Recovery Center
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Role badge */}
          <div className="mt-3.5 flex items-center justify-between">
            <span className={`text-[10px] font-mono font-bold px-2.5 py-1 rounded-full border ${currentRoleInfo.badgeClass} bg-white/10 text-white`}>
              {currentRoleInfo.label}
            </span>

            {/* Stepper indicator */}
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-300">
              <span className={`w-5 h-5 rounded-full flex items-center justify-center ${step === 'EMAIL' ? 'bg-[#00C9A7] text-[#0A2540]' : 'bg-white/20'}`}>1</span>
              <span>-</span>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center ${step === 'OTP' ? 'bg-[#00C9A7] text-[#0A2540]' : 'bg-white/20'}`}>2</span>
              <span>-</span>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center ${step === 'NEW_PASSWORD' ? 'bg-[#00C9A7] text-[#0A2540]' : 'bg-white/20'}`}>3</span>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          {/* Error Banner */}
          {errorMessage && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-2.5 text-xs text-rose-700 animate-in fade-in">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-500" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* STEP 1: ENTER EMAIL / EMP CODE */}
          {step === 'EMAIL' && (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div className="space-y-1">
                <h4 className="font-display font-black text-xl text-[#0A2540]">
                  Forgot Your Password?
                </h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Enter your registered corporate email or employee code. We will dispatch an OTP verification code via Trade Nexus secure mail.
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                  Registered Email or Employee Code
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="e.g. sagarsuchi26@gmail.com or TNX-AD01"
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-4 py-3 text-xs text-slate-800 focus:outline-none focus:border-[#00C9A7] font-medium transition-colors"
                    autoFocus
                  />
                </div>
              </div>

              <div className="p-3 bg-emerald-50/70 border border-emerald-200/60 rounded-2xl flex items-center gap-2.5 text-[11px] text-emerald-800">
                <ShieldCheck className="w-4 h-4 text-[#00A88B] flex-shrink-0" />
                <span>Protected by SMTP SSL/TLS automated authentication.</span>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 rounded-2xl bg-[#00C9A7] hover:bg-[#00B4D8] text-[#0A2540] font-black text-xs shadow-lg shadow-[#00C9A7]/25 flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Dispatching OTP Code...</span>
                  </>
                ) : (
                  <>
                    <span>Send Verification Code</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* STEP 2: VERIFY 6-DIGIT OTP */}
          {step === 'OTP' && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="space-y-1">
                <h4 className="font-display font-black text-xl text-[#0A2540]">
                  Check Your Inbox
                </h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  We've sent a 6-digit verification code to <span className="font-bold text-slate-800">{verifiedEmail}</span>. Code expires in 10 minutes.
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase tracking-wider text-center">
                  Enter 6-Digit OTP Code
                </label>
                <div className="relative">
                  <input
                    type="text"
                    maxLength={6}
                    value={otpInput}
                    onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ''))}
                    placeholder="• • • • • •"
                    className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl py-3 text-center text-2xl font-mono font-black text-slate-800 tracking-[10px] focus:outline-none focus:border-[#00C9A7] transition-all"
                    autoFocus
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <button
                  type="button"
                  onClick={() => setStep('EMAIL')}
                  className="text-slate-500 hover:text-slate-800 font-semibold cursor-pointer underline text-[11px]"
                >
                  Change Email
                </button>

                <button
                  type="button"
                  disabled={resendCooldown > 0 || isLoading}
                  onClick={() => handleSendOtp()}
                  className="text-[#00A88B] hover:text-[#0A2540] font-bold flex items-center gap-1 cursor-pointer disabled:text-slate-400 disabled:cursor-not-allowed text-[11px]"
                >
                  <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
                  <span>
                    {resendCooldown > 0 ? `Resend code (${resendCooldown}s)` : 'Resend Code'}
                  </span>
                </button>
              </div>

              <button
                type="submit"
                disabled={isLoading || otpInput.trim().length !== 6}
                className="w-full py-3.5 rounded-2xl bg-[#00C9A7] hover:bg-[#00B4D8] text-[#0A2540] font-black text-xs shadow-lg shadow-[#00C9A7]/25 flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Verifying Code...</span>
                  </>
                ) : (
                  <>
                    <span>Verify Code</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* STEP 3: ENTER NEW PASSWORD */}
          {step === 'NEW_PASSWORD' && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-1">
                <h4 className="font-display font-black text-xl text-[#0A2540]">
                  Create New Password
                </h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Choose a secure password for <span className="font-bold text-slate-800">{verifiedEmail}</span>.
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter at least 6 characters"
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-10 py-3 text-xs text-slate-800 focus:outline-none focus:border-[#00C9A7] font-medium transition-colors"
                    autoFocus
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

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                  Confirm New Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat new password"
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-10 py-3 text-xs text-slate-800 focus:outline-none focus:border-[#00C9A7] font-medium transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 p-0.5"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Password Match / Strength Indicator */}
              {newPassword && (
                <div className="text-[11px] flex items-center gap-1.5 font-medium">
                  {confirmPassword && newPassword === confirmPassword ? (
                    <span className="text-emerald-600 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Passwords match
                    </span>
                  ) : confirmPassword ? (
                    <span className="text-amber-600 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" /> Passwords do not match yet
                    </span>
                  ) : (
                    <span className="text-slate-400">
                      Length: {newPassword.length} characters (min 6)
                    </span>
                  )}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading || !newPassword || newPassword !== confirmPassword}
                className="w-full py-3.5 rounded-2xl bg-[#00C9A7] hover:bg-[#00B4D8] text-[#0A2540] font-black text-xs shadow-lg shadow-[#00C9A7]/25 flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Saving New Password...</span>
                  </>
                ) : (
                  <>
                    <span>Reset Password &amp; Login</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* STEP 4: SUCCESS */}
          {step === 'SUCCESS' && (
            <div className="text-center py-3 space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-600 mx-auto shadow-sm animate-in zoom-in duration-300">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div className="space-y-1">
                <h4 className="font-display font-black text-xl text-[#0A2540]">
                  Password Reset Complete!
                </h4>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  {successInfo || 'Your password has been successfully updated in Trade Nexus security database.'}
                </p>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-[11px] font-medium text-slate-600 text-left space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-400">Account:</span>
                  <span className="font-bold text-slate-800">{verifiedEmail}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Role:</span>
                  <span className="font-bold text-[#00A88B]">{currentRoleInfo.label}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-full py-3.5 rounded-2xl bg-[#0A2540] hover:bg-[#07192C] text-white font-black text-xs shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
              >
                <span>Return to Login</span>
                <ArrowRight className="w-4 h-4 text-[#00C9A7]" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
