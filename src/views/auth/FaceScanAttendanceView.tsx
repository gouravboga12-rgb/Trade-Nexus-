import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { useScreenData } from '../../hooks/useScreenData';
import { 
  Camera, 
  CheckCircle2, 
  RefreshCw, 
  ShieldCheck, 
  User, 
  Sparkles, 
  Scan, 
  Building, 
  Clock,
  Shield,
  ScanFace
} from 'lucide-react';
import { FaceRegistrationModal } from '../../components/modals/FaceRegistrationModal';

export const FaceScanAttendanceView: React.FC = () => {
  const { 
    currentRole, 
    profile, 
    faceProfiles, 
    verifyFaceAttendance, 
    setIsFaceRegistrationModalOpen, 
    setFaceRegistrationEmployee,
    setAuthStep, 
    triggerToast 
  } = useApp();

  useScreenData('faceScan');
  const [scanningState, setScanningState] = useState<'INITIAL' | 'SCANNING' | 'MATCHED'>('INITIAL');
  const [progress, setProgress] = useState(0);

  const isLeader = currentRole === 'team_leader';
  const personName = profile.name || (isLeader ? 'Team Leader' : 'Employee');
  const personCode = profile.empCode || '—';
  const personRole = profile.roleTitle || (isLeader ? 'Team Leader' : 'Sales Executive');
  const personDept = profile.department || 'Sales';
  const personTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const isEnrolled = faceProfiles.some(p => 
    p.employeeName.toLowerCase() === personName.toLowerCase() || 
    p.employeeId === profile.id
  );

  const startFaceScan = () => {
    setScanningState('SCANNING');
    setProgress(0);
  };

  useEffect(() => {
    if (scanningState === 'SCANNING') {
      const interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            setScanningState('MATCHED');
            verifyFaceAttendance();
            triggerToast(`✓ Face Match 99.8% Verified: ${personName}`);
            setTimeout(() => {
              setAuthStep('ATTENDANCE_SUCCESS');
            }, 1000);
            return 100;
          }
          return prev + 25;
        });
      }, 140);

      return () => clearInterval(interval);
    }
  }, [scanningState, setAuthStep, triggerToast, personName, verifyFaceAttendance]);

  return (
    <div className="min-h-screen bg-[#07131F] text-white flex flex-col justify-between max-w-md mx-auto relative overflow-hidden font-sans p-5">
      
      {/* 1. Terminal Top Bar */}
      <div className="flex items-center justify-between py-2 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          {/* Official Trade Nexus Emblem */}
          <div className="w-9 h-9 rounded-xl overflow-hidden bg-[#0A2540] border border-[#00C9A7]/40 shadow-md shadow-[#00C9A7]/20 flex items-center justify-center flex-shrink-0 p-0.5">
            <img 
              src="/logo-icon.png" 
              alt="Trade Nexus" 
              className="w-full h-full object-cover rounded-lg"
            />
          </div>
          <div>
            <h2 className="font-display font-black text-sm text-white tracking-wider leading-tight">
              TRADE NEXUS
            </h2>
            <span className="text-[9px] font-mono text-[#00C9A7] uppercase tracking-widest block font-bold">
              {isLeader ? 'Team Leader Face Scan' : 'Face Recognition Attendance'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 bg-emerald-500/20 text-emerald-400 text-[10px] font-mono font-bold px-2.5 py-1 rounded-full border border-emerald-500/30">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
          <span>CAMERA LIVE</span>
        </div>
      </div>

      {/* 2. Biometric Camera Scanner Viewport */}
      <div className="relative my-auto flex flex-col items-center justify-center">
        
        {/* Terminal Outer Bezel */}
        <div className="w-full aspect-[3/4] max-h-[440px] bg-[#0A2540] rounded-[36px] border-4 border-slate-700 shadow-2xl relative overflow-hidden flex items-center justify-center">
          
          {/* Simulated Live Camera Background */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-800 to-slate-900 flex items-center justify-center">
            {/* Holographic Face Silhouette */}
            <div className="w-48 h-56 rounded-full bg-gradient-to-b from-slate-700/60 to-slate-800/80 border-2 border-dashed border-[#00C9A7]/40 flex flex-col items-center justify-center relative shadow-2xl">
              <User className="w-24 h-24 text-slate-500 opacity-60" />
              
              {/* AI Facial Landmarks Dots */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-32 h-36 border border-[#00C9A7]/30 rounded-full relative">
                  <span className="w-1.5 h-1.5 bg-[#00C9A7] rounded-full absolute top-10 left-8 shadow-[0_0_8px_#00C9A7]" />
                  <span className="w-1.5 h-1.5 bg-[#00C9A7] rounded-full absolute top-10 right-8 shadow-[0_0_8px_#00C9A7]" />
                  <span className="w-1.5 h-1.5 bg-[#00C9A7] rounded-full absolute top-18 left-14 shadow-[0_0_8px_#00C9A7]" />
                  <span className="w-1.5 h-1.5 bg-[#00C9A7] rounded-full absolute bottom-8 left-14 shadow-[0_0_8px_#00C9A7]" />
                </div>
              </div>
            </div>
          </div>

          {/* AI Scanning Grid & Laser Animation */}
          {scanningState === 'SCANNING' && (
            <div className="absolute inset-0 bg-[#00C9A7]/5 flex flex-col justify-center items-center pointer-events-none">
              <div 
                className="w-full h-1 bg-gradient-to-r from-transparent via-[#00C9A7] to-transparent shadow-[0_0_15px_#00C9A7] animate-bounce" 
                style={{ animationDuration: '1.2s' }}
              />
            </div>
          )}

          {/* Corner Brackets Target Overlay */}
          <div className="absolute inset-6 border-2 border-transparent pointer-events-none flex flex-col justify-between">
            <div className="flex justify-between">
              <div className="w-8 h-8 border-t-4 border-l-4 border-[#00C9A7] rounded-tl-xl shadow-[0_0_10px_#00C9A7]" />
              <div className="w-8 h-8 border-t-4 border-r-4 border-[#00C9A7] rounded-tr-xl shadow-[0_0_10px_#00C9A7]" />
            </div>
            <div className="flex justify-between">
              <div className="w-8 h-8 border-b-4 border-l-4 border-[#00C9A7] rounded-bl-xl shadow-[0_0_10px_#00C9A7]" />
              <div className="w-8 h-8 border-b-4 border-r-4 border-[#00C9A7] rounded-br-xl shadow-[0_0_10px_#00C9A7]" />
            </div>
          </div>

          {/* Bottom Card Overlay: Detected Employee Badge */}
          <div className="absolute bottom-4 left-4 right-4 bg-white/95 backdrop-blur-md rounded-2xl p-3 text-slate-800 shadow-xl border border-white/40 animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-[#0A2540] text-[#00C9A7] flex items-center justify-center font-bold text-sm flex-shrink-0">
                {isLeader ? 'RS' : 'AK'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="font-display font-bold text-sm text-[#0A2540] truncate">{personName}</h3>
                  <span className="text-[9px] font-mono font-bold bg-[#00C9A7]/20 text-[#00A88B] px-1.5 py-0.2 rounded">
                    {personCode}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 font-semibold">{personRole}</p>
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono mt-0.5">
                  <span>{personDept}</span>
                  <strong className="text-emerald-600 font-bold">{personTime}</strong>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Liveness Instruction Banner */}
        <div className="mt-4 text-center">
          {scanningState === 'INITIAL' && (
            <p className="text-xs font-semibold text-slate-300">
              👁️ Look directly at the camera &amp; keep your face centered
            </p>
          )}
          {scanningState === 'SCANNING' && (
            <div className="space-y-1.5">
              <p className="text-xs font-bold text-[#00C9A7] animate-pulse">
                ⚡ Analyzing 128 Facial Keypoints ({progress}%)
              </p>
              <div className="w-48 h-1.5 bg-slate-800 rounded-full mx-auto overflow-hidden">
                <div className="h-full bg-[#00C9A7] transition-all duration-150" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}
          {scanningState === 'MATCHED' && (
            <p className="text-xs font-extrabold text-emerald-400 flex items-center justify-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              <span>Face Verified • 99.6% Biometric Confidence</span>
            </p>
          )}
        </div>

      </div>

      {/* 3. Bottom Action Controls */}
      <div className="space-y-2 pt-2">
        {scanningState === 'INITIAL' ? (
          <button
            onClick={startFaceScan}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#00C9A7] to-[#00B4D8] hover:brightness-110 text-[#0A2540] font-black text-sm shadow-xl shadow-[#00C9A7]/30 flex items-center justify-center gap-2.5 active:scale-95 transition-all"
          >
            <Camera className="w-5 h-5 stroke-[2.5]" />
            <span>Capture &amp; Verify Face ID</span>
          </button>
        ) : scanningState === 'SCANNING' ? (
          <button
            disabled
            className="w-full py-4 rounded-2xl bg-slate-800 text-slate-400 font-bold text-xs flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4 animate-spin text-[#00C9A7]" />
            <span>Matching Face with HR Records...</span>
          </button>
        ) : (
          <button
            onClick={() => setAuthStep('ATTENDANCE_SUCCESS')}
            className="w-full py-4 rounded-2xl bg-emerald-500 text-white font-black text-sm shadow-xl shadow-emerald-500/30 flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-5 h-5 stroke-[3]" />
            <span>Attendance Verified ✓</span>
          </button>
        )}

        <button
          onClick={() => setAuthStep('LOGIN')}
          className="w-full text-center text-xs font-semibold text-slate-400 hover:text-white py-1"
        >
          Back to Login
        </button>
      </div>

    </div>
  );
};
