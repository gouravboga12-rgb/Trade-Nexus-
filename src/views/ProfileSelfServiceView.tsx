import React, { useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { useScreenData } from '../hooks/useScreenData';
import { 
  ArrowLeft,
  Bell,
  MoreVertical,
  User,
  FileText, 
  Download, 
  CheckCircle2, 
  ChevronRight, 
  Clock, 
  LogOut,
  Calendar,
  CheckSquare,
  QrCode,
  Award,
  Briefcase,
  CreditCard,
  Video
} from 'lucide-react';

export const ProfileSelfServiceView: React.FC = () => {
  const { 
    profile, 
    payslips, 
    teamTasks,
    teamMeetings,
    joinMeeting,
    toggleTaskStatus,
    setIsIdCardModalOpen,
    setSelectedIdCardEmpId, 
    openPayslipModal, 
    openOfferLetterModal,
    openExperienceCertModal,
    openRelievingLetterModal,
    offerLetters,
    experienceCerts,
    relievingLetters, 
    setIsRecentPayslipsModalOpen,
    setActiveTab,
    logout, 
    triggerToast 
  } = useApp();

  const myOfferLetter = offerLetters.find(o => 
    (o.candidateName && o.candidateName.toLowerCase() === profile.name.toLowerCase()) ||
    (o.candidateEmail && o.candidateEmail.toLowerCase() === (profile.email || '').toLowerCase())
  );

  const myExperienceCert = experienceCerts.find(c => 
    (c.empCode && c.empCode.toLowerCase() === profile.empCode.toLowerCase()) || 
    (c.employeeName && c.employeeName.toLowerCase() === profile.name.toLowerCase())
  );

  const myRelievingLetter = relievingLetters.find(r => 
    (r.empCode && r.empCode.toLowerCase() === profile.empCode.toLowerCase()) || 
    (r.employeeName && r.employeeName.toLowerCase() === profile.name.toLowerCase())
  );

  useScreenData('profileSelfService');

  const MONTH_ORDER: Record<string, number> = {
    january: 1, jan: 1, february: 2, feb: 2, march: 3, mar: 3,
    april: 4, apr: 4, may: 5, june: 6, jun: 6, july: 7, jul: 7,
    august: 8, aug: 8, september: 9, sep: 9, october: 10, oct: 10,
    november: 11, nov: 11, december: 12, dec: 12
  };

  // Strict Rolling 3-Month Window: Deduplicated & Chronologically Sorted (Newest First)
  const rollingPayslips = useMemo(() => {
    const seen = new Set<string>();
    const unique = payslips.filter((p) => {
      const key = `${p.month.toLowerCase()}-${p.year}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    unique.sort((a, b) => {
      if (b.year !== a.year) return b.year - a.year;
      const aM = MONTH_ORDER[a.month.toLowerCase()] || 0;
      const bM = MONTH_ORDER[b.month.toLowerCase()] || 0;
      return bM - aM;
    });

    return unique.slice(0, 3);
  }, [payslips]);

  const latestPayslip = rollingPayslips[0];

  const isCheckedIn = profile.faceIdStatus === 'VERIFIED_PRESENT' && profile.checkInTime;
  const isShiftEnded = profile.faceIdStatus === 'ON_BREAK';

  const myTasks = (teamTasks || []).filter(
    (t) =>
      !t.assignedTo ||
      t.assignedTo.toLowerCase() === (profile.name || '').toLowerCase() ||
      (profile.name && t.assignedTo.toLowerCase().includes(profile.name.toLowerCase())) ||
      t.assignedTo === 'All'
  );

  return (
    <div className="flex flex-col gap-3.5 pb-24 pt-1 px-3 sm:px-4 max-w-lg mx-auto select-none">
      
      {/* 1. Header Navigation Bar (Back, Notifications, More Options) */}
      <div className="flex items-center justify-between pt-0.5">
        <button
          onClick={() => setActiveTab('home')}
          className="w-8 h-8 rounded-xl bg-white border border-slate-100 shadow-[0_2px_6px_rgba(0,0,0,0.03)] flex items-center justify-center text-slate-700 hover:bg-slate-50 active:scale-95 transition-all"
        >
          <ArrowLeft className="w-4 h-4 text-slate-700" />
        </button>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => triggerToast('🔔 2 pending callbacks and 1 leave approval')}
            className="w-8 h-8 rounded-xl bg-white border border-slate-100 shadow-[0_2px_6px_rgba(0,0,0,0.03)] flex items-center justify-center text-slate-700 hover:bg-slate-50 relative active:scale-95 transition-all"
          >
            <Bell className="w-4 h-4 text-slate-700" />
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-amber-500 ring-2 ring-white" />
          </button>

          <button
            onClick={() => triggerToast('Profile options')}
            className="w-8 h-8 rounded-xl bg-white border border-slate-100 shadow-[0_2px_6px_rgba(0,0,0,0.03)] flex items-center justify-center text-slate-700 hover:bg-slate-50 active:scale-95 transition-all"
          >
            <MoreVertical className="w-4 h-4 text-slate-700" />
          </button>
        </div>
      </div>

      {/* 2. Elevated White Identity Card */}
      <div className="rounded-3xl p-4 bg-white border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] space-y-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-[#D4F6ED] flex items-center justify-center text-[#0A2540] font-display font-black text-lg flex-shrink-0 shadow-2xs">
              {profile.name ? profile.name.trim().split(' ').filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase() : 'EM'}
            </div>
            <div>
              <h2 className="font-display font-black text-base text-[#0A2540] tracking-tight">
                {profile.name || 'Employee Profile'}
              </h2>
              <p className="text-xs font-bold text-[#00A88B]">
                {profile.roleTitle ? profile.roleTitle.replace(/telecaller/gi, 'Sales Executive') : 'Sales Executive'}
              </p>
              <p className="text-[10px] text-slate-400 font-medium">
                {profile.department || 'Sales'}
              </p>
            </div>
          </div>

          <span className="font-mono text-[10px] font-bold bg-[#E8FAF5] text-[#00A88B] border border-[#BCEFE3] px-2 py-0.5 rounded-lg">
            {profile.empCode || '—'}
          </span>
        </div>

        {/* Bottom Status Pill Strip */}
        <div className="bg-[#F1FAF7] rounded-xl py-1.5 px-2.5 flex items-center justify-between text-[11px] font-semibold text-slate-700 border border-[#E0F5EE]/80">
          <div className="flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isCheckedIn ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
            <span className="text-[10px] font-medium text-slate-700">
              {isCheckedIn ? `On Duty (${profile.checkInTime})` : isShiftEnded ? 'Shift Completed' : 'Shift Inactive'}
            </span>
          </div>

          <span className="h-3 w-px bg-slate-200/80" />

          <div className="flex items-center gap-1 text-slate-600">
            <User className="w-3 h-3 text-[#00A88B] flex-shrink-0" />
            <span className="text-[10px] text-slate-600">
              Team Leader: <strong className="text-slate-800 font-bold">{profile.teamLeaderName || 'Unassigned'}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* 3. Digital ID Card Row - Sleek, Compact & Mobile-proportioned */}
      <div 
        onClick={() => setIsIdCardModalOpen(true)}
        className="rounded-2xl py-2.5 px-3.5 bg-white border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.03)] cursor-pointer hover:border-slate-200 transition-all flex items-center justify-between group active:scale-[0.99]"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#E8FAF5] text-[#00A88B] border border-[#C6F2E7]/80 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-[#00A88B]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="5" width="18" height="15" rx="3" />
              <circle cx="12" cy="11" r="2.5" />
              <path d="M8 17c0-1.8 1.8-3 4-3s4 1.2 4 3" />
              <path d="M10 2h4" />
              <path d="M10 2v3" />
              <path d="M14 2v3" />
            </svg>
          </div>
          <div>
            <h4 className="font-display font-bold text-xs text-[#0A2540]">
              Digital ID Card
            </h4>
            <p className="text-[10px] text-slate-400 font-medium">
              View your official ID card
            </p>
          </div>
        </div>

        <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700 transition-transform group-hover:translate-x-0.5" />
      </div>

      {/* 4. Section: Salary & Disbursements */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <span className="font-display font-bold text-sm text-[#0A2540]">
            Salary & Disbursements
          </span>
          <span className="text-xs font-semibold text-[#00A88B] flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Direct Bank Credit
          </span>
        </div>

        {latestPayslip ? (
          <div className="rounded-3xl p-4 sm:p-5 bg-white border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-[#E8FAF5] text-[#00A88B] border border-[#C6F2E7]/80 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h4 className="font-display font-bold text-sm text-[#0A2540]">
                    {latestPayslip.month} {latestPayslip.year} Statement
                  </h4>
                  <span className="text-[11px] text-slate-400 font-medium">
                    Disbursed: {latestPayslip.generatedDate}
                  </span>
                </div>
              </div>

              <span className="text-[11px] font-bold text-[#00A88B] bg-[#E8FAF5] border border-[#BCEFE3] px-2.5 py-0.5 rounded-full">
                ✓ PAID
              </span>
            </div>

            {/* Net Take Home Highlight Box */}
            <div className="bg-[#F1FAF7] rounded-2xl p-3.5 px-4 flex items-center justify-between border border-[#DCF5ED]">
              <div>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block font-sans">
                  NET TAKE-HOME
                </span>
                <span className="font-mono-nums font-black text-xl text-[#0A2540] tracking-tight">
                  ₹{latestPayslip.netPay.toLocaleString()}
                </span>
              </div>

              <button
                onClick={() => openPayslipModal(latestPayslip)}
                className="px-3.5 py-2 rounded-xl bg-[#00C29F] hover:bg-[#00B4D8] text-white font-bold text-xs shadow-sm shadow-[#00C29F]/20 flex items-center gap-1.5 active:scale-95 transition-all"
              >
                <Download className="w-3.5 h-3.5" />
                <span>View Slip</span>
              </button>
            </div>

            {/* Single Clean Statement History Button */}
            <button
              onClick={() => setIsRecentPayslipsModalOpen(true)}
              className="w-full py-2.5 px-3 rounded-2xl bg-[#F8FAFB] hover:bg-[#F0F5F4] border border-slate-100/90 flex items-center justify-between group active:scale-[0.99] transition-all"
            >
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-[#E8FAF5] text-[#00A88B] flex items-center justify-center flex-shrink-0">
                  <Clock className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-bold text-[#0A2540]">
                  View All Payslips
                </span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700 transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>
        ) : (
          <div className="rounded-3xl p-4 bg-white border border-slate-100 shadow-sm text-center">
            <p className="text-xs text-slate-500 font-medium">No salary statements issued yet.</p>
          </div>
        )}
      </div>

      {/* 5. Section: Official Documents & Vault */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <span className="font-display font-bold text-sm text-[#0A2540]">
            Official Documents & Vault
          </span>
          <span className="text-[11px] font-bold text-slate-400">
            Verified Records
          </span>
        </div>

        <div className="space-y-2">
          {/* Card 1: Digital ID Card */}
          <div 
            onClick={() => {
              setSelectedIdCardEmpId(profile.id || profile.empCode);
              setIsIdCardModalOpen(true);
            }}
            className="rounded-3xl p-3.5 px-4 bg-white border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex items-center justify-between cursor-pointer hover:border-slate-200 transition-all group active:scale-[0.99]"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#06152B] text-[#00C9A7] border border-[#00C9A7]/30 flex items-center justify-center flex-shrink-0">
                <QrCode className="w-4.5 h-4.5" />
              </div>
              <div>
                <h4 className="font-display font-bold text-sm text-[#0A2540]">
                  Official Digital ID Card
                </h4>
                <p className="text-[11px] text-slate-400 font-medium">
                  Badge: {profile.empCode} • Dual-Sided QR
                </p>
              </div>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                setSelectedIdCardEmpId(profile.id || profile.empCode);
                setIsIdCardModalOpen(true);
              }}
              className="w-8 h-8 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 text-slate-600 flex items-center justify-center transition-all shadow-2xs"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Card 2: Offer & Appointment Letter */}
          <div 
            onClick={() => openOfferLetterModal(myOfferLetter)}
            className="rounded-3xl p-3.5 px-4 bg-white border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex items-center justify-between cursor-pointer hover:border-slate-200 transition-all group active:scale-[0.99]"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-[#5B3DF5] border border-indigo-100 flex items-center justify-center flex-shrink-0">
                <FileText className="w-4.5 h-4.5" />
              </div>
              <div>
                <h4 className="font-display font-bold text-sm text-[#0A2540]">
                  Job Offer & Contract
                </h4>
                <p className="text-[11px] text-slate-400 font-medium">
                  {myOfferLetter ? `Issued: ${myOfferLetter.issuedDate}` : 'Official Appointment Letter'}
                </p>
              </div>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                openOfferLetterModal(myOfferLetter);
              }}
              className="w-8 h-8 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 text-slate-600 flex items-center justify-center transition-all shadow-2xs"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Card 3: Experience Certificate */}
          <div 
            onClick={() => openExperienceCertModal(myExperienceCert)}
            className="rounded-3xl p-3.5 px-4 bg-white border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex items-center justify-between cursor-pointer hover:border-slate-200 transition-all group active:scale-[0.99]"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center flex-shrink-0">
                <Award className="w-4.5 h-4.5" />
              </div>
              <div>
                <h4 className="font-display font-bold text-sm text-[#0A2540]">
                  Experience Certificate
                </h4>
                <p className="text-[11px] text-slate-400 font-medium">
                  {myExperienceCert ? `Ref: ${myExperienceCert.refNumber}` : 'Service Verification Record'}
                </p>
              </div>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                openExperienceCertModal(myExperienceCert);
              }}
              className="w-8 h-8 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 text-slate-600 flex items-center justify-center transition-all shadow-2xs"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Card 4: Relieving Letter (If issued or on-demand) */}
          <div 
            onClick={() => openRelievingLetterModal(myRelievingLetter)}
            className="rounded-3xl p-3.5 px-4 bg-white border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex items-center justify-between cursor-pointer hover:border-slate-200 transition-all group active:scale-[0.99]"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-teal-50 text-[#00A88B] border border-teal-100 flex items-center justify-center flex-shrink-0">
                <Briefcase className="w-4.5 h-4.5" />
              </div>
              <div>
                <h4 className="font-display font-bold text-sm text-[#0A2540]">
                  Relieving Letter
                </h4>
                <p className="text-[11px] text-slate-400 font-medium">
                  {myRelievingLetter ? `LWD: ${myRelievingLetter.lastWorkingDate}` : 'Exit Clearance & Seal'}
                </p>
              </div>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                openRelievingLetterModal(myRelievingLetter);
              }}
              className="w-8 h-8 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 text-slate-600 flex items-center justify-center transition-all shadow-2xs"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 6. Section: Assigned Tasks & Team Meetings */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <span className="font-display font-bold text-sm text-[#0A2540]">
            Assigned Tasks & Standups
          </span>
          <span className="text-[11px] font-bold text-slate-400">
            {myTasks.filter((t) => t.status !== 'COMPLETED').length} Pending
          </span>
        </div>

        {/* Tasks List */}
        {myTasks.length > 0 ? (
          <div className="space-y-2">
            {myTasks.map((t) => (
              <div 
                key={t.id}
                onClick={() => toggleTaskStatus(t.id)}
                className="rounded-2xl p-3.5 bg-white border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.03)] cursor-pointer hover:border-slate-200 transition-all flex items-start gap-3"
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleTaskStatus(t.id);
                  }}
                  className={`mt-0.5 w-5 h-5 rounded-lg flex items-center justify-center border transition-all ${
                    t.status === 'COMPLETED'
                      ? 'bg-emerald-500 border-emerald-500 text-white'
                      : t.status === 'IN_PROGRESS'
                      ? 'bg-amber-50 border-amber-300 text-amber-600'
                      : 'border-slate-300 hover:border-[#00C9A7]'
                  }`}
                >
                  {t.status === 'COMPLETED' ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                  ) : t.status === 'IN_PROGRESS' ? (
                    <Clock className="w-3 h-3 text-amber-600" />
                  ) : null}
                </button>
                <div className="flex-1 min-w-0">
                  <h4 className={`text-xs font-bold leading-snug ${t.status === 'COMPLETED' ? 'line-through text-slate-400' : 'text-[#0A2540]'}`}>
                    {t.title}
                  </h4>
                  <div className="flex items-center gap-2 mt-1 text-[10px]">
                    <span className={`font-bold px-1.5 py-0.5 rounded ${
                      t.priority === 'HIGH' ? 'bg-rose-50 text-rose-600 border border-rose-200' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {t.priority}
                    </span>
                    <span className="text-slate-400 font-mono">Due: {t.dueDate}</span>
                    <span className={`font-semibold ml-auto ${
                      t.status === 'COMPLETED' ? 'text-emerald-600' : t.status === 'IN_PROGRESS' ? 'text-amber-600' : 'text-slate-400'
                    }`}>
                      {t.status === 'COMPLETED' ? 'Done' : t.status === 'IN_PROGRESS' ? 'In Progress' : 'To Do'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl p-3 bg-white border border-slate-100 text-center">
            <p className="text-xs text-slate-400">No pending tasks assigned.</p>
          </div>
        )}

        {/* Team Meetings */}
        {teamMeetings.length > 0 && (
          <div className="space-y-1.5 pt-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1">
              Upcoming Team Standups
            </span>
            {teamMeetings.filter(m => m.status !== 'COMPLETED').slice(0, 3).map((mtg) => (
              <div 
                key={mtg.id}
                className="rounded-2xl p-3 bg-[#F8FAFB] border border-slate-100/90 flex items-center justify-between gap-2"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 border border-sky-100 flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h5 className="font-display font-bold text-xs text-[#0A2540] truncate">{mtg.title}</h5>
                      {mtg.zoomMeetingId && (
                        <span className="text-[9px] font-mono font-bold bg-blue-100 text-blue-800 px-1 rounded">
                          Zoom
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 font-medium truncate">{mtg.dateTime} • {mtg.location}</p>
                  </div>
                </div>
                <button
                  onClick={() => joinMeeting(mtg)}
                  className="px-2.5 py-1 bg-[#00C9A7] hover:bg-[#00B4D8] text-[#0A2540] font-black text-xs rounded-xl flex items-center gap-1 cursor-pointer transition-all active:scale-95 flex-shrink-0"
                >
                  <Video className="w-3 h-3" />
                  <span>Join</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 7. Sign Out Button */}
      <div className="pt-1">
        <button
          onClick={logout}
          className="w-full py-3 rounded-2xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-black text-xs flex items-center justify-center gap-2 shadow-xs active:scale-98 transition-all"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out of Account</span>
        </button>

        <p className="text-center text-[10px] text-slate-400 font-medium pt-2.5">
          Trade Nexus Mobile • Employee Portal
        </p>
      </div>

    </div>
  );
};
