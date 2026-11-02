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
  const [serverMonths, setServerMonths] = useState<MonthHistoryItem[] | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>(() => getTodayDateIST().slice(0, 7));
  const [showAllMonthsTable, setShowAllMonthsTable] = useState<boolean>(true);

  useEffect(() => {
    let cancelled = false;
    const lookupId = employeeId || empCode || employeeName;
    if (!lookupId) return;

    api
      .getEmployeeMonthlyHistory(lookupId)
      .then((res) => {
        if (!cancelled && res && Array.isArray(res.months) && res.months.length > 0) {
          setServerMonths(res.months);
          if (!res.months.some((m) => m.month === selectedMonth)) {
            setSelectedMonth(res.months[0].month);
          }
        }
      })
      .catch(() => {
        // Fallback to client-computed breakdown seamlessly
      });

    return () => {
      cancelled = true;
    };
  }, [employeeId, empCode, employeeName]);

  // Instant client-side computation so the card never flashes empty while loading
  const fallbackMonths = useMemo<MonthHistoryItem[]>(() => {
    const currentYM = getTodayDateIST().slice(0, 7);
    const [curY, curM] = currentYM.split('-').map(Number);
    const monthSet = new Set<string>();
    for (let i = 0; i < 6; i++) {
      const d = new Date(Date.UTC(curY, curM - 1 - i, 1));
      monthSet.add(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`);
    }

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
      monthSet.add(ym);
      let b = buckets.get(ym);
      if (!b) {
        b = makeBucket();
        buckets.set(ym, b);
      }
      return b;
    };

    for (const l of myLeads) {
      const dStr = extractDatePrefix(l.assignedDate) || extractDatePrefix(l.createdAt) || `${currentYM}-01`;
      const ym = dStr.slice(0, 7);
      const b = getB(ym);
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

    return Array.from(monthSet)
      .sort((a, b) => b.localeCompare(a))
      .map((ym) => {
        const b = buckets.get(ym) || makeBucket();
        const [y, m] = ym.split('-').map(Number);
        const dt = new Date(Date.UTC(y, (m || 1) - 1, 1));
        const label = `${dt.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' })} ${y}`;
        const fullLabel = `${dt.toLocaleString('en-US', { month: 'long', timeZone: 'UTC' })} ${y}`;
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

        return {
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
        };
      });
  }, [assignedLeads, callLogs, paymentVerifications, leadBatches, employeeId, empCode, employeeName, salesTarget]);

  const months = serverMonths && serverMonths.length > 0 ? serverMonths : fallbackMonths;
  const activeMonthData = months.find((m) => m.month === selectedMonth) || months[0];

  if (!activeMonthData) return null;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-3.5 sm:p-4 shadow-2xs space-y-3">
      {/* Header Row + Month Selector Pills */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div>
          <div className="flex items-center gap-1.5">
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
            Month-wise lead allocation, calling activity &amp; verified sales target achievement
          </p>
        </div>

        {/* Month Selector Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
          {months.slice(0, 6).map((m) => {
            const isSelected = m.month === activeMonthData.month;
            return (
              <button
                key={m.month}
                type="button"
                onClick={() => setSelectedMonth(m.month)}
                className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1 ${
                  isSelected
                    ? 'bg-[#0A2540] text-white shadow-2xs'
                    : 'bg-slate-50 text-slate-600 border border-slate-200/80 hover:bg-slate-100'
                }`}
              >
                <span>{m.label}</span>
                {m.leadsAssigned > 0 && (
                  <span
                    className={`text-[9px] font-mono px-1 py-0.2 rounded ${
                      isSelected ? 'bg-[#00C9A7] text-[#0A2540] font-black' : 'bg-slate-200/80 text-slate-700'
                    }`}
                  >
                    {m.leadsAssigned}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Month KPI Grid */}
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

      {/* Collapsible Month-by-Month Summary Comparison Table */}
      <div className="pt-1 border-t border-slate-100">
        <button
          type="button"
          onClick={() => setShowAllMonthsTable((prev) => !prev)}
          className="w-full flex items-center justify-between text-[11px] font-bold text-slate-600 hover:text-[#0A2540] py-1 cursor-pointer"
        >
          <span className="flex items-center gap-1.5">
            <Target className="w-3.5 h-3.5 text-[#00A88B]" />
            <span>Month-by-Month Leads &amp; Target Breakdown ({months.length} Months)</span>
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
                {months.slice(0, compact ? 4 : 6).map((m) => {
                  const isActive = m.month === activeMonthData.month;
                  return (
                    <tr
                      key={m.month}
                      onClick={() => setSelectedMonth(m.month)}
                      className={`cursor-pointer transition-colors ${
                        isActive ? 'bg-[#E6FAF6]/50 font-bold' : 'hover:bg-slate-50'
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

