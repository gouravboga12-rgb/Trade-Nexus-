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
import { getTodayDateIST, isDateInPeriodIST } from '../utils/dateUtils';
import { getPaymentDateIST, isPaymentInPeriod, matchLeadsToPayments, paymentBelongsTo } from '../utils/revenueUtils';

export const ClientsPipelineView: React.FC = () => {
  const { 
    assignedLeads, 
    profile, 
    currentUser,
    stats,
    paymentVerifications,
  } = useApp();

  useScreenData('clientsPipeline');

  const [dateFilter, setDateFilter] = useState<'ALL' | 'TODAY' | 'YESTERDAY' | 'THIS_MONTH' | 'CUSTOM'>('ALL');
  const [customDate, setCustomDate] = useState<string>('');
  const [search, setSearch] = useState('');

  // Leads converted by this telecaller
  const myWonLeads = useMemo(() => {
    const validIds = new Set(
      [currentUser?.id, currentUser?.employeeId, currentUser?.empCode, profile?.id, profile?.empCode]
        .filter(Boolean)
    );
    const validName = (currentUser?.name || profile?.name || '').trim().toLowerCase();

    return assignedLeads.filter((l) => {
      const matchesId = validIds.has(l.assignedToEmployeeId);
      const matchesName = validName && l.assignedToEmployeeName && l.assignedToEmployeeName.toLowerCase() === validName;
      const isMine = Boolean(matchesId || matchesName);
      // Only genuinely converted leads are deals. A dealValue on an INTERESTED/PENDING
      // lead is just a quoted amount, not a closed deal.
      return isMine && l.status === 'CONVERTED';
    });
  }, [assignedLeads, profile, currentUser]);

  const myName = (currentUser?.name || profile?.name || '').trim();

  // This employee's payment rows (server already scopes them; name check is a safety net)
  const myPayments = useMemo(
    () => (paymentVerifications || []).filter((p) => paymentBelongsTo(p, myName)),
    [paymentVerifications, myName]
  );

  // One-to-one lead ↔ payment link so a duplicate lead can never double-count a payment
  const paymentByLead = useMemo(() => matchLeadsToPayments(myWonLeads, myPayments), [myWonLeads, myPayments]);

  // Date a deal belongs to: its payment date when linked, otherwise the IST day it was closed
  const dealDate = (lead: AssignedLead): string => {
    const pay = paymentByLead.get(lead.id);
    const payDate = getPaymentDateIST(pay);
    if (payDate) return payDate;
    if (lead.updatedAt) {
      const d = new Date(lead.updatedAt);
      if (!isNaN(d.getTime())) return getTodayDateIST(d);
    }
    return lead.assignedDate || '';
  };

  // Filter won leads by selected calendar date/period & search query
  const filteredWonLeads = useMemo(() => {
    return myWonLeads.filter((lead) => {
      // Search filter by phone, name, company, city
      const q = search.trim().toLowerCase();
      if (q) {
        const phoneMatch = lead.phone && lead.phone.includes(q);
        const nameMatch = lead.name && lead.name.toLowerCase().includes(q);
        const companyMatch = lead.company && lead.company.toLowerCase().includes(q);
        const cityMatch = lead.city && lead.city.toLowerCase().includes(q);
        if (!phoneMatch && !nameMatch && !companyMatch && !cityMatch) {
          return false;
        }
      }

      // Robust IST Date filtering
      return isDateInPeriodIST(dealDate(lead), dateFilter, customDate, customDate);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myWonLeads, dateFilter, customDate, search, paymentByLead]);

  // Verified payments in the selected period — identical rule to Admin / Team Leader / HR
  const verifiedInPeriod = useMemo(
    () => myPayments.filter((p) => p.status === 'VERIFIED' && isPaymentInPeriod(p, dateFilter, customDate, customDate)),
    [myPayments, dateFilter, customDate]
  );

  // Total Revenue of currently selected date filter (verified only)
  const totalSelectedRevenue = useMemo(
    () => verifiedInPeriod.reduce((sum, p) => sum + (Number(p.dealAmount) || 0), 0),
    [verifiedInPeriod]
  );

  const awaitingCount = filteredWonLeads.filter((l) => paymentByLead.get(l.id)?.status !== 'VERIFIED').length;

  const inr = (n: number) => `₹${n.toLocaleString('en-IN')}`;
  return (
    <div className="flex flex-col gap-3 pb-28 pt-2 px-3 sm:px-6 lg:px-8 w-full max-w-5xl mx-auto">
      
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
              {inr(totalSelectedRevenue)}

            </span>
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold block">
            Deals Won
          </span>
          <span className="font-mono font-black text-lg text-emerald-700 block leading-tight">
            {verifiedInPeriod.length}
          </span>
          {awaitingCount > 0 && (
            <span className="text-[10px] font-semibold text-amber-600 block">
              +{awaitingCount} not verified
            </span>
          )}
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
          filteredWonLeads.map((lead) => {
            const pay = paymentByLead.get(lead.id);
            const status = pay?.status;
            const chip =
              status === 'VERIFIED'
                ? { label: 'Deal Closed & Verified', cls: 'text-emerald-800 bg-emerald-100/80', icon: 'text-emerald-600' }
                : status === 'PENDING_HR_AUDIT'
                ? { label: 'Awaiting HR Verification', cls: 'text-amber-800 bg-amber-100/80', icon: 'text-amber-600' }
                : status === 'REJECTED'
                ? { label: 'Payment Rejected', cls: 'text-rose-800 bg-rose-100/80', icon: 'text-rose-600' }
                : { label: 'No Payment Record — Not Counted', cls: 'text-slate-700 bg-slate-100', icon: 'text-slate-500' };
            const amount = pay?.dealAmount ?? lead.dealValue ?? 0;
            return (
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
                    <span>Closed: {dealDate(lead) || 'Today'}</span>
                  </span>
                </div>
                <div className="text-right">
                  <span className={`inline-flex items-center gap-1 text-xs font-mono font-black px-2.5 py-1 rounded-xl border ${
                    status === 'VERIFIED'
                      ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                      : 'text-slate-500 bg-slate-50 border-slate-200 line-through decoration-slate-300'
                  }`}>
                    <Award className={`w-3.5 h-3.5 ${status === 'VERIFIED' ? 'text-emerald-600' : 'text-slate-400'}`} />
                    <span>+{inr(amount)}</span>
                  </span>
                </div>
              </div>

              {/* Status Chips */}
              <div className="flex items-center gap-2 pt-1">
                <span className={`inline-flex items-center gap-1 text-[10px] font-mono font-extrabold px-2 py-0.5 rounded-md ${chip.cls}`}>
                  <CheckCircle2 className={`w-3 h-3 ${chip.icon}`} />
                  {chip.label}
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
            );
          })
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
