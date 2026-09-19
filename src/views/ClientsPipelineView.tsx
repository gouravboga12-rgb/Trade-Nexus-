import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { useScreenData } from '../hooks/useScreenData';
import { 
  Award, 
  Calendar, 
  Search, 
  CheckCircle2, 
  X, 
  TrendingUp,
  Sparkles,
  Phone,
  Clock,
  Filter
} from 'lucide-react';
import { AssignedLead } from '../types';

export const ClientsPipelineView: React.FC = () => {
  const { 
    assignedLeads, 
    profile, 
    stats 
  } = useApp();

  useScreenData('clientsPipeline');

  const [dateFilter, setDateFilter] = useState<'ALL' | 'TODAY' | 'YESTERDAY' | 'THIS_MONTH' | 'CUSTOM'>('ALL');
  const [customDate, setCustomDate] = useState<string>('');
  const [search, setSearch] = useState('');

  // Leads converted by this telecaller
  const myWonLeads = useMemo(() => {
    return assignedLeads.filter((l) => {
      const isMine =
        !l.assignedToEmployeeId ||
        l.assignedToEmployeeId === profile.id ||
        (l.assignedToEmployeeName && l.assignedToEmployeeName.toLowerCase() === profile.name.toLowerCase()) ||
        l.assignedToEmployeeId === 'emp-101';
      return isMine && l.status === 'CONVERTED';
    });
  }, [assignedLeads, profile]);

  // Today's formatted YYYY-MM-DD string
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const yesterdayStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  }, []);

  // Filter won leads by selected calendar date/period
  const filteredWonLeads = useMemo(() => {
    return myWonLeads.filter((lead) => {
      // Search filter by phone number
      const q = search.toLowerCase();
      if (q && !lead.phone.includes(q)) {
        return false;
      }

      // Date filtering
      const leadDateStr = lead.updatedAt ? lead.updatedAt.split('T')[0] : todayStr;

      if (dateFilter === 'TODAY') {
        return leadDateStr === todayStr;
      }
      if (dateFilter === 'YESTERDAY') {
        return leadDateStr === yesterdayStr;
      }
      if (dateFilter === 'THIS_MONTH') {
        const currentMonth = todayStr.slice(0, 7);
        return leadDateStr.startsWith(currentMonth);
      }
      if (dateFilter === 'CUSTOM' && customDate) {
        return leadDateStr === customDate;
      }
      return true; // 'ALL'
    });
  }, [myWonLeads, dateFilter, customDate, search, todayStr, yesterdayStr]);

  // Total Revenue of currently selected date filter
  const totalSelectedRevenue = useMemo(() => {
    return filteredWonLeads.reduce((sum, lead) => {
      return sum + (lead.dealValue || 0);
    }, 0);
  }, [filteredWonLeads]);

  const inr = (n: number) => `₹${n.toLocaleString('en-IN')}`;  return (
    <div className="flex flex-col gap-3 pb-28 pt-2 px-3 sm:px-4 max-w-lg mx-auto">
      
      {/* 1. Sleek Compact Total Revenue Banner (Clean, Spacious, Light Luxury) */}
      <div className="flex items-center justify-between bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-white p-3.5 rounded-2xl border border-emerald-200/80 shadow-2xs">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-white flex items-center justify-center shadow-xs flex-shrink-0">
            <TrendingUp className="w-5 h-5 stroke-[2.3]" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-800 font-bold block">
              Total Revenue
            </span>
            <span className="font-display font-black text-2xl text-[#0A2540] tracking-tight block leading-tight">
              {inr(dateFilter === 'ALL' ? (totalSelectedRevenue || stats.monthlySalesAchieved) : totalSelectedRevenue)}
            </span>
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold block">
            Deals Won
          </span>
          <span className="font-mono font-black text-lg text-emerald-700 block leading-tight">
            {filteredWonLeads.length}
          </span>
        </div>
      </div>

      {/* 2. Combined Single-Line Timeframe Bar + Integrated Date Picker */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
        {[
          { id: 'ALL', label: 'All Time' },
          { id: 'TODAY', label: 'Today' },
          { id: 'YESTERDAY', label: 'Yesterday' },
          { id: 'THIS_MONTH', label: 'This Month' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setDateFilter(tab.id as any);
              setCustomDate('');
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
              dateFilter === tab.id
                ? 'bg-[#0A2540] text-white shadow-2xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        ))}

        {/* Integrated Custom Date Picker Pill */}
        <div className="relative flex items-center flex-shrink-0">
          <input
            type="date"
            value={customDate}
            onChange={(e) => {
              setCustomDate(e.target.value);
              if (e.target.value) {
                setDateFilter('CUSTOM');
              } else {
                setDateFilter('ALL');
              }
            }}
            className={`px-2 py-1.5 rounded-xl text-xs font-mono font-bold border transition-all cursor-pointer focus:outline-none ${
              dateFilter === 'CUSTOM'
                ? 'bg-emerald-50 text-emerald-900 border-emerald-400 ring-1 ring-emerald-300'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          />
        </div>
      </div>

      {/* 3. Sleek Search Filter */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search phone number..."
          className="w-full bg-white border border-slate-200/90 rounded-xl pl-9 pr-8 py-2 text-xs font-mono text-slate-800 focus:outline-none focus:border-[#00C9A7] shadow-2xs font-medium"
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

      {/* 4. Won Deals List (Dedicated - Spacious, No Call Buttons) */}
      <div className="space-y-3">
        {filteredWonLeads.length > 0 ? (
          filteredWonLeads.map((lead) => (
            <div 
              key={lead.id} 
              className="nexus-card p-4 bg-white border border-slate-200/90 rounded-2xl shadow-xs hover:border-emerald-300 transition-all space-y-2.5"
            >
              {/* Top Row: Phone Number + Deal Amount Badge */}
              <div className="flex items-start justify-between">
                <div>
                  <span className="font-mono font-black text-base text-[#0A2540] tracking-tight block">
                    {lead.phone}
                  </span>
                  <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1 mt-0.5">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span>Closed: {lead.updatedAt ? lead.updatedAt.split('T')[0] : 'Today'}</span>
                  </span>
                </div>
                <div className="text-right">
                  <span className="inline-flex items-center gap-1 text-xs font-mono font-black text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200">
                    <Award className="w-3.5 h-3.5 text-emerald-600" />
                    <span>+{inr(lead.dealValue || 0)}</span>
                  </span>
                </div>
              </div>

              {/* Status Chips */}
              <div className="flex items-center gap-2 pt-1">
                <span className="inline-flex items-center gap-1 text-[10px] font-mono font-extrabold text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-md">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  Deal Closed &amp; Verified
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  Dials: {lead.callCount || 0}
                </span>
              </div>

              {/* Notes: Only legitimate notes, hide test suite text */}
              {lead.notes && 
               !lead.notes.toLowerCase().includes('test suite') && 
               !lead.notes.toLowerCase().includes('automated_test') && (
                <p className="text-xs text-slate-600 italic bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  "{lead.notes}"
                </p>
              )}
            </div>
          ))
        ) : (
          <div className="nexus-card p-8 bg-white border border-slate-200 rounded-2xl text-center space-y-2">
            <Award className="w-8 h-8 text-emerald-400 mx-auto" />
            <h4 className="font-display font-bold text-sm text-[#0A2540]">
              No won deals found for this date
            </h4>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">
              {search ? 'No deals match your search.' : 'Deals closed on this date will appear here.'}
            </p>
          </div>
        )}
      </div>

    </div>
  );
};
