import React from 'react';
import { useApp } from '../../context/AppContext';
import { useScreenData } from '../../hooks/useScreenData';
import { 
  Phone, 
  PhoneCall, 
  CheckCircle2, 
  AlertTriangle, 
  TrendingUp, 
  UserCheck, 
  Clock, 
  Target, 
  Calendar, 
  Plus, 
  FileText, 
  ArrowUpRight,
  ShieldCheck,
  LogOut,
  Camera,
  RotateCcw,
  Video,
  Users,
  Award,
  ArrowRight
} from 'lucide-react';

export const DesktopTelecallerHome: React.FC = () => {
  const { 
    profile, 
    stats, 
    myLeads: clients, 
    assignedLeads,
    callLogs, 
    teamMeetings,
    joinMeeting,
    setIsFaceIdModalOpen, 
    setIsQuickCallModalOpen, 
    openPunchIn, 
    openPunchOut, 
    triggerToast, 
    setActiveTab,
    setClientPipelineTab 
  } = useApp();

  const { isLoading } = useScreenData('telecallerHome');

  // May be undefined while the pipeline loads, or when no leads are assigned yet
  const urgentLead = clients.find(c => c.status === 'Due Today') || clients[0];
  const goalPercentage = Math.round((stats.dialsMade / Math.max(1, stats.todayGoalCalls)) * 100);
  const tgtPercentage = Math.round((stats.monthlySalesAchieved / Math.max(1, stats.monthlySalesTarget)) * 100);

  const handleInstantCall = () => {
    if (!urgentLead) return;
    triggerToast(`📞 Dialing ${urgentLead.name} (${urgentLead.phone})...`);
    window.location.href = `tel:${urgentLead.phone}`;
    setTimeout(() => {
      setIsQuickCallModalOpen(true);
    }, 500);
  };

  const inr = (n: number) => `₹${n.toLocaleString('en-IN')}`;
  const pendingCallbacks = clients.filter(c => c.status === 'Due Today' || c.status === 'Follow-up').length;
  const dialsRemaining = Math.max(0, stats.todayGoalCalls - stats.dialsMade);
  const minsRemaining = Math.round((dialsRemaining * stats.averageCallDurationSec) / 60);

  // User's assigned leads & pipeline breakdown
  const userLeads = assignedLeads.filter(l => 
    !l.assignedToEmployeeId || 
    l.assignedToEmployeeId === profile.id || 
    (l.assignedToEmployeeName && l.assignedToEmployeeName.toLowerCase() === profile.name.toLowerCase()) || 
    l.assignedToEmployeeId === 'emp-101'
  );
  const wonCount = userLeads.filter(l => l.status === 'CONVERTED').length;
  const followUpCount = userLeads.filter(l => l.status === 'CALLBACK').length;
  const toCallCount = userLeads.filter(l => l.status === 'PENDING').length;
  const estRemaining = `${Math.floor(minsRemaining / 60)}h ${minsRemaining % 60}m`;
  const avgDuration = `${Math.floor(stats.averageCallDurationSec / 60)}m ${String(stats.averageCallDurationSec % 60).padStart(2, '0')}s`;

  const liveMeeting = teamMeetings.find(m => 
    m.status === 'LIVE' && 
    (!m.invitedMemberName || m.invitedMemberName.includes(profile.name) || m.invitedMemberName.toLowerCase().includes('all') || m.invitedMemberName.toLowerCase().includes('team'))
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      
      {/* 1. Page Header with Greeting & Quick Log Call CTA */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-display font-black text-2xl text-[#0A2540] tracking-tight">
              Welcome back, {profile.name}
            </h2>
            <span className="text-xl">👋</span>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            {profile.roleTitle} • {profile.department} • <strong className="text-emerald-600">● On Duty</strong>
          </p>
        </div>

        <div className="flex items-center gap-3">
          {profile.faceIdStatus === 'VERIFIED_PRESENT' && profile.checkInTime ? (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 bg-[#E6FAF6] border border-[#00C9A7]/30 text-[#00A88B] font-bold text-xs px-3.5 py-2.5 rounded-xl shadow-xs">
                <UserCheck className="w-4 h-4 text-emerald-600" />
                <span>On Duty · In: {profile.checkInTime}</span>
              </div>
              <button
                onClick={openPunchOut}
                title="End shift with face scan"
                className="flex items-center gap-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-extrabold text-xs px-3.5 py-2.5 rounded-xl transition-all active:scale-95 shadow-xs"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Punch Out</span>
              </button>
            </div>
          ) : profile.faceIdStatus === 'ON_BREAK' ? (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs px-3.5 py-2.5 rounded-xl">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Shift Ended ({profile.checkInTime} → {profile.checkOutTime || '06:30 PM'})</span>
              </div>
              <button
                onClick={openPunchIn}
                title="Need to resume calling? Punch in again"
                className="flex items-center gap-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-extrabold text-xs px-3.5 py-2.5 rounded-xl transition-all active:scale-95 shadow-xs"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Punch In Again</span>
              </button>
            </div>
          ) : (
            <button
              onClick={openPunchIn}
              className="flex items-center gap-2 bg-[#00C9A7] hover:bg-[#00B4D8] text-[#0A2540] font-extrabold text-xs px-4 py-2.5 rounded-xl shadow-sm transition-all active:scale-95"
            >
              <Camera className="w-4 h-4" />
              <span>Punch In (Face Scan)</span>
            </button>
          )}

          <button
            onClick={() => setIsQuickCallModalOpen(true)}
            className="flex items-center gap-2 bg-[#00C9A7] hover:bg-[#00B4D8] text-[#0A2540] font-extrabold text-xs px-5 py-2.5 rounded-xl shadow-md shadow-[#00C9A7]/20 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>+ Quick Log Call</span>
          </button>
        </div>
      </div>

      {/* 🔴 Live Team Meeting Banner (if active) */}
      {liveMeeting && (
        <div className="p-4 bg-gradient-to-r from-emerald-50 via-teal-50 to-cyan-50 border-2 border-emerald-500 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-4 shadow-md animate-in slide-in-from-top-2">
          <div className="flex items-center gap-3.5">
            <span className="relative flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-600"></span>
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  🔴 Live Team Meeting
                </span>
                <span className="text-xs font-mono text-emerald-800 font-bold">Conducted by Team Leader</span>
              </div>
              <h4 className="font-display font-black text-base text-[#0A2540] mt-0.5">
                {liveMeeting.title}
              </h4>
              <p className="text-xs text-slate-500 font-medium">
                {liveMeeting.invitedMemberName ? `Invited: ${liveMeeting.invitedMemberName}` : 'All team employees invited'} • Click Join to enter live video session
              </p>
            </div>
          </div>

          <button
            onClick={() => joinMeeting(liveMeeting)}
            className="px-6 py-2.5 bg-[#00C9A7] hover:bg-[#00B4D8] text-[#0A2540] font-black text-xs rounded-xl flex items-center gap-2 shadow-md shadow-[#00C9A7]/30 transition-all active:scale-95"
          >
            <Video className="w-4 h-4" />
            <span>Join Video Call</span>
          </button>
        </div>
      )}

      {/* 2. Top Row: 4 Full-Width Metric Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        
        {/* Card 1: Daily Calls Goal */}
        <div className="nexus-card p-5 bg-white border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Today's Calling Goal
            </span>
            <div className="flex items-baseline gap-2">
              <span className="font-mono-nums font-black text-2xl text-[#0A2540]">{stats.dialsMade}</span>
              <span className="text-xs font-bold text-slate-400">/ {stats.todayGoalCalls} Dials</span>
            </div>
            <span className="text-xs text-[#00A88B] font-extrabold mt-1 block">
              {goalPercentage}% Goal Achieved
            </span>
          </div>

          <div className="w-12 h-12 rounded-2xl bg-[#E6FAF6] text-[#00C9A7] flex items-center justify-center shadow-xs">
            <Phone className="w-6 h-6" />
          </div>
        </div>

        {/* Card 2: Connected Calls */}
        <div className="nexus-card p-5 bg-white border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Connected Calls
            </span>
            <div className="flex items-baseline gap-2">
              <span className="font-mono-nums font-black text-2xl text-sky-600">{stats.connected}</span>
              <span className="text-xs font-bold text-slate-400">Calls</span>
            </div>
            <span className="text-xs text-sky-600 font-bold mt-1 block">
              {Math.round((stats.connected / (stats.dialsMade || 1)) * 100)}% Connection Rate
            </span>
          </div>

          <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center shadow-xs">
            <PhoneCall className="w-6 h-6" />
          </div>
        </div>

        {/* Card 3: Monthly Sales (TGT) */}
        <div className="nexus-card p-5 bg-white border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Monthly Sales Target (TGT)
            </span>
            <div className="flex items-baseline gap-2">
              <span className="font-mono-nums font-black text-xl text-[#00A88B]">{inr(stats.monthlySalesAchieved)}</span>
              <span className="text-xs font-bold text-slate-400">/ {inr(stats.monthlySalesTarget)}</span>
            </div>
            <span className="text-xs text-[#00A88B] font-extrabold mt-1 block">
              {tgtPercentage}% Target Met
            </span>
          </div>

          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-xs">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        {/* Card 4: Interested & Pipeline */}
        <div className="nexus-card p-5 bg-white border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Interested Hot Leads
            </span>
            <div className="flex items-baseline gap-2">
              <span className="font-mono-nums font-black text-2xl text-amber-600">{stats.interested}</span>
              <span className="text-xs font-bold text-slate-400">Prospects</span>
            </div>
            <span className="text-xs text-amber-600 font-bold mt-1 block">
              {pendingCallbacks} Pending Callbacks
            </span>
          </div>

          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shadow-xs">
            <Target className="w-6 h-6" />
          </div>
        </div>

      </div>

      {/* 3. Middle Section: Progress Chart & Goal Breakdown (Left 7 Cols) + Urgent Follow-up Action Card (Right 5 Cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left: Calling Progress & Hourly Trend */}
        <div className="lg:col-span-7 nexus-card p-6 bg-white border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-display font-black text-base text-[#0A2540]">Calling Performance & Target Gauge</h3>
                <p className="text-xs text-slate-500">Real-time dial distribution & conversion breakdown</p>
              </div>
              <span className="text-xs font-bold text-[#00A88B] bg-[#E6FAF6] px-3 py-1 rounded-lg">
                Daily Quota: {stats.todayGoalCalls} Calls
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center my-2">
              {/* Progress Ring */}
              <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div className="relative w-24 h-24 flex-shrink-0 flex items-center justify-center">
                  <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 80 80">
                    <circle cx="40" cy="40" r="32" className="stroke-slate-200" strokeWidth="7" fill="transparent" />
                    <circle
                      cx="40"
                      cy="40"
                      r="32"
                      stroke="#00C9A7"
                      strokeWidth="7"
                      strokeDasharray="201"
                      strokeDashoffset={201 - (201 * goalPercentage) / 100}
                      strokeLinecap="round"
                      fill="transparent"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="font-display font-black text-xl text-[#0A2540]">{goalPercentage}%</span>
                    <span className="text-[8px] font-bold text-slate-400 uppercase">DONE</span>
                  </div>
                </div>

                <div>
                  <span className="text-xs font-bold text-slate-500 block">Dials Remaining:</span>
                  <span className="font-mono-nums font-black text-xl text-[#0A2540]">
                    {stats.todayGoalCalls - stats.dialsMade} Calls
                  </span>
                  <span className="text-[11px] text-[#00A88B] font-bold block mt-0.5">Estimated {estRemaining}</span>
                </div>
              </div>

              {/* Breakdown Stats */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Connected</span>
                  <span className="font-mono-nums font-black text-lg text-sky-600">{stats.connected}</span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Interested</span>
                  <span className="font-mono-nums font-black text-lg text-emerald-600">{stats.interested}</span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Rejected</span>
                  <span className="font-mono-nums font-black text-lg text-rose-500">{stats.rejected}</span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Avg Duration</span>
                  <span className="font-mono-nums font-black text-lg text-[#0A2540]">{avgDuration}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Monthly Sales TGT Milestone Bar */}
          <div className="pt-4 border-t border-slate-100 mt-2">
            <div className="flex justify-between items-center text-xs mb-1.5">
              <span className="font-bold text-slate-700">Monthly Sales Target Milestone (TGT)</span>
              <span className="font-mono font-extrabold text-[#00A88B]">{inr(stats.monthlySalesAchieved)} / {inr(stats.monthlySalesTarget)} ({tgtPercentage}%)</span>
            </div>
            <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-[#00C9A7] to-[#00B4D8] rounded-full" style={{ width: `${tgtPercentage}%` }} />
            </div>
          </div>
        </div>

        {/* Right: Won Deals & Due for Callback Cards */}
        {/* Right: Won Deals & Due for Callback Quick-Action Cards */}
        <div className="lg:col-span-5 grid grid-cols-2 gap-4">
          {/* Tile 1: Won Deals */}
          <div 
            onClick={() => {
              setClientPipelineTab('WON');
              setActiveTab('clients');
            }}
            className="group relative bg-white hover:bg-emerald-50/25 border border-slate-200/90 hover:border-emerald-300 rounded-3xl p-5 shadow-xs hover:shadow-md transition-all duration-200 active:scale-[0.98] cursor-pointer flex flex-col justify-between overflow-hidden"
          >
            <div className="absolute -top-8 -right-8 w-24 h-24 bg-emerald-400/10 rounded-full blur-xl pointer-events-none" />

            <div className="flex items-center justify-between relative z-10">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200/70 flex items-center justify-center shadow-2xs">
                <Award className="w-6 h-6 stroke-[2.2]" />
              </div>
              <div className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center justify-center text-slate-400 group-hover:text-emerald-600 group-hover:bg-emerald-50 group-hover:border-emerald-200 transition-colors">
                <ArrowUpRight className="w-4 h-4" />
              </div>
            </div>

            <div className="space-y-1.5 relative z-10 mt-6 select-none">
              <div className="flex items-baseline gap-1.5">
                <span className="font-display font-black text-3xl text-[#0A2540] tracking-tight leading-none">
                  {wonCount}
                </span>
                <span className="text-xs font-bold text-slate-400">
                  / {userLeads.length} leads
                </span>
              </div>
              
              <h4 className="font-display font-bold text-sm text-[#0A2540] tracking-tight">
                Won Deals
              </h4>

              <div className="inline-flex items-center gap-1 text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200/70 mt-1">
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
            className="group relative bg-white hover:bg-amber-50/25 border border-slate-200/90 hover:border-amber-300 rounded-3xl p-5 shadow-xs hover:shadow-md transition-all duration-200 active:scale-[0.98] cursor-pointer flex flex-col justify-between overflow-hidden"
          >
            <div className="absolute -top-8 -right-8 w-24 h-24 bg-amber-400/10 rounded-full blur-xl pointer-events-none" />

            <div className="flex items-center justify-between relative z-10">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 border border-amber-200/70 flex items-center justify-center shadow-2xs">
                <Clock className="w-6 h-6 stroke-[2.2]" />
              </div>
              <div className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center justify-center text-slate-400 group-hover:text-amber-700 group-hover:bg-amber-50 group-hover:border-amber-200 transition-colors">
                <ArrowUpRight className="w-4 h-4" />
              </div>
            </div>

            <div className="space-y-1.5 relative z-10 mt-6 select-none">
              <div className="flex items-baseline gap-1.5">
                <span className="font-display font-black text-3xl text-[#0A2540] tracking-tight leading-none">
                  {followUpCount}
                </span>
                <span className="text-xs font-bold text-slate-400">
                  / {userLeads.length} leads
                </span>
              </div>
              
              <h4 className="font-display font-bold text-sm text-[#0A2540] tracking-tight">
                Due for Callback
              </h4>

            <div className="inline-flex items-center gap-1 text-xs font-mono font-bold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-lg border border-amber-200/70 mt-1">
                <span>{toCallCount} calls scheduled</span>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* 4. Bottom Section: Today's Calling History Full-Width Table */}
      <div className="nexus-card p-6 bg-white border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-display font-black text-base text-[#0A2540]">Today's Calling Activity Log</h3>
            <p className="text-xs text-slate-500">Live chronological feed of dials and customer responses</p>
          </div>
          <button
            onClick={() => setActiveTab('calling')}
            className="text-xs font-bold text-[#00A88B] hover:underline flex items-center gap-1"
          >
            <span>View All Calling Logs</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 uppercase tracking-wider font-bold text-[10px]">
                <th className="pb-3 px-3">Time</th>
                <th className="pb-3 px-3">Client & Company</th>
                <th className="pb-3 px-3">Phone</th>
                <th className="pb-3 px-3">Duration</th>
                <th className="pb-3 px-3">Call Outcome</th>
                <th className="pb-3 px-3">Notes & Next Callback</th>
                <th className="pb-3 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {callLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-3 font-mono text-slate-400 font-semibold">{log.timestamp}</td>
                  <td className="py-3.5 px-3">
                    <span className="font-bold text-[#0A2540] block">{log.clientName}</span>
                    <span className="text-[11px] text-slate-400">{log.companyName}</span>
                  </td>
                  <td className="py-3.5 px-3 font-mono text-slate-600">{log.phoneNumber}</td>
                  <td className="py-3.5 px-3 font-mono text-slate-600">
                    {Math.floor(log.durationSec / 60)}m {log.durationSec % 60}s
                  </td>
                  <td className="py-3.5 px-3">
                    <span className={`inline-block text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${
                      log.outcome === 'DEAL_CLOSED' ? 'bg-emerald-100 text-emerald-800' :
                      log.outcome === 'INTERESTED' ? 'bg-sky-100 text-sky-800' :
                      log.outcome === 'CALLBACK' ? 'bg-amber-100 text-amber-800' :
                      log.outcome === 'CONNECTED' ? 'bg-teal-100 text-teal-800' :
                      'bg-slate-100 text-slate-600'
                    }`}>
                      {log.outcome.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="py-3.5 px-3 max-w-xs truncate text-slate-600">
                    {log.notes}
                  </td>
                  <td className="py-3.5 px-3 text-right">
                    <button
                      onClick={() => triggerToast(`📞 Redialing ${log.clientName}`)}
                      className="p-1.5 rounded-lg bg-[#E6FAF6] text-[#00A88B] hover:bg-[#00C9A7] hover:text-[#0A2540] transition-colors"
                      title="Redial"
                    >
                      <Phone className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
