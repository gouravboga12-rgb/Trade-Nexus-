import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { useScreenData } from '../../hooks/useScreenData';
import { 
  PhoneCall, 
  Plus, 
  Search, 
  Download, 
  Phone, 
  Clock, 
  CheckCircle2, 
  PhoneForwarded, 
  PhoneOff, 
  ThumbsDown, 
  Award, 
  X,
  History,
  Zap,
  Check,
  RotateCcw,
  AlertCircle,
  Calendar,
  CalendarDays,
  FileText,
  MessageSquare
} from 'lucide-react';
import { CallOutcome, AssignedLead, CallLogItem } from '../../types';

export const DesktopDailyCalling: React.FC = () => {
  const { 
    callLogs, 
    stats, 
    assignedLeads,
    profile,
    openCallModalForLead,
    setIsQuickCallModalOpen, 
    setActiveCallingLead,
    triggerToast 
  } = useApp();

  useScreenData('dailyCalling');

  const [activeSection, setActiveSection] = useState<'QUEUE' | 'LOGS'>('QUEUE');
  const [activeQueueFilter, setActiveQueueFilter] = useState<'ALL_ASSIGNED' | 'CALLBACKS' | 'INTERESTED'>('ALL_ASSIGNED');
  const [selectedOutcome, setSelectedOutcome] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Historical Date Range Filter State
  type DatePeriod = 'TODAY' | 'YESTERDAY' | 'LAST_7' | 'LAST_30' | 'ALL' | 'CUSTOM';
  const [selectedPeriod, setSelectedPeriod] = useState<DatePeriod>('TODAY');
  const [customDate, setCustomDate] = useState<string>('');

  // Leads allocated to this telecaller (server already scopes, keep strict client match)
  const myAssignedLeads = useMemo(() => {
    return assignedLeads.filter((l) => {
      return (
        (profile.id && l.assignedToEmployeeId === profile.id) ||
        (profile.empCode && l.assignedToEmployeeId === profile.empCode) ||
        (l.assignedToEmployeeName && profile.name && l.assignedToEmployeeName.toLowerCase() === profile.name.toLowerCase())
      );
    });
  }, [assignedLeads, profile]);

  const uncalledLeads = useMemo(() => myAssignedLeads.filter((l) => l.status === 'PENDING'), [myAssignedLeads]);
  const callbackLeads = useMemo(() => myAssignedLeads.filter((l) => l.status === 'CALLBACK'), [myAssignedLeads]);
  const interestedLeads = useMemo(() => myAssignedLeads.filter((l) => l.status === 'INTERESTED'), [myAssignedLeads]);

  const totalAssigned = myAssignedLeads.length;
  const dialsDone = myAssignedLeads.filter((l) => l.status !== 'PENDING').length;

  // Local date calculation utilities
  const getLocalDateStr = (daysAgo: number = 0): string => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayIso = useMemo(() => getLocalDateStr(0), []);
  const yesterdayIso = useMemo(() => getLocalDateStr(1), []);
  const sevenDaysAgoIso = useMemo(() => getLocalDateStr(7), []);
  const thirtyDaysAgoIso = useMemo(() => getLocalDateStr(30), []);

  // Metric Filter State for interactive buttons
  type MetricFilter = 'ALL' | 'INTERESTED' | 'CALLBACK' | 'NOT_ANSWERED';
  const [selectedMetricFilter, setSelectedMetricFilter] = useState<MetricFilter>('ALL');

  // Yesterday / Overdue Callbacks detector
  const yesterdayCallbacksCount = useMemo(() => {
    return callbackLeads.filter((l) => {
      const d = (l.followUpDate || '').toLowerCase();
      return d.includes('yesterday') || (l.followUpDate && l.followUpDate.split(' ')[0] < todayIso);
    }).length;
  }, [callbackLeads, todayIso]);

  // Filtered queue based on active cube + search
  const currentQueueLeads = useMemo(() => {
    let list = myAssignedLeads;
    if (activeQueueFilter === 'CALLBACKS') {
      list = callbackLeads;
    } else if (activeQueueFilter === 'INTERESTED') {
      list = interestedLeads;
    } else {
      list = myAssignedLeads.filter((l) => l.status === 'PENDING');
    }

    const q = searchQuery.trim().toLowerCase();
    if (!q) return list;
    return list.filter((l) => l.phone.includes(q));
  }, [myAssignedLeads, activeQueueFilter, callbackLeads, interestedLeads, searchQuery]);

  const handleDialActive = (lead: AssignedLead) => {
    window.location.href = `tel:${lead.phone}`;
    triggerToast(`📞 Dialing ${lead.phone}...`);
  };

  // Helper to extract local YYYY-MM-DD date from a call log item
  const getLogDateIso = (log: CallLogItem): string => {
    if (log.date) return log.date;
    if (log.createdAt) {
      try {
        const d = new Date(log.createdAt);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      } catch {
        return log.createdAt.split('T')[0];
      }
    }
    const ts = (log.timestamp || '').toLowerCase();
    if (ts.includes('yesterday')) return yesterdayIso;
    if (ts.includes('4 days ago') || ts.includes('5 days ago')) return getLocalDateStr(4);
    if (ts.includes('12 days ago')) return getLocalDateStr(12);
    if (ts.includes('20 days ago')) return getLocalDateStr(20);
    return todayIso;
  };

  // 1. Period-filtered logs
  const periodFilteredLogs = useMemo(() => {
    return callLogs.filter((log) => {
      const logDate = getLogDateIso(log);
      if (selectedPeriod === 'TODAY') return logDate === todayIso;
      if (selectedPeriod === 'YESTERDAY') return logDate === yesterdayIso;
      if (selectedPeriod === 'LAST_7') return logDate >= sevenDaysAgoIso;
      if (selectedPeriod === 'LAST_30') return logDate >= thirtyDaysAgoIso;
      if (selectedPeriod === 'CUSTOM') {
        if (!customDate) return true;
        return logDate === customDate;
      }
      return true; // ALL
    });
  }, [callLogs, selectedPeriod, customDate, todayIso, yesterdayIso, sevenDaysAgoIso, thirtyDaysAgoIso]);

  // 2. Reframed Period statistics: Total Calls, Interested, Callbacks, Not Answered
  const periodStats = useMemo(() => {
    const total = periodFilteredLogs.length;
    const interested = periodFilteredLogs.filter(
      (l) => l.outcome === 'INTERESTED' || l.outcome === 'DEAL_CLOSED'
    ).length;
    const callbacks = periodFilteredLogs.filter(
      (l) => l.outcome === 'CALLBACK'
    ).length;
    const notAnswered = periodFilteredLogs.filter(
      (l) => l.outcome === 'BUSY' || l.outcome === 'NOT_INTERESTED'
    ).length;

    return { total, interested, callbacks, notAnswered };
  }, [periodFilteredLogs]);

  // 3. Final Search & Interactive Metric Filtered Logs
  const finalFilteredLogs = useMemo(() => {
    return periodFilteredLogs.filter((log) => {
      if (selectedMetricFilter === 'INTERESTED') {
        if (log.outcome !== 'INTERESTED' && log.outcome !== 'DEAL_CLOSED') return false;
      } else if (selectedMetricFilter === 'CALLBACK') {
        if (log.outcome !== 'CALLBACK') return false;
      } else if (selectedMetricFilter === 'NOT_ANSWERED') {
        if (log.outcome !== 'BUSY' && log.outcome !== 'NOT_INTERESTED') return false;
      }

      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;
      return (
        log.phoneNumber.includes(q) ||
        (log.clientName && log.clientName.toLowerCase().includes(q)) ||
        (log.companyName && log.companyName.toLowerCase().includes(q)) ||
        (log.notes && log.notes.toLowerCase().includes(q))
      );
    });
  }, [periodFilteredLogs, selectedMetricFilter, searchQuery]);

  const handleExportLogsCsv = () => {
    const header = 'Time,Phone,Client Name,Duration,Outcome,Notes,Follow Up';
    const rows = finalFilteredLogs.map((l) =>
      `"${l.timestamp}","${l.phoneNumber}","${l.clientName || ''}",${l.durationSec},"${l.outcome}","${(l.notes || '').replace(/"/g, '""')}","${l.followUpDate || ''}"`
    );
    const csv = `data:text/csv;charset=utf-8,${header}\n${rows.join('\n')}`;
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csv));
    link.setAttribute('download', `Call_Logs_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    triggerToast('✓ Call logs exported to CSV');
  };

  const formatDuration = (sec: number) => {
    if (!sec) return '00s';
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m > 0 ? `${m}m ` : ''}${s > 0 ? `${s}s` : ''}`;
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      
      {/* 1. Desktop Top Header & Mode Switcher */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display font-black text-2xl text-[#0A2540] tracking-tight">
            Daily Calling Station
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Desktop Power Dialer · Master queue, scheduled callbacks, and live result logger
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Mode Switcher Tabs */}
          <div className="bg-slate-100 p-1 rounded-2xl flex items-center gap-1 border border-slate-200">
            <button
              onClick={() => { setActiveSection('QUEUE'); setSearchQuery(''); }}
              className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all cursor-pointer ${
                activeSection === 'QUEUE'
                  ? 'bg-[#0A2540] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Phone className="w-3.5 h-3.5 text-[#00C9A7]" />
              <span>Calling Queue</span>
            </button>

            <button
              onClick={() => { setActiveSection('LOGS'); setSearchQuery(''); }}
              className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all cursor-pointer ${
                activeSection === 'LOGS'
                  ? 'bg-[#0A2540] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <History className="w-3.5 h-3.5 text-sky-400" />
              <span>Call Logs</span>
            </button>
          </div>

          <button
            onClick={() => {
              setActiveCallingLead(null);
              setIsQuickCallModalOpen(true);
            }}
            className="flex items-center gap-2 bg-[#00C9A7] hover:bg-[#00B4D8] text-[#0A2540] font-black text-xs px-4 py-2.5 rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Quick Log</span>
          </button>
        </div>
      </div>

      {/* 2. SECTION A: LIVE CALLING QUEUE WORKSTATION */}
      {activeSection === 'QUEUE' && (
        <div className="space-y-6">
          
          {/* 3 Desktop KPI Cubes (Widescreen Strip) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Cube 1: Fresh Queue Progress */}
            <button
              onClick={() => setActiveQueueFilter('ALL_ASSIGNED')}
              className={`p-5 rounded-3xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                activeQueueFilter === 'ALL_ASSIGNED'
                  ? 'bg-emerald-500/10 border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs'
                  : 'bg-white border-slate-200/90 hover:border-slate-300 shadow-xs'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Fresh Queue
                </span>
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Phone className="w-4 h-4 stroke-[2.5]" />
                </div>
              </div>
              <div className="mt-3">
                <div className="flex items-baseline gap-2">
                  <span className="font-mono font-black text-3xl text-[#0A2540]">
                    {uncalledLeads.length}
                  </span>
                  <span className="text-xs font-bold font-mono text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-lg">
                    To Call
                  </span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div 
                    className="bg-emerald-500 h-full rounded-full transition-all"
                    style={{ width: `${totalAssigned > 0 ? (dialsDone / totalAssigned) * 100 : 0}%` }}
                  />
                </div>
                <span className="text-xs font-semibold font-mono text-slate-400 block mt-2">
                  {dialsDone} / {totalAssigned} dials completed
                </span>
              </div>
            </button>

            {/* Cube 2: Callbacks Due Today & Overdue from Yesterday */}
            <button
              onClick={() => setActiveQueueFilter('CALLBACKS')}
              className={`p-5 rounded-3xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                activeQueueFilter === 'CALLBACKS'
                  ? 'bg-amber-500/10 border-amber-500 ring-2 ring-amber-500/20 shadow-xs'
                  : 'bg-white border-slate-200/90 hover:border-amber-300 shadow-xs'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Scheduled Callbacks
                </span>
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Clock className="w-4 h-4 stroke-[2.5]" />
                </div>
              </div>
              <div className="mt-3">
                <div className="flex items-baseline gap-2">
                  <span className="font-mono font-black text-3xl text-[#0A2540]">
                    {callbackLeads.length}
                  </span>
                  <span className="text-xs font-bold font-mono text-amber-800 bg-amber-100 px-2 py-0.5 rounded-lg">
                    Due
                  </span>
                </div>
                {yesterdayCallbacksCount > 0 ? (
                  <span className="text-xs font-black font-mono text-rose-600 block mt-3">
                    ⚠️ {yesterdayCallbacksCount} Overdue from Yesterday
                  </span>
                ) : (
                  <span className="text-xs font-medium text-slate-500 block mt-3">
                    {callbackLeads.length > 0 ? 'Follow-ups scheduled today' : 'No pending callbacks today'}
                  </span>
                )}
              </div>
            </button>

            {/* Cube 3: Interested Hot Leads */}
            <button
              onClick={() => setActiveQueueFilter('INTERESTED')}
              className={`p-5 rounded-3xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                activeQueueFilter === 'INTERESTED'
                  ? 'bg-sky-500/10 border-sky-500 ring-2 ring-sky-500/20 shadow-xs'
                  : 'bg-white border-slate-200/90 hover:border-sky-300 shadow-xs'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Interested Leads
                </span>
                <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                </div>
              </div>
              <div className="mt-3">
                <div className="flex items-baseline gap-2">
                  <span className="font-mono font-black text-3xl text-[#0A2540]">
                    {interestedLeads.length}
                  </span>
                  <span className="text-xs font-bold font-mono text-sky-800 bg-sky-100 px-2 py-0.5 rounded-lg">
                    Hot Prospects
                  </span>
                </div>
                <span className="text-xs font-medium text-slate-500 block mt-3">
                  Ready to advance into Won Deals
                </span>
              </div>
            </button>
          </div>

          {/* Desktop Queue Workspace */}
          <div className="space-y-4">
            
            {/* Search & Filter Bar */}
            <div className="flex items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-xs">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by phone number..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-8 py-2 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-emerald-500"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <span className="text-xs font-mono font-bold text-slate-500 whitespace-nowrap">
                {currentQueueLeads.length} Leads in Queue
              </span>
            </div>

            {/* Lead Cards Grid (2-column desktop grid for comfortable reading) */}
            {currentQueueLeads.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {currentQueueLeads.map((lead) => {
                  const isYesterdayCallback =
                    lead.status === 'CALLBACK' &&
                    ((lead.followUpDate || '').toLowerCase().includes('yesterday') ||
                     (lead.followUpDate && lead.followUpDate.split(' ')[0] < todayIso));

                  return (
                    <div
                      key={lead.id}
                      className={`nexus-card p-4 bg-white border rounded-2xl shadow-xs transition-all flex items-center justify-between gap-4 ${
                        isYesterdayCallback
                          ? 'border-rose-300 ring-1 ring-rose-200'
                          : 'border-slate-200/90 hover:border-[#00C9A7]/60'
                      }`}
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
                          isYesterdayCallback
                            ? 'bg-rose-50 text-rose-600 border border-rose-200'
                            : lead.status === 'CALLBACK' 
                            ? 'bg-amber-50 text-amber-600 border border-amber-200' 
                            : lead.status === 'INTERESTED'
                            ? 'bg-sky-50 text-sky-600 border border-sky-200'
                            : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                        }`}>
                          {lead.status === 'CALLBACK' ? (
                            isYesterdayCallback ? <AlertCircle className="w-5 h-5 stroke-[2.4]" /> : <Clock className="w-5 h-5 stroke-[2.2]" />
                          ) : (
                            <Phone className="w-5 h-5 stroke-[2.2]" />
                          )}
                        </div>

                        <div className="min-w-0">
                          <span className="font-mono font-black text-base text-[#0A2540] tracking-tight block whitespace-nowrap">
                            {lead.phone}
                          </span>
                          {lead.status === 'CALLBACK' ? (
                            isYesterdayCallback ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-mono font-black px-2 py-0.5 rounded-md mt-0.5 bg-rose-100 text-rose-800 border border-rose-200">
                                <AlertCircle className="w-3 h-3 text-rose-600" />
                                <span>⚠️ Yesterday's Callback (Call First!)</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-md mt-0.5 bg-amber-100 text-amber-800 border border-amber-200">
                                <Clock className="w-3 h-3 text-amber-600" />
                                <span>⏰ Callback: {lead.followUpDate || 'Today, 04:00 PM'}</span>
                              </span>
                            )
                          ) : lead.status === 'INTERESTED' ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-md mt-0.5 bg-sky-100 text-sky-800 border border-sky-200">
                              <CheckCircle2 className="w-3 h-3 text-sky-600" />
                              <span>🟢 Interested Prospect</span>
                            </span>
                          ) : (
                            <span className="inline-block text-[10px] font-mono font-bold px-2 py-0.5 rounded-md mt-0.5 bg-slate-100 text-slate-600">
                              Fresh Lead · Ready to Dial
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={() => handleDialActive(lead)}
                          className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#00C9A7] to-[#00B4D8] hover:opacity-95 text-[#0A2540] font-black text-xs flex items-center gap-1.5 active:scale-95 transition-all shadow-xs cursor-pointer"
                        >
                          <Phone className="w-3.5 h-3.5 fill-current" />
                          <span>Call</span>
                        </button>
                        <button
                          onClick={() => openCallModalForLead(lead)}
                          className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1 active:scale-95 transition-all cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                          <span>Result</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="nexus-card p-12 bg-white border border-slate-200 rounded-3xl text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 text-[#00C9A7] mx-auto" />
                <h4 className="font-display font-bold text-base text-[#0A2540]">
                  {activeQueueFilter === 'ALL_ASSIGNED' ? 'All Fresh Calls Completed!' : 'Queue Completed!'}
                </h4>
                <p className="text-xs text-slate-400">
                  {activeQueueFilter === 'ALL_ASSIGNED'
                    ? '0 uncalled leads remaining. Great job! Check Callbacks or Interested to follow up.'
                    : 'No leads match this category right now.'}
                </p>
              </div>
            )}
          </div>

        </div>
      )}

      {/* 3. SECTION B: CALL HISTORY & AUDIT ARCHIVE */}
      {activeSection === 'LOGS' && (
        <div className="space-y-4">
          
          {/* Timeframe Bar & Export */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-3xl border border-slate-200/90 shadow-xs">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1">
                Timeframe:
              </span>
              {[
                { id: 'TODAY', label: 'Today' },
                { id: 'YESTERDAY', label: 'Yesterday' },
                { id: 'LAST_7', label: 'Last 7 Days' },
                { id: 'LAST_30', label: 'Last 30 Days' },
                { id: 'ALL', label: 'All Time' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setSelectedPeriod(tab.id as DatePeriod);
                    setCustomDate('');
                  }}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    selectedPeriod === tab.id
                      ? 'bg-[#0A2540] text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}

              {/* Custom Date Picker */}
              <div className="flex items-center gap-1.5 ml-2">
                <Calendar className="w-4 h-4 text-slate-400" />
                <input
                  type="date"
                  value={customDate}
                  onChange={(e) => {
                    setCustomDate(e.target.value);
                    setSelectedPeriod('CUSTOM');
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold border transition-all cursor-pointer focus:outline-none ${
                    selectedPeriod === 'CUSTOM'
                      ? 'bg-emerald-50 text-emerald-900 border-emerald-400 ring-1 ring-emerald-300'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                />
              </div>
            </div>

            <button
              onClick={handleExportLogsCsv}
              className="flex items-center gap-2 bg-white border border-slate-200 hover:border-emerald-500 text-slate-700 font-bold text-xs px-4 py-2 rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Export CSV</span>
            </button>
          </div>

          {/* Interactive 4-Box Metric Filter Buttons: Total Calls, Interested, Callbacks, Not Answered */}
          <div className="grid grid-cols-4 gap-4">
            {/* 1. Total Calls */}
            <button
              type="button"
              onClick={() => setSelectedMetricFilter('ALL')}
              className={`p-4 rounded-2xl border transition-all cursor-pointer text-left active:scale-[0.99] shadow-xs ${
                selectedMetricFilter === 'ALL'
                  ? 'bg-[#0A2540] text-white border-[#0A2540] ring-2 ring-[#0A2540]/20'
                  : 'bg-white text-slate-700 border-slate-200/90 hover:border-slate-300'
              }`}
            >
              <span className={`text-xs font-bold uppercase tracking-wider block ${
                selectedMetricFilter === 'ALL' ? 'text-slate-300' : 'text-slate-400'
              }`}>
                Total Calls
              </span>
              <span className={`font-mono font-black text-2xl mt-1 block ${
                selectedMetricFilter === 'ALL' ? 'text-[#00C9A7]' : 'text-[#0A2540]'
              }`}>
                {periodStats.total}
              </span>
              <span className={`text-[11px] block mt-0.5 ${
                selectedMetricFilter === 'ALL' ? 'text-slate-300' : 'text-slate-400'
              }`}>
                All calls in timeframe
              </span>
            </button>

            {/* 2. Interested */}
            <button
              type="button"
              onClick={() => setSelectedMetricFilter('INTERESTED')}
              className={`p-4 rounded-2xl border transition-all cursor-pointer text-left active:scale-[0.99] shadow-xs ${
                selectedMetricFilter === 'INTERESTED'
                  ? 'bg-sky-600 text-white border-sky-600 ring-2 ring-sky-300'
                  : 'bg-white text-slate-700 border-slate-200/90 hover:border-sky-300'
              }`}
            >
              <span className={`text-xs font-bold uppercase tracking-wider block ${
                selectedMetricFilter === 'INTERESTED' ? 'text-sky-100' : 'text-sky-600'
              }`}>
                Interested
              </span>
              <span className={`font-mono font-black text-2xl mt-1 block ${
                selectedMetricFilter === 'INTERESTED' ? 'text-white' : 'text-sky-600'
              }`}>
                {periodStats.interested}
              </span>
              <span className={`text-[11px] block mt-0.5 ${
                selectedMetricFilter === 'INTERESTED' ? 'text-sky-100' : 'text-sky-600/70'
              }`}>
                Hot leads &amp; closed deals
              </span>
            </button>

            {/* 3. Callbacks */}
            <button
              type="button"
              onClick={() => setSelectedMetricFilter('CALLBACK')}
              className={`p-4 rounded-2xl border transition-all cursor-pointer text-left active:scale-[0.99] shadow-xs ${
                selectedMetricFilter === 'CALLBACK'
                  ? 'bg-amber-500 text-white border-amber-600 ring-2 ring-amber-300'
                  : 'bg-white text-slate-700 border-slate-200/90 hover:border-amber-300'
              }`}
            >
              <span className={`text-xs font-bold uppercase tracking-wider block ${
                selectedMetricFilter === 'CALLBACK' ? 'text-amber-100' : 'text-amber-600'
              }`}>
                Callbacks
              </span>
              <span className={`font-mono font-black text-2xl mt-1 block ${
                selectedMetricFilter === 'CALLBACK' ? 'text-white' : 'text-amber-600'
              }`}>
                {periodStats.callbacks}
              </span>
              <span className={`text-[11px] block mt-0.5 ${
                selectedMetricFilter === 'CALLBACK' ? 'text-amber-100' : 'text-amber-600/70'
              }`}>
                Scheduled follow-ups
              </span>
            </button>

            {/* 4. Not Answered */}
            <button
              type="button"
              onClick={() => setSelectedMetricFilter('NOT_ANSWERED')}
              className={`p-4 rounded-2xl border transition-all cursor-pointer text-left active:scale-[0.99] shadow-xs ${
                selectedMetricFilter === 'NOT_ANSWERED'
                  ? 'bg-rose-500 text-white border-rose-600 ring-2 ring-rose-300'
                  : 'bg-white text-slate-700 border-slate-200/90 hover:border-rose-300'
              }`}
            >
              <span className={`text-xs font-bold uppercase tracking-wider block ${
                selectedMetricFilter === 'NOT_ANSWERED' ? 'text-rose-100' : 'text-rose-600'
              }`}>
                Not Answered
              </span>
              <span className={`font-mono font-black text-2xl mt-1 block ${
                selectedMetricFilter === 'NOT_ANSWERED' ? 'text-white' : 'text-rose-600'
              }`}>
                {periodStats.notAnswered}
              </span>
              <span className={`text-[11px] block mt-0.5 ${
                selectedMetricFilter === 'NOT_ANSWERED' ? 'text-rose-100' : 'text-rose-600/70'
              }`}>
                Busy / No response
              </span>
            </button>
          </div>

          {/* Search Across Notes & Phone */}
          <div className="flex items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-xs">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500">
                Showing:
              </span>
              <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800">
                {selectedMetricFilter === 'ALL' && 'All Logged Calls'}
                {selectedMetricFilter === 'INTERESTED' && '🟢 Interested Leads'}
                {selectedMetricFilter === 'CALLBACK' && '⏰ Callbacks Scheduled'}
                {selectedMetricFilter === 'NOT_ANSWERED' && '🔴 Not Answered / Busy'}
              </span>
              <span className="text-xs text-slate-400 font-mono">
                ({finalFilteredLogs.length} records)
              </span>
            </div>

            <div className="relative w-80">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search phone, client, or past notes..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-8 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:border-emerald-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Call Logs Table with Notes Inspection */}
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3.5 px-6">Timestamp &amp; Date</th>
                    <th className="py-3.5 px-6">Contact / Company</th>
                    <th className="py-3.5 px-6">Outcome</th>
                    <th className="py-3.5 px-6">Duration</th>
                    <th className="py-3.5 px-6">Follow-Up</th>
                    <th className="py-3.5 px-6">Notes &amp; Conversation</th>
                    <th className="py-3.5 px-6 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {finalFilteredLogs.length > 0 ? (
                    finalFilteredLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3.5 px-6 font-mono text-slate-500">
                          <span className="font-bold text-slate-700 block">{log.timestamp}</span>
                          <span className="text-[10px] text-slate-400">{getLogDateIso(log)}</span>
                        </td>
                        <td className="py-3.5 px-6">
                          <span className="font-mono font-black text-sm text-[#0A2540] block">
                            {log.phoneNumber}
                          </span>
                          {log.clientName && log.clientName !== 'Direct Caller' && (
                            <span className="text-xs text-slate-600 font-semibold block mt-0.5">
                              {log.clientName}
                              {log.companyName && <span className="text-slate-400 font-normal"> · {log.companyName}</span>}
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-6">
                          <span className={`inline-flex items-center gap-1 font-bold text-[11px] px-2.5 py-1 rounded-lg border ${
                            log.outcome === 'DEAL_CLOSED'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : log.outcome === 'INTERESTED'
                              ? 'bg-sky-50 text-sky-700 border-sky-200'
                              : log.outcome === 'CALLBACK'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}>
                            {log.outcome.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-3.5 px-6 font-mono text-slate-500">
                          {formatDuration(log.durationSec)}
                        </td>
                        <td className="py-3.5 px-6 font-mono text-amber-700 font-bold">
                          {log.followUpDate || '—'}
                        </td>
                        <td className="py-3.5 px-6 max-w-sm">
                          {log.notes ? (
                            <div className="bg-slate-50 p-2 rounded-xl border border-slate-100 text-slate-700 leading-snug">
                              "{log.notes}"
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">No notes recorded</span>
                          )}
                        </td>
                        <td className="py-3.5 px-6 text-right">
                          <a
                            href={`tel:${log.phoneNumber}`}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs cursor-pointer transition-all active:scale-95"
                          >
                            <Phone className="w-3.5 h-3.5 text-emerald-600 fill-current" />
                            <span>Call</span>
                          </a>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-14 text-center text-slate-400">
                        <PhoneCall className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <h4 className="font-display font-bold text-sm text-[#0A2540]">No calls found in this period</h4>
                        <p className="text-xs text-slate-400 max-w-xs mx-auto mt-1">
                          {searchQuery 
                            ? 'No logs match your search terms.' 
                            : `No calls recorded for ${selectedPeriod === 'CUSTOM' ? (customDate || 'selected date') : selectedPeriod.replace('_', ' ').toLowerCase()}.`}
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

    </div>
  );
};
