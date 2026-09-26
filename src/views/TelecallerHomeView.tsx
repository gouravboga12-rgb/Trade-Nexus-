import React from 'react';
import { useApp } from '../context/AppContext';
import { useScreenData } from '../hooks/useScreenData';
import { 
  CheckCircle2, 
  Phone, 
  Plus, 
  AlertTriangle, 
  PhoneCall, 
  Clock, 
  Target,
  UserCheck,
  LogOut,
  Camera,
  Check,
  RotateCcw,
  Video,
  Award,
  ArrowRight,
  ArrowUpRight
} from 'lucide-react';

export const TelecallerHomeView: React.FC = () => {
  const { 
    currentUser,
    profile, 
    stats, 
    myLeads, 
    assignedLeads,
    teamMeetings,
    joinMeeting,
    setIsFaceIdModalOpen, 
    setIsQuickCallModalOpen, 
    setActiveCallingLead,
    openCallModalForLead,
    openPunchIn,
    openPunchOut,
    triggerToast,
    setActiveTab,
    setClientPipelineTab
  } = useApp();

  const { isLoading } = useScreenData('telecallerHome');

  const empId = currentUser?.employeeId || currentUser?.id || profile.id;
  const empCode = currentUser?.empCode || profile.empCode;
  const empName = currentUser?.name || profile.name || 'Sales Rep';
  const empFirstName = empName.split(' ')[0] || 'Sales Rep';

  // Callback lead due today or first in queue from allocated leads
  const urgentLead = myLeads.find(c => c.status === 'Due Today') || myLeads[0];
  const goalPercentage = Math.round((stats.dialsMade / Math.max(1, stats.todayGoalCalls)) * 100);
  const tgtPercentage = Math.round((stats.monthlySalesAchieved / Math.max(1, stats.monthlySalesTarget)) * 100);

  const inr = (n: number) => `₹${n.toLocaleString('en-IN')}`;
  const remainingToTarget = Math.max(0, stats.monthlySalesTarget - stats.monthlySalesAchieved);

  // User's assigned leads & pipeline breakdown strictly for this authenticated employee
  const userLeads = assignedLeads.filter(l => 
    (empId && l.assignedToEmployeeId === empId) || 
    (empCode && l.assignedToEmployeeId === empCode) || 
    (empName && l.assignedToEmployeeName && l.assignedToEmployeeName.toLowerCase() === empName.toLowerCase())
  );
  const wonCount = userLeads.filter(l => l.status === 'CONVERTED').length;
  const followUpCount = userLeads.filter(l => l.status === 'CALLBACK').length;
  const toCallCount = userLeads.filter(l => l.status === 'PENDING').length;

  const isPunchedIn = profile.faceIdStatus === 'VERIFIED_PRESENT' && !!profile.checkInTime;
  const isShiftEnded = profile.faceIdStatus === 'ON_BREAK';

  const handleInstantCall = () => {
    if (!urgentLead) return;
    const matched = assignedLeads.find(l => l.id === urgentLead.id || l.phone === urgentLead.phone);
    if (matched) {
      openCallModalForLead(matched);
    } else {
      setActiveCallingLead(null);
      setIsQuickCallModalOpen(true);
    }
    window.location.href = `tel:${urgentLead.phone}`;
  };

  return (
    <div className="flex flex-col gap-4 pb-28 pt-2 px-3 sm:px-4 max-w-lg mx-auto">
      
      {/* 1. Personalized Greeting with Online Status */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <div className="flex items-center gap-1.5">
            <h2 className="font-display font-black text-xl text-[#0A2540] tracking-tight">
              Hello, <span className="text-[#00A88B]">{empFirstName}</span>
            </h2>
            <span className="text-lg">👋</span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-slate-500 font-semibold">{profile.roleTitle}</span>
            {isPunchedIn ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Active Shift
              </span>
            ) : isShiftEnded ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                Shift Ended
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                Off Duty
              </span>
            )}
          </div>
        </div>

        {/* User Mini Avatar Badge */}
        <div className="w-9 h-9 rounded-xl bg-[#0A2540] text-[#00C9A7] flex items-center justify-center font-black text-xs shadow-sm">
          {profile.name.substring(0, 2).toUpperCase()}
        </div>
      </div>

      {/* 🔴 Live Zoom Meeting Banner on Mobile */}
      {(() => {
        const liveMeeting = teamMeetings.find(m => m.status === 'LIVE');
        if (!liveMeeting) return null;
        return (
          <div className="p-3.5 bg-gradient-to-r from-emerald-50 via-teal-50 to-blue-50 border-2 border-emerald-500 rounded-2xl flex items-center justify-between gap-3 shadow-sm animate-in slide-in-from-top-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="relative flex h-3 w-3 flex-shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-600"></span>
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[9px] font-black bg-emerald-200 text-emerald-900 px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                    🔴 Live Zoom Call
                  </span>
                  {liveMeeting.zoomMeetingId && (
                    <span className="text-[9px] font-mono font-bold bg-blue-100 text-blue-800 px-1 rounded">
                      ID: {liveMeeting.zoomMeetingId}
                    </span>
                  )}
                </div>
                <h4 className="font-bold text-xs text-[#0A2540] truncate mt-0.5">
                  {liveMeeting.title}
                </h4>
                <p className="text-[10px] text-slate-500 truncate">
                  Host: {liveMeeting.hostName || 'Leader'} · Tap to join instantly
                </p>
              </div>
            </div>

            <button
              onClick={() => joinMeeting(liveMeeting)}
              className="px-3.5 py-2 bg-[#00C9A7] hover:bg-[#00B4D8] text-[#0A2540] font-black text-xs rounded-xl flex items-center gap-1.5 shadow-md shadow-[#00C9A7]/30 flex-shrink-0 active:scale-95 transition-all cursor-pointer"
            >
              <Video className="w-3.5 h-3.5" />
              <span>Join Zoom</span>
            </button>
          </div>
        );
      })()}

      {/* 2. Clear Punch In / Punch Out Attendance Lifecycle */}
      {!isPunchedIn && !isShiftEnded && (
        <div className="nexus-card p-4 bg-gradient-to-r from-amber-500/10 via-amber-50/50 to-white border border-amber-300 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-display font-bold text-sm text-[#0A2540]">Morning Punch In</h4>
              <p className="text-[11px] text-slate-500 font-medium">Verify face to begin your shift</p>
            </div>
          </div>
          <button
            onClick={openPunchIn}
            className="px-3.5 py-2 rounded-xl bg-[#00C9A7] hover:bg-[#00B4D8] text-[#0A2540] font-extrabold text-xs shadow-sm active:scale-95 transition-all"
          >
            Punch In
          </button>
        </div>
      )}

      {isPunchedIn && (
        <div className="nexus-card p-3.5 bg-gradient-to-r from-[#E6FAF6]/90 via-white to-white border border-[#00C9A7]/30 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#00C9A7]/15 text-[#00A88B] flex items-center justify-center flex-shrink-0">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h4 className="font-display font-bold text-sm text-[#0A2540]">On Duty</h4>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                Punched in: <strong className="text-[#00A88B] font-mono">{profile.checkInTime}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={openPunchOut}
              title="End shift with face scan"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-black transition-all active:scale-95 shadow-xs"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Punch Out</span>
            </button>
          </div>
        </div>
      )}

      {isShiftEnded && (
        <div className="nexus-card p-3.5 bg-slate-50 border border-slate-200 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200/80 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="w-4.5 h-4.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-display font-bold text-xs text-slate-800">Shift Completed</h4>
                <span className="text-[9px] font-bold uppercase tracking-wider bg-slate-200/70 text-slate-600 px-1.5 py-0.5 rounded">
                  Punched Out
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                {profile.checkInTime} → {profile.checkOutTime || '06:30 PM'}
              </p>
            </div>
          </div>
          
          <button
            onClick={openPunchIn}
            title="Need to resume calling? Punch in again"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#00C9A7] hover:bg-[#00B4D8] text-[#0A2540] font-black text-xs shadow-xs active:scale-95 transition-all flex-shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Punch In Again</span>
          </button>
        </div>
      )}

      {/* 3. Today's Calling Goal Progress Card */}
      <div className="nexus-card p-4 bg-white border border-slate-200 shadow-sm flex flex-col justify-between">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-display font-extrabold text-sm text-[#0A2540] tracking-tight">Today's Calling Goal</h3>
            <p className="text-[11px] text-slate-400 font-medium">Calls completed against your daily target</p>
          </div>
          <div className="flex items-center gap-1 text-[11px] font-bold text-[#00A88B] bg-[#E6FAF6] px-2.5 py-1 rounded-lg">
            <Target className="w-3.5 h-3.5" />
            <span>Target: {stats.todayGoalCalls} Calls</span>
          </div>
        </div>

        <div className="flex items-center gap-3.5">
          {/* Circular Progress Gauge */}
          <div className="relative w-22 h-22 flex-shrink-0 flex items-center justify-center">
            <svg className="w-22 h-22 transform -rotate-90" viewBox="0 0 80 80">
              <circle
                cx="40"
                cy="40"
                r="32"
                className="stroke-slate-100"
                strokeWidth="7"
                fill="transparent"
              />
              <circle
                cx="40"
                cy="40"
                r="32"
                stroke="#00C9A7"
                strokeWidth="7"
                strokeDasharray="201"
                strokeDashoffset={201 - (201 * Math.min(100, goalPercentage)) / 100}
                strokeLinecap="round"
                fill="transparent"
                className="transition-all duration-1000 ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="font-display font-black text-xl text-[#0A2540] leading-none">
                {goalPercentage}%
              </span>
              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                DONE
              </span>
            </div>
          </div>

          {/* 4 Metric Chips */}
          <div className="flex-1 grid grid-cols-2 gap-2">
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-2">
              <div className="flex items-center gap-1 text-slate-500 mb-0.5">
                <Phone className="w-3 h-3 text-[#00C9A7]" />
                <span className="text-[10px] font-bold">Dials</span>
              </div>
              <span className="font-mono-nums font-black text-base text-[#0A2540]">{stats.dialsMade}</span>
            </div>

            <div className="bg-slate-50 border border-slate-100 rounded-xl p-2">
              <div className="flex items-center gap-1 text-slate-500 mb-0.5">
                <PhoneCall className="w-3 h-3 text-sky-500" />
                <span className="text-[10px] font-bold">Connected</span>
              </div>
              <span className="font-mono-nums font-black text-base text-sky-600">{stats.connected}</span>
            </div>

            <div className="bg-slate-50 border border-slate-100 rounded-xl p-2">
              <div className="flex items-center gap-1 text-slate-500 mb-0.5">
                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                <span className="text-[10px] font-bold">Interested</span>
              </div>
              <span className="font-mono-nums font-black text-base text-emerald-600">{stats.interested}</span>
            </div>

            <div className="bg-slate-50 border border-slate-100 rounded-xl p-2">
              <div className="flex items-center gap-1 text-slate-500 mb-0.5">
                <AlertTriangle className="w-3 h-3 text-rose-500" />
                <span className="text-[10px] font-bold">Rejected</span>
              </div>
              <span className="font-mono-nums font-black text-base text-rose-500">{stats.rejected}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Monthly Sales Target Progress Bar */}
      <div className="nexus-card p-4 bg-white border border-slate-200 shadow-sm flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-2">
            <div>
              <h4 className="font-display font-bold text-sm text-[#0A2540]">Monthly Sales Incentive Target</h4>
              <p className="text-[11px] text-slate-400 font-medium">Revenue quota towards your bonus</p>
            </div>
            <div className="text-right">
              <span className="text-sm font-mono-nums font-extrabold text-[#00A88B]">
                {tgtPercentage}%
              </span>
              <span className="text-[10px] text-slate-400 font-semibold block">Achieved</span>
            </div>
          </div>

          <div className="flex items-baseline justify-between font-mono-nums text-xs mb-3">
            <span className="font-extrabold text-base text-[#0A2540]">
              {inr(stats.monthlySalesAchieved)}
            </span>
            <span className="text-slate-400 font-semibold text-xs">
              / {inr(stats.monthlySalesTarget)}
            </span>
          </div>

          {/* Progress Bar Track */}
          <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden mb-2.5">
            <div 
              className="h-full bg-gradient-to-r from-[#00C9A7] to-[#00B4D8] rounded-full transition-all duration-700"
              style={{ width: `${Math.min(100, tgtPercentage)}%` }}
            />
          </div>
        </div>

        <div className="bg-slate-50 p-2.5 rounded-xl text-xs text-slate-600 flex justify-between font-medium">
          <span>Remaining to hit incentive:</span>
          <span className="font-bold font-mono text-[#00A88B]">{inr(remainingToTarget)}</span>
        </div>
      </div>

      {/* 5. Premium App Quick-Actions Grid: Won Deals & Due Callbacks */}
      <div className="grid grid-cols-2 gap-3">
        {/* Tile 1: Won Deals */}
        <div 
          onClick={() => {
            setClientPipelineTab('WON');
            setActiveTab('clients');
          }}
          className="group relative bg-white hover:bg-emerald-50/25 border border-slate-200/90 hover:border-emerald-300 rounded-3xl p-3.5 shadow-xs hover:shadow-md transition-all duration-200 active:scale-[0.97] cursor-pointer flex flex-col justify-between min-h-[134px] overflow-hidden"
        >
          {/* Subtle ambient luxury aura */}
          <div className="absolute -top-6 -right-6 w-20 h-20 bg-emerald-400/10 rounded-full blur-xl pointer-events-none" />

          {/* Top Row: Icon + Arrow Chip */}
          <div className="flex items-center justify-between relative z-10">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200/70 flex items-center justify-center shadow-2xs">
              <Award className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div className="w-7 h-7 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center justify-center text-slate-400 group-hover:text-emerald-600 group-hover:bg-emerald-50 group-hover:border-emerald-200 transition-colors">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>

          {/* Bottom Area: Large Metric + Label + Revenue Tag */}
          <div className="space-y-1 relative z-10 mt-3">
            <div className="flex items-baseline gap-1.5">
              <span className="font-display font-black text-2xl text-[#0A2540] tracking-tight leading-none">
                {wonCount}
              </span>
              <span className="text-[11px] font-bold text-slate-400">
                / {userLeads.length} leads
              </span>
            </div>
            
            <h4 className="font-display font-bold text-xs text-[#0A2540] tracking-tight">
              Won Deals
            </h4>

            <div className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200/70 mt-0.5">
              <span>{inr(stats.monthlySalesAchieved)}</span>
            </div>
          </div>
        </div>

        {/* Tile 2: Due Callbacks */}
        <div 
          onClick={() => {
            setClientPipelineTab('CALLBACK');
            setActiveTab('clients');
          }}
          className="group relative bg-white hover:bg-amber-50/25 border border-slate-200/90 hover:border-amber-300 rounded-3xl p-3.5 shadow-xs hover:shadow-md transition-all duration-200 active:scale-[0.97] cursor-pointer flex flex-col justify-between min-h-[134px] overflow-hidden"
        >
          {/* Subtle ambient warm aura */}
          <div className="absolute -top-6 -right-6 w-20 h-20 bg-amber-400/10 rounded-full blur-xl pointer-events-none" />

          {/* Top Row: Icon + Notification / Arrow Chip */}
          <div className="flex items-center justify-between relative z-10">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-700 border border-amber-200/70 flex items-center justify-center shadow-2xs">
              <Clock className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div className="w-7 h-7 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center justify-center text-slate-400 group-hover:text-amber-700 group-hover:bg-amber-50 group-hover:border-amber-200 transition-colors">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>

          {/* Bottom Area: Large Metric + Label + Status Tag */}
          <div className="space-y-1 relative z-10 mt-3 select-none">
            <div className="flex items-baseline gap-1.5">
              <span className="font-display font-black text-2xl text-[#0A2540] tracking-tight leading-none">
                {followUpCount}
              </span>
              <span className="text-[11px] font-bold text-slate-400">
                / {userLeads.length} leads
              </span>
            </div>
            
            <h4 className="font-display font-bold text-xs text-[#0A2540] tracking-tight">
              Due for Callback
            </h4>

            <div className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200/70 mt-0.5">
              <span>{toCallCount} calls scheduled</span>
            </div>
          </div>
        </div>
      </div>

      {/* 6. Clean Primary Log Call Action */}
      <button
        onClick={() => {
          setActiveCallingLead(null);
          setIsQuickCallModalOpen(true);
        }}
        className="w-full py-3.5 px-4 rounded-2xl bg-[#0A2540] hover:bg-[#12385f] text-white font-display font-extrabold text-xs flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-all"
      >
        <Plus className="w-4 h-4 text-[#00C9A7] stroke-[3]" />
        <span>+ Log an Unscheduled Call</span>
      </button>

    </div>
  );
};
