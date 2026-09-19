import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { useScreenData } from '../hooks/useScreenData';
import { 
  PhoneCall, 
  Plus, 
  Clock, 
  Search, 
  Phone, 
  CheckCircle2, 
  X, 
  PhoneForwarded, 
  PhoneOff, 
  ThumbsDown, 
  Award,
  Sparkles,
  History,
  ArrowUpRight,
  AlertCircle,
  Zap,
  Calendar,
  CalendarDays,
  FileText,
  MessageSquare,
  Filter
} from 'lucide-react';
import { CallOutcome, AssignedLead, CallLogItem } from '../types';

export const DailyCallingView: React.FC = () => {
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

  const [activeSection, setActiveSection] = useState<'FRESH_CALLS' | 'CALL_LOGS'>('FRESH_CALLS');
  const [activeQueueFilter, setActiveQueueFilter] = useState<'ALL_ASSIGNED' | 'CALLBACKS' | 'INTERESTED'>('ALL_ASSIGNED');
  const [selectedOutcome, setSelectedOutcome] = useState<string>('ALL');
  const [search, setSearch] = useState('');

  // Historical Date Range Filter State
  type DatePeriod = 'TODAY' | 'YESTERDAY' | 'LAST_7' | 'LAST_30' | 'ALL' | 'CUSTOM';
  const [selectedPeriod, setSelectedPeriod] = useState<DatePeriod>('TODAY');
  const [customDate, setCustomDate] = useState<string>('');

  // Leads allocated to this telecaller (server already scopes, keep strict client match)
  const myAssignedLeads = assignedLeads.filter((l) => {
    return (
      (profile.id && l.assignedToEmployeeId === profile.id) ||
      (profile.empCode && l.assignedToEmployeeId === profile.empCode) ||
      (l.assignedToEmployeeName && profile.name && l.assignedToEmployeeName.toLowerCase() === profile.name.toLowerCase())
    );
  });

  const uncalledLeads = myAssignedLeads.filter((l) => l.status === 'PENDING');
  const callbackLeads = myAssignedLeads.filter((l) => l.status === 'CALLBACK');
  const interestedLeads = myAssignedLeads.filter((l) => l.status === 'INTERESTED');
  const freshLeads = uncalledLeads;

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

  // Metric Filter State for the 4 interactive buttons
  type MetricFilter = 'ALL' | 'INTERESTED' | 'CALLBACK' | 'NOT_ANSWERED';
  const [selectedMetricFilter, setSelectedMetricFilter] = useState<MetricFilter>('ALL');

  // Yesterday / Overdue Callbacks detector
  const yesterdayCallbacksCount = callbackLeads.filter((l) => {
    const d = (l.followUpDate || '').toLowerCase();
    return d.includes('yesterday') || (l.followUpDate && l.followUpDate.split(' ')[0] < todayIso);
  }).length;

  // Filtered queue based on active cube + search
  const currentQueueLeads = myAssignedLeads.filter((l) => {
    if (activeQueueFilter === 'CALLBACKS') {
      if (l.status !== 'CALLBACK') return false;
    } else if (activeQueueFilter === 'INTERESTED') {
      if (l.status !== 'INTERESTED') return false;
    } else {
      // Fresh queue: ONLY PENDING leads
      if (l.status !== 'PENDING') return false;
    }

    const q = search.trim().toLowerCase();
    if (!q) return true;
    return l.phone.includes(q);
  });

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

  // 1. Period-filtered logs (dynamically updates when timeframe changes)
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
      // Filter by interactive metric button
      if (selectedMetricFilter === 'INTERESTED') {
        if (log.outcome !== 'INTERESTED' && log.outcome !== 'DEAL_CLOSED') return false;
      } else if (selectedMetricFilter === 'CALLBACK') {
        if (log.outcome !== 'CALLBACK') return false;
      } else if (selectedMetricFilter === 'NOT_ANSWERED') {
        if (log.outcome !== 'BUSY' && log.outcome !== 'NOT_INTERESTED') return false;
      }

      const q = search.trim().toLowerCase();
      if (!q) return true;
      return (
        log.phoneNumber.includes(q) ||
        (log.clientName && log.clientName.toLowerCase().includes(q)) ||
        (log.companyName && log.companyName.toLowerCase().includes(q)) ||
        (log.notes && log.notes.toLowerCase().includes(q))
      );
    });
  }, [periodFilteredLogs, selectedMetricFilter, search]);

  // 4. Grouped by Date for Timeline Display
  const groupedLogs = useMemo(() => {
    const groups: { [dateStr: string]: CallLogItem[] } = {};
    finalFilteredLogs.forEach((log) => {
      const dateKey = getLogDateIso(log);
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(log);
    });

    return Object.keys(groups)
      .sort((a, b) => b.localeCompare(a))
      .map((dateKey) => {
        let label = dateKey;
        if (dateKey === todayIso) label = 'Today';
        else if (dateKey === yesterdayIso) label = 'Yesterday';
        else {
          try {
            label = new Date(dateKey + 'T00:00:00').toLocaleDateString('en-US', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            });
          } catch (e) {
            label = dateKey;
          }
        }
        return {
          dateKey,
          label,
          logs: groups[dateKey],
        };
      });
  }, [finalFilteredLogs, todayIso, yesterdayIso]);

  const handleCallLead = (lead: AssignedLead) => {
    openCallModalForLead(lead);
    window.location.href = `tel:${lead.phone}`;
    triggerToast(`📞 Dialing ${lead.phone}...`);
  };

  const getOutcomeBadge = (outcome: CallOutcome) => {
    switch (outcome) {
      case 'INTERESTED':
        return (
          <span className="bg-sky-50 text-sky-700 text-[10px] font-extrabold px-2 py-0.5 rounded-md border border-sky-200 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-sky-600" />
            Interested
          </span>
        );
      case 'DEAL_CLOSED':
        return (
          <span className="bg-emerald-50 text-emerald-700 text-[10px] font-extrabold px-2 py-0.5 rounded-md border border-emerald-200 flex items-center gap-1">
            <Award className="w-3 h-3 text-emerald-600" />
            Won Deal
          </span>
        );
      case 'CALLBACK':
        return (
          <span className="bg-amber-50 text-amber-700 text-[10px] font-extrabold px-2 py-0.5 rounded-md border border-amber-200 flex items-center gap-1">
            <PhoneForwarded className="w-3 h-3 text-amber-600" />
            Call Back
          </span>
        );
      case 'BUSY':
        return (
          <span className="bg-slate-100 text-slate-600 text-[10px] font-extrabold px-2 py-0.5 rounded-md border border-slate-200 flex items-center gap-1">
            <PhoneOff className="w-3 h-3 text-slate-500" />
            No Answer
          </span>
        );
      case 'NOT_INTERESTED':
        return (
          <span className="bg-rose-50 text-rose-700 text-[10px] font-extrabold px-2 py-0.5 rounded-md border border-rose-200 flex items-center gap-1">
            <ThumbsDown className="w-3 h-3 text-rose-500" />
            Not Interested
          </span>
        );
      case 'CONNECTED':
      default:
        return (
          <span className="bg-teal-50 text-[#00876f] text-[10px] font-extrabold px-2 py-0.5 rounded-md border border-teal-200 flex items-center gap-1">
            <Phone className="w-3 h-3 text-[#00A88B]" />
            Spoke
          </span>
        );
    }
  };

  const formatDuration = (sec: number) => {
    if (!sec) return '00s';
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m > 0 ? `${m}m ` : ''}${s > 0 ? `${s}s` : ''}`;
  };

  return (
    <div className="flex flex-col gap-4 pb-28 pt-2 px-3 sm:px-4 max-w-lg mx-auto">
      
      {/* 1. Primary Calling Mode Segment Switch (Clean labels, NO number badges) */}
      <div className="bg-slate-200/70 p-1 rounded-2xl flex items-center gap-1 shadow-2xs">
        <button
          onClick={() => { setActiveSection('FRESH_CALLS'); setSearch(''); }}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] ${
            activeSection === 'FRESH_CALLS'
              ? 'bg-[#0A2540] text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Phone className="w-3.5 h-3.5 text-[#00C9A7]" />
          <span>Fresh Calls</span>
        </button>

        <button
          onClick={() => { setActiveSection('CALL_LOGS'); setSearch(''); }}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] ${
            activeSection === 'CALL_LOGS'
              ? 'bg-[#0A2540] text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <History className="w-3.5 h-3.5 text-sky-400" />
          <span>Call Logs</span>
        </button>
      </div>

      {/* 2. SECTION A: FRESH CALLS / TODAY'S CALLING QUEUE */}
      {activeSection === 'FRESH_CALLS' && (
        <div className="space-y-3 pt-1">
          {/* 3 Compact Action Buttons: Assigned (dialsDone / totalAssigned), Callbacks, Interested */}
          <div className="grid grid-cols-3 gap-2">
            {/* Button 1: Assigned (dialsDone / totalAssigned) */}
            <button
              type="button"
              onClick={() => setActiveQueueFilter('ALL_ASSIGNED')}
              className={`p-2.5 rounded-2xl border text-left transition-all active:scale-[0.97] cursor-pointer shadow-2xs ${
                activeQueueFilter === 'ALL_ASSIGNED'
                  ? 'bg-emerald-500/10 border-emerald-500 ring-2 ring-emerald-500/20'
                  : 'bg-white border-slate-200/90 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-[10px] font-bold uppercase tracking-wider block ${
                  activeQueueFilter === 'ALL_ASSIGNED' ? 'text-emerald-800' : 'text-slate-400'
                }`}>
                  Assigned
                </span>
                <Phone className={`w-3 h-3 ${
                  activeQueueFilter === 'ALL_ASSIGNED' ? 'text-emerald-600' : 'text-slate-400'
                }`} />
              </div>
              <div className="mt-1">
                <span className="font-mono font-black text-base text-[#0A2540] leading-none block">
                  {dialsDone} / {totalAssigned}
                </span>
              </div>
            </button>

            {/* Button 2: Callbacks */}
            <button
              type="button"
              onClick={() => setActiveQueueFilter('CALLBACKS')}
              className={`p-2.5 rounded-2xl border text-left transition-all active:scale-[0.97] cursor-pointer shadow-2xs ${
                activeQueueFilter === 'CALLBACKS'
                  ? 'bg-amber-500/10 border-amber-500 ring-2 ring-amber-500/20'
                  : 'bg-white border-slate-200/90 hover:border-amber-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-[10px] font-bold uppercase tracking-wider block ${
                  activeQueueFilter === 'CALLBACKS' ? 'text-amber-800' : 'text-slate-400'
                }`}>
                  Callbacks
                </span>
                <Clock className={`w-3 h-3 ${
                  activeQueueFilter === 'CALLBACKS' ? 'text-amber-600' : 'text-slate-400'
                }`} />
              </div>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="font-mono font-black text-base text-[#0A2540] leading-none">
                  {callbackLeads.length}
                </span>
                {yesterdayCallbacksCount > 0 && (
                  <span className="text-[9px] font-mono font-bold text-rose-600 bg-rose-50 px-1 py-0.2 rounded border border-rose-200">
                    {yesterdayCallbacksCount} overdue
                  </span>
                )}
              </div>
            </button>

            {/* Button 3: Interested */}
            <button
              type="button"
              onClick={() => setActiveQueueFilter('INTERESTED')}
              className={`p-2.5 rounded-2xl border text-left transition-all active:scale-[0.97] cursor-pointer shadow-2xs ${
                activeQueueFilter === 'INTERESTED'
                  ? 'bg-sky-500/10 border-sky-500 ring-2 ring-sky-500/20'
                  : 'bg-white border-slate-200/90 hover:border-sky-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-[10px] font-bold uppercase tracking-wider block ${
                  activeQueueFilter === 'INTERESTED' ? 'text-sky-800' : 'text-slate-400'
                }`}>
                  Interested
                </span>
                <CheckCircle2 className={`w-3 h-3 ${
                  activeQueueFilter === 'INTERESTED' ? 'text-sky-600' : 'text-slate-400'
                }`} />
              </div>
              <div className="mt-1">
                <span className="font-mono font-black text-base text-[#0A2540] leading-none block">
                  {interestedLeads.length}
                </span>
              </div>
            </button>
          </div>

          {/* Search by Phone Number */}
          <div className="relative pt-1">
            <Search className="w-4 h-4 absolute left-3 top-3.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search phone number..."
              className="w-full bg-white border border-slate-200/90 rounded-xl pl-9 pr-8 py-2 text-xs font-mono font-medium text-slate-800 focus:outline-none focus:border-[#00C9A7] shadow-2xs"
            />
            {search && (
              <button 
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-3.5 p-0.5 rounded-full bg-slate-200 text-slate-600 text-xs font-bold cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Calling Queue Cards: FULL Phone Number Displayed, NO developer import junk */}
          {currentQueueLeads.length > 0 ? (
            <div className="space-y-2">
              {currentQueueLeads.map((lead) => {
                const isYesterdayCallback =
                  lead.status === 'CALLBACK' &&
                  ((lead.followUpDate || '').toLowerCase().includes('yesterday') ||
                   (lead.followUpDate && lead.followUpDate.split(' ')[0] < todayIso));

                return (
                  <div
                    key={lead.id}
                    className={`nexus-card p-3.5 bg-white border rounded-2xl shadow-2xs transition-all space-y-2.5 ${
                      isYesterdayCallback
                        ? 'border-rose-300 ring-1 ring-rose-200'
                        : 'border-slate-200/90 hover:border-[#00C9A7]/60'
                    }`}
                  >
                    {/* Top Row: Contact Info & Status Badge (Uncongested & Full Width) */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                          isYesterdayCallback
                            ? 'bg-rose-50 text-rose-600 border border-rose-200'
                            : lead.status === 'CALLBACK' 
                            ? 'bg-amber-50 text-amber-600 border border-amber-200/80' 
                            : lead.status === 'INTERESTED'
                            ? 'bg-sky-50 text-sky-600 border border-sky-200/80'
                            : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                        }`}>
                          {lead.status === 'CALLBACK' ? (
                            isYesterdayCallback ? <AlertCircle className="w-4 h-4 stroke-[2.4]" /> : <Clock className="w-4 h-4 stroke-[2.2]" />
                          ) : (
                            <Phone className="w-4 h-4 stroke-[2.2]" />
                          )}
                        </div>

                        <div className="min-w-0">
                          {/* Full Phone Number with room to breathe */}
                          <span className="font-mono font-black text-[15px] text-[#0A2540] tracking-tight block">
                            {lead.phone}
                          </span>
                          {lead.name && (
                            <span className="text-xs text-slate-500 font-medium block truncate">
                              {lead.name}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Clean, Non-wrapping Status Tag */}
                      <div className="flex-shrink-0">
                        {lead.status === 'CALLBACK' ? (
                          isYesterdayCallback ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-mono font-black px-2 py-0.5 rounded-lg bg-rose-100 text-rose-800 border border-rose-200">
                              <AlertCircle className="w-3 h-3 text-rose-600 flex-shrink-0" />
                              <span>⚠️ Overdue Callback</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-lg bg-amber-100 text-amber-800 border border-amber-200">
                              <Clock className="w-3 h-3 text-amber-600 flex-shrink-0" />
                              <span>{lead.followUpDate || 'Today, 04:00 PM'}</span>
                            </span>
                          )
                        ) : lead.status === 'INTERESTED' ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-lg bg-sky-100 text-sky-800 border border-sky-200">
                            <CheckCircle2 className="w-3 h-3 text-sky-600 flex-shrink-0" />
                            <span>Hot Lead</span>
                          </span>
                        ) : (
                          <span className="inline-block text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-600">
                            Fresh Lead
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Bottom Action Row: Spacious 50/50 Thumb-Friendly Action Buttons */}
                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
                      <button
                        onClick={() => handleCallLead(lead)}
                        className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-[#00C9A7] to-[#00B4D8] hover:opacity-95 text-[#0A2540] font-black text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-xs cursor-pointer"
                      >
                        <Phone className="w-3.5 h-3.5 fill-current" />
                        <span>Call Lead</span>
                      </button>
                      <button
                        onClick={() => openCallModalForLead(lead)}
                        className="w-full py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer border border-slate-200/80"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 stroke-[2.5]" />
                        <span>Log Result</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="nexus-card p-8 bg-white border border-slate-200 rounded-2xl text-center space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
              <h4 className="font-display font-bold text-sm text-[#0A2540]">
                {activeQueueFilter === 'ALL_ASSIGNED' ? 'All Fresh Calls Completed!' : 'Queue Empty'}
              </h4>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                {activeQueueFilter === 'ALL_ASSIGNED'
                  ? '0 uncalled leads remaining. Great job! Check Callbacks or Interested to follow up.'
                  : 'No leads match this category right now.'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* 3. SECTION B: CALL HISTORY & AUDIT ARCHIVE */}
      {activeSection === 'CALL_LOGS' && (
        <div className="space-y-3 pt-1">
          {/* Top Control Bar: Timeframe Pills (Full Width, NO bulky heading or Log button) */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
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
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  selectedPeriod === tab.id
                    ? 'bg-[#0A2540] text-white shadow-2xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                {tab.label}
              </button>
            ))}

            {/* Custom Date Input Pill */}
            <div className="relative flex items-center flex-shrink-0">
              <input
                type="date"
                value={customDate}
                onChange={(e) => {
                  setCustomDate(e.target.value);
                  setSelectedPeriod('CUSTOM');
                }}
                className={`px-2 py-1.5 rounded-xl text-xs font-mono font-bold border transition-all cursor-pointer focus:outline-none ${
                  selectedPeriod === 'CUSTOM'
                    ? 'bg-emerald-50 text-emerald-900 border-emerald-400 ring-1 ring-emerald-300'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              />
            </div>
          </div>

          {/* Interactive 4-Box Metric Filter Buttons: Total Calls, Interested, Callbacks, Not Answered */}
          <div className="grid grid-cols-4 gap-1.5">
            {/* 1. Total Calls */}
            <button
              type="button"
              onClick={() => setSelectedMetricFilter('ALL')}
              className={`p-2 rounded-2xl border transition-all cursor-pointer text-center active:scale-95 shadow-2xs ${
                selectedMetricFilter === 'ALL'
                  ? 'bg-[#0A2540] text-white border-[#0A2540] ring-2 ring-[#0A2540]/20'
                  : 'bg-white text-slate-700 border-slate-200/90 hover:border-slate-300'
              }`}
            >
              <span className={`text-[9px] font-bold uppercase tracking-wider block ${
                selectedMetricFilter === 'ALL' ? 'text-slate-300' : 'text-slate-400'
              }`}>
                Total Calls
              </span>
              <span className={`font-mono-nums font-black text-base mt-0.5 block ${
                selectedMetricFilter === 'ALL' ? 'text-[#00C9A7]' : 'text-[#0A2540]'
              }`}>
                {periodStats.total}
              </span>
            </button>

            {/* 2. Interested */}
            <button
              type="button"
              onClick={() => setSelectedMetricFilter('INTERESTED')}
              className={`p-2 rounded-2xl border transition-all cursor-pointer text-center active:scale-95 shadow-2xs ${
                selectedMetricFilter === 'INTERESTED'
                  ? 'bg-sky-600 text-white border-sky-600 ring-2 ring-sky-300'
                  : 'bg-white text-slate-700 border-slate-200/90 hover:border-sky-300'
              }`}
            >
              <span className={`text-[9px] font-bold uppercase tracking-wider block ${
                selectedMetricFilter === 'INTERESTED' ? 'text-sky-100' : 'text-sky-600'
              }`}>
                Interested
              </span>
              <span className={`font-mono-nums font-black text-base mt-0.5 block ${
                selectedMetricFilter === 'INTERESTED' ? 'text-white' : 'text-sky-600'
              }`}>
                {periodStats.interested}
              </span>
            </button>

            {/* 3. Callbacks */}
            <button
              type="button"
              onClick={() => setSelectedMetricFilter('CALLBACK')}
              className={`p-2 rounded-2xl border transition-all cursor-pointer text-center active:scale-95 shadow-2xs ${
                selectedMetricFilter === 'CALLBACK'
                  ? 'bg-amber-500 text-white border-amber-600 ring-2 ring-amber-300'
                  : 'bg-white text-slate-700 border-slate-200/90 hover:border-amber-300'
              }`}
            >
              <span className={`text-[9px] font-bold uppercase tracking-wider block ${
                selectedMetricFilter === 'CALLBACK' ? 'text-amber-100' : 'text-amber-600'
              }`}>
                Callbacks
              </span>
              <span className={`font-mono-nums font-black text-base mt-0.5 block ${
                selectedMetricFilter === 'CALLBACK' ? 'text-white' : 'text-amber-600'
              }`}>
                {periodStats.callbacks}
              </span>
            </button>

            {/* 4. Not Answered */}
            <button
              type="button"
              onClick={() => setSelectedMetricFilter('NOT_ANSWERED')}
              className={`p-2 rounded-2xl border transition-all cursor-pointer text-center active:scale-95 shadow-2xs ${
                selectedMetricFilter === 'NOT_ANSWERED'
                  ? 'bg-rose-500 text-white border-rose-600 ring-2 ring-rose-300'
                  : 'bg-white text-slate-700 border-slate-200/90 hover:border-rose-300'
              }`}
            >
              <span className={`text-[9px] font-bold uppercase tracking-wider block ${
                selectedMetricFilter === 'NOT_ANSWERED' ? 'text-rose-100' : 'text-rose-600'
              }`}>
                Not Ans.
              </span>
              <span className={`font-mono-nums font-black text-base mt-0.5 block ${
                selectedMetricFilter === 'NOT_ANSWERED' ? 'text-white' : 'text-rose-600'
              }`}>
                {periodStats.notAnswered}
              </span>
            </button>
          </div>

          {/* Search Across Phone, Client & Past Notes */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search phone, client name, or past notes..."
              className="w-full bg-white border border-slate-200/90 rounded-xl pl-9 pr-8 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#00C9A7] shadow-2xs font-medium"
            />
            {search && (
              <button 
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-2.5 p-0.5 rounded-full bg-slate-200 text-slate-600 text-xs font-bold cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Date-Grouped Timeline Feed */}
          {groupedLogs.length > 0 ? (
            <div className="space-y-4">
              {groupedLogs.map((group) => (
                <div key={group.dateKey} className="space-y-2">
                  {/* Group Date Header */}
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-1.5">
                      <CalendarDays className="w-3.5 h-3.5 text-slate-500" />
                      <span className="font-display font-bold text-xs text-[#0A2540]">
                        {group.label}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                      {group.logs.length} calls
                    </span>
                  </div>

                  {/* Group Cards */}
                  <div className="space-y-2.5">
                    {group.logs.map((log) => (
                      <div 
                        key={log.id} 
                        className="nexus-card p-3.5 bg-white border border-slate-200/90 rounded-2xl shadow-2xs hover:border-[#00C9A7]/50 transition-all space-y-2.5"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <span className="font-mono font-black text-sm text-[#0A2540] block tracking-tight">
                              {log.phoneNumber}
                            </span>
                            {log.clientName && log.clientName !== 'Direct Caller' && (
                              <p className="text-xs text-slate-700 font-semibold mt-0.5 truncate">
                                {log.clientName}
                                {log.companyName && <span className="text-slate-400 font-normal"> · {log.companyName}</span>}
                              </p>
                            )}
                          </div>
                          <div className="flex-shrink-0">
                            {getOutcomeBadge(log.outcome)}
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-xs font-mono text-slate-500 bg-slate-50/80 px-2.5 py-1.5 rounded-xl border border-slate-100">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            {formatDuration(log.durationSec)}
                          </span>
                          <span className="font-medium text-slate-600">{log.timestamp}</span>
                        </div>

                        {/* Prominent Notes Box */}
                        {log.notes && (
                          <div className="bg-slate-50/70 p-2.5 rounded-xl border border-slate-100/90 flex items-start gap-2">
                            <MessageSquare className="w-3.5 h-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
                            <p className="text-xs text-slate-700 leading-relaxed font-normal">
                              "{log.notes}"
                            </p>
                          </div>
                        )}

                        {log.followUpDate && (
                          <div className="bg-amber-50/80 text-amber-800 text-xs px-2.5 py-1.5 rounded-xl border border-amber-200 flex items-center gap-1.5 font-medium">
                            <Clock className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                            <span>Follow-up: <strong>{log.followUpDate}</strong></span>
                          </div>
                        )}

                        {/* Action Row */}
                        <div className="pt-1 flex items-center justify-end gap-2 border-t border-slate-100">
                          <a
                            href={`tel:${log.phoneNumber}`}
                            className="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-[11px] flex items-center gap-1 cursor-pointer active:scale-95 transition-all"
                          >
                            <Phone className="w-3 h-3 text-emerald-600 fill-current" />
                            <span>Call Again</span>
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="nexus-card p-8 bg-white border border-slate-200 rounded-2xl text-center space-y-2">
              <PhoneCall className="w-8 h-8 text-slate-300 mx-auto" />
              <h4 className="font-display font-bold text-sm text-[#0A2540]">No calls found in this period</h4>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                {search 
                  ? 'No logs match your search terms.' 
                  : `No calls recorded for ${selectedPeriod === 'CUSTOM' ? (customDate || 'selected date') : selectedPeriod.replace('_', ' ').toLowerCase()}. Try selecting 'Last 30 Days' or 'All Time'.`}
              </p>
            </div>
          )}
        </div>
      )}

    </div>
  );
};
