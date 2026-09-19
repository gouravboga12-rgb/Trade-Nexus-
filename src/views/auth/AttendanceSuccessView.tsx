import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useScreenData } from '../../hooks/useScreenData';
import { 
  CheckCircle2, 
  ArrowRight, 
  Clock, 
  MapPin, 
  ShieldCheck, 
  Calendar, 
  UserCheck,
  Sparkles,
  Shield 
} from 'lucide-react';

export const AttendanceSuccessView: React.FC = () => {
  const { currentRole, profile, setAuthStep } = useApp();

  useScreenData('attendanceSuccess');
  const [countdown, setCountdown] = useState(3);

  const isLeader = currentRole === 'team_leader';
  const personName = profile.name || (isLeader ? 'Team Leader' : 'Employee');
  const checkInTime = profile.checkInTime || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const statusLabel = isLeader ? 'ON SUPERVISOR DUTY' : 'ON DUTY';
  const dashboardLabel = isLeader ? 'Enter Team Leader Dashboard' : 'Enter Sales Dashboard';

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setAuthStep('AUTHENTICATED');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [setAuthStep]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#E6FAF6]/80 via-white to-white flex flex-col justify-between max-w-md mx-auto relative overflow-hidden font-sans text-slate-800 p-6">
      
      {/* 1. Header with Trade Nexus Emblem */}
      <div className="flex items-center justify-between pt-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl overflow-hidden bg-[#0A2540] border border-[#00C9A7]/40 shadow-sm flex items-center justify-center p-0.5">
            <img src="/logo-icon.png" alt="Trade Nexus" className="w-full h-full object-cover rounded-lg" />
          </div>
          <div>
            <span className="font-display font-black text-xs text-[#0A2540] tracking-wider block leading-tight">TRADE NEXUS</span>
            <span className="text-[9px] font-mono font-bold text-[#00A88B] block leading-tight">Attendance Verified</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-[#00A88B] bg-[#E6FAF6] px-3 py-1 rounded-full border border-[#00C9A7]/30">
          <Sparkles className="w-3.5 h-3.5 text-[#00C9A7]" />
          <span>{isLeader ? 'SUPERVISOR VERIFIED' : 'BIOMETRIC VERIFIED'}</span>
        </div>
      </div>

      {/* 2. Main Success Card */}
      <div className="my-auto text-center space-y-6">
        
        {/* Animated Checkmark Circle */}
        <div className="relative w-28 h-28 mx-auto flex items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-emerald-500/15 animate-ping" />
          <div className="w-28 h-28 rounded-full bg-gradient-to-br from-[#00C9A7] to-emerald-600 text-white flex items-center justify-center shadow-2xl shadow-emerald-500/40 relative z-10 border-4 border-white">
            <CheckCircle2 className="w-16 h-16 stroke-[2.5]" />
          </div>
        </div>

        <div className="space-y-1.5">
          <h1 className="font-display font-black text-2xl text-[#0A2540] tracking-tight">
            Attendance Marked!
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Welcome back, <strong className="text-slate-800">{personName}</strong>! Your shift is active.
          </p>
        </div>

        {/* Attendance Summary Card */}
        <div className="nexus-card p-4 bg-white border border-slate-200 shadow-md rounded-3xl text-left space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Status</span>
              <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {statusLabel}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Check-in Time</span>
              <span className="font-mono font-black text-base text-[#0A2540]">
                {checkInTime}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs font-medium">
            <div className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
              <Calendar className="w-4 h-4 text-[#00A88B]" />
              <div>
                <span className="text-[9px] text-slate-400 font-bold block">Date</span>
                <span className="text-slate-700 font-bold text-[11px]">Today, 28 May</span>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
              <Clock className="w-4 h-4 text-sky-500" />
              <div>
                <span className="text-[9px] text-slate-400 font-bold block">Shift</span>
                <span className="text-slate-700 font-bold text-[11px]">08:30 - 18:30</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs">
            <MapPin className="w-4 h-4 text-amber-500 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="text-[9px] text-slate-400 font-bold block">Verification Method</span>
              <span className="text-slate-700 font-bold text-[11px] truncate block">
                Face ID Biometric (Supervisor Geo-Fenced)
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* 3. Bottom Action & Auto-Redirect */}
      <div className="space-y-3 pt-2">
        <button
          onClick={() => setAuthStep('AUTHENTICATED')}
          className="w-full py-4 rounded-2xl bg-[#00C9A7] hover:bg-[#00B4D8] text-[#0A2540] font-black text-sm shadow-xl shadow-[#00C9A7]/30 flex items-center justify-center gap-2.5 active:scale-95 transition-all"
        >
          <span>{dashboardLabel}</span>
          <ArrowRight className="w-5 h-5 stroke-[2.5]" />
        </button>

        <p className="text-center text-[11px] text-slate-400 font-mono">
          Auto-entering dashboard in <strong className="text-[#00A88B]">{countdown}s</strong>...
        </p>
      </div>

    </div>
  );
};
