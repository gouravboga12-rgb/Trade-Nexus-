import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { X, CalendarCheck, Calendar, Clock, AlertCircle } from 'lucide-react';

const MONTHS = [
  { value: 0, label: '01 - Jan', name: 'Jan' },
  { value: 1, label: '02 - Feb', name: 'Feb' },
  { value: 2, label: '03 - Mar', name: 'Mar' },
  { value: 3, label: '04 - Apr', name: 'Apr' },
  { value: 4, label: '05 - May', name: 'May' },
  { value: 5, label: '06 - Jun', name: 'Jun' },
  { value: 6, label: '07 - Jul', name: 'Jul' },
  { value: 7, label: '08 - Aug', name: 'Aug' },
  { value: 8, label: '09 - Sep', name: 'Sep' },
  { value: 9, label: '10 - Oct', name: 'Oct' },
  { value: 10, label: '11 - Nov', name: 'Nov' },
  { value: 11, label: '12 - Dec', name: 'Dec' },
];

const YEARS = Array.from({ length: 7 }, (_, i) => new Date().getFullYear() - 1 + i);

export const ApplyLeaveModal: React.FC = () => {
  const { isLeaveModalOpen, setIsLeaveModalOpen, submitLeaveRequest, profile } = useApp();

  const now = new Date();
  const initYear = now.getFullYear();
  const initMonth = now.getMonth();
  const initDay = now.getDate();

  const [leaveType, setLeaveType] = useState<'Casual Leave' | 'Sick Leave' | 'Earned / Paid Leave'>('Casual Leave');

  // Explicit Day, Month, Year to completely prevent DD/MM vs MM/DD confusion
  const [fromDay, setFromDay] = useState<number>(initDay);
  const [fromMonth, setFromMonth] = useState<number>(initMonth);
  const [fromYear, setFromYear] = useState<number>(initYear);

  const [toDay, setToDay] = useState<number>(initDay);
  const [toMonth, setToMonth] = useState<number>(initMonth);
  const [toYear, setToYear] = useState<number>(initYear);

  const [reason, setReason] = useState('');

  // Helper for max days in a month
  const getDaysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();

  // Ensure day selection doesn't exceed month length
  useEffect(() => {
    const maxFrom = getDaysInMonth(fromYear, fromMonth);
    if (fromDay > maxFrom) setFromDay(maxFrom);
  }, [fromYear, fromMonth, fromDay]);

  useEffect(() => {
    const maxTo = getDaysInMonth(toYear, toMonth);
    if (toDay > maxTo) setToDay(maxTo);
  }, [toYear, toMonth, toDay]);

  if (!isLeaveModalOpen) return null;

  // Safe UTC date calculations
  const fromUtc = Date.UTC(fromYear, fromMonth, fromDay);
  const toUtc = Date.UTC(toYear, toMonth, toDay);
  const diffMs = toUtc - fromUtc;
  const isDateOrderValid = diffMs >= 0;
  const totalDays = isDateOrderValid ? Math.round(diffMs / (24 * 60 * 60 * 1000)) + 1 : 0;

  const pad = (n: number) => n.toString().padStart(2, '0');
  const formatDisplay = (y: number, m: number, d: number) => {
    return `${pad(d)} ${MONTHS[m]?.name || 'Sep'} ${y}`;
  };

  const fromDisplay = formatDisplay(fromYear, fromMonth, fromDay);
  const toDisplay = formatDisplay(toYear, toMonth, toDay);

  // Quick preset shortcuts
  const applyPreset = (daysCount: number, offsetDays = 0) => {
    const base = new Date();
    base.setDate(base.getDate() + offsetDays);
    const startY = base.getFullYear();
    const startM = base.getMonth();
    const startD = base.getDate();

    const end = new Date(base);
    end.setDate(base.getDate() + daysCount - 1);
    const endY = end.getFullYear();
    const endM = end.getMonth();
    const endD = end.getDate();

    setFromYear(startY);
    setFromMonth(startM);
    setFromDay(startD);

    setToYear(endY);
    setToMonth(endM);
    setToDay(endD);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isDateOrderValid || totalDays < 1) return;

    submitLeaveRequest({
      leaveType,
      fromDate: fromDisplay,
      toDate: toDisplay,
      totalDays,
      reason: reason.trim() || 'Personal leave',
    });
    setIsLeaveModalOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4">
      <div className="w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl border border-slate-200 animate-in slide-in-from-bottom duration-200 max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#E6FAF6] flex items-center justify-center text-[#00C9A7]">
              <CalendarCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-display font-bold text-base text-[#0A2540]">Apply for Leave</h3>
              <p className="text-xs text-slate-500">Balance: <strong className="text-emerald-600">{profile.totalLeaveBalance} Days</strong> Available</p>
            </div>
          </div>
          <button
            onClick={() => setIsLeaveModalOpen(false)}
            className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Quick Presets */}
          <div>
            <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              Quick Shortcuts
            </span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => applyPreset(1, 0)}
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-[#E6FAF6] hover:text-[#00A88B] text-slate-600 font-bold text-[11px] transition-all"
              >
                Today (1d)
              </button>
              <button
                type="button"
                onClick={() => applyPreset(1, 1)}
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-[#E6FAF6] hover:text-[#00A88B] text-slate-600 font-bold text-[11px] transition-all"
              >
                Tomorrow (1d)
              </button>
              <button
                type="button"
                onClick={() => applyPreset(2, 0)}
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-[#E6FAF6] hover:text-[#00A88B] text-slate-600 font-bold text-[11px] transition-all"
              >
                2 Days
              </button>
              <button
                type="button"
                onClick={() => applyPreset(3, 0)}
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-[#E6FAF6] hover:text-[#00A88B] text-slate-600 font-bold text-[11px] transition-all"
              >
                3 Days
              </button>
              <button
                type="button"
                onClick={() => applyPreset(5, 0)}
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-[#E6FAF6] hover:text-[#00A88B] text-slate-600 font-bold text-[11px] transition-all"
              >
                Work Week (5d)
              </button>
            </div>
          </div>

          {/* Leave Type */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Leave Type</label>
            <select
              value={leaveType}
              onChange={(e) => setLeaveType(e.target.value as any)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#00C9A7]"
            >
              <option>Casual Leave</option>
              <option>Sick Leave</option>
              <option>Earned / Paid Leave</option>
            </select>
          </div>

          {/* From Date: Explicit Day, Month, Year */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[#0A2540] flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#00C9A7]" />
                <span>From Date (Start)</span>
              </label>
              <span className="font-mono text-xs font-extrabold text-[#00A88B]">
                {fromDisplay}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <span className="text-[10px] text-slate-400 font-semibold block mb-0.5">Day (DD)</span>
                <select
                  value={fromDay}
                  onChange={(e) => setFromDay(Number(e.target.value))}
                  className="w-full bg-white border border-slate-200 rounded-xl px-2 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#00C9A7]"
                >
                  {Array.from({ length: getDaysInMonth(fromYear, fromMonth) }, (_, i) => i + 1).map((d) => (
                    <option key={d} value={d}>{pad(d)}</option>
                  ))}
                </select>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 font-semibold block mb-0.5">Month</span>
                <select
                  value={fromMonth}
                  onChange={(e) => setFromMonth(Number(e.target.value))}
                  className="w-full bg-white border border-slate-200 rounded-xl px-2 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#00C9A7]"
                >
                  {MONTHS.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 font-semibold block mb-0.5">Year</span>
                <select
                  value={fromYear}
                  onChange={(e) => setFromYear(Number(e.target.value))}
                  className="w-full bg-white border border-slate-200 rounded-xl px-2 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#00C9A7]"
                >
                  {YEARS.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* To Date: Explicit Day, Month, Year */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[#0A2540] flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-sky-500" />
                <span>To Date (End)</span>
              </label>
              <span className="font-mono text-xs font-extrabold text-sky-600">
                {toDisplay}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <span className="text-[10px] text-slate-400 font-semibold block mb-0.5">Day (DD)</span>
                <select
                  value={toDay}
                  onChange={(e) => setToDay(Number(e.target.value))}
                  className="w-full bg-white border border-slate-200 rounded-xl px-2 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#00C9A7]"
                >
                  {Array.from({ length: getDaysInMonth(toYear, toMonth) }, (_, i) => i + 1).map((d) => (
                    <option key={d} value={d}>{pad(d)}</option>
                  ))}
                </select>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 font-semibold block mb-0.5">Month</span>
                <select
                  value={toMonth}
                  onChange={(e) => setToMonth(Number(e.target.value))}
                  className="w-full bg-white border border-slate-200 rounded-xl px-2 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#00C9A7]"
                >
                  {MONTHS.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 font-semibold block mb-0.5">Year</span>
                <select
                  value={toYear}
                  onChange={(e) => setToYear(Number(e.target.value))}
                  className="w-full bg-white border border-slate-200 rounded-xl px-2 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#00C9A7]"
                >
                  {YEARS.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Live Calculated Deduction Card */}
          {isDateOrderValid ? (
            <div className="p-3 bg-[#E6FAF6] border border-[#00C9A7]/30 rounded-2xl flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-display font-black text-sm text-[#0A2540]">
                    {totalDays} {totalDays === 1 ? 'Day' : 'Days'} Total
                  </span>
                  <span className="text-[10px] font-bold text-[#00A88B] bg-white px-2 py-0.5 rounded-full border border-[#00C9A7]/30">
                    Inclusive
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 font-medium">
                  {fromDisplay} → {toDisplay}
                </p>
              </div>
              <span className="text-xs font-bold text-[#00A88B]">
                -{totalDays} from balance
              </span>
            </div>
          ) : (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-2 text-rose-700 text-xs font-bold">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>To Date cannot be earlier than From Date. Please adjust.</span>
            </div>
          )}

          {/* Reason Input */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Reason for Leave</label>
            <textarea
              rows={3}
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="State the reason for your leave application..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:outline-none focus:border-[#00C9A7]"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!isDateOrderValid || totalDays < 1}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#00C9A7] to-[#00B4D8] text-[#0A2540] font-display font-extrabold text-sm uppercase tracking-wider shadow-lg shadow-[#00C9A7]/25 hover:brightness-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            Submit Leave Request ({totalDays} {totalDays === 1 ? 'Day' : 'Days'})
          </button>
        </form>
      </div>
    </div>
  );
};
