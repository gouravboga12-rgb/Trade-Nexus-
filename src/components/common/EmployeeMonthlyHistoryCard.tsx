import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../../services/api';
import { useApp } from '../../context/AppContext';
import { getTodayDateIST } from '../../utils/dateUtils';
import { getPaymentDateIST } from '../../utils/revenueUtils';
import {
  Calendar,
  FileSpreadsheet,
  PhoneCall,
  CheckCircle2,
  Award,
  TrendingUp,
  Layers,
  ChevronDown,
  ChevronUp,
  Target,
  Users,
  Filter,
} from 'lucide-react';

interface MonthHistoryItem {
  month: string;
  label: string;
  fullLabel: string;
  isCurrentMonth: boolean;
  leadsAssigned: number;
  leadsCalled: number;
  leadsPending: number;
  interestedCount: number;
  callbackCount: number;
  wonCount: number;
  verifiedDealsCount: number;
  totalDials: number;
  salesAchieved: number;
  salesTarget: number;
  targetPercent: number;
  batchesCount: number;
  batches: Array<{
    id: string;
    fileName: string;
    uploadedAt: string;
    leadsCount: number;
  }>;
}

interface EmployeeMonthlyHistoryCardProps {
  employeeId: string;
  empCode?: string;
  employeeName: string;
  salesTarget?: number;
  compact?: boolean;
}

const YMD = /^\d{4}-\d{2}-\d{2}/;

const MONTH_NAMES = [
  { num: '01', short: 'Jan', full: 'January' },
  { num: '02', short: 'Feb', full: 'February' },
  { num: '03', short: 'Mar', full: 'March' },
  { num: '04', short: 'Apr', full: 'April' },
  { num: '05', short: 'May', full: 'May' },
  { num: '06', short: 'Jun', full: 'June' },
  { num: '07', short: 'Jul', full: 'July' },
  { num: '08', short: 'Aug', full: 'August' },
  { num: '09', short: 'Sep', full: 'September' },
  { num: '10', short: 'Oct', full: 'October' },
  { num: '11', short: 'Nov', full: 'November' },
  { num: '12', short: 'Dec', full: 'December' },
];

function extractDatePrefix(raw?: string | null): string | null {
  if (!raw) return null;
  const s = String(raw).trim();
  if (YMD.test(s)) {
    if (s.length === 10) return s;
    const iso = s.includes('T') ? s : `${s.replace(' ', 'T')}Z`;
    const d = new Date(iso);
    if (!isNaN(d.getTime())) return getTodayDateIST(d);
    return s.slice(0, 10);
  }
  return null;
}

const inr = (n: number) => `₹${Math.round(n || 0).toLocaleString('en-IN')}`;

const formatInLakhs = (amount: number) => {
  if (!amount || amount === 0) return '₹0';
  if (amount >= 100000) {
    const lakhs = (amount / 100000).toFixed(2).replace(/\.00$/, '');
    return `₹${lakhs} L`;
  }
  return inr(amount);
};

export const EmployeeMonthlyHistoryCard: React.FC<EmployeeMonthlyHistoryCardProps> = ({
  employeeId,
  empCode,
  employeeName,
  salesTarget = 200000,
  compact = false,
}) => {
  const { assignedLeads, callLogs, paymentVerifications, leadBatches } = useApp();

  const todayIST = getTodayDateIST();
  const currentYM = todayIST.slice(0, 7);
  const currentYearNum = parseInt(todayIST.slice(0, 4), 10) || 2026;
  const currentMonthNum = todayIST.slice(5, 7);

  const [selectedYear, setSelectedYear] = useState<number>(currentYearNum);
  const [selectedMonthNum, setSelectedMonthNum] = useState<string>(currentMonthNum);
  const selectedYM = `${selectedYear}-${selectedMonthNum}`;

  const [serverMonths, setServerMonths] = useState<MonthHistoryItem[] | null>(null);
  const [showAllMonthsTable, setShowAllMonthsTable] = useState<boolean>(true);

  // Generate Year options dynamically from 1996 through future planning years (up to currentYear + 5, including 2027, 2028, 2030, etc.)
  const availableYears = useMemo(() => {
    const years: number[] = [];
    const maxFutureYear = Math.max(currentYearNum + 5, 2031);
    for (let y = maxFutureYear; y >= 1996; y--) {
      years.push(y);
    }
    return years;
  }, [currentYearNum]);

  // Fetch month history from backend API
  useEffect(() => {
    let cancelled = false;
    const lookupId = employeeId || empCode || employeeName;
    if (!lookupId) return;

    api
      .getEmployeeMonthlyHistory(lookupId)
      .then((res) => {
        if (!cancelled && res && Array.isArray(res.months)) {
          setServerMonths(res.months);
        }
      })
      .catch(() => {
        // Fallback to client-computed breakdown seamlessly
      });

    return () => {
      cancelled = true;
    };
  }, [employeeId, empCode, employeeName]);

  // Comprehensive calculation across any chosen year and month
  const computedMonthDataMap = useMemo(() => {
    const nameLower = (employeeName || '').trim().toLowerCase();
    const validIds = new Set([employeeId, empCode].filter(Boolean));

    const myLeads = (assignedLeads || []).filter((l) => {
      const byId = l.assignedToEmployeeId && validIds.has(l.assignedToEmployeeId);
      const byName = l.assignedToEmployeeName && l.assignedToEmployeeName.trim().toLowerCase() === nameLower;
      return Boolean(byId || byName);
    });

    const myCalls = (callLogs || []).filter((c) => {
      const byId = c.employeeId && validIds.has(c.employeeId);
      const byName = c.clientName && c.clientName.trim().toLowerCase() === nameLower;
      return Boolean(byId || byName);
    });

    const seenPay = new Set<string>();
    const myVerifiedPayments = (paymentVerifications || []).filter((p) => {
      if (p.status !== 'VERIFIED') return false;
      if ((p.telecallerName || '').trim().toLowerCase() !== nameLower) return false;
      const key = `${(p.companyName || p.leadName || '').trim().toLowerCase()}_${nameLower}_${p.dealAmount}_${p.status}`;
      if (seenPay.has(key)) return false;
      seenPay.add(key);
      return true;
    });

    const batchMap = new Map<string, any>();
    (leadBatches || []).forEach((b) => batchMap.set(b.id, b));

    const effTarget = salesTarget && salesTarget > 0 ? salesTarget : 200000;

    interface Bucket {
      leadsAssigned: number;
      leadsCalled: number;
      leadsPending: number;
      interestedLeads: number;
      callbackLeads: number;
      convertedLeads: number;
      leadDialsSum: number;
      callLogsCount: number;
      interestedCalls: number;
      verifiedDealsCount: number;
      verifiedRevenue: number;
      batchCounts: Map<string, number>;
    }

    const makeBucket = (): Bucket => ({
      leadsAssigned: 0,
      leadsCalled: 0,
      leadsPending: 0,
      interestedLeads: 0,
      callbackLeads: 0,
      convertedLeads: 0,
      leadDialsSum: 0,
      callLogsCount: 0,
      interestedCalls: 0,
      verifiedDealsCount: 0,
      verifiedRevenue: 0,
      batchCounts: new Map<string, number>(),
    });

    const buckets = new Map<string, Bucket>();
    const getB = (ym: string) => {
      let b = buckets.get(ym);
      if (!b) {
        b = makeBucket();
        buckets.set(ym, b);
      }
      return b;
    };

    // If server sent data, initialize buckets from server
    if (serverMonths && Array.isArray(serverMonths)) {
      serverMonths.forEach((sm) => {
        const b = getB(sm.month);
        b.leadsAssigned = sm.leadsAssigned;
        b.leadsCalled = sm.leadsCalled;
        b.leadsPending = sm.leadsPending;
        b.interestedLeads = sm.interestedCount;
        b.callbackLeads = sm.callbackCount;
        b.convertedLeads = sm.wonCount;
        b.callLogsCount = sm.totalDials;
        b.verifiedDealsCount = sm.verifiedDealsCount;
        b.verifiedRevenue = sm.salesAchieved;
        (sm.batches || []).forEach((batch) => {
          b.batchCounts.set(batch.id, batch.leadsCount);
        });
      });
    }

    // Merge in current local data to ensure full accuracy
    for (const l of myLeads) {
      const dStr = extractDatePrefix(l.assignedDate) || extractDatePrefix(l.createdAt) || `${currentYM}-01`;
      const ym = dStr.slice(0, 7);
      const b = getB(ym);
      // Avoid double counting if already populated by server
      if (!serverMonths) {
        b.leadsAssigned += 1;
        const st = (l.status || 'PENDING').toUpperCase();
        const calls = Number(l.callCount) || 0;
        if (st !== 'PENDING' || calls > 0) b.leadsCalled += 1;
        else b.leadsPending += 1;
        if (st === 'INTERESTED') b.interestedLeads += 1;
        if (st === 'CALLBACK') b.callbackLeads += 1;
        if (st === 'CONVERTED') b.convertedLeads += 1;
        b.leadDialsSum += calls > 0 ? calls : st !== 'PENDING' ? 1 : 0;
        if (l.batchId && l.batchId !== 'crm-pipeline') {
          b.batchCounts.set(l.batchId, (b.batchCounts.get(l.batchId) || 0) + 1);
        }
      }
    }

    if (!serverMonths) {
      for (const c of myCalls) {
        const dStr = extractDatePrefix(c.date) || extractDatePrefix(c.createdAt) || extractDatePrefix(c.timestamp);
        if (!dStr) continue;
        const ym = dStr.slice(0, 7);
        const b = getB(ym);
        b.callLogsCount += 1;
        if ((c.outcome || '').toUpperCase() === 'INTERESTED') b.interestedCalls += 1;
      }

      for (const p of myVerifiedPayments) {
        const dStr = getPaymentDateIST(p);
        if (!dStr) continue;
        const ym = dStr.slice(0, 7);
        const b = getB(ym);
        b.verifiedDealsCount += 1;
        b.verifiedRevenue += Number(p.dealAmount) || 0;
      }
    }

    const resultMap = new Map<string, MonthHistoryItem>();

    buckets.forEach((b, ym) => {
      const [yStr, mStr] = ym.split('-');
      const y = parseInt(yStr, 10);
      const m = parseInt(mStr, 10);
      const mObj = MONTH_NAMES.find((mn) => mn.num === mStr) || { short: mStr, full: mStr };
      const label = `${mObj.short} ${y}`;
      const fullLabel = `${mObj.full} ${y}`;

      const batches = Array.from(b.batchCounts.entries()).map(([batchId, count]) => {
        const meta = batchMap.get(batchId);
        return {
          id: batchId,
          fileName: meta?.fileName || `Batch ${batchId}`,
          uploadedAt: meta?.uploadedAt || ym,
          leadsCount: count,
        };
      });

      const totalDials = Math.max(b.callLogsCount, b.leadDialsSum);
      const interestedCount = Math.max(b.interestedLeads, b.interestedCalls);
      const wonCount = Math.max(b.verifiedDealsCount, b.convertedLeads);
      const targetPercent = effTarget > 0 ? Math.round((b.verifiedRevenue / effTarget) * 100) : 0;

      resultMap.set(ym, {
        month: ym,
        label,
        fullLabel,
        isCurrentMonth: ym === currentYM,
        leadsAssigned: b.leadsAssigned,
        leadsCalled: b.leadsCalled,
        leadsPending: b.leadsPending,
        interestedCount,
        callbackCount: b.callbackLeads,
        wonCount,
        verifiedDealsCount: b.verifiedDealsCount,
        totalDials,
        salesAchieved: b.verifiedRevenue,
        salesTarget: effTarget,
        targetPercent,
        batchesCount: batches.length,
        batches,
      });
    });

    return resultMap;
  }, [assignedLeads, callLogs, paymentVerifications, leadBatches, employeeId, empCode, employeeName, salesTarget, serverMonths, currentYM]);

  // Construct active month item (falling back to a clean 0-record object if nothing occurred in that year/month)
  const activeMonthData = useMemo<MonthHistoryItem>(() => {
    const existing = computedMonthDataMap.get(selectedYM);
    if (existing) return existing;

    const mObj = MONTH_NAMES.find((mn) => mn.num === selectedMonthNum) || { short: selectedMonthNum, full: selectedMonthNum };
    const effTarget = salesTarget && salesTarget > 0 ? salesTarget : 200000;
    return {
      month: selectedYM,
      label: `${mObj.short} ${selectedYear}`,
      fullLabel: `${mObj.full} ${selectedYear}`,
      isCurrentMonth: selectedYM === currentYM,
      leadsAssigned: 0,
      leadsCalled: 0,
      leadsPending: 0,
      interestedCount: 0,
      callbackCount: 0,
      wonCount: 0,
      verifiedDealsCount: 0,
      totalDials: 0,
      salesAchieved: 0,
      salesTarget: effTarget,
      targetPercent: 0,
      batchesCount: 0,
      batches: [],
    };
  }, [computedMonthDataMap, selectedYM, selectedMonthNum, selectedYear, currentYM, salesTarget]);

  // All 12 months for the currently selected year (for the comparison table)
  const selectedYearMonths = useMemo<MonthHistoryItem[]>(() => {
    return MONTH_NAMES.map((mObj) => {
      const ym = `${selectedYear}-${mObj.num}`;
      const existing = computedMonthDataMap.get(ym);
      if (existing) return existing;
      const effTarget = salesTarget && salesTarget > 0 ? salesTarget : 200000;
      return {
        month: ym,
        label: `${mObj.short} ${selectedYear}`,
        fullLabel: `${mObj.full} ${selectedYear}`,
        isCurrentMonth: ym === currentYM,
        leadsAssigned: 0,
        leadsCalled: 0,
        leadsPending: 0,
        interestedCount: 0,
        callbackCount: 0,
        wonCount: 0,
        verifiedDealsCount: 0,
        totalDials: 0,
        salesAchieved: 0,
        salesTarget: effTarget,
        targetPercent: 0,
        batchesCount: 0,
        batches: [],
      };
    }).reverse(); // Latest month first
  }, [selectedYear, computedMonthDataMap, currentYM, salesTarget]);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-3.5 sm:p-4 shadow-2xs space-y-3.5">
      {/* Header Row + Dynamic Year & Month Dropdowns */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <Calendar className="w-4 h-4 text-[#00A88B]" />
            <h3 className="font-display font-black text-sm text-[#0A2540]">
              Monthly Leads &amp; Target History
            </h3>
            {activeMonthData.isCurrentMonth && (
              <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#E6FAF6] text-[#00A88B] border border-[#00C9A7]/30">
                Current Month
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Select any year from 1996 to {currentYearNum} and month to review performance details
          </p>
        </div>

        {/* Dynamic Year & Month Dropdown Selectors */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Year Selector Dropdown */}
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200/90 rounded-xl px-2.5 py-1.5 shadow-2xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Year:</span>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="bg-transparent text-xs font-bold text-[#0A2540] focus:outline-none cursor-pointer"
            >
              {availableYears.map((yr) => (
                <option key={yr} value={yr}>
                  {yr} {yr === currentYearNum ? '(Current)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Month Selector Dropdown */}
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200/90 rounded-xl px-2.5 py-1.5 shadow-2xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Month:</span>
            <select
              value={selectedMonthNum}
              onChange={(e) => setSelectedMonthNum(e.target.value)}
              className="bg-transparent text-xs font-bold text-[#0A2540] focus:outline-none cursor-pointer"
            >
              {MONTH_NAMES.map((mn) => (
                <option key={mn.num} value={mn.num}>
                  {mn.full} ({mn.short})
                </option>
              ))}
            </select>
          </div>

          {/* Jump to Current Month Button */}
          {selectedYM !== currentYM && (
            <button
              type="button"
              onClick={() => {
                setSelectedYear(currentYearNum);
                setSelectedMonthNum(currentMonthNum);
              }}
              className="px-2.5 py-1.5 rounded-xl bg-[#E6FAF6] text-[#00A88B] hover:bg-[#00C9A7] hover:text-[#0A2540] text-[10px] font-bold border border-[#00C9A7]/30 transition-all cursor-pointer shadow-2xs"
            >
              Today's Month
            </button>
          )}
        </div>
      </div>

      {/* Month Fast-Tap Carousel for Selected Year */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar border-t border-slate-100 pt-2.5">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mr-1 flex-shrink-0 flex items-center gap-1">
          <Filter className="w-3 h-3 text-[#00A88B]" />
          <span>{selectedYear}:</span>
        </span>
        {MONTH_NAMES.map((mn) => {
          const ym = `${selectedYear}-${mn.num}`;
          const isSelected = ym === activeMonthData.month;
          const dataForMonth = computedMonthDataMap.get(ym);
          const hasLeads = Boolean(dataForMonth && dataForMonth.leadsAssigned > 0);
          const hasSales = Boolean(dataForMonth && dataForMonth.salesAchieved > 0);

          return (
            <button
              key={mn.num}
              type="button"
              onClick={() => setSelectedMonthNum(mn.num)}
              className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1 ${
                isSelected
                  ? 'bg-[#0A2540] text-white shadow-2xs'
                  : hasSales
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200/80 hover:bg-emerald-100'
                  : hasLeads
                  ? 'bg-teal-50 text-teal-800 border border-teal-200/80 hover:bg-teal-100'
                  : 'bg-slate-50 text-slate-600 border border-slate-200/80 hover:bg-slate-100'
              }`}
            >
              <span>{mn.short}</span>
              {dataForMonth && dataForMonth.leadsAssigned > 0 && (
                <span
                  className={`text-[9px] font-mono px-1 py-0.2 rounded ${
                    isSelected ? 'bg-[#00C9A7] text-[#0A2540] font-black' : 'bg-slate-200/80 text-slate-700'
                  }`}
                >
                  {dataForMonth.leadsAssigned}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Selected Month Details Label Banner */}
      <div className="bg-gradient-to-r from-slate-50 via-teal-50/20 to-slate-50 rounded-xl px-3 py-1.5 border border-slate-200/60 flex items-center justify-between">
        <span className="text-xs font-bold text-[#0A2540]">
          Showing performance for <strong className="text-[#00A88B]">{activeMonthData.fullLabel}</strong>
        </span>
        <span className="text-[10px] text-slate-500 font-mono">
          Monthly Target: {formatInLakhs(activeMonthData.salesTarget)}
        </span>
      </div>

      {/* Selected Month 6-KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {/* 1. Leads Received */}
        <div className="bg-slate-50/90 border border-slate-200/70 rounded-xl p-2.5">
          <div className="flex items-center justify-between text-slate-400 mb-0.5">
            <span className="text-[9px] font-bold uppercase tracking-wider">Leads Got</span>
            <Users className="w-3.5 h-3.5 text-indigo-500" />
          </div>
          <strong className="font-mono-nums font-black text-base text-[#0A2540] block leading-tight">
            {activeMonthData.leadsAssigned.toLocaleString('en-IN')}
          </strong>
          <span className="text-[10px] text-slate-500 font-medium block mt-0.5">
            {activeMonthData.batchesCount > 0
              ? `${activeMonthData.batchesCount} Excel Batch${activeMonthData.batchesCount > 1 ? 'es' : ''}`
              : activeMonthData.leadsAssigned > 0
              ? 'Direct Allocation'
              : 'No leads assigned'}
          </span>
        </div>

        {/* 2. Leads Called vs Pending */}
        <div className="bg-slate-50/90 border border-slate-200/70 rounded-xl p-2.5">
          <div className="flex items-center justify-between text-slate-400 mb-0.5">
            <span className="text-[9px] font-bold uppercase tracking-wider">Leads Called</span>
            <PhoneCall className="w-3.5 h-3.5 text-sky-500" />
          </div>
          <strong className="font-mono-nums font-black text-base text-sky-700 block leading-tight">
            {activeMonthData.leadsCalled.toLocaleString('en-IN')}
          </strong>
          <span className="text-[10px] text-slate-500 font-medium block mt-0.5">
            {activeMonthData.leadsPending.toLocaleString('en-IN')} fresh pending
          </span>
        </div>

        {/* 3. Total Dials */}
        <div className="bg-slate-50/90 border border-slate-200/70 rounded-xl p-2.5">
          <div className="flex items-center justify-between text-slate-400 mb-0.5">
            <span className="text-[9px] font-bold uppercase tracking-wider">Total Dials</span>
            <Layers className="w-3.5 h-3.5 text-teal-600" />
          </div>
          <strong className="font-mono-nums font-black text-base text-[#0A2540] block leading-tight">
            {activeMonthData.totalDials.toLocaleString('en-IN')}
          </strong>
          <span className="text-[10px] text-slate-500 font-medium block mt-0.5">
             In {activeMonthData.label}
          </span>
        </div>

        {/* 4. Interested & Callbacks */}
        <div className="bg-slate-50/90 border border-slate-200/70 rounded-xl p-2.5">
          <div className="flex items-center justify-between text-slate-400 mb-0.5">
            <span className="text-[9px] font-bold uppercase tracking-wider">Interested</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-purple-600" />
          </div>
          <strong className="font-mono-nums font-black text-base text-purple-700 block leading-tight">
            {activeMonthData.interestedCount.toLocaleString('en-IN')}
          </strong>
          <span className="text-[10px] text-slate-500 font-medium block mt-0.5">
            +{activeMonthData.callbackCount} callbacks
          </span>
        </div>

        {/* 5. Won Deals */}
        <div className="bg-slate-50/90 border border-slate-200/70 rounded-xl p-2.5">
          <div className="flex items-center justify-between text-slate-400 mb-0.5">
            <span className="text-[9px] font-bold uppercase tracking-wider">Won Deals</span>
            <Award className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <strong className="font-mono-nums font-black text-base text-emerald-700 block leading-tight">
            {activeMonthData.wonCount}
          </strong>
          <span className="text-[10px] text-emerald-700 font-semibold block mt-0.5">
            {activeMonthData.verifiedDealsCount} HR Verified
          </span>
        </div>

        {/* 6. Monthly Sales vs Target */}
        <div className="bg-[#E6FAF6]/60 border border-[#00C9A7]/30 rounded-xl p-2.5">
          <div className="flex items-center justify-between text-[#00A88B] mb-0.5">
            <span className="text-[9px] font-black uppercase tracking-wider">Month Sales</span>
            <TrendingUp className="w-3.5 h-3.5 text-[#00A88B]" />
          </div>
          <strong className="font-mono-nums font-black text-base text-[#00A88B] block leading-tight">
            {formatInLakhs(activeMonthData.salesAchieved)}
          </strong>
          <span className="text-[10px] text-slate-600 font-semibold block mt-0.5">
            {activeMonthData.targetPercent}% of {formatInLakhs(activeMonthData.salesTarget)}
          </span>
        </div>
      </div>

      {/* Excel Batches Assigned in Selected Month (if any) */}
      {activeMonthData.batches && activeMonthData.batches.length > 0 && (
        <div className="bg-indigo-50/50 border border-indigo-200/70 rounded-xl p-2.5 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-indigo-900 flex items-center gap-1">
              <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-600" />
              Excel Batches Assigned in {activeMonthData.fullLabel}
            </span>
            <span className="text-[10px] font-mono font-bold text-indigo-700">
              {activeMonthData.batches.length} file{activeMonthData.batches.length > 1 ? 's' : ''}
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {activeMonthData.batches.map((b) => (
              <div
                key={b.id}
                className="bg-white border border-indigo-200/80 rounded-lg px-2.5 py-1 text-[11px] flex items-center gap-1.5 shadow-2xs"
              >
                <span className="font-bold text-[#0A2540] truncate max-w-[180px]">{b.fileName}</span>
                <span className="px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-800 font-mono font-black text-[10px]">
                  {b.leadsCount} leads
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Collapsible Year Overview Table */}
      <div className="pt-1 border-t border-slate-100">
        <button
          type="button"
          onClick={() => setShowAllMonthsTable((prev) => !prev)}
          className="w-full flex items-center justify-between text-[11px] font-bold text-slate-600 hover:text-[#0A2540] py-1 cursor-pointer"
        >
          <span className="flex items-center gap-1.5">
            <Target className="w-3.5 h-3.5 text-[#00A88B]" />
            <span>Year {selectedYear} All 12 Months Breakdown</span>
          </span>
          {showAllMonthsTable ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showAllMonthsTable && (
          <div className="overflow-x-auto mt-2">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-400">
                  <th className="py-2 px-2">Month</th>
                  <th className="py-2 px-2 text-right">Leads Got</th>
                  <th className="py-2 px-2 text-right">Called</th>
                  <th className="py-2 px-2 text-right">Interested</th>
                  <th className="py-2 px-2 text-right">Won</th>
                  <th className="py-2 px-2 text-right">Verified Sales</th>
                  <th className="py-2 px-2 text-right">Target %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {selectedYearMonths.map((m) => {
                  const isActive = m.month === activeMonthData.month;
                  return (
                    <tr
                      key={m.month}
                      onClick={() => {
                        const mNum = m.month.split('-')[1];
                        setSelectedMonthNum(mNum);
                      }}
                      className={`cursor-pointer transition-colors ${
                        isActive ? 'bg-[#E6FAF6]/60 font-bold' : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="py-2 px-2 font-bold text-[#0A2540] whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span>{m.label}</span>
                          {m.isCurrentMonth && (
                            <span className="text-[8px] font-black uppercase px-1.5 py-0.2 rounded bg-[#00C9A7]/20 text-[#00A88B]">
                              Now
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2 px-2 text-right font-mono text-[#0A2540]">
                        {m.leadsAssigned.toLocaleString('en-IN')}
                      </td>
                      <td className="py-2 px-2 text-right font-mono text-sky-700">
                        {m.leadsCalled.toLocaleString('en-IN')}
                      </td>
                      <td className="py-2 px-2 text-right font-mono text-purple-700">
                        {m.interestedCount.toLocaleString('en-IN')}
                      </td>
                      <td className="py-2 px-2 text-right font-mono text-emerald-700">
                        {m.wonCount}
                      </td>
                      <td className="py-2 px-2 text-right font-mono font-bold text-[#00A88B]">
                        {inr(m.salesAchieved)}
                      </td>
                      <td className="py-2 px-2 text-right font-mono">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-black ${
                            m.targetPercent >= 100
                              ? 'bg-emerald-100 text-emerald-800'
                              : m.targetPercent > 0
                              ? 'bg-teal-50 text-[#00A88B]'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {m.targetPercent}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
